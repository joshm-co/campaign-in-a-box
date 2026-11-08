/* Campaign-in-a-Box app — Utah's official precinct results, built into the app.
 * tools/collect_utah_results.py (run by a scheduled GitHub Action) saves each county's
 * results from electionresults.utah.gov into data/utah/. The app reads them from its own
 * address, so nothing is requested from anyone else. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const UTR = (CIB.utah = {});
  let idxCache = null;

  UTR.slug = (county) => String(county || "").toLowerCase().replace(/\s+county$/, "").trim().replace(/[^a-z0-9]+/g, "-") + "-county-ut";

  UTR.index = async () => {
    if (idxCache) return idxCache;
    const r = await fetch("data/utah/index.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("The built-in Utah results couldn't be read. If you opened the app from a folder, use the published link instead.");
    return (idxCache = await r.json());
  };

  // Elections that have results for this county, newest first, in the same shape as the OpenElections file list.
  UTR.filesFor = (idx, county) => {
    const slug = UTR.slug(county);
    return (idx.elections || []).filter((e) => e.counties && e.counties[slug]).map((e) => ({
      path: `data/utah/${e.id}/${slug}.json`, id: e.id, date: String(e.date || "").replace(/-/g, ""), kind: e.name, label: e.name,
      scope: "county", races: e.counties[slug].races || [], hasRegistered: e.counties[slug].hasRegistered,
      source: `https://electionresults.utah.gov/results/public/${slug}/elections/${e.id}`
    })).sort((a, b) => b.date.localeCompare(a.date));
  };

  // One county file → the importer's summary shape (same as CIB.oe.summarize).
  UTR.toSum = (doc) => {
    const reg = new Map(), bal = new Map(), seen = new Set();
    Object.entries(doc.precincts || {}).forEach(([p, [b, r]]) => {
      if (b) bal.set(p, b);
      if (r) reg.set(p, r);
    });
    const races = (doc.races || []).map((r) => {
      const cands = new Map(), byP = new Map();
      r.cands.forEach(([name, party, total]) => cands.set(name, { name, party: party && party !== "NONPARTISAN" ? party : "", total }));
      const names = r.cands.map((c) => c[0]);
      Object.entries(r.votes || {}).forEach(([p, line]) => {
        seen.add(p);
        byP.set(p, new Map(names.map((n, i) => [n, line[i] || 0])));
      });
      return { key: r.name.replace(/\s+/g, " ").trim(), office: r.name.replace(/\s+/g, " ").trim(), district: "", voteFor: r.voteFor || 1, cands, byP,
        total: r.cands.reduce((s, c) => s + (c[2] || 0), 0) };
    });
    // Precincts with ballots cast or votes in some race, skipping empty split precincts.
    const precincts = [...new Set([...bal.keys(), ...seen])].filter((p) => (bal.get(p) || 0) > 0 || races.some((r) => { const m = r.byP.get(p); return m && [...m.values()].some((v) => v > 0); }))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    return { precincts, reg, bal, races, inCounty: precincts.length, hasCounty: true, unit: "precinct", asOf: doc.asOf, source: doc.source };
  };

  UTR.load = async (f) => {
    const r = await fetch(f.path, { cache: "no-cache" });
    if (!r.ok) throw new Error("That county's results aren't in the app yet.");
    return UTR.toSum(await r.json());
  };
})(typeof window !== "undefined" ? window : globalThis);
