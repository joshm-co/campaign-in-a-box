#!/usr/bin/env python3
"""
Campaign-in-a-Box — precinct targeting and win number.

Reads one row per precinct with results from 1–4 past comparable elections and
sorts each precinct into Turn Out / Base - Light Touch / Persuade / Skip.
Uses only the Python 3 standard library.

Input columns (see inputs/precinct-results-template.csv):
  precinct, registered_now,
  e1_registered, e1_ballots_cast, e1_baseline_votes, e1_race_total_votes,
  e2_..., e3_..., e4_...   (e1_label etc. and notes are optional)

Usage:
  python3 tools/targeting.py examples/rivertown-precincts.csv
  python3 tools/targeting.py my.csv --out targeting.csv --base 0.55 --persuade-low 0.45
  python3 tools/targeting.py my.csv --turnout 0.30 --margin 0.05

This is a planning aid, not a prediction. State law decides how your race is
won (plurality, runoff, ranked choice, multi-seat) — see strategy/win-number.md.
"""
import argparse
import csv
import math
import sys

FIELDS = ("registered", "ballots_cast", "baseline_votes", "race_total_votes")
SMALL_PRECINCT_VOTERS = 200


def num(value):
    value = (value or "").strip().replace(",", "")
    return float(value) if value else None


def read_precincts(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        precincts = []
        for line, row in enumerate(reader, start=2):
            if not (row.get("precinct") or "").strip():
                continue
            elections = []
            for i in range(1, 5):
                vals = {k: num(row.get(f"e{i}_{k}")) for k in FIELDS}
                if all(v is None for v in vals.values()):
                    continue
                missing = [k for k, v in vals.items() if v is None]
                if missing:
                    sys.exit(f"Row {line}, election e{i}: missing {', '.join(missing)}")
                if vals["registered"] <= 0 or vals["ballots_cast"] <= 0 or vals["race_total_votes"] <= 0:
                    sys.exit(f"Row {line}, election e{i}: registered, ballots and race totals must be above zero")
                elections.append(vals)
            if not elections:
                sys.exit(f"Row {line}: no past election results found")
            reg_now = num(row.get("registered_now"))
            if not reg_now:
                sys.exit(f"Row {line}: registered_now is required")
            precincts.append({
                "precinct": row["precinct"].strip(),
                "registered_now": reg_now,
                "elections": elections,
                "notes": (row.get("notes") or "").strip(),
            })
    if not precincts:
        sys.exit("No precinct rows found.")
    return precincts


def mean(xs):
    return sum(xs) / len(xs)


def analyze(precincts, base, persuade_low, turnout_override, margin):
    # District-level history (pooled across all precincts, per election)
    n_elections = max(len(p["elections"]) for p in precincts)
    district_turnouts, district_rolloffs = [], []
    for i in range(n_elections):
        reg = sum(p["elections"][i]["registered"] for p in precincts if len(p["elections"]) > i)
        bal = sum(p["elections"][i]["ballots_cast"] for p in precincts if len(p["elections"]) > i)
        race = sum(p["elections"][i]["race_total_votes"] for p in precincts if len(p["elections"]) > i)
        district_turnouts.append(bal / reg)
        district_rolloffs.append(race / bal)
    district_turnout = mean(district_turnouts)
    rolloff = mean(district_rolloffs)

    rows = []
    for p in precincts:
        e = p["elections"]
        turnout = mean([x["ballots_cast"] / x["registered"] for x in e])
        support = mean([x["baseline_votes"] / x["race_total_votes"] for x in e])
        p_rolloff = mean([x["race_total_votes"] / x["ballots_cast"] for x in e])
        proj_voters = p["registered_now"] * turnout * p_rolloff
        proj_base_votes = proj_voters * support

        if support >= base:
            if turnout < district_turnout:
                category = "Turn Out"
                score = p["registered_now"] * support * (1 - turnout)
            else:
                category = "Base - Light Touch"
                score = proj_base_votes
        elif support >= persuade_low:
            category = "Persuade"
            width = max(base - 0.5, 0.5 - persuade_low) * 2
            score = proj_voters * (1 - abs(support - 0.5) / width)
        else:
            category = "Skip"
            score = 0.0

        flags = []
        if proj_voters < SMALL_PRECINCT_VOTERS:
            flags.append("small sample")
        if p["notes"]:
            flags.append(p["notes"])

        rows.append({
            "precinct": p["precinct"],
            "registered_now": int(p["registered_now"]),
            "avg_turnout": turnout,
            "avg_support": support,
            "projected_race_voters": proj_voters,
            "projected_baseline_votes": proj_base_votes,
            "category": category,
            "priority_score": score,
            "flags": "; ".join(flags),
        })

    order = {"Persuade": 0, "Turn Out": 1, "Base - Light Touch": 2, "Skip": 3}
    rows.sort(key=lambda r: (order[r["category"]], -r["priority_score"]))
    rank = {}
    for r in rows:
        rank[r["category"]] = rank.get(r["category"], 0) + 1
        r["rank_in_category"] = rank[r["category"]]

    registered_total = sum(p["registered_now"] for p in precincts)
    turnout_used = turnout_override if turnout_override else district_turnout
    projected_turnout = registered_total * turnout_used
    race_votes = projected_turnout * rolloff
    votes_to_win = math.floor(race_votes * 0.5) + 1
    win_number = votes_to_win + math.ceil(race_votes * margin)
    expected_base = sum(r["projected_baseline_votes"] for r in rows)

    summary = {
        "registered_total": int(registered_total),
        "historic_turnouts": district_turnouts,
        "turnout_used": turnout_used,
        "rolloff": rolloff,
        "projected_turnout": projected_turnout,
        "race_votes": race_votes,
        "votes_to_win": votes_to_win,
        "margin": margin,
        "win_number": win_number,
        "expected_base": expected_base,
        "gap": win_number - expected_base,
    }
    return rows, summary


def write_csv(rows, path):
    cols = ["precinct", "category", "rank_in_category", "registered_now", "avg_turnout",
            "avg_support", "projected_race_voters", "projected_baseline_votes",
            "priority_score", "flags"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            w.writerow([
                r["precinct"], r["category"], r["rank_in_category"], r["registered_now"],
                f"{r['avg_turnout']:.3f}", f"{r['avg_support']:.3f}",
                round(r["projected_race_voters"]), round(r["projected_baseline_votes"]),
                round(r["priority_score"]), r["flags"],
            ])


def print_report(rows, s):
    print("\nWIN NUMBER")
    print(f"  Registered voters now        {s['registered_total']:>8,}")
    hist = ", ".join(f"{t:.1%}" for t in s["historic_turnouts"])
    print(f"  Past turnout (comparable)    {hist}")
    print(f"  Turnout used                 {s['turnout_used']:>8.1%}")
    print(f"  Projected ballots cast       {s['projected_turnout']:>8,.0f}")
    print(f"  Share voting in this race    {s['rolloff']:>8.1%}")
    print(f"  Projected votes in race      {s['race_votes']:>8,.0f}")
    print(f"  Votes to win (50% + 1)       {s['votes_to_win']:>8,}")
    print(f"  WIN NUMBER (+{s['margin']:.0%} margin)     {s['win_number']:>8,}")
    print(f"  Expected baseline votes      {s['expected_base']:>8,.0f}")
    gap = s["gap"]
    label = "Votes still needed" if gap > 0 else "Cushion over win number"
    print(f"  {label:<28} {abs(gap):>8,.0f}")

    print("\nPRECINCT TARGETING")
    print(f"  {'Precinct':<10}{'Category':<20}{'Rank':>5}{'Turnout':>9}{'Support':>9}{'Score':>8}  Flags")
    for r in rows:
        print(f"  {r['precinct']:<10}{r['category']:<20}{r['rank_in_category']:>5}"
              f"{r['avg_turnout']:>9.1%}{r['avg_support']:>9.1%}{r['priority_score']:>8.0f}  {r['flags']}")
    print("\n  Note: how your race is won is set by state law. See strategy/win-number.md.\n")


def main():
    ap = argparse.ArgumentParser(description="Precinct targeting and win number.")
    ap.add_argument("csv", help="precinct results CSV")
    ap.add_argument("--out", help="write targeting results to this CSV")
    ap.add_argument("--base", type=float, default=0.55, help="support at or above this = base (default 0.55)")
    ap.add_argument("--persuade-low", type=float, default=0.45, help="support at or above this = persuade (default 0.45)")
    ap.add_argument("--turnout", type=float, help="override expected turnout rate, e.g. 0.30")
    ap.add_argument("--margin", type=float, default=0.05, help="safety margin over 50%%+1 (default 0.05)")
    a = ap.parse_args()
    if not 0 < a.persuade_low < a.base < 1:
        sys.exit("Thresholds must satisfy 0 < persuade-low < base < 1")
    rows, summary = analyze(read_precincts(a.csv), a.base, a.persuade_low, a.turnout, a.margin)
    print_report(rows, summary)
    if a.out:
        write_csv(rows, a.out)
        print(f"Wrote {a.out}")


if __name__ == "__main__":
    main()
