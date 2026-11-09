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

// Step 3: weekly numbers, message tests, quality checks and the rules checklist.
{
  for (const f of ["js/law.js", "js/run.js"]) vm.runInContext(fs.readFileSync(path.join(kit, "app", f), "utf8"), ctx, { filename: f });
  const RN = CIB.run, LW = CIB.law;
  const ex = CIB.state.example();
  const win = RN.window(ex);
  assert.strictEqual(win.start, "2027-08-10", "tracking starts when door-knocking does (84 days out)");
  assert.strictEqual(win.n, 13);
  const goals = RN.goals(ex);
  assert.strictEqual(goals.doors.value, (15 * 40 + 150) * 10, "doors goal = field model");
  assert.strictEqual(goals.dollars.value, 18000, "money goal = likely budget");
  const s = CIB.strategy.result(ex).summary;
  assert.strictEqual(goals.ids.value, Math.max(s.gap, Math.round(s.winNumber * 0.1)), "supporters goal = votes still needed");
  ex.run.goals.list = "500";
  assert.strictEqual(RN.goals(ex).list.value, 500, "own goal wins");
  const status = RN.status(ex);
  assert.strictEqual(status.last, 5, "six example weeks");
  const by = Object.fromEntries(status.metrics.map((m) => [m.key, m]));
  assert.strictEqual(by.doors.actual, 3540);
  assert.ok(Math.abs(by.doors.target - 7500 * 6 / 13) < 0.01);
  assert.strictEqual(by.doors.verdict.key, "ok");
  assert.strictEqual(by.dollars.verdict.key, "warn", "money is behind: due by the time ballots go out");
  assert.ok(status.projection.total > s.expectedBase && status.projection.total < s.winNumber + 500);
  assert.strictEqual(RN.verdict(69, 100).key, "bad");
  assert.strictEqual(RN.verdict(90, 100).key, "ok");
  // CSV round trip and a shared sheet with its own headings.
  const back = RN.parseCsv(RN.toCsv(ex));
  assert.strictEqual(back.weeks.length, 6);
  assert.strictEqual(back.weeks[4].note, "Rain on Saturday");
  const sheet = RN.parseCsv("Date,Doors knocked,Talked to,Supporters IDed,$ Raised,Email sign-ups\n8/17/2027,700,200,30,\"$2,500\",25\nnot a date,1,1,1,1,1\n");
  assert.strictEqual(sheet.weeks.length, 1);
  assert.strictEqual(JSON.stringify(sheet.weeks[0]), JSON.stringify({ week: "2027-08-17", note: "", doors: 700, conversations: 200, ids: 30, dollars: 2500, list: 25 }));
  assert.strictEqual(sheet.problems.length, 1);
  const merged = RN.merge(ex.run.weeks, sheet.weeks);
  assert.strictEqual(merged.length, 6, "same week replaced");
  assert.strictEqual(merged[1].doors, 700);
  // Message tests.
  assert.ok(Math.abs(RN.moe(400) - 0.049) < 0.001);
  assert.strictEqual(RN.abCompare({ shown: 10000, clicks: 20 }, { shown: 10000, clicks: 10 }).verdict, "wait");
  const ab = RN.abCompare({ shown: 20000, clicks: 160 }, { shown: 20000, clicks: 100 });
  assert.strictEqual(ab.verdict, "winner"); assert.strictEqual(ab.winner, "a");
  assert.strictEqual(RN.abCompare({ shown: 20000, clicks: 105 }, { shown: 20000, clicks: 100 }).verdict, "close");
  assert.strictEqual(RN.pollCompare({ n: 200, yes: 110 }, { n: 200, yes: 100 }).winner, "", "5 points on 200 each is within the margin");
  assert.strictEqual(RN.pollCompare({ n: 200, yes: 130 }, { n: 200, yes: 90 }).winner, "a");
  // Website checks on pages like the ones the app builds.
  const page = (lang, body, extra = "") => `<!doctype html><html lang="${lang}"><head><meta name="viewport" content="width=device-width"><title>T</title><meta name="description" content="d">${extra}</head><body>${body}</body></html>`;
  const files = [{ name: "index.html", data: page("en", '<h1>Hi</h1><a href="about/">About</a><img src="photo.jpg" alt="Chris"><label for="e">Email</label><input id="e" type="email"><link href="css/site.css">') },
    { name: "about/index.html", data: page("en", '<h1>About</h1><a href="../">Home</a><a href="../missing/">x</a><img src="../photo.jpg">') }, { name: "css/site.css", data: "body{}" }];
  const chk = Object.fromEntries(RN.siteChecks(files).map((c) => [c.key, c]));
  assert.ok(chk.lang.ok && chk.title.ok && chk.h1.ok && chk.labels.ok && chk.weight.ok);
  assert.strictEqual(chk.alt.bad.join(), "about/index.html");
  assert.strictEqual(chk.links.bad.join(), "about/index.html → ../missing/");
  assert.strictEqual(RN.lhResult({ performance: 92, accessibility: 94 }).map((x) => x.ok).join(), "true,false,,");
  const em = RN.emailResult({ tester: "9.5", complaints: "0.2", bounces: "6" }).numbers;
  assert.strictEqual(em.map((x) => x.ok).join(), "true,false,false");
  assert.strictEqual(em[1].warn, true); assert.strictEqual(em[2].warn, false);
  // Rules checklist.
  ex.cfg.place.state = "UT";
  const items = LW.items(ex);
  assert.ok(items.find((i) => i.key === "electioneering").answer.text.includes("150 ft"));
  assert.ok(items.every((i) => !i.answer || i.sources.every((src) => /^https:\/\//.test(src.url))), "every Utah answer cites a source");
  assert.ok(items.find((i) => i.key === "translation"), "Spanish question when the campaign has Spanish pieces");
  const lang = ex.cfg.language.secondary; ex.cfg.language.secondary = "";
  assert.ok(!LW.items(ex).find((i) => i.key === "translation"), "and not without them");
  ex.cfg.language.secondary = lang;
  ex.checks.disclaimer = true;
  assert.strictEqual(LW.items(ex).find((i) => i.key === "disclaimer").status, "ok", "confirmed on Before you print = confirmed here");
  ex.cfg.place.state = "OR";
  assert.ok(LW.items(ex).every((i) => !i.answer), "no answers for states we haven't collected");
  assert.ok(/Rules to confirm/.test(LW.document(ex)));
  console.log("Step 3 checks passed (weekly numbers, tests, quality, rules).");
}
