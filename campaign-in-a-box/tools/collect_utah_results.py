#!/usr/bin/env python3
"""
Collect Utah's official precinct results for the app.

Utah's results site (electionresults.utah.gov, run for the Lieutenant Governor's
Office) shows every county's results, including city and town races, by precinct.
Browsers on other websites aren't allowed to read its data, so this script reads
it on a server (a scheduled GitHub Action) and saves compact files the app loads
from its own address:

  app/data/utah/index.json                     elections, counties, races available
  app/data/utah/<election>/<county>.json       one county's precinct results

Where the data comes from, for each election:
  - Precinct votes: the state's statewide results export
      /cdn/results/Utah/export-<election>.json   (2024 general onward)
    or, for elections without an export, each contest's precinct breakdown
      /results/public/api/elections/<county>/<election>/data/ballot-item/<id>
  - Ballots cast and registered voters by precinct:
      /results/public/api/elections/<county>/<election>/data

Be a good neighbor: the script asks for one thing at a time with a pause between
requests, skips elections that haven't changed since the last run, and identifies
itself. Run it after elections, not constantly.

Usage (from the campaign-in-a-box folder; standard library only):
  python3 tools/collect_utah_results.py              # new or changed elections
  python3 tools/collect_utah_results.py --all        # re-collect everything
  python3 tools/collect_utah_results.py --only general11042025 --county cache-county-ut
  python3 tools/collect_utah_results.py --self-test  # check the parsers on saved samples
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(KIT, "app", "data", "utah")
FIXTURES = os.path.join(KIT, "app", "tests", "fixtures")
BASE = "https://electionresults.utah.gov"
UA = "Campaign-in-a-Box results collector (open-source candidate tool; https://github.com/joshm-co/campaign-in-a-box)"
PAUSE = 0.6
SKIP_IDS = ("demo", "recount")
NON_CANDIDATE = {"over votes", "under votes", "ballots cast", "total votes", "times cast", "blank votes",
                 "invalid", "write-in", "write-in: not assigned"}  # named write-in candidates are kept


# --------------------------------------------------------------------------- fetching
class FetchError(Exception):
    """A page that couldn't be read after retries. The collector skips it and keeps going."""


def get_json(path, retries=4):
    """JSON from the results site, or None if it doesn't exist. Empty or non-JSON replies
    (the site sometimes answers with a blank page or an error page) are retried with a
    growing pause, then raise FetchError so the caller can skip just that piece."""
    url = path if path.startswith("http") else BASE + urllib.parse.quote(path, safe="/:?=&-_.")
    last = ""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode("utf-8-sig", errors="replace")
            time.sleep(PAUSE)
            if body.strip():
                try:
                    return json.loads(body)
                except json.JSONDecodeError:
                    last = f"not JSON ({body.strip()[:60]!r})"
            else:
                last = "empty reply"
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(PAUSE)
                return None
            last = f"HTTP {e.code}"
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = f"{type(e).__name__}: {e}"
        time.sleep(PAUSE * 5 * (attempt + 1))
    raise FetchError(f"{path}: {last}")


def text(v):
    """The site stores names as [{languageId, text}] lists."""
    if isinstance(v, list):
        for x in v:
            if isinstance(x, dict) and x.get("languageId", "en") == "en":
                return (x.get("text") or "").strip()
        return (v[0].get("text") or "").strip() if v and isinstance(v[0], dict) else ""
    return (v or "").strip() if isinstance(v, str) else v


def vote_for(v):
    if isinstance(v, int):
        return v
    digits = "".join(ch for ch in str(text(v) or "") if ch.isdigit())
    return int(digits) if digits else 1


# ---------------------------------------------------------------------------- parsing
def parse_turnout(data):
    """{precinct: [ballots_cast, registered_or_None]} from a county's /data response."""
    out = {}
    for t in (data or {}).get("voterTurnout") or []:
        name = (t.get("precinctName") or "").strip()
        if not name:
            continue
        reg = t.get("voterRegistration") or None
        out[name] = [t.get("ballotsCast") or 0, reg]
    return out


def parse_export_county(county_block):
    """Races with precinct votes from one county's block of the statewide export."""
    races = []
    for item in county_block.get("ballotItems") or []:
        opts = [o for o in item.get("ballotOptions") or [] if (o.get("name") or "").strip().lower() not in NON_CANDIDATE]
        votes = {}
        for i, o in enumerate(opts):
            for pr in o.get("precinctResults") or []:
                if pr.get("isVirtual"):
                    continue
                p = (pr.get("name") or "").strip()
                if not p:
                    continue
                votes.setdefault(p, [0] * len(opts))[i] = pr.get("voteCount") or 0
        races.append({
            "name": (item.get("name") or "").strip(),
            "voteFor": vote_for(item.get("voteFor")),
            "type": item.get("contestType") or "",
            "cands": [[(o.get("name") or "").strip(), o.get("politicalParty") or "", o.get("voteCount") or 0] for o in opts],
            "votes": votes,
        })
    return races


def parse_breakdown(item, breakdown):
    """One race from the API's per-contest precinct breakdown (elections without an export)."""
    w = (breakdown or {}).get("ballotItemWithBreakdown") or {}
    rows = w.get("breakdownResults") or []
    names, parties = [], {}
    for o in ((w.get("summaryResults") or {}).get("ballotOptions") or []):
        n = text(o.get("name"))
        if n and n.lower() not in NON_CANDIDATE and n not in names:
            names.append(n)
            party = o.get("party") or {}
            parties[n] = party.get("abbreviation") or text(party.get("name")) or ""
    totals = {n: 0 for n in names}
    votes = {}
    for r in rows:
        prec = r.get("precinct") or {}
        if prec.get("isVirtual"):
            continue
        p = text(prec.get("name"))
        if not p:
            continue
        line = [0] * len(names)
        for o in r.get("ballotOptions") or []:
            n = text(o.get("name"))
            if n in totals:
                line[names.index(n)] = o.get("voteCount") or 0
                totals[n] += o.get("voteCount") or 0
        votes[p] = line
    return {
        "name": text(item.get("name")),
        "voteFor": vote_for(item.get("voteFor")),
        "type": item.get("contestType") or "",
        "cands": [[n, parties.get(n, ""), totals[n]] for n in names],
        "votes": votes,
    }


def county_file(election, county, turnout, races, as_of):
    return {
        "v": 1,
        "election": election,
        "county": county,
        "source": f"{BASE}/results/public/{county['slug']}/elections/{election['id']}",
        "asOf": as_of,
        "collected": dt.date.today().isoformat(),
        "precincts": turnout,
        "races": [r for r in races if r["votes"]],
    }


# --------------------------------------------------------------------------- collect
def collect(only=None, county_only=None, force=False):
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = {"elections": []}
    if os.path.exists(idx_path):
        with open(idx_path, encoding="utf-8") as f:
            index = json.load(f)
    known = {e["id"]: e for e in index.get("elections", [])}

    try:
        state = get_json("/results/public/api/jurisdictions/Utah")
    except FetchError as err:
        sys.exit(f"Couldn't read the list of Utah elections: {err}")
    if not state:
        sys.exit("Couldn't read the list of Utah elections.")
    counties = [{"slug": c["shortName"], "name": text(c.get("name"))} for c in state.get("childLocalities") or []]
    if county_only:
        counties = [c for c in counties if c["slug"] == county_only]
    elections = [e for e in state.get("elections") or [] if not any(s in e["publicElectionId"].lower() for s in SKIP_IDS)]
    if only:
        elections = [e for e in elections if e["publicElectionId"] in only]
    print(f"{len(elections)} elections, {len(counties)} counties")

    problems = []
    for e in elections:
        eid = e["publicElectionId"]
        election = {"id": eid, "name": text(e.get("name")) or eid, "date": str(e.get("electionDate") or "")[:10]}
        try:
            export = get_json(f"/cdn/results/Utah/export-{eid}.json")
        except FetchError as err:
            problems.append(str(err))
            print(f"{eid}: couldn't read the statewide export, using each contest instead ({err})")
            export = None
        as_of = export.get("createdAt") if export else None
        prev = known.get(eid)
        if prev and prev.get("complete") and not force and as_of and prev.get("asOf") == as_of and not county_only:
            print(f"{eid}: unchanged since {as_of[:10]}, skipped")
            continue
        blocks = {(b.get("name") or "").strip().lower(): b for b in (export or {}).get("localResults") or []}
        entry = {**election, "asOf": as_of, "source": "export" if export else "api", "counties": {}}
        failed = 0
        for c in counties:
            try:
                data = get_json(f"/results/public/api/elections/{c['slug']}/{eid}/data")
                if not data:
                    continue
                turnout = parse_turnout(data)
                block = blocks.get(c["name"].lower())
                if block is not None:
                    races = parse_export_county(block)
                else:
                    races = []
                    for item in data.get("ballotItems") or []:
                        try:
                            bd = get_json(f"/results/public/api/elections/{c['slug']}/{eid}/data/ballot-item/{item['id']}")
                        except FetchError as err:
                            problems.append(str(err))
                            continue
                        if bd:
                            races.append(parse_breakdown(item, bd))
            except FetchError as err:
                failed += 1
                problems.append(str(err))
                print(f"  {eid} {c['slug']}: skipped — {err}")
                if prev and c["slug"] in prev.get("counties", {}):  # keep what an earlier run saved
                    entry["counties"][c["slug"]] = prev["counties"][c["slug"]]
                continue
            stamp = as_of or ((data.get("election") or {}).get("asOf"))
            doc = county_file(election, c, turnout, races, stamp)
            entry["asOf"] = entry["asOf"] or stamp
            if not doc["races"]:  # e.g. an election whose precinct results aren't posted yet
                print(f"  {eid} {c['slug']}: no precinct results yet")
                continue
            folder = os.path.join(OUT, eid)
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, f"{c['slug']}.json"), "w", encoding="utf-8") as f:
                json.dump(doc, f, separators=(",", ":"), ensure_ascii=False)
            entry["counties"][c["slug"]] = {"name": c["name"], "races": [r["name"] for r in doc["races"]],
                                           "precincts": len(turnout), "hasRegistered": any(v[1] for v in turnout.values())}
            print(f"  {eid} {c['slug']}: {len(doc['races'])} races, {len(turnout)} precincts")
        if county_only and prev:  # keep the other counties from the earlier run
            entry["counties"] = {**prev.get("counties", {}), **entry["counties"]}
        # Skip next time only if every county was read and there were results to save.
        entry["complete"] = not county_only and bool(as_of) and failed == 0 and bool(entry["counties"])
        if entry["counties"]:
            known[eid] = entry
        write_index(idx_path, state, known)  # save progress after each election

    write_index(idx_path, state, known)
    if problems:
        print(f"\n{len(problems)} piece(s) couldn't be read this time and will be tried again next run:")
        for p in problems[:30]:
            print("  -", p)
    print("Wrote", os.path.relpath(idx_path, KIT))


def write_index(idx_path, state, known):
    index = {
        "collected": dt.date.today().isoformat(),
        "source": "Utah election results (electionresults.utah.gov), Lieutenant Governor's Office",
        "counties": {c["slug"]: c["name"] for c in [{"slug": x["shortName"], "name": text(x.get("name"))} for x in state.get("childLocalities") or []]},
        "elections": sorted(known.values(), key=lambda x: x["date"], reverse=True),
    }
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=1, ensure_ascii=False)


# ------------------------------------------------------------------------- self-test
def self_test():
    with open(os.path.join(FIXTURES, "utah-export-sample.json"), encoding="utf-8") as f:
        export = json.load(f)
    with open(os.path.join(FIXTURES, "utah-data-sample.json"), encoding="utf-8") as f:
        data = json.load(f)
    with open(os.path.join(FIXTURES, "utah-breakdown-sample.json"), encoding="utf-8") as f:
        breakdown = json.load(f)
    block = export["localResults"][0]
    races = parse_export_county(block)
    r = next(x for x in races if x["name"] == "Smithfield City Council")
    assert r["voteFor"] == 2, r["voteFor"]
    assert [c[0] for c in r["cands"]] == ["CHRIS OLSEN", "LIZETTE VILLEGAS", "SUE HYER", "JAY D. DOWNS"]
    assert r["votes"]["3SMI1:I"] == [286, 140, 269, 240]
    turnout = parse_turnout(data)
    assert turnout["3SMI1:I"] == [506, 1086], turnout["3SMI1:I"]
    item = data["ballotItems"][0]
    b = parse_breakdown(item, breakdown)
    assert b["votes"]["3SMI2:I"] == [284, 156, 309, 299], b["votes"]
    assert b["cands"][0][1] == "NON"
    doc = county_file({"id": "general11042025", "name": "2025", "date": "2025-11-04"}, {"slug": "cache-county-ut", "name": "Cache County"}, turnout, races, "x")
    assert doc["races"] and doc["precincts"]
    print("Utah collector parsers: OK")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--all", action="store_true", help="re-collect elections even if unchanged")
    ap.add_argument("--only", nargs="*", help="only these election ids (e.g. general11042025)")
    ap.add_argument("--county", help="only this county (e.g. cache-county-ut)")
    ap.add_argument("--self-test", action="store_true", help="check the parsers against saved samples")
    a = ap.parse_args()
    if a.self_test:
        self_test()
    else:
        collect(set(a.only) if a.only else None, a.county, a.all)
