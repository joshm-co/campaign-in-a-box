/* Campaign-in-a-Box app — core: helpers, color checks, strategy math, saved state.
 * Runs entirely in the browser. Nothing here talks to a server.
 * Strategy math is a direct port of tools/targeting.py and the Step 1 workbook;
 * tests/strategy.test.js checks it against the Rivertown example.
 * MIT License. */
(function (root) {
  "use strict";
  const CIB = (root.CIB = root.CIB || {});
  const C = root.CIB_CONTENT || {};

  /* ------------------------------------------------------------------ helpers */
  const U = (CIB.util = {});
  U.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.int = (n) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("en-US"));
  U.pct = (n, d = 0) => (n == null || isNaN(n) ? "—" : (n * 100).toFixed(d) + "%");
  U.money = (n) => (n == null || isNaN(n) ? "—" : "$" + Math.round(n).toLocaleString("en-US"));
  U.num = (v) => {
    if (v == null) return null;
    const s = String(v).replace(/[,$\s%]/g, "");
    if (s === "") return null;
    const n = Number(s);
    return isNaN(n) ? null : n;
  };
  U.words = (s) => String(s || "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  U.slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
  U.get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  U.domain = (url) => String(url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // Dates are kept as "YYYY-MM-DD" strings and handled at noon UTC so time zones never shift the day.
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MONTHS_ES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DAYS_ES_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  U.d = (iso) => (iso ? new Date(iso + "T12:00:00Z") : null);
  U.iso = (d) => (d ? d.toISOString().slice(0, 10) : "");
  U.addDays = (iso, n) => {
    const d = U.d(iso);
    if (!d || isNaN(d)) return "";
    d.setUTCDate(d.getUTCDate() + n);
    return U.iso(d);
  };
  U.daysBetween = (a, b) => Math.round((U.d(b) - U.d(a)) / 864e5);
  U.today = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  };
  // style: "short" = "Sep 26", "med" = "Sun, Sep 26", "long" = "Sunday, September 26"
  U.fmtDate = (iso, lang = "en", style = "med") => {
    const d = U.d(iso);
    if (!d || isNaN(d)) return "—";
    const m = d.getUTCMonth(), day = d.getUTCDate(), wd = d.getUTCDay();
    if (lang === "es") {
      if (style === "long") return `${DAYS_ES_LONG[wd]} ${day} de ${MONTHS_ES_LONG[m]}`;
      return style === "short" ? `${day} ${MONTHS_ES[m]}` : `${DAYS_ES[wd]} ${day} de ${MONTHS_ES[m]}`;
    }
    if (style === "long") return `${DAYS[wd]}, ${MONTHS[m]} ${day}`;
    if (style === "short") return `${MONTHS[m].slice(0, 3)} ${day}`;
    return `${DAYS[wd].slice(0, 3)}, ${MONTHS[m].slice(0, 3)} ${day}`;
  };

  /* ------------------------------------------------------------------- colors */
  const K = (CIB.color = {});
  K.norm = (h) => {
    h = String(h || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
    return /^[0-9a-f]{6}$/i.test(h) ? "#" + h.toUpperCase() : null;
  };
  K.rgb = (h) => { h = K.norm(h).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  K.hex = (c) => "#" + c.map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  K.lum = (h) => K.rgb(h).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  K.ratio = (a, b) => { const x = K.lum(a), y = K.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  K.mix = (a, b, t) => { const x = K.rgb(a), y = K.rgb(b); return K.hex(x.map((v, i) => v + (y[i] - v) * t)); };
  K.hsl = (h) => {
    const [r, g, b] = K.rgb(h).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (hh * 60 + 360) % 360, s, l };
  };
  K.fromHsl = ({ h, s, l }) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return K.hex([r, g, b].map((v) => (v + m) * 255));
  };
  K.withL = (hex, l) => { const c = K.hsl(hex); return K.fromHsl({ ...c, l: U.clamp(l, 0, 1) }); };
  K.WHITE = "#FFFFFF";
  K.best = (bg, dark = "#111111") => (K.ratio(K.WHITE, bg) >= K.ratio(dark, bg) ? K.WHITE : dark);

  K.brand = () => (C.brand || { palettes: {}, type_pairings: {}, contrast_pairs: [] });

  // Build a full kit palette (primary, secondary, accent, ink, paper, tint) from a main and an accent color.
  K.derive = (main, accent) => {
    main = K.norm(main) || "#0B4F5C";
    accent = K.norm(accent) || "#F2B705";
    const hm = K.hsl(main);
    const ink = K.fromHsl({ h: hm.h, s: Math.min(hm.s, 0.35), l: 0.11 });
    // "accent" in the kit = buttons and small labels on white: needs 4.5:1 both ways with white.
    let btn = accent;
    for (let l = K.hsl(accent).l; K.ratio(K.WHITE, btn) < 4.6 && l > 0.05; l -= 0.02) btn = K.withL(accent, l);
    if (K.ratio(K.WHITE, btn) < 4.5) btn = main;
    return { name: "Your colors", primary: main, secondary: accent, accent: btn, ink, paper: K.WHITE, tint: K.mix(main, K.WHITE, 0.9), custom: true };
  };

  K.palette = (cfg) => {
    const b = cfg.brand || {};
    let P;
    if (b.palette === "custom" && b.custom) P = K.derive(b.custom.main, b.custom.accent);
    else P = { ...(K.brand().palettes[b.palette] || K.brand().palettes.river) };
    // Text colors that sit on the main color and on the stripe.
    P.onPrimary = K.ratio(P.paper, P.primary) >= K.ratio(P.ink, P.primary) ? P.paper : P.ink;
    P.onSecondary = K.ratio(P.ink, P.secondary) >= K.ratio(P.paper, P.secondary) ? P.ink : P.paper;
    P.hiOnPrimary = K.ratio(P.secondary, P.primary) >= 3 ? P.secondary : P.onPrimary;
    return P;
  };

  // The kit's contrast rules (brand.json → contrast_pairs), checked against a palette.
  K.kitChecks = (P) => (K.brand().contrast_pairs || []).map((c) => {
    const fg = c.fg === "paper" && P.custom && c.bg === "primary" ? P.onPrimary : P[c.fg];
    const r = K.ratio(fg, P[c.bg]);
    return { ...c, ratio: r, ok: r >= c.min };
  });

  // The three plain-language checks shown when someone picks their own colors (mockup 6b).
  K.customChecks = (main, accent) => {
    const nameInk = K.best(main), bandInk = K.best(accent);
    const r1 = K.ratio(nameInk, main), r2 = K.ratio(bandInk, accent), r3 = K.ratio(accent, main);
    return [
      { id: "name", ok: r1 >= 7, ratio: r1, title: r1 >= 7 ? "Readable from a car" : "Hard to read from a car",
        detail: r1 >= 7 ? "Your name stands out clearly against the main color." : "Your name blends into the main color. A darker or lighter main color fixes it." },
      { id: "stripe", ok: r2 >= 4.5, ratio: r2, title: r2 >= 4.5 ? "Stripe text is clear" : "Stripe text is hard to read",
        detail: r2 >= 4.5 ? `We picked ${bandInk === K.WHITE ? "white" : "black"} text for your accent color.` : "Neither black nor white text reads well on this accent." },
      { id: "pop", ok: r3 >= 2, ratio: r3, title: r3 >= 2 ? "Accent stands out" : "Colors are too similar",
        detail: r3 >= 2 ? "The stripe pops against the main color." : "The stripe disappears into the background." }
    ];
  };

  // "Fix it for me": keep both hues, only move lightness, until all three checks pass.
  K.fix = (main, accent) => {
    let m = K.norm(main), a = K.norm(accent);
    const pass = (mm, aa) => K.customChecks(mm, aa).every((c) => c.ok);
    if (pass(m, a)) return { main: m, accent: a };
    const hm = K.hsl(m), ha = K.hsl(a);
    let best = null;
    // Search main lightness first (darker is usually right for signs), then accent lightness.
    const mLs = []; for (let l = hm.l; l >= 0.04; l -= 0.01) mLs.push(l); for (let l = hm.l; l <= 0.96; l += 0.01) mLs.push(l);
    const aLs = []; for (let d = 0; d <= 0.9; d += 0.01) { aLs.push(ha.l + d); aLs.push(ha.l - d); }
    for (const ml of mLs) {
      const mm = K.fromHsl({ ...hm, l: U.clamp(ml, 0, 1) });
      if (K.ratio(K.best(mm), mm) < 7) continue;
      for (const al of aLs) {
        if (al < 0 || al > 1) continue;
        const aa = K.fromHsl({ ...ha, l: al });
        if (pass(mm, aa)) {
          const cost = Math.abs(ml - hm.l) + Math.abs(al - ha.l);
          if (!best || cost < best.cost) best = { main: mm, accent: aa, cost };
          break;
        }
      }
      if (best && Math.abs(ml - hm.l) > best.cost) break;
    }
    return best ? { main: best.main, accent: best.accent } : { main: "#1F2A37", accent: "#F2B705" };
  };

  // Gentle note when colors read as party red or blue.
  K.partySignal = (main, accent) => {
    const isRed = (x) => x.s > 0.45 && (x.h < 12 || x.h > 345) && x.l > 0.2 && x.l < 0.75;
    const isBlue = (x) => x.s > 0.45 && x.h > 205 && x.h < 245 && x.l > 0.15 && x.l < 0.75;
    const hm = K.hsl(main), ha = K.hsl(accent);
    return isRed(hm) || isBlue(hm) || ((isRed(hm) || isRed(ha)) && (isBlue(hm) || isBlue(ha)));
  };

  /* ----------------------------------------------------------------- strategy */
  const S = (CIB.strategy = {});
  const FIELDS = ["registered", "ballots_cast", "baseline_votes", "race_total_votes"];
  S.SMALL_PRECINCT_VOTERS = 200;
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // Validate precinct rows: [{precinct, registered_now, notes, elections:[{label, registered, ballots_cast, baseline_votes, race_total_votes}]}]
  // Elections with missing or impossible numbers are skipped for that precinct (kept as null so years stay lined up);
  // a precinct is left out only when none of its past elections can be used.
  S.validate = (rows) => {
    const problems = [], good = [];
    (rows || []).forEach((r, i) => {
      const name = String(r.precinct || "").trim();
      if (!name) return;
      const raw = r.elections || [];
      const bad = [];
      const els = raw.map((e, j) => {
        e = e || {};
        if (!FIELDS.some((k) => U.num(e[k]) != null)) return null;
        const miss = FIELDS.filter((k) => U.num(e[k]) == null);
        let why = "";
        if (miss.length) why = `is missing ${miss.length} number${miss.length > 1 ? "s" : ""}`;
        else if (U.num(e.registered) <= 0 || U.num(e.ballots_cast) <= 0 || U.num(e.race_total_votes) <= 0) why = "has a zero";
        else if (U.num(e.baseline_votes) > U.num(e.race_total_votes)) why = "has more votes for the candidate than in the race";
        else if (U.num(e.ballots_cast) > U.num(e.registered)) why = "has more ballots than registered voters";
        if (why) { bad.push(`past election ${j + 1} ${why}`); return null; }
        return Object.fromEntries(FIELDS.map((k) => [k, U.num(e[k])]));
      });
      const usable = els.filter(Boolean).length;
      if (!U.num(r.registered_now)) bad.push("registered voters now is missing");
      if (!usable && !bad.length) bad.push("no past results yet");
      const kept = usable && U.num(r.registered_now);
      if (bad.length) problems.push({ row: i, precinct: name, kept: !!kept, text: `Precinct ${name}: ${bad.join("; ")}${kept ? " — skipped that election, kept the rest" : ""}.` });
      if (kept) good.push({ precinct: name, registered_now: U.num(r.registered_now), notes: String(r.notes || "").trim(), elections: els });
    });
    return { good, problems };
  };

  S.analyze = (precincts, { base = 0.55, persuadeLow = 0.45, turnoutOverride = null, margin = 0.05 } = {}) => {
    const nEl = Math.max(...precincts.map((p) => p.elections.length));
    const dT = [], dR = [];
    for (let i = 0; i < nEl; i++) {
      const has = precincts.filter((p) => p.elections[i]);
      if (!has.length) continue;
      const reg = has.reduce((s, p) => s + p.elections[i].registered, 0);
      const bal = has.reduce((s, p) => s + p.elections[i].ballots_cast, 0);
      const race = has.reduce((s, p) => s + p.elections[i].race_total_votes, 0);
      dT.push(bal / reg); dR.push(race / bal);
    }
    if (!dT.length) return null;
    const districtTurnout = mean(dT), rolloff = mean(dR);
    const rows = precincts.map((p) => {
      const e = p.elections.filter(Boolean);
      const turnout = mean(e.map((x) => x.ballots_cast / x.registered));
      const support = mean(e.map((x) => x.baseline_votes / x.race_total_votes));
      const pRoll = mean(e.map((x) => x.race_total_votes / x.ballots_cast));
      const projVoters = p.registered_now * turnout * pRoll;
      const projBase = projVoters * support;
      let category, score;
      if (support >= base) {
        if (turnout < districtTurnout) { category = "Turn Out"; score = p.registered_now * support * (1 - turnout); }
        else { category = "Base - Light Touch"; score = projBase; }
      } else if (support >= persuadeLow) {
        category = "Persuade";
        const width = Math.max(base - 0.5, 0.5 - persuadeLow) * 2;
        score = projVoters * (1 - Math.abs(support - 0.5) / width);
      } else { category = "Skip"; score = 0; }
      const flags = [];
      if (projVoters < S.SMALL_PRECINCT_VOTERS) flags.push("small sample");
      if (p.notes) flags.push(p.notes);
      return { precinct: p.precinct, registered_now: Math.trunc(p.registered_now), avg_turnout: turnout, avg_support: support,
        projected_race_voters: projVoters, projected_baseline_votes: projBase, category, priority_score: score, flags };
    });
    const order = { "Persuade": 0, "Turn Out": 1, "Base - Light Touch": 2, "Skip": 3 };
    rows.sort((a, b) => order[a.category] - order[b.category] || b.priority_score - a.priority_score);
    const rank = {};
    rows.forEach((r) => { rank[r.category] = (rank[r.category] || 0) + 1; r.rank_in_category = rank[r.category]; });
    const registered = precincts.reduce((s, p) => s + p.registered_now, 0);
    const turnoutUsed = turnoutOverride || districtTurnout;
    const projectedTurnout = registered * turnoutUsed;
    const raceVotes = projectedTurnout * rolloff;
    const votesToWin = Math.floor(raceVotes * 0.5) + 1;
    const winNumber = votesToWin + Math.ceil(raceVotes * margin);
    const expectedBase = rows.reduce((s, r) => s + r.projected_baseline_votes, 0);
    return { rows, summary: { mode: "precincts", registered: Math.trunc(registered), historicTurnouts: dT, districtTurnout, turnoutUsed, rolloff,
      projectedTurnout, raceVotes, votesToWin, margin, winNumber, expectedBase, gap: winNumber - expectedBase } };
  };

  // No precinct numbers yet: district-level estimate only.
  S.quick = ({ registered, turnout, rolloff = 0.9, baselineShare = null, margin = 0.05 }) => {
    if (!registered || !turnout) return null;
    const projectedTurnout = registered * turnout;
    const raceVotes = projectedTurnout * rolloff;
    const votesToWin = Math.floor(raceVotes * 0.5) + 1;
    const winNumber = votesToWin + Math.ceil(raceVotes * margin);
    const expectedBase = baselineShare ? raceVotes * baselineShare : null;
    return { rows: [], summary: { mode: "quick", registered, historicTurnouts: [turnout], districtTurnout: turnout, turnoutUsed: turnout, rolloff,
      projectedTurnout, raceVotes, votesToWin, margin, winNumber, expectedBase, gap: expectedBase == null ? null : winNumber - expectedBase } };
  };

  S.RACE_TYPES = {
    two: { label: "Two candidates — most votes wins", short: "Most votes wins", note: "" },
    many: { label: "Three or more candidates — most votes wins", short: "Most votes wins (3+ candidates)",
      note: "With three or more candidates you may win with less than half. Plan for 45–50% anyway — it's the safer target." },
    runoff: { label: "Need a majority, or there's a runoff", short: "Majority or runoff",
      note: "This number avoids a runoff. Keep money in reserve in case there is one." },
    rcv: { label: "Ranked-choice voting", short: "Ranked choice",
      note: "You need half plus one after the rankings are counted. Ask supporters of likely-eliminated candidates to rank you second." },
    multi: { label: "Several seats (\"vote for 2 or 3\")", short: "Several seats",
      note: "Voters pick more than one, so half-plus-one doesn't apply. Your target is the votes the last winner got last time, plus a cushion." },
    primary: { label: "A party primary", short: "Primary",
      note: "Use past primary results only. Turnout is usually much lower, and only voters allowed in that primary count (rules vary by state)." }
  };

  S.result = (st) => {
    const sg = st.strategy;
    const opts = { base: sg.thresholds.base, persuadeLow: sg.thresholds.persuadeLow, margin: sg.margin, turnoutOverride: sg.turnoutOverride || null };
    let out = null, problems = [];
    if (sg.dataMode === "precincts") {
      const v = S.validate(sg.precincts);
      problems = v.problems;
      if (v.good.length) out = S.analyze(v.good, opts);
      if (out && v.good.some((p) => p.elections.some((e) => !e))) out.partial = true;
    }
    if (!out && sg.quick && U.num(sg.quick.registered) && U.num(sg.quick.turnout)) {
      out = S.quick({ registered: U.num(sg.quick.registered), turnout: U.num(sg.quick.turnout) / 100,
        rolloff: (U.num(sg.quick.rolloff) || 90) / 100, baselineShare: U.num(sg.quick.baseline) ? U.num(sg.quick.baseline) / 100 : null, margin: sg.margin });
    }
    if (out && sg.raceType === "multi" && U.num(sg.lastWinnerVotes)) {
      const s = out.summary;
      s.votesToWin = Math.round(U.num(sg.lastWinnerVotes) * (s.raceVotes / (U.num(sg.lastRaceVotes) || s.raceVotes)));
      s.winNumber = s.votesToWin + Math.ceil(s.votesToWin * sg.margin);
      s.gap = s.expectedBase == null ? null : s.winNumber - s.expectedBase;
      s.multiSeat = true;
    }
    if (out) out.problems = problems;
    return out || { rows: [], summary: null, problems };
  };

  S.groups = (rows) => {
    const g = { "Persuade": [], "Turn Out": [], "Base - Light Touch": [], "Skip": [] };
    rows.forEach((r) => g[r.category].push(r));
    return g;
  };

  // Calendar (workbook Calendar tab). Offsets are days from Election Day; ⚖️ = set by law.
  S.MILESTONES = [
    { key: "filing_deadline", label: "Candidate filing deadline", law: true, note: "Missing it ends the campaign." },
    { key: "persuasion_starts", label: "Persuasion begins — start knocking doors", note: "About 12 weeks out." },
    { key: "ballots_out", label: "Mail ballots go out", law: true, note: "Set by your state." },
    { key: "register_deadline", label: "Last day to register to vote", law: true, note: "Some states allow same-day registration." },
    { key: "early_vote_starts", label: "Early in-person voting starts", law: true, note: "Some states have none." },
    { key: "finance_report", label: "Last finance report before the election", law: true, note: "Check your state's reporting calendar." },
    { key: "gotv_starts", label: "Final get-out-the-vote push", note: "Only supporters who haven't voted." },
    { key: "election_day", label: "Election Day" },
    { key: "sign_removal", label: "Take down yard signs by", law: true, note: "Set by city or county code." },
    { key: "final_report", label: "Final finance report", law: true }
  ];
  S.dates = (cfg) => {
    const ed = cfg.election.election_day;
    const out = { election_day: ed };
    Object.entries(cfg.election.offsets || {}).forEach(([k, v]) => { if (!k.startsWith("_") && v != null && v !== "") out[k] = U.addDays(ed, Number(v)); });
    return out;
  };
  S.calendar = (cfg) => {
    const D = S.dates(cfg);
    return S.MILESTONES.filter((m) => D[m.key]).map((m) => ({ ...m, date: D[m.key] })).sort((a, b) => a.date.localeCompare(b.date));
  };
  // Production: when each item must be in hand, and when to start (lead times from calendar-guide.md).
  S.PRODUCTION = [
    { id: "door-hanger", label: "Door hangers & palm cards", anchor: "persuasion_starts", off: 0, lead: 18, note: "Needed when door-knocking starts." },
    { id: "mailer-1-intro", label: "Intro mailer", anchor: "ballots_out", off: -7, lead: 35, note: "Lands about a week before ballots." },
    { id: "yard-sign", label: "Yard signs", anchor: "ballots_out", off: -14, lead: 21, note: "⚖️ Check when signs may legally go up." },
    { id: "ads", label: "Digital ads live", anchor: "ballots_out", off: -7, lead: 21, note: "Political-ad verification can take weeks. Start early." },
    { id: "mailer-2-contrast", label: "Contrast mailer", anchor: "ballots_out", off: 3, lead: 35, note: "Lands as ballots arrive." },
    { id: "mailer-3-gotv", label: "GOTV mailer to supporters", anchor: "election_day", off: -9, lead: 25, note: "First-Class is faster." },
    { id: "gotv-door-hanger", label: "GOTV door hangers", anchor: "election_day", off: -5, lead: 18 }
  ];
  S.production = (cfg) => {
    const D = S.dates(cfg);
    return S.PRODUCTION.filter((p) => D[p.anchor]).map((p) => {
      const ready = U.addDays(D[p.anchor], p.off);
      return { ...p, ready, startBy: U.addDays(ready, -p.lead) };
    }).sort((a, b) => a.startBy.localeCompare(b.startBy));
  };

  // Budget (workbook Budget tab).
  S.BUDGET = [
    { key: "Field", split: [0.2, 0.15, 0.15], covers: "Walk lists, canvass materials, volunteer food, voter file ⚖️" },
    { key: "Mail", split: [0.3, 0.4, 0.4], covers: "Design, print and postage" },
    { key: "Digital", split: [0.15, 0.15, 0.2], covers: "Ads, email tool, website hosting" },
    { key: "Signs", split: [0.15, 0.1, 0.07], covers: "Yard signs, stakes, a few large signs" },
    { key: "Print", split: [0.1, 0.1, 0.08], covers: "Palm cards, door hangers, fliers" },
    { key: "Reserve & compliance", split: [0.1, 0.1, 0.1], covers: "Emergencies, filing fees, treasurer help, a possible runoff ⚖️" }
  ];
  S.budget = (st, result) => {
    const b = st.strategy.budget;
    const likely = U.num(b.likely) || 0;
    const tier = likely < 10000 ? 0 : likely < 50000 ? 1 : 2;
    const lines = S.BUDGET.map((c) => {
      const share = b.splits && b.splits[c.key] != null ? b.splits[c.key] : c.split[tier];
      return { ...c, share, amount: share * likely };
    });
    const by = Object.fromEntries(lines.map((l) => [l.key, l.amount]));
    const u = b.unit;
    const mailPieces = by.Mail / u.mail, households = mailPieces / u.perHousehold;
    const field = S.field(st, result);
    return { tier, likely, lines, total: lines.reduce((s, l) => s + l.share, 0),
      buys: { mailPieces, households, signs: by.Signs / u.sign, printed: by.Print / u.print },
      coverage: field.targetHouseholds ? households / field.targetHouseholds : null };
  };
  S.field = (st, result) => {
    const f = st.strategy.field;
    const doors = (f.volunteers * f.shiftsPerWeek * f.doorsPerShift + f.candidateDoors) * f.weeks;
    const conversations = doors * f.contactRate;
    const votesAdded = conversations / f.convPerVote;
    const s = result && result.summary;
    const needed = s && s.gap != null ? Math.max(s.gap, 0) : null;
    const rows = (result && result.rows) || [];
    const targetReg = rows.filter((r) => r.category === "Persuade" || r.category === "Turn Out").reduce((a, r) => a + r.registered_now, 0);
    const targetHouseholds = targetReg / f.votersPerHousehold;
    return { doors, conversations, votesAdded, needed, coverage: needed ? votesAdded / needed : null,
      targetHouseholds, knocksPerDoor: targetHouseholds ? doors / targetHouseholds : null };
  };

  /* ------------------------------------------------------------ message checks */
  const M = (CIB.message = {});
  M.QUADS = {
    Q1: { name: "Why you", long: "What you say about yourself", color: "q1" },
    Q2: { name: "The contrast", long: "What you say about them", color: "q2" },
    Q3: { name: "Their attacks", long: "What they'll say about you — and your answer", color: "q3" },
    Q4: { name: "Their pitch", long: "What they'll say about themselves", color: "q4" }
  };
  M.quadLabel = (qs) => (qs || []).map((q) => q === "Q3" ? "answers an attack" : M.QUADS[q] ? M.QUADS[q].name.toLowerCase() : q).join(" + ").replace(/^./, (c) => c.toUpperCase());
  M.coreCheck = (s) => {
    const n = U.words(s);
    if (!n) return { n, ok: false, text: "Write your one sentence" };
    if (n < 25) return { n, ok: true, text: `${n} words — good` };
    return { n, ok: false, text: `${n} words — aim for under 25` };
  };
  // Builder rules from Step 2, in plain words.
  M.sloganProblems = (cfg) => {
    const out = [];
    const sl = cfg.slogans || [];
    if (sl.length < 5) out.push(`You have ${sl.length} slogan${sl.length === 1 ? "" : "s"}. Write at least 5 so you have choices to test.`);
    if (sl.length > 10) out.push("More than 10 slogans — keep your best 10.");
    sl.forEach((s) => {
      if (!(s.quadrants || []).length) out.push(`“${s.text}” needs a label: which part of your message does it use?`);
      if ((s.quadrants || []).includes("Q4")) out.push(`“${s.text}” repeats your opponent's pitch. Slogans should never do that.`);
    });
    return out;
  };
  M.contrastProblems = (cfg) => (cfg.message_box.q2 || []).filter((q) => q.text && !String(q.source || "").trim())
    .map((q) => `“${q.text}” needs a source (meeting minutes, a vote record, a news story).`);

  /* --------------------------------------------------------------------- state */
  const ST = (CIB.state = {});
  ST.KEY = "campaign-in-a-box.v1";
  ST.VERSION = 1;

  const DEFAULT_OFFSETS = { filing_deadline: -120, persuasion_starts: -84, register_deadline: -29, ballots_out: -30, early_vote_starts: -14,
    finance_report: -10, gotv_starts: -4, sign_removal: 7, final_report: 30 };

  ST.defaultPieces = () => {
    const ex = U.clone((C.example && C.example.pieces) || []);
    ex.forEach((p) => { p.content = {}; });
    return ex;
  };

  ST.blank = () => ({
    v: ST.VERSION,
    meta: { created: new Date().toISOString(), updated: null, example: false, seenWelcome: false, lastBackup: null, backedUpAt: [], nudgeSnoozed: 0 },
    cfg: {
      slug: "",
      place: { state: "", county: "", town: "" },
      candidate: { first_name: "", last_name: "", full_name: "", initials: "", pronoun_subject: "they", pronoun_possessive: "their",
        office: "", district: "", jurisdiction: "", bio_short: "", bio_points: ["", "", ""] },
      message_box: { core_message: "", builder: {}, q1: [""], q2: [], q3_responses: [], q4: [], issues: [{ title: "", short: "", detail: "" }, { title: "", short: "", detail: "" }, { title: "", short: "", detail: "" }] },
      slogans: [],
      brand: { palette: "river", type_pairing: "civic", custom: { main: "#2E5E4E", accent: "#F2B705" } },
      election: { election_day: "", offsets: { ...DEFAULT_OFFSETS }, polls_close: "8:00 p.m.", voter_info_url: "", election_office: "", election_office_phone: "",
        confirmed: {} },
      web: { base_url: "", donate_url: "", donate_processor_url: "", volunteer_url: "", volunteer_form_url: "", email: "", phone: "", mailing_address: "", social: {},
        analytics: { provider: "none" } },
      disclaimer: { text: "", text_es: "", address_line: "", union_bug: false },
      language: { secondary: "", secondary_name: "", acs_share_limited_english: null, review_status: "", es: { office_line: "", core_message: "", slogan: "", bio_short: "", bio_points: ["", "", ""], issues: [{ title: "", short: "", detail: "" }, { title: "", short: "", detail: "" }, { title: "", short: "", detail: "" }] } },
      pieces: ST.defaultPieces(),
      social: U.clone((C.example && C.example.social) || { cards: [], utm_campaign: "social" })
    },
    strategy: {
      raceType: "two", dataMode: "", precinctSource: "", precincts: [], electionLabels: ["", "", ""],
      quick: { registered: "", turnout: "", rolloff: "90", baseline: "" },
      thresholds: { base: 0.55, persuadeLow: 0.45 }, margin: 0.05, turnoutOverride: null, lastWinnerVotes: "", lastRaceVotes: "",
      budget: { low: "", likely: "", high: "", splits: null, unit: { mail: 0.75, perHousehold: 3, sign: 6, print: 0.12 } },
      field: { volunteers: 10, shiftsPerWeek: 1, doorsPerShift: 40, candidateDoors: 150, weeks: 10, contactRate: 0.3, votersPerHousehold: 1.7, convPerVote: 15 }
    },
    checks: { disclaimer: false, dates: false, translation: false, qr: false, officialNumbers: false },
    run: { start: "", weeks: [], goals: {}, law: {}, tests: { ab: { a: {}, b: {} }, poll: { a: {}, b: {} }, listen: { people: "", scores: {} } }, quality: { lh: {}, email: {}, qr: {} } },
    photo: null
  });

  ST.example = () => {
    const st = ST.blank();
    const ex = U.clone(C.example || {});
    st.meta.example = true;
    st.meta.seenWelcome = true;
    Object.assign(st.cfg, ex);
    delete st.cfg._about;
    st.cfg.election.offsets = { ...DEFAULT_OFFSETS, ...Object.fromEntries(Object.entries(ex.election.offsets).filter(([k]) => !k.startsWith("_"))) };
    st.cfg.election.confirmed = {};
    st.cfg.brand.custom = { main: "#2E5E4E", accent: "#F2B705" };
    st.cfg.web.volunteer_form_url = "";
    // The message-box worked example (examples/rivertown-message-box.md) adds a third attack and the incumbent's pitch.
    const mb = st.cfg.message_box;
    mb.q4 = ["Experience and relationships at City Hall", "\"Kept taxes flat\"", "Knows how City Hall works"];
    if (mb.q3_responses.length < 3) mb.q3_responses.push({ attack: "Missed two municipal elections",
      response: "I missed two local elections when my kids were small. I should have voted — it's part of why I'm running." });
    // Shorter core sentence suggested in examples/README.md (the original is 27 words; the rule is under 25).
    mb.core_message = "Chris Porter will finally fix east-side flooding. He's an engineer who already cleared Mill Creek — City Hall left it 'pending' six years.";
    st.cfg.place.town = "Rivertown";
    st.strategy.dataMode = "precincts";
    st.strategy.precinctSource = "example";
    const P = C.examplePrecincts || [];
    st.strategy.electionLabels = [1, 2, 3].map((i) => (P[0] && P[0][`e${i}_label`]) || "");
    st.strategy.precincts = P.map((r) => ({
      precinct: r.precinct, registered_now: r.registered_now, notes: r.notes || "",
      elections: [1, 2, 3, 4].map((i) => ({ registered: r[`e${i}_registered`] || "", ballots_cast: r[`e${i}_ballots_cast`] || "",
        baseline_votes: r[`e${i}_baseline_votes`] || "", race_total_votes: r[`e${i}_race_total_votes`] || "" })).filter((e) => e.registered)
    }));
    st.strategy.budget.low = 8000; st.strategy.budget.likely = 18000; st.strategy.budget.high = 30000;
    st.strategy.field.volunteers = 15;
    // Six fictional weeks of door-knocking for the weekly dashboard (doors start 84 days out).
    const wk0 = U.addDays(st.cfg.election.election_day, Number(st.cfg.election.offsets.persuasion_starts));
    st.run.weeks = [[520, 140, 18, 1500, 15], [610, 165, 22, 2200, 22], [580, 150, 20, 1800, 18], [640, 170, 25, 2600, 20], [590, 160, 21, 1200, 14], [600, 165, 24, 1900, 19]]
      .map(([doors, conversations, ids, dollars, list], i) => ({ week: U.addDays(wk0, 7 * i), doors, conversations, ids, dollars, list, note: i === 4 ? "Rain on Saturday" : "" }));
    return st;
  };

  // Fill derived fields (full name, initials, slug) so every piece reads the same values.
  ST.normalize = (st) => {
    const c = st.cfg.candidate;
    c.full_name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    c.initials = ((c.first_name || "")[0] || "") + ((c.last_name || "")[0] || "");
    const pr = { he: "his", she: "her", they: "their" };
    c.pronoun_possessive = pr[c.pronoun_subject] || "their";
    st.cfg.slug = U.slug([c.jurisdiction, c.district || c.last_name].filter(Boolean).join(" "));
    const w = st.cfg.web;
    if (w.base_url && !/^https?:\/\//.test(w.base_url)) w.base_url = "https://" + w.base_url;
    w.base_url = (w.base_url || "").replace(/\/+$/, "");
    if (w.base_url) {
      w.volunteer_url = w.base_url + "/volunteer/";
      w.donate_url = w.base_url + "/donate/";
    }
    if (!st.cfg.disclaimer.text && c.full_name) st.cfg.disclaimer.autoText = `Paid for by Friends of ${c.full_name}`;
    return st;
  };

  ST.migrate = (st) => {
    const base = ST.blank();
    const merge = (a, b) => {
      if (Array.isArray(a) || Array.isArray(b) || typeof a !== "object" || typeof b !== "object" || !a || !b) return b === undefined ? a : b;
      const o = { ...a };
      Object.keys(b).forEach((k) => { o[k] = merge(a[k], b[k]); });
      return o;
    };
    const out = merge(base, st || {});
    out.v = ST.VERSION;
    return ST.normalize(out);
  };

  ST.load = () => {
    try {
      const raw = root.localStorage && root.localStorage.getItem(ST.KEY);
      return raw ? ST.migrate(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  };
  ST.save = (st) => {
    st.meta.updated = new Date().toISOString();
    try { root.localStorage.setItem(ST.KEY, JSON.stringify(st)); return { ok: true }; }
    catch (e) { return { ok: false, error: e && e.name === "QuotaExceededError" ? "full" : "blocked" }; }
  };
  ST.clear = () => { try { root.localStorage.removeItem(ST.KEY); } catch (e) { /* nothing saved */ } };

  // campaign.json for the command-line builder (tools/build_creative.py), from the app's answers.
  ST.toCampaignJson = (st) => {
    const cfg = U.clone(st.cfg);
    const out = { _about: "Exported from the Campaign-in-a-Box app. Works with tools/build_creative.py.", ...cfg };
    if (out.brand.palette === "custom") out._custom_palette = K.palette(st.cfg);
    out.disclaimer.text = out.disclaimer.text || out.disclaimer.autoText || "";
    delete out.disclaimer.autoText;
    out.pieces = cfg.pieces.map((p) => ({ ...p, content: CIB.pieceContent ? CIB.pieceContent(st, p) : p.content }));
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);
