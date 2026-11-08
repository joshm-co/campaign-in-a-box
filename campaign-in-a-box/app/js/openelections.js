/* Campaign-in-a-Box app — optional import of precinct results from OpenElections.
 * OpenElections (openelections.net) publishes certified results as CSV files on GitHub.
 * The app lists files from its own bundled index (data/openelections/XX.json) and
 * downloads only the file the candidate picks. Nothing the candidate typed is sent:
 * GitHub sees only the device's internet address and which public file was requested.
 * MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const U = CIB.util;
  const OE = (CIB.oe = {});
  const norm = (s) => String(s || "").toLowerCase().replace(/county|parish|borough/g, "").replace(/[^a-z0-9]/g, "");
  OE.MAX_BYTES = 60 * 1024 * 1024;

  const cache = {};
  // The file list for a state: from the app's own index, or GitHub's file list if the index can't be read.
  OE.index = async (state) => {
    const st = String(state || "").toLowerCase();
    if (cache[st]) return cache[st];
    try {
      const r = await fetch(`data/openelections/${st}.json`, { cache: "no-cache" });
      if (r.ok) return (cache[st] = await r.json());
    } catch (e) { /* opened from a folder: fall back to GitHub's list */ }
    const repo = `openelections/openelections-data-${st}`;
    const meta = await fetch(`https://api.github.com/repos/${repo}`, { referrerPolicy: "no-referrer" });
    if (!meta.ok) throw new Error("Couldn't reach OpenElections for this state.");
    const branch = (await meta.json()).default_branch;
    const tree = await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, { referrerPolicy: "no-referrer" })).json();
    const re = /(\d{8})__([a-z]{2})__(.+?)__(precinct|ward|town)\.csv$/i;
    const files = (tree.tree || []).map((t) => {
      const m = t.path.split("/").pop().match(re);
      if (!m) return null;
      const parts = m[3].toLowerCase().split("__");
      return { path: t.path, date: m[1], kind: parts[0], county: parts.slice(1).join(" ").replace(/_/g, " "), unit: m[4].toLowerCase(), size: t.size };
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    return (cache[st] = { state: st.toUpperCase(), repo, branch, files });
  };

  OE.label = (f) => `${f.date.slice(0, 4)} ${f.kind.replace(/\b\w/g, (c) => c.toUpperCase())}${f.date.slice(4, 6) !== "11" ? ` (${U.fmtDate(`${f.date.slice(0, 4)}-${f.date.slice(4, 6)}-${f.date.slice(6, 8)}`, "en", "short")})` : ""}`;

  // Files for one county: that county's own files, plus statewide files the app can filter to the county.
  OE.filesFor = (idx, county) => {
    const c = norm(county);
    const own = idx.files.filter((f) => f.county && c && norm(f.county) === c);
    const state = idx.files.filter((f) => !f.county);
    const ownKeys = new Set(own.map((f) => f.date + f.kind));
    return own.map((f) => ({ ...f, scope: "county" }))
      .concat(state.filter((f) => !ownKeys.has(f.date + f.kind)).map((f) => ({ ...f, scope: "state" })))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  OE.rawUrl = (idx, f) => `https://raw.githubusercontent.com/${idx.repo}/${idx.branch}/${f.path.split("/").map(encodeURIComponent).join("/")}`;
  OE.sourceUrl = (idx, f) => `https://github.com/${idx.repo}/blob/${idx.branch}/${f.path}`;

  OE.download = async (idx, f, onProgress) => {
    const r = await fetch(OE.rawUrl(idx, f), { referrerPolicy: "no-referrer", credentials: "omit" });
    if (!r.ok) throw new Error(`GitHub said ${r.status} for that file.`);
    const len = Number(r.headers.get("content-length") || 0);
    if (len > OE.MAX_BYTES) throw new Error("That file is too big to open on this device.");
    if (!r.body || !r.body.getReader) return r.text();
    const reader = r.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (got > OE.MAX_BYTES) { reader.cancel(); throw new Error("That file is too big to open on this device."); }
      if (onProgress) onProgress(got, len);
    }
    return new TextDecoder().decode(await new Blob(parts).arrayBuffer());
  };

  // CSV → rows of objects with lower-case headers.
  OE.parseCsv = (text) => {
    const rows = [];
    let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); rows.push(row); row = []; cur = "";
      } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
    return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  };

  const META_OFFICE = /^(registered voters|ballots cast|total ballots cast|ballots cast blank|ballots cast - blank|voters|turnout|times cast|total voters)$/i;
  const NON_CANDIDATE = /^(over ?votes?|under ?votes?|blank( votes)?|total( votes)?|times cast|registered voters|ballots cast)$/i;

  // Boil one file down to: precinct list, registered and ballots by precinct, and each race's votes by precinct.
  OE.summarize = (rows, county) => {
    const c = norm(county);
    const hasCounty = rows.length && "county" in rows[0];
    const pcol = rows.length ? ["precinct", "ward", "town", "precinct_name"].find((k) => k in rows[0]) : "precinct";
    const reg = new Map(), bal = new Map(), races = new Map(), precincts = new Set();
    let inCounty = 0;
    rows.forEach((r) => {
      if (hasCounty && c && norm(r.county) !== c) return;
      inCounty++;
      const p = r[pcol];
      if (!p || /^total$/i.test(p)) return;
      const v = U.num(r.votes) || 0, office = r.office || "";
      precincts.add(p);
      if (/^registered voters$/i.test(office)) { reg.set(p, (reg.get(p) || 0) + v); return; }
      if (/^(ballots cast|total ballots cast)$/i.test(office)) { bal.set(p, Math.max(bal.get(p) || 0, v)); return; }
      if (META_OFFICE.test(office) || !office) return;
      const cand = r.candidate || "";
      if (NON_CANDIDATE.test(cand) || !cand) return;
      const key = office + (r.district ? ` — ${r.district}` : "");
      let race = races.get(key);
      if (!race) races.set(key, (race = { key, office, district: r.district || "", cands: new Map(), byP: new Map() }));
      const ck = cand + (r.party ? ` (${r.party})` : "");
      const cr = race.cands.get(ck) || { name: cand, party: r.party || "", total: 0 };
      cr.total += v; race.cands.set(ck, cr);
      let pm = race.byP.get(p);
      if (!pm) race.byP.set(p, (pm = new Map()));
      pm.set(ck, (pm.get(ck) || 0) + v);
    });
    const raceList = [...races.values()].map((r) => ({ ...r, total: [...r.cands.values()].reduce((s, x) => s + x.total, 0) }))
      .sort((a, b) => a.office.localeCompare(b.office) || a.district.localeCompare(b.district, "en", { numeric: true }));
    return { precincts: [...precincts].sort((a, b) => a.localeCompare(b, "en", { numeric: true })), reg, bal, races: raceList, inCounty, hasCounty, unit: pcol };
  };

  // A sensible first race to show: the top of the ticket, else the race with the most votes.
  const TOP = [/^president/i, /^governor/i, /^u\.?s\.? senate/i, /^attorney general/i, /^u\.?s\.? house|congress/i];
  OE.defaultRace = (sum) => {
    for (const re of TOP) { const r = sum.races.find((x) => re.test(x.office)); if (r) return r; }
    return [...sum.races].sort((a, b) => b.total - a.total)[0];
  };
  // Most votes cast in any race in a precinct: a stand-in for ballots cast when a file doesn't list them.
  const topVotes = (sum, p) => Math.max(0, ...sum.races.map((r) => { const pm = r.byP.get(p); return pm ? Math.round([...pm.values()].reduce((s, x) => s + x, 0) / (r.voteFor || 1)) : 0; }));

  // A matching key for precinct names that change between years, e.g. Cache County's "3SMI1:I" (2025) and "SMI01:I" (2024):
  // drop a leading number code and leading zeros. Only used to line years up; the newest name is what's shown.
  OE.pkey = (p) => String(p || "").toUpperCase().replace(/\s+/g, "").replace(/^\d+(?=[A-Z])/, "").replace(/(^|\D)0+(?=\d)/g, "$1");

  // Precincts across the picked elections, grouped by matching key, newest name first.
  OE.groupPrecincts = (elections) => {
    const g = new Map();
    elections.forEach((e) => e.sum.precincts.forEach((p) => {
      const k = OE.pkey(p);
      const x = g.get(k) || { key: k, names: [], inCount: 0 };
      if (!x.names.includes(p)) x.names.push(p);
      g.set(k, x);
    }));
    g.forEach((x) => { x.inCount = elections.filter((e) => e.sum.precincts.some((p) => OE.pkey(p) === x.key)).length; x.display = x.names[0]; });
    return [...g.values()].sort((a, b) => a.display.localeCompare(b.display, "en", { numeric: true }));
  };

  // Turn picked elections into the app's precinct rows. Each election: { file, sum, raceKey, cand }; chosen = precinct keys.
  // Races where voters pick more than one ("vote for 2") count the race total as total votes ÷ seats, about the number of voters.
  // estimate: when a file doesn't list ballots cast, use the most votes in any race on the ballot, and say so in the notes.
  OE.build = (elections, chosen, estimate = true) => {
    const year = (e) => (e.file.date || "").slice(0, 4) || e.file.label || "file";
    const nameIn = elections.map((e) => { const m = new Map(); e.sum.precincts.concat(...e.sum.races.map((r) => [...r.byP.keys()])).forEach((p) => { const k = OE.pkey(p); if (!m.has(k)) m.set(k, p); }); return m; });
    return chosen.map((k) => {
      const notes = [], names = [];
      const els = elections.map((e, i) => {
        const p = nameIn[i].get(k);
        if (p && !names.includes(p)) names.push(p);
        const race = e.sum.races.find((r) => r.key === e.raceKey);
        const pm = p && race && race.byP.get(p);
        if (!pm) return { registered: "", ballots_cast: "", baseline_votes: "", race_total_votes: "" };
        const total = Math.round([...pm.values()].reduce((s, x) => s + x, 0) / (race.voteFor || 1));
        const reg = e.sum.reg.get(p) || "";
        let bal = e.sum.bal.get(p) || "";
        if (estimate && !bal) { bal = topVotes(e.sum, p) || ""; if (bal) notes.push(`${year(e)} ballots ≈ top race votes`); }
        return { registered: reg, ballots_cast: bal, baseline_votes: pm.get(e.cand) || 0, race_total_votes: total };
      });
      if (names.length > 1) notes.unshift(`Same precinct as ${names.slice(1).join(", ")} in earlier years (matched by name — check)`);
      const withReg = elections.map((e, i) => e.sum.reg.get(nameIn[i].get(k))).find(Boolean);
      return { precinct: names[0] || k, registered_now: withReg || "", notes: notes.length ? notes.join("; ") : "", elections: els };
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
