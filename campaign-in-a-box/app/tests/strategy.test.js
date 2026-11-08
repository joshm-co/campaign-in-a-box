// Checks the app's strategy math against tools/targeting.py on the Rivertown example.
// Run from the campaign-in-a-box folder:  node app/tests/strategy.test.js
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert"), { execFileSync } = require("child_process");
const kit = path.resolve(__dirname, "../..");
const ctx = { window: {}, console, TextDecoder, TextEncoder, DecompressionStream, Response, Blob };
ctx.globalThis = ctx.window;
vm.createContext(ctx);
for (const f of ["js/content.js", "js/core.js"]) vm.runInContext(fs.readFileSync(path.join(kit, "app", f), "utf8"), ctx, { filename: f });
const CIB = ctx.window.CIB;

const st = CIB.state.example();
const res = CIB.strategy.result(st);
const tmp = path.join(require("os").tmpdir(), "cib-targeting-test.csv");
const py = execFileSync("python3", [path.join(kit, "tools/targeting.py"), path.join(kit, "examples/rivertown-precincts.csv"),
  "--out", tmp], { encoding: "utf8" });
const pyRows = fs.readFileSync(tmp, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const winLine = py.match(/WIN NUMBER \(\+5% margin\)\s+([\d,]+)/)[1].replace(/,/g, "");
const baseLine = py.match(/Expected baseline votes\s+([\d,]+)/)[1].replace(/,/g, "");

assert.strictEqual(res.summary.winNumber, Number(winLine), "win number matches targeting.py");
assert.strictEqual(Math.round(res.summary.expectedBase), Number(baseLine), "baseline matches targeting.py");
assert.strictEqual(res.summary.winNumber, 2728, "Rivertown win number is 2,728 (Step 1)");
res.rows.forEach((r, i) => {
  assert.strictEqual(r.precinct, pyRows[i][0], `row ${i} precinct order`);
  assert.strictEqual(r.category, pyRows[i][1], `precinct ${r.precinct} category`);
  assert.strictEqual(String(Math.round(r.priority_score)), pyRows[i][8], `precinct ${r.precinct} score`);
});
const g = CIB.strategy.groups(res.rows);
assert.strictEqual(JSON.stringify(g["Persuade"].map((r) => r.precinct)), JSON.stringify(["403", "410", "404", "406"]));
assert.strictEqual(JSON.stringify(g["Turn Out"].map((r) => r.precinct)), JSON.stringify(["412", "401", "409", "405"]));
assert.strictEqual(JSON.stringify(g["Base - Light Touch"].map((r) => r.precinct)), JSON.stringify(["402"]));

// Calendar order-by dates shown in the mockup.
const prod = Object.fromEntries(CIB.strategy.production(st.cfg).map((p) => [p.id, p.startBy]));
assert.strictEqual(prod["door-hanger"], "2027-07-23");
assert.strictEqual(prod["mailer-1-intro"], "2027-08-22");
assert.strictEqual(prod["yard-sign"], "2027-08-29");

// Contrast checks: kit palettes pass the kit's own minimums; Fix it repairs a failing custom pair.
const K = CIB.color;
for (const name of ["river", "forest", "plum"]) {
  const P = K.palette({ brand: { palette: name } });
  K.kitChecks(P).forEach((c) => assert.ok(c.ok, `${name}: ${c.fg} on ${c.bg} ${c.ratio.toFixed(2)} >= ${c.min}`));
}
const bad = K.customChecks("#5B8FD9", "#F2B705");
assert.ok(bad.some((c) => !c.ok), "mockup's light blue fails a check");
const fixed = K.fix("#5B8FD9", "#F2B705");
assert.ok(K.customChecks(fixed.main, fixed.accent).every((c) => c.ok), "Fix it passes all checks: " + JSON.stringify(fixed));
assert.ok(Math.abs(K.hsl(fixed.main).h - K.hsl("#5B8FD9").h) < 3, "Fix it keeps the hue");
assert.ok(K.partySignal("#C8102E", "#FFFFFF"), "bright red reads as a party color");
assert.ok(!K.partySignal("#0B4F5C", "#F2B705"), "River does not");
for (const [m, a] of [["#FFD400", "#FFFFFF"], ["#777777", "#888888"], ["#00FF00", "#FF00FF"], ["#101010", "#121212"]]) {
  const f = K.fix(m, a);
  assert.ok(K.customChecks(f.main, f.accent).every((c) => c.ok), `fix ${m}/${a} → ${JSON.stringify(f)}`);
}
// Custom palettes derived for the kit pass the body-text and button rules.
const D = K.palette({ brand: { palette: "custom", custom: fixed } });
K.kitChecks(D).filter((c) => ["ink", "accent"].includes(c.fg) || c.bg === "accent").forEach((c) => assert.ok(c.ok, `custom ${c.fg}/${c.bg} ${c.ratio.toFixed(2)}`));

assert.strictEqual(CIB.message.coreCheck(st.cfg.message_box.core_message).n, 22, "example core sentence is 22 words");
console.log("All strategy checks passed. Win number", res.summary.winNumber, "baseline", Math.round(res.summary.expectedBase));

// OpenElections import: parse a small file in the OpenElections layout and build precinct rows.
vm.runInContext(fs.readFileSync(path.join(kit, "app/js/openelections.js"), "utf8"), ctx, { filename: "openelections.js" });
const OE = CIB.oe;
const csv1 = `county,precinct,office,district,party,candidate,votes
Cache,SMI01,Registered Voters,,,,1000
Cache,SMI01,Ballots Cast,,,,600
Cache,SMI01,U.S. Senate,,REP,Ann A,300
Cache,SMI01,U.S. Senate,,DEM,Bo B,250
Cache,SMI01,U.S. Senate,,,Over Votes,3
Cache,SMI02,Registered Voters,,,,500
Cache,SMI02,Ballots Cast,,,,200
Cache,SMI02,U.S. Senate,,REP,Ann A,90
Cache,SMI02,U.S. Senate,,DEM,Bo B,100
Davis,X1,U.S. Senate,,REP,Ann A,999
`;
const csv2 = `county,precinct,office,district,party,candidate,votes
Cache,SMI01,President,,REP,Cy C,400
Cache,SMI01,President,,DEM,Di D,"300"
Cache,SMI01,President,,,Total Votes,700
`;
const sum1 = OE.summarize(OE.parseCsv(csv1), "Cache County"), sum2 = OE.summarize(OE.parseCsv(csv2), "cache");
assert.strictEqual(JSON.stringify(sum1.precincts), JSON.stringify(["SMI01", "SMI02"]), "filters to the county");
assert.strictEqual(sum1.races.length, 1);
assert.strictEqual(sum1.races[0].total, 740, "over votes and other counties excluded");
assert.strictEqual(OE.defaultRace(sum2).office, "President");
const rows = OE.build([
  { file: { date: "20241105" }, sum: sum2, raceKey: "President", cand: "Cy C (REP)" },
  { file: { date: "20221108" }, sum: sum1, raceKey: "U.S. Senate", cand: "Ann A (REP)" }], ["SMI01", "SMI02"].map(OE.pkey), true);
assert.strictEqual(rows[0].registered_now, 1000);
assert.strictEqual(JSON.stringify(rows[0].elections[1]), JSON.stringify({ registered: 1000, ballots_cast: 600, baseline_votes: 300, race_total_votes: 550 }));
assert.strictEqual(rows[0].elections[0].registered, "", "no registered estimate across years");
const v = CIB.strategy.validate(rows);
assert.strictEqual(v.good.length, 2, "precincts kept with one usable election");
assert.ok(v.problems.every((p) => p.kept), "incomplete election skipped, not the precinct");
const an = CIB.strategy.analyze(v.good, {});
assert.ok(an && an.summary.winNumber > 0, "analysis works with skipped elections");
console.log("OpenElections import checks passed.");

// Utah built-in results and the drop-in spreadsheet reader.
for (const f of ["js/utahresults.js", "js/xlsx.js"]) vm.runInContext(fs.readFileSync(path.join(kit, "app", f), "utf8"), ctx, { filename: f });
(async () => {
  const UTR = CIB.utah;
  assert.strictEqual(UTR.slug("Box Elder"), "box-elder-county-ut");
  assert.strictEqual(UTR.slug("Salt Lake County"), "salt-lake-county-ut");
  const doc = JSON.parse(fs.readFileSync(path.join(kit, "app/data/utah/general11042025/cache-county-ut.json"), "utf8"));
  const sum = UTR.toSum(doc);
  const council = sum.races.find((r) => r.key === "Smithfield City Council");
  assert.strictEqual(council.voteFor, 2);
  assert.strictEqual(sum.reg.get("3SMI1:I"), 1086);
  assert.ok(!sum.precincts.includes("3LG18:IB"), "empty split precincts dropped");
  const smi = sum.precincts.filter((p) => /SMI/.test(p)).map(OE.pkey);
  const rowsU = OE.build([{ file: { date: "20251104" }, sum, raceKey: "Smithfield City Council", cand: "CHRIS OLSEN" }], smi, true);
  assert.strictEqual(rowsU.length, 8);
  const r1 = rowsU.find((r) => r.precinct === "3SMI1:I").elections[0];
  assert.strictEqual(JSON.stringify(r1), JSON.stringify({ registered: 1086, ballots_cast: 506, baseline_votes: 286, race_total_votes: 468 }), "vote-for-2 race total halved");
  const resU = CIB.strategy.analyze(CIB.strategy.validate(rowsU).good, {});
  assert.ok(resU.summary.winNumber > 1000 && resU.summary.winNumber < 3000, "Smithfield win number " + resU.summary.winNumber);
  // Matching renamed precincts across years.
  assert.strictEqual(OE.pkey("3SMI1:I"), OE.pkey("SMI01:I"));
  const older = { precincts: ["SMI01:I"], reg: new Map([["SMI01:I", 1000]]), bal: new Map([["SMI01:I", 700]]),
    races: [{ key: "U.S. Senate", office: "U.S. Senate", district: "", voteFor: 1, cands: new Map([["A", { total: 400 }]]), byP: new Map([["SMI01:I", new Map([["A", 400], ["B", 250]])]]), total: 650 }] };
  const both = OE.build([{ file: { date: "20251104" }, sum, raceKey: "Smithfield City Council", cand: "CHRIS OLSEN" }, { file: { date: "20221108" }, sum: older, raceKey: "U.S. Senate", cand: "A" }], [OE.pkey("3SMI1:I")], true);
  assert.strictEqual(both[0].elections[1].baseline_votes, 400, "older year matched by name");
  assert.ok(/Same precinct as SMI01:I/.test(both[0].notes));
  // Utah's "All Results Excel" layout.
  const buf = fs.readFileSync(path.join(kit, "app/tests/fixtures/utah-all-results-sample.xlsx"));
  const sheets = await CIB.xlsx.readXlsx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  assert.strictEqual(sheets.map((s) => s.name).join("|"), "Summary Results|Precinct Results|Precinct Results by Group");
  const rowsX = CIB.xlsx.toResultRows(sheets[1].rows);
  const sx = OE.summarize(rowsX, "");
  assert.strictEqual(sx.bal.get("3SMI2:I"), 571, "ballots cast read");
  assert.strictEqual(sx.races[0].total, 286 + 140 + 269 + 240 + 284 + 156 + 309 + 299, "under votes excluded");
  console.log("Utah results and spreadsheet checks passed.");
})().catch((e) => { console.error(e); process.exit(1); });
