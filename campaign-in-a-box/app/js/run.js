/* Campaign-in-a-Box app — running the campaign (Step 3).
 * - Weekly dashboard: doors, conversations, supporters found, dollars and list signups against goals
 *   that come from the win number, the field model, the budget and the calendar.
 * - Message tests: margin of error for a cheap poll, and an A/B ad test with a plain decision rule.
 * - Quality checks: website checks run on the generated pages, plus pass marks for Lighthouse and email.
 * Pure functions; nothing here sends data anywhere. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const U = CIB.util, S = CIB.strategy;
  const RN = (CIB.run = {});

  /* ------------------------------------------------------------------ dashboard */
  RN.METRICS = [
    { key: "doors", label: "Doors knocked", short: "Doors", fmt: "int" },
    { key: "conversations", label: "Conversations", short: "Talks", fmt: "int" },
    { key: "ids", label: "Supporters found", short: "Supporters", fmt: "int" },
    { key: "dollars", label: "Money raised", short: "Raised", fmt: "money" },
    { key: "list", label: "New email signups", short: "Signups", fmt: "int" }
  ];
  RN.fmt = (m, v) => (m.fmt === "money" ? U.money(v) : U.int(v));

  // The campaign's weeks: from the start (door-knocking start by default) to Election Day.
  RN.window = (st) => {
    const ed = st.cfg.election.election_day;
    if (!ed) return null;
    const D = S.dates(st.cfg), f = st.strategy.field;
    let start = (st.run && st.run.start) || D.persuasion_starts || U.addDays(ed, -7 * f.weeks);
    if (start > ed) start = U.addDays(ed, -7 * f.weeks);
    const days = Math.max(1, U.daysBetween(start, ed) + 1);
    const n = Math.max(1, Math.ceil(days / 7));
    return { start, end: ed, n, weeks: Array.from({ length: n }, (_, i) => U.addDays(start, 7 * i)), moneyBy: D.ballots_out && D.ballots_out > start && D.ballots_out < ed ? D.ballots_out : ed };
  };

  // Goals: each one explained, each one editable.
  RN.goals = (st) => {
    const r = S.result(st), s = r.summary, fc = S.field(st, r), b = S.budget(st, r), g = (st.run && st.run.goals) || {};
    const win = s ? s.winNumber : null;
    const needed = s && s.gap != null ? Math.max(0, s.gap) : null;
    const auto = {
      doors: { value: Math.round(fc.doors), why: "From your plan: volunteers × shifts × doors, plus your own doors, every week." },
      conversations: { value: Math.round(fc.conversations), why: `About ${U.pct(st.strategy.field.contactRate)} of doors answer.` },
      ids: { value: win ? Math.max(needed || 0, Math.round(win * 0.1)) : 0, why: needed ? "At least the votes you still need. Each supporter gets a reminder to vote." : "One in ten of your win number, at least. Each supporter gets a reminder to vote." },
      dollars: { value: Math.round(b.likely || 0), why: "Your likely budget, raised by the time ballots go out (that's when the big bills land)." },
      list: { value: win ? Math.round(win * 0.1) : 0, why: "One signup for every ten votes you need — a planning guess. Change it if you have a better one." }
    };
    const out = {};
    RN.METRICS.forEach((m) => {
      const own = U.num(g[m.key]);
      out[m.key] = { ...auto[m.key], auto: auto[m.key].value, value: own != null && own > 0 ? own : auto[m.key].value, custom: own != null && own > 0 };
    });
    return out;
  };

  // How much of a goal should be done by the end of week i (0-based). Money is due earlier.
  RN.paceShare = (win, key, i) => {
    const end = U.addDays(win.weeks[i], 6);
    if (key === "dollars") {
      const span = Math.max(1, U.daysBetween(win.start, win.moneyBy) + 1);
      return Math.min(1, Math.max(0, (U.daysBetween(win.start, end) + 1) / span));
    }
    return Math.min(1, (i + 1) / win.n);
  };

  RN.weekIndex = (win, iso) => Math.floor(U.daysBetween(win.start, iso) / 7);

  // Totals by campaign week (entries are per-week numbers, matched to the week they fall in).
  RN.series = (st) => {
    const win = RN.window(st);
    if (!win) return null;
    const rows = win.weeks.map((w) => ({ week: w, entered: false, ...Object.fromEntries(RN.METRICS.map((m) => [m.key, 0])) }));
    let before = 0;
    ((st.run && st.run.weeks) || []).forEach((e) => {
      if (!e.week) return;
      const i = RN.weekIndex(win, e.week);
      if (i < 0) { before++; return; }
      const row = rows[Math.min(i, rows.length - 1)];
      row.entered = true;
      RN.METRICS.forEach((m) => { row[m.key] += U.num(e[m.key]) || 0; });
    });
    let run = Object.fromEntries(RN.METRICS.map((m) => [m.key, 0]));
    rows.forEach((r) => { RN.METRICS.forEach((m) => { run[m.key] += r[m.key]; r["cum_" + m.key] = run[m.key]; }); });
    const last = rows.reduce((a, r, i) => (r.entered ? i : a), -1);
    return { win, rows, last, before };
  };

  // On track = at least 90% of where you should be; behind = 70–90%; well behind = under 70%.
  RN.THRESHOLDS = { onTrack: 0.9, behind: 0.7 };
  RN.verdict = (actual, target) => {
    if (!target) return { key: "none", label: "No goal" };
    const r = actual / target;
    if (r >= RN.THRESHOLDS.onTrack) return { key: "ok", label: "On track", ratio: r };
    if (r >= RN.THRESHOLDS.behind) return { key: "warn", label: "Behind", ratio: r };
    return { key: "bad", label: "Well behind", ratio: r };
  };

  RN.status = (st) => {
    const ser = RN.series(st);
    if (!ser) return null;
    const goals = RN.goals(st), r = S.result(st), s = r.summary, f = st.strategy.field;
    const { win, rows, last } = ser;
    const today = U.today();
    const nowIdx = Math.min(win.n - 1, Math.max(-1, RN.weekIndex(win, today)));
    const metrics = RN.METRICS.map((m) => {
      const goal = goals[m.key].value;
      const actual = last >= 0 ? rows[last]["cum_" + m.key] : 0;
      const target = last >= 0 ? goal * RN.paceShare(win, m.key, last) : 0;
      return { ...m, goal, actual, target, verdict: last >= 0 ? RN.verdict(actual, target) : { key: "none", label: "No numbers yet" }, why: goals[m.key].why, custom: goals[m.key].custom };
    });
    const by = Object.fromEntries(metrics.map((m) => [m.key, m]));
    // Against the win number: votes a candidate like you usually gets, plus what the conversations so far
    // are on pace to add (one vote per N conversations, the plan's guess).
    let projection = null;
    if (s && last >= 0) {
      const weeksDone = last + 1, conv = by.conversations.actual;
      const projConv = conv + (conv / weeksDone) * Math.max(0, win.n - weeksDone);
      const added = projConv / f.convPerVote;
      const base = s.expectedBase;
      projection = { conversations: projConv, added, base, total: base != null ? base + added : null, win: s.winNumber, short: base != null ? s.winNumber - (base + added) : null };
    }
    const doors = by.doors.actual, conv = by.conversations.actual;
    const contact = doors > 0 ? conv / doors : null;
    const notes = [];
    if (contact != null && doors >= 100 && contact < f.contactRate * 0.8) notes.push(`Only ${U.pct(contact)} of doors answer (the plan assumes ${U.pct(f.contactRate)}). Try evenings and weekends, or plan more doors.`);
    if (last >= 0 && last < nowIdx - 1) notes.push(`No numbers since the week of ${U.fmtDate(rows[last].week, "en", "short")}. Add last week's numbers to keep this accurate.`);
    return { win, rows, last, nowIdx, metrics, projection, contact, notes, before: ser.before };
  };

  // CSV in and out. Columns are matched loosely so a shared Google Sheet with its own headers works.
  RN.CSV_COLS = ["week", "doors", "conversations", "supporters_found", "dollars", "email_signups", "note"];
  const KEY_FOR = (h) => {
    h = String(h || "").toLowerCase();
    if (/week|date|start/.test(h)) return "week";
    if (/door|knock/.test(h)) return "doors";
    if (/conv|talk|contact/.test(h)) return "conversations";
    if (/support|\bids?\b|identified/.test(h)) return "ids";
    if (/dollar|raised|money|\$|donat|amount/.test(h)) return "dollars";
    if (/list|signup|sign-up|email|subscri/.test(h)) return "list";
    if (/note|comment/.test(h)) return "note";
    return "";
  };
  RN.toCsv = (st) => {
    const rows = ((st.run && st.run.weeks) || []).slice().sort((a, b) => String(a.week).localeCompare(String(b.week)));
    const cell = (v) => (/[",\n]/.test(String(v == null ? "" : v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v == null ? "" : v));
    return [RN.CSV_COLS.join(","), ...rows.map((r) => [r.week, r.doors, r.conversations, r.ids, r.dollars, r.list, r.note].map(cell).join(","))].join("\n") + "\n";
  };
  const splitCsv = (text) => {
    const rows = []; let row = [], cell = "", q = false;
    const delim = (text.split("\n")[0].match(/\t/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? "\t" : ",";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
  };
  RN.parseDate = (s) => {
    s = String(s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
    return "";
  };
  RN.parseCsv = (text) => {
    const rows = splitCsv(String(text || "").replace(/^﻿/, ""));
    if (rows.length < 2) return { weeks: [], problems: ["No rows found. The first row should be headings like: week, doors, conversations, supporters_found, dollars, email_signups."] };
    const keys = rows[0].map(KEY_FOR);
    if (!keys.includes("week")) return { weeks: [], problems: ["Couldn't find a week or date column."] };
    const weeks = [], problems = [];
    rows.slice(1).forEach((r, i) => {
      const o = {};
      keys.forEach((k, j) => { if (k && o[k] == null) o[k] = r[j]; });
      const week = RN.parseDate(o.week);
      if (!week) { problems.push(`Row ${i + 2}: “${o.week || ""}” isn't a date (use 2026-09-07 or 9/7/2026).`); return; }
      const e = { week, note: (o.note || "").trim() };
      RN.METRICS.forEach((m) => { const n = U.num(String(o[m.key] == null ? "" : o[m.key]).replace(/[$,\s]/g, "")); e[m.key] = n == null ? "" : n; });
      weeks.push(e);
    });
    return { weeks, problems };
  };
  // Imported rows replace any saved row for the same week.
  RN.merge = (saved, incoming) => {
    const map = new Map((saved || []).map((w) => [w.week, w]));
    incoming.forEach((w) => map.set(w.week, w));
    return [...map.values()].sort((a, b) => String(a.week).localeCompare(String(b.week)));
  };

  /* --------------------------------------------------------------- message tests */
  // 95% margin of error for a share near 50% from n people.
  RN.moe = (n) => (n > 0 ? 1.96 * Math.sqrt(0.25 / n) : null);
  // Split-sample poll: half hear message A, half hear B. The difference is real when it's bigger than this.
  RN.pollCompare = (a, b) => {
    const na = U.num(a.n) || 0, nb = U.num(b.n) || 0, ya = U.num(a.yes) || 0, yb = U.num(b.yes) || 0;
    if (!na || !nb) return null;
    const pa = Math.min(1, ya / na), pb = Math.min(1, yb / nb);
    const se = Math.sqrt((pa * (1 - pa)) / na + (pb * (1 - pb)) / nb) || Math.sqrt(0.5 / Math.min(na, nb));
    const moe = 1.96 * se, diff = pa - pb;
    return { pa, pb, diff, moe, winner: Math.abs(diff) > moe ? (diff > 0 ? "a" : "b") : "" };
  };
  // A/B ads: two-proportion z-test on click rates. Needs enough clicks before it says anything.
  RN.AB_MIN_CLICKS = 30;
  RN.abCompare = (a, b) => {
    const sa = U.num(a.shown) || 0, sb = U.num(b.shown) || 0, ca = U.num(a.clicks) || 0, cb = U.num(b.clicks) || 0;
    if (!sa || !sb) return null;
    const ra = ca / sa, rb = cb / sb, p = (ca + cb) / (sa + sb);
    const se = Math.sqrt(p * (1 - p) * (1 / sa + 1 / sb));
    const z = se ? (ra - rb) / se : 0;
    const enough = ca + cb >= RN.AB_MIN_CLICKS * 2 && Math.min(ca, cb) >= 5;
    let verdict = "wait", winner = "";
    if (enough && Math.abs(z) >= 1.96) { verdict = "winner"; winner = z > 0 ? "a" : "b"; }
    else if (enough && ca + cb >= 400) verdict = "tie";
    else if (enough) verdict = "close";
    return { ra, rb, z, verdict, winner, clicks: ca + cb };
  };
  // Listening session: rank slogans by how many people remembered them, then liked them.
  RN.listenRank = (slogans, scores) => slogans.map((s, i) => ({ i, text: s.text, remembered: U.num((scores[i] || {}).remembered) || 0, liked: U.num((scores[i] || {}).liked) || 0 }))
    .sort((x, y) => y.remembered - x.remembered || y.liked - x.liked);

  /* -------------------------------------------------------------- quality checks */
  RN.LH_PASS = { performance: 90, accessibility: 95, "best-practices": 90, seo: 90 };
  RN.LH_LABELS = { performance: "Performance", accessibility: "Accessibility", "best-practices": "Best practices", seo: "SEO" };
  RN.PAGE_KB_MAX = 500;

  // Checks we can run on the website files the app builds, before anything is published.
  RN.siteChecks = (files) => {
    const pages = files.filter((f) => /\.html$/.test(f.name) && typeof f.data === "string");
    const size = (f) => (typeof f.data === "string" ? new TextEncoder().encode(f.data).length : f.data.length || f.data.byteLength || 0);
    const css = files.filter((f) => /\.css$/.test(f.name)).reduce((a, f) => a + size(f), 0);
    const fonts = files.filter((f) => /^fonts\//.test(f.name)).reduce((a, f) => a + size(f), 0);
    const results = [];
    const add = (key, label, bad, total, detail) => results.push({ key, label, ok: !bad.length, bad, total, detail });
    const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, "");
    add("lang", "Every page says its language", pages.filter((p) => !/<html[^>]*\slang="[a-z]{2}/i.test(p.data)).map((p) => p.name), pages.length);
    add("title", "Every page has a title", pages.filter((p) => !/<title>[^<]+<\/title>/i.test(p.data)).map((p) => p.name), pages.length);
    add("desc", "Every page has a search description", pages.filter((p) => !/<meta name="description" content="[^"]+"/i.test(p.data)).map((p) => p.name), pages.length);
    add("viewport", "Every page fits phone screens", pages.filter((p) => !/<meta name="viewport"/i.test(p.data)).map((p) => p.name), pages.length);
    add("h1", "One main heading per page", pages.filter((p) => (strip(p.data).match(/<h1[\s>]/gi) || []).length !== 1).map((p) => p.name), pages.length);
    add("alt", "Every image has a description", pages.filter((p) => (p.data.match(/<img\b[^>]*>/gi) || []).some((t) => !/\salt="/i.test(t))).map((p) => p.name), pages.length);
    add("labels", "Every form box has a label", pages.filter((p) => {
      const ids = [...p.data.matchAll(/<(?:input|select|textarea)\b([^>]*)>/gi)].filter((m) => !/type="(hidden|submit|button)"/i.test(m[1]));
      return ids.some((m) => { const id = (m[1].match(/\sid="([^"]+)"/) || [])[1]; return !/aria-label=/.test(m[1]) && !(id && new RegExp(`<label[^>]*for="${id}"`).test(p.data)); });
    }).map((p) => p.name), pages.length);
    add("links", "No broken links between pages", (() => {
      const names = new Set(files.map((f) => f.name));
      const bad = [];
      pages.forEach((p) => {
        const dir = p.name.includes("/") ? p.name.replace(/[^/]+$/, "") : "";
        [...p.data.matchAll(/\shref="([^"#?]+)/g)].map((m) => m[1]).filter((h) => !/^(https?:|mailto:|tel:|\/\/)/.test(h)).forEach((h) => {
          const parts = (dir + h).split("/"), out = [];
          parts.forEach((x) => { if (x === "..") out.pop(); else if (x !== "." && x !== "") out.push(x); });
          let t = out.join("/");
          if (h.endsWith("/") || t === "") t = (t ? t + "/" : "") + "index.html";
          if (!names.has(t) && !/^(icon\.png|share\.png|photo\.jpg)$/.test(t)) bad.push(`${p.name} → ${h}`);
        });
      });
      return bad;
    })(), pages.length);
    const home = pages.find((p) => p.name === "index.html");
    const homeKb = home ? (size(home) + css + fonts) / 1024 : 0;
    add("weight", `Home page under ${RN.PAGE_KB_MAX} KB before photos`, homeKb > RN.PAGE_KB_MAX ? ["index.html"] : [], 1, `${Math.round(homeKb)} KB`);
    return results;
  };

  RN.lhResult = (lh) => Object.entries(RN.LH_PASS).map(([k, min]) => {
    const v = U.num((lh || {})[k]);
    return { key: k, label: RN.LH_LABELS[k], min, value: v, ok: v == null ? null : v >= min };
  });

  // Email: setup checks (yes/no) and the numbers to watch after each send.
  RN.EMAIL_SETUP = [
    { key: "domain", label: "Sending from your own domain", how: "Use an address at your website's domain (you@yourname.com), not Gmail or Yahoo — big mailboxes reject bulk mail that claims to be from them." },
    { key: "spf", label: "SPF record added", how: "Your email tool gives you a line of text to add to your domain's DNS settings (a TXT record starting v=spf1)." },
    { key: "dkim", label: "DKIM record added", how: "Also from your email tool: a record that signs your mail so it can't be faked." },
    { key: "dmarc", label: "DMARC record added", how: "A TXT record named _dmarc. Start with v=DMARC1; p=none; and move to p=quarantine once SPF and DKIM pass." },
    { key: "pass", label: "Test email shows SPF, DKIM and DMARC: PASS", how: "Send yourself a test at Gmail, open it, ⋮ → Show original. All three should say PASS." },
    { key: "inbox", label: "Test lands in the inbox at Gmail, Outlook and Yahoo", how: "Ask three friends with those addresses to check — not Spam or Promotions." },
    { key: "unsub", label: "Every email has an unsubscribe link that works in one click", how: "listmonk and Mautic add this. Click it once yourself to be sure." },
    { key: "optin", label: "Only people who signed up are on the list", how: "Never import a bought list or the voter file. It's the fastest way to the spam folder." }
  ];
  RN.EMAIL_NUMBERS = [
    { key: "tester", label: "mail-tester.com score", unit: "/10", pass: (v) => v >= 9, rule: "9 or higher", how: "Send one email to the address mail-tester.com shows you, then open your score." },
    { key: "complaints", label: "Spam complaint rate", unit: "%", pass: (v) => v < 0.1, warn: (v) => v < 0.3, rule: "under 0.1% (never 0.3% or more)", how: "In Google Postmaster Tools, or your email tool's reports. Gmail starts blocking senders at 0.3%." },
    { key: "bounces", label: "Bounce rate", unit: "%", pass: (v) => v < 2, warn: (v) => v < 5, rule: "under 2%", how: "Your email tool's report after each send. Remove addresses that bounce." }
  ];
  RN.emailResult = (em) => {
    em = em || {};
    const setup = RN.EMAIL_SETUP.map((x) => ({ ...x, ok: !!em[x.key] }));
    const numbers = RN.EMAIL_NUMBERS.map((x) => {
      const v = U.num(em[x.key]);
      return { ...x, value: v, ok: v == null ? null : x.pass(v), warn: v != null && !x.pass(v) && x.warn ? x.warn(v) : false };
    });
    return { setup, numbers };
  };
})(typeof window !== "undefined" ? window : globalThis);
