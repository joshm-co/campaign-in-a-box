/* Campaign-in-a-Box app — screens and navigation.
 * One question per screen, a live plan, live materials, and a checklist that
 * unlocks the printer files. Saved only on this device (localStorage).
 * MIT License. */
(function () {
  "use strict";
  const CIB = window.CIB;
  const U = CIB.util, K = CIB.color, S = CIB.strategy, M = CIB.message, ST = CIB.state, R = CIB.render, O = CIB.out, PL = CIB.places, OE = CIB.oe;
  const esc = U.esc;

  let st = ST.load();
  let fontsReady = false;
  const view = { side: {}, sitePage: "index.html", email: 0, social: "Social" };

  /* ---------------------------------------------------------------- icons */
  const svg = (d, o = {}) => `<svg width="${o.s || 22}" height="${o.s || 22}" viewBox="0 0 24 24" fill="none" stroke="${o.c || "currentColor"}" stroke-width="${o.w || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${o.style ? ` style="${o.style}"` : ""}>${d}</svg>`;
  const I = {
    back: (o) => svg('<path d="M15 18l-6-6 6-6"/>', { w: 2.4, ...o }),
    chev: (o) => svg('<path d="M9 6l6 6-6 6"/>', { s: 16, w: 2.5, ...o }),
    house: (o) => svg('<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M10 21v-6h4v6"/>', o),
    target: (o) => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', o),
    chat: (o) => svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', o),
    screen: (o) => svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/>', o),
    lock: (o) => svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', { s: 14, ...o }),
    help: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17h.01"/>', o),
    info: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>', { s: 18, w: 2.2, ...o }),
    warn: (o) => svg('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>', { s: 18, w: 2.2, ...o }),
    car: (o) => svg('<path d="M5 17h14l-1.5-6h-11z"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>', o),
    download: (o) => svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>', { s: 20, ...o }),
    share: (o) => svg('<path d="M12 3v13"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>', { s: 20, ...o }),
    plus: (o) => svg('<path d="M12 5v14"/><path d="M5 12h14"/>', { s: 20, ...o }),
    trash: (o) => svg('<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/>', { s: 20, ...o }),
    done: (o) => `<svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Done" style="flex:none"><circle cx="12" cy="12" r="11" fill="var(--green)"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--card)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    todo: () => `<svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Not done yet" style="flex:none"><circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--line2)" stroke-width="1.5"/></svg>`,
    fix: () => `<svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Needs a fix" style="flex:none"><circle cx="12" cy="12" r="11" fill="var(--amber)"/><path d="M12 7v6" stroke="var(--card)" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.4" fill="var(--card)"/></svg>`,
    tick: (o) => svg('<path d="M5 12l5 5L20 7"/>', { s: 20, w: 2.6, ...o })
  };

  /* --------------------------------------------------------------- state io */
  const getP = (path) => U.get(st, path);
  const setP = (path, value) => {
    const keys = path.split(".");
    let o = st;
    keys.slice(0, -1).forEach((k, i) => {
      if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
  };
  let saveTimer = null, saveState = "saved";
  const save = (now) => {
    clearTimeout(saveTimer);
    const go = () => {
      ST.normalize(st);
      const r = ST.save(st);
      saveState = r.ok ? "saved" : r.error;
      if (!r.ok) toast(r.error === "full" ? "This device is out of space for the campaign. Remove the photo or download a backup." : "This browser is blocking saving (private mode?). Download a backup so you don't lose your work.", 6000);
      const s = document.querySelector("[data-saved]");
      if (s) s.textContent = savedText();
    };
    if (now) go(); else saveTimer = setTimeout(go, 350);
  };
  const savedText = () => saveState === "saved" ? `Saved on this ${/Mobi|iPhone|Android/.test(navigator.userAgent) ? "phone" : "device"}` : "Not saved — download a backup";

  let toastTimer = null;
  const toast = (msg, ms = 2600) => {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  };

  /* ----------------------------------------------------------- form fields */
  const fid = (p) => "f-" + p.replace(/[^a-z0-9]+/gi, "-");
  const valueFor = (path, kind) => {
    const v = getP(path);
    if (kind === "pct") return v == null || v === "" ? "" : String(Math.round(v * 1000) / 10);
    if (kind && kind.startsWith("off:")) {
      const off = getP(path);
      return st.cfg.election.election_day && off != null && off !== "" ? U.addDays(st.cfg.election.election_day, Number(off)) : "";
    }
    return v == null ? "" : String(v);
  };
  // A labeled input bound to a path in the saved campaign.
  const field = (o) => {
    const id = o.id || fid(o.bind), kind = o.kind || "text", val = valueFor(o.bind, kind);
    const type = o.type || (kind.startsWith("off:") || kind === "date" ? "date" : "text");
    const common = `id="${id}" data-bind="${o.bind}" data-kind="${kind}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${o.ac ? ` autocomplete="${o.ac}"` : ' autocomplete="off"'}${o.im ? ` inputmode="${o.im}"` : ""}${o.hint ? ` aria-describedby="${id}-h"` : ""}${o.max ? ` maxlength="${o.max}"` : ""}`;
    const input = o.rows ? `<textarea class="field${o.sm ? " sm" : ""}" rows="${o.rows}" ${common}>${esc(val)}</textarea>`
      : `<input class="field${o.sm ? " sm" : ""}" type="${type}" value="${esc(val)}" ${common}${o.style ? ` style="${o.style}"` : ""}>`;
    return `${o.label ? `<label class="lbl" for="${id}">${o.label}${o.opt ? ` <span class="opt">(${o.opt})</span>` : ""}${o.law ? ' <span class="law">⚖️ set by law</span>' : ""}</label>` : ""}${input}${o.hint ? `<p class="hint" id="${id}-h">${o.hint}</p>` : ""}`;
  };
  const help = (title, body) => `<details class="help"><summary>${I.help({ s: 22, c: "var(--blue)" })}${esc(title)}</summary><div>${body}</div></details>`;
  const note = (kind, html, icon) => `<div class="note ${kind}">${icon || (kind === "ok" ? I.tick({ s: 18 }) : kind === "info" ? I.info() : I.warn())}<div>${html}</div></div>`;
  const choice = (name, value, current, title, sub, act) => `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${current === value ? " checked" : ""} data-act="${act}" data-arg="${esc(value)}"><div><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</div></label>`;

  /* --------------------------------------------------------------- results */
  const result = () => S.result(st);
  const lockList = () => {
    const c = st.checks, need = [];
    if (!c.disclaimer) need.push({ id: "disclaimer", label: "“Paid for by” wording confirmed" });
    if (!c.dates) need.push({ id: "dates", label: "Voting dates confirmed" });
    if (st.cfg.language.secondary === "es" && !c.translation) need.push({ id: "translation", label: "Spanish checked by a fluent speaker" });
    return need;
  };
  const planReady = () => { const r = result(); return !!(r.summary && st.cfg.message_box.core_message.trim()); };
  const name = () => st.cfg.candidate.full_name || "";
  const firstName = () => st.cfg.candidate.first_name || "you";
  const TARGET_PLAIN = { "Persuade": "close races", "Turn Out": "friendly, low-turnout", "Base - Light Touch": "friendly, already vote", "Skip": "hard to win" };

  /* --------------------------------------------------------------- questions */
  const SECTIONS = { race: "Your race", numbers: "Your numbers", you: "About you", contact: "Contact & “Paid for by”" };
  const OFFICE_CHIPS = ["City Council", "School Board", "County Commission", "State House", "Mayor"];
  const DATE_ROWS = [
    ["filing_deadline", "Candidate filing deadline", true], ["persuasion_starts", "Start knocking doors", false], ["ballots_out", "Mail ballots go out", true],
    ["register_deadline", "Last day to register to vote", true], ["early_vote_starts", "Early in-person voting starts", true],
    ["finance_report", "Last finance report before the election", true], ["gotv_starts", "Final get-out-the-vote push starts", false], ["sign_removal", "Take down yard signs by", true]
  ];

  const QUESTIONS = [
    { id: "name", section: "race", title: "What's your name, as it'll appear on the ballot?", sub: "We'll put it on your sign, mailers and website.",
      body: () => `${field({ bind: "cfg.candidate.first_name", label: "First name", ac: "given-name" })}${field({ bind: "cfg.candidate.last_name", label: "Last name", ac: "family-name" })}
        <p class="lbl" id="pron-l">How should emails refer to you?</p>
        <div class="chips" role="group" aria-labelledby="pron-l">${[["he", "he / his"], ["she", "she / her"], ["they", "they / their"]].map(([v, l]) => `<button type="button" class="chip" aria-pressed="${st.cfg.candidate.pronoun_subject === v}" data-act="pronoun" data-arg="${v}">${l}</button>`).join("")}</div>`,
      help: ["Where do I find this?", "<p>Use your name exactly as you filed it. Your filing paperwork, or a quick call to your election office, will confirm it. A nickname is fine if the ballot uses it.</p>"] },
    { id: "office", section: "race", title: "What office are you running for?", sub: "Use the name on the ballot. You can change it later.",
      body: () => `${field({ bind: "cfg.candidate.office", label: "Office" })}
        <div class="chips">${OFFICE_CHIPS.map((o) => `<button type="button" class="chip" aria-pressed="${st.cfg.candidate.office === o}" data-act="office" data-arg="${esc(o)}">${o}</button>`).join("")}</div>
        ${field({ bind: "cfg.candidate.district", label: "District or seat", opt: "if any", ph: "District 4" })}`,
      help: ["Where do I find this?", "<p>Your county or state election office lists every office on the next ballot. They answer candidate questions for free.</p>"] },
    { id: "where", section: "race", title: "Where are you running?", sub: () => ({ town: "For a city race, we need the town and its county.", county: "For a county or school race, we need the county.", state: "For a state race, the state is enough — add your county to find local results." })[PL.level(st.cfg.candidate.office)],
      body: () => {
        const pl = st.cfg.place, lvl = PL.level(st.cfg.candidate.office), dir = PL.dir(pl.state), counties = PL.counties(pl.state);
        return `<label class="lbl" for="pl-state">State</label><select class="field" id="pl-state" data-act="pl-state"><option value="">Choose your state</option>${PL.STATES.map(([c, n]) => `<option value="${c}"${pl.state === c ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
          ${counties.length ? `<label class="lbl" for="pl-county">County${lvl === "state" ? ' <span class="opt">(optional)</span>' : ""}</label><select class="field" id="pl-county" data-act="pl-county"><option value="">Choose your county</option>${counties.map((c) => `<option${pl.county === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>`
            : field({ bind: "cfg.place.county", label: "County", opt: lvl === "state" ? "optional" : "", ph: "Cache", hint: "Just the name, without “County”." })}
          ${lvl !== "county" || pl.town ? field({ bind: "cfg.place.town", label: "City or town", opt: lvl === "town" ? "" : "optional", ph: "Smithfield", ac: "address-level2" }) : ""}
          <div data-live="placeinfo"></div>`;
      },
      live: { placeinfo: () => placeCard(true) },
      help: ["Why we ask", "<p>Your place decides which election office you call, where past results live, and what the ballot calls your race. It also fills in the city, county or state that appears on your sign and website.</p><p>The app keeps this on your device. The directory of election offices is built into the app, so looking it up sends nothing anywhere.</p>"] },
    { id: "eday", section: "race", title: "When is the election, and how is it won?", sub: "Everything else — mail, signs, emails — is timed backward from this date.",
      body: () => `${field({ bind: "cfg.election.election_day", label: "Election Day", kind: "date", type: "date" })}
        <p class="lbl">How is this race won? <span class="law">⚖️ set by law</span></p>
        <div class="card flush" role="radiogroup" aria-label="How the race is won">${Object.entries(S.RACE_TYPES).map(([k, v]) => choice("race", k, st.strategy.raceType, v.label, "", "raceType")).join("")}</div>
        <div data-live="racenote"></div>`,
      live: { racenote: () => {
        const t = S.RACE_TYPES[st.strategy.raceType];
        return (t.note ? note("info", esc(t.note)) : "") + (st.strategy.raceType === "multi" ? `<div class="two">${field({ bind: "strategy.lastWinnerVotes", label: "Votes the last winner got", im: "numeric", sm: true })}${field({ bind: "strategy.lastRaceVotes", label: "Total votes in that race", opt: "optional", im: "numeric", sm: true })}</div><p class="hint">From the last comparable election's results. If you add the total, we scale it to this year's expected turnout.</p>` : "");
      } },
      help: ["Where do I find this?", "<p>Your election office's calendar has the date. Ask them how the race is decided: most votes, a majority with a runoff, ranked choice, or several seats. It changes your win number.</p>"] },
    { id: "dates", section: "race", title: "Key voting dates", sub: "We've filled in typical dates. Replace each one with your real date — they're set by state law and print on your materials.",
      body: () => (st.cfg.election.election_day ? "" : note("warn", "Add Election Day first, on the previous screen.")) +
        `<div class="card">${DATE_ROWS.map(([k, l, law]) => field({ bind: `cfg.election.offsets.${k}`, kind: `off:${k}`, label: l, law, sm: true })).join("")}
        ${field({ bind: "cfg.election.polls_close", label: "Polls close at", ph: "8:00 p.m.", sm: true })}</div>`,
      help: ["What to ask your election office", "<p>Call and ask:</p><p>• When do mail ballots go out, and who gets one automatically?<br>• What's the last day to register? Is there same-day registration?<br>• When does early in-person voting start, if there is any?<br>• When is the last campaign finance report due before the election?<br>• When may yard signs go up, and when must they come down?<br>• What time do polls close?</p>"] },
    { id: "officeinfo", section: "race", title: "Your election office", sub: "This goes on your “How to vote” page and palm cards, so voters can check the rules themselves.",
      body: () => `${officeFill()}${field({ bind: "cfg.election.election_office", label: "Office name", ph: "Rivertown County Elections Office" })}
        ${field({ bind: "cfg.election.election_office_phone", label: "Phone", type: "tel", ac: "off" })}
        ${field({ bind: "cfg.election.voter_info_url", label: "Voter information website", type: "url", ph: "https://vote.example.gov" })}`,
      help: ["Where do I find this?", "<p>Search for your county name plus “elections office”. Use the official government site (usually ending in .gov or your state's domain), not a third-party site.</p>"] },
    { id: "source", section: "numbers", title: "Do you have past election results by precinct?", sub: "Precinct results show where a candidate like you does well, and where races are close.",
      body: () => `<div class="card flush" role="radiogroup" aria-label="Where your numbers come from">
        ${choice("src", "unofficial", st.strategy.dataMode === "precincts" && st.strategy.precinctSource === "unofficial" ? "unofficial" : "", "I'll copy them from the county's results website", "Many counties post unofficial results by precinct (Utah County does, for example). Good enough to start — swap in the official numbers later.", "source")}
        ${choice("src", "official", st.strategy.dataMode === "precincts" && st.strategy.precinctSource === "official" ? "official" : "", "I have the official numbers from the county", "The certified results, or a spreadsheet the county sent you.", "source")}
        ${st.cfg.place.state === "UT" ? choice("src", "utah", st.strategy.dataMode === "precincts" && st.strategy.precinctSource === "utah" ? "utah" : "", "Use Utah's official results (built in)", "Every county's precinct results from the state's results site, including city and town races. Nothing to download.", "source") : ""}
        ${choice("src", "openelections", st.strategy.dataMode === "precincts" && st.strategy.precinctSource === "openelections" ? "openelections" : "", "Download them free from OpenElections", `Volunteers publish certified precinct results for most states as files you can open here${st.cfg.place.state ? ` — ${esc(PL.stateName(st.cfg.place.state))} has ${oeCount(st.cfg.place.state)}` : ""}. Mostly state and federal races: you pick the one most like yours.`, "source")}
        ${choice("src", "quick", st.strategy.dataMode === "quick" ? "quick" : "", "Not yet — start with a district estimate", "You'll get a win number now. Add precincts later to see where to knock.", "source")}
        ${st.meta.example ? choice("src", "example", st.strategy.precinctSource === "example" ? "example" : "", "Use the fictional Rivertown numbers", "Only for trying the app.", "source") : ""}
      </div>${st.cfg.place.state ? `<p class="section-label">Where to look</p>${placeCard(false)}` : ""}`,
      help: ["Where do I find precinct results?", "<p>Search for your county's election results page and pick the last 3–4 elections like yours (same office or same kind of election — for a city council race, past city elections).</p><p>For each precinct you need: registered voters, ballots cast, total votes in the race, and votes for the candidate most like you (same side of the main local issue, or the same party in a partisan race).</p><p>Unofficial results come out on election night and can change slightly. Official (certified) numbers come a few weeks later — ask the county clerk to email them.</p>"] },
    { id: "precincts", section: "numbers", title: () => st.strategy.dataMode === "quick" ? "A quick district estimate" : "Past results by precinct",
      sub: () => st.strategy.dataMode === "quick" ? "Four numbers from your election office or past results." : "One row per precinct. Paste from a spreadsheet, or type them in.",
      body: () => st.strategy.dataMode === "quick" ? quickBody() : precinctBody(),
      live: { pstatus: () => precinctStatus(), plabels: () => "" },
      help: ["What do these numbers mean?", "<p><b>Registered now</b> — voters in the precinct today.</p><p>For each past election: <b>registered</b> and <b>ballots cast</b> (everyone who voted), <b>total votes in the race</b> (some people skip down-ballot races), and <b>votes for a candidate like you</b>.</p><p>“A candidate like you” is a judgment call: in a nonpartisan race, pick the past candidate closest to you on the big local issue. Write down why you picked them.</p>"] },
    { id: "budget", section: "numbers", title: "Money and people", sub: "Rough numbers are fine. Plan to the amount you'll likely raise.",
      body: () => `<div class="two">${field({ bind: "strategy.budget.likely", label: "Likely budget", im: "numeric", ph: "$18,000" })}${field({ bind: "strategy.field.volunteers", label: "Reliable volunteers", im: "numeric", kind: "int" })}</div>
        <div class="two">${field({ bind: "strategy.budget.low", label: "If it's tight", opt: "optional", im: "numeric", sm: true })}${field({ bind: "strategy.budget.high", label: "If it goes well", opt: "optional", im: "numeric", sm: true })}</div>
        <p class="hint">Count volunteers by name, not hopes — people who'll give a shift most weeks.</p><div data-live="budgetprev"></div>`,
      live: { budgetprev: () => {
        const b = S.budget(st, result());
        if (!b.likely) return "";
        return `<div class="card"><h2>How it splits</h2>${b.lines.map((l) => `<div class="stat"><span>${l.key}</span><b>${U.money(l.amount)}</b></div>`).join("")}<p class="hint">Typical splits for a ${["under $10k", "$10k–$50k", "$50k+"][b.tier]} race. You can change them on your plan.</p></div>`;
      } },
      help: ["How much does a local race cost?", "<p>It varies a lot. Many city council and school board races run between a few thousand and tens of thousands of dollars. Ask a past candidate in your area what they spent; spending reports are public.</p><p>⚖️ Contribution limits, who may give, and whether you need a treasurer and separate bank account are set by state law.</p>"] },
    { id: "language", section: "numbers", title: "Do your voters need another language?", sub: "The kit makes Spanish versions when the district calls for it.",
      body: () => `${field({ bind: "cfg.language.acs_share_limited_english", kind: "pct", label: "Adults who speak Spanish and English “less than very well”", im: "decimal", ph: "8", hint: "As a percent. Leave blank if you don't know yet." })}
        <div data-live="langrec"></div>
        <div class="card flush" style="margin-top:12px"><label class="toggle"><input type="checkbox" data-act="spanish" ${st.cfg.language.secondary === "es" ? "checked" : ""}><span class="grow"><b>Make Spanish versions</b><br><span class="small muted">Door hanger, palm card, website pages and emails. A fluent speaker from the district must check them.</span></span></label></div>`,
      live: { langrec: () => {
        const v = st.cfg.language.acs_share_limited_english;
        if (v == null || v === "") return "";
        return v >= 0.05 ? note("info", `${U.pct(v, 1)} is at or above the kit's 5% guideline — Spanish versions are recommended.`) : note("ok", `${U.pct(v, 1)} is under the kit's 5% guideline. English-only is reasonable; you can still add Spanish.`);
      } },
      help: ["Where do I find this?", "<p>The Census Bureau's American Community Survey has it. Go to data.census.gov, search table <b>C16001</b> (or S1601), and filter to your city, county or district. Look for “Speak Spanish: speak English less than very well”, divided by the total population 5 and older.</p><p>The app only makes Spanish versions today. For another language, translate the Spanish fields' English text with a fluent volunteer.</p>"] },
    { id: "bio", section: "you", title: "Introduce yourself in a few lines", sub: "Plain words a neighbor would use. These go on your mailer, palm card and website.",
      body: () => `${field({ bind: "cfg.candidate.bio_short", label: "One or two sentences", rows: 3, ph: "Civil engineer. 15 years in District 4. Led the push that got the Mill Creek culvert cleared." })}
        <p class="lbl">Three proof points</p>${[0, 1, 2].map((i) => field({ bind: `cfg.candidate.bio_points.${i}`, id: `bp${i}`, sm: true, ph: ["What you do and for how long", "Something you got done here", "Family, neighborhood, how long you've lived here"][i] })).join('<div style="height:8px"></div>')}`,
      help: ["Not sure what to say?", "<p>Have a friend ask you these out loud and write down your words:</p><p>• What do you do for work? What did you do before that?<br>• Name one problem you've helped solve here. What happened, step by step?<br>• Finish this sentence in under 20 words: “I'm running because…”<br>• What do people who know you well say you're good at?</p><p>The phrases you use naturally are usually your best ones. The full interview is in the kit's <i>inputs/candidate-interview.md</i>.</p>"] },
    { id: "issues", section: "you", title: "Your three local issues", sub: "Specific, local, and within the power of this office.",
      body: () => [0, 1, 2].map((i) => `<div class="card"><h2>Issue ${i + 1}</h2>${field({ bind: `cfg.message_box.issues.${i}.title`, label: "In a few words", sm: true, ph: ["Fix east-side flooding", "Faster permits for small businesses", "A safe walk to school"][i] })}${field({ bind: `cfg.message_box.issues.${i}.short`, label: "What you'll do, in one sentence", sm: true, rows: 2 })}${field({ bind: `cfg.message_box.issues.${i}.detail`, label: "More detail for your website", opt: "optional", rows: 3, sm: true })}</div>`).join(""),
      help: ["How to pick", "<p>For each issue: what's the problem in a neighbor's words, who it affects and where, what you'd actually do, and how you'd know it worked.</p><p><b>Check:</b> can this office actually fix it? A school board can't change state tax law. Voters notice.</p>"] },
    { id: "photo", section: "you", title: "Add a photo of yourself", sub: "A real, recent, well-lit photo. It stays on this device until you download your files.",
      body: () => `<div class="card center">${st.photo ? `<img src="${st.photo}" alt="Your photo" style="max-width:100%;max-height:340px;border-radius:12px">` : `<p class="muted">No photo yet. Your materials show a placeholder box until you add one.</p>`}
        <div class="row" style="justify-content:center;margin-top:12px;flex-wrap:wrap"><label class="btn secondary small" for="photo-in">${st.photo ? "Choose a different photo" : "Choose a photo"}</label>
        <input id="photo-in" type="file" accept="image/*" class="sr" data-act="photo">${st.photo ? '<button type="button" class="btn danger small" data-act="photo-remove">Remove</button>' : ""}</div></div>`,
      help: ["What makes a good campaign photo?", "<p>Outdoors in soft light, shoulders up, looking at the camera, in your district if you can. Ask a friend with a good phone camera. For print, a photo straight from a modern phone is plenty.</p><p>⚖️ Some states restrict photos taken in public buildings or of public employees in uniform.</p>"] },
    { id: "web", section: "contact", title: "Where should people find you?", sub: "Leave a blank if you don't have it yet. QR codes point to your website.",
      body: () => `${field({ bind: "cfg.web.base_url", label: "Your website address", ph: "chrisporter.com", type: "url", hint: "The address you'll use once your website is published. Buy one for about $12 a year, or use the free address your host gives you." })}
        ${field({ bind: "cfg.web.donate_processor_url", label: "Donation page link", opt: "optional", type: "url", hint: "From your donation processor (for example ActBlue, WinRed, Anedot, or a local option). ⚖️ Your state may require collecting donor employer and occupation." })}
        ${field({ bind: "cfg.web.email", label: "Campaign email", type: "email", ac: "email" })}
        ${field({ bind: "cfg.web.phone", label: "Campaign phone", opt: "optional", type: "tel" })}
        ${field({ bind: "cfg.web.mailing_address", label: "Mailing address", ph: "PO Box 404, Rivertown, ST 00000" })}`,
      help: ["Do I need a website?", "<p>Yes — it's where QR codes, mailers and social posts send people. The app builds the whole site for you, and the Website screen walks you through publishing it free on your own account.</p>"] },
    { id: "signup", section: "contact", title: "When someone wants to help, where should it go?", sub: "The “Volunteer” page sends sign-ups here. The app never sees them.",
      body: () => {
        const p = (st.cfg.web.forms || {}).provider === "listmonk" ? "listmonk" : st.cfg.web.volunteer_form_url ? "link" : "email";
        return `<div class="card flush" role="radiogroup" aria-label="Where sign-ups go">${choice("su", "email", p, "Email me", "Simplest. The button opens the volunteer's email with your address filled in.", "signup")}${choice("su", "link", p, "A sign-up form I already have", "Google Forms, Mobilize, your donation platform's form, or similar.", "signup")}${choice("su", "listmonk", p, "My listmonk email list", "Advanced: sign-ups go straight onto your lists and start the welcome emails.", "signup")}</div>
          <div data-live="sudetail"></div>`;
      },
      live: { sudetail: () => {
        const f = st.cfg.web.forms || {};
        if (f.provider === "listmonk") return `${field({ bind: "cfg.web.forms.listmonk_url", label: "listmonk address", type: "url", ph: "https://lists.yourname.com" })}${field({ bind: "cfg.web.forms.lists.updates", label: "“Updates” list ID", sm: true })}${field({ bind: "cfg.web.forms.lists.volunteer_doors", label: "Door-knocking list ID", opt: "optional", sm: true })}${field({ bind: "cfg.web.forms.lists.volunteer_phones", label: "Phone-bank list ID", opt: "optional", sm: true })}${field({ bind: "cfg.web.forms.lists.yard_sign", label: "Yard-sign list ID", opt: "optional", sm: true })}<p class="hint">In listmonk: Lists → each list's UUID. Turn on public subscription for each.</p>`;
        if (st.view_signup === "link" || st.cfg.web.volunteer_form_url) return field({ bind: "cfg.web.volunteer_form_url", label: "Sign-up form link", type: "url" });
        return st.cfg.web.email ? note("ok", `Sign-ups will email <b>${esc(st.cfg.web.email)}</b>.`) : note("warn", "Add your campaign email on the previous screen.");
      } } },
    { id: "disclaimer", section: "contact", title: "Your “Paid for by” line", sub: "Most states require it on signs, mail, ads, emails and your website. The exact wording is set by law.",
      body: () => `${field({ bind: "cfg.disclaimer.text", label: "Paid for by", ph: st.cfg.disclaimer.autoText || "Paid for by Friends of Your Name", law: true, rows: 2 })}
        ${st.cfg.language.secondary === "es" ? field({ bind: "cfg.disclaimer.text_es", label: "In Spanish", opt: "if your state requires it", rows: 2, ph: (st.cfg.disclaimer.text || st.cfg.disclaimer.autoText || "").replace(/^Paid for by/, "Pagado por") }) : ""}
        ${field({ bind: "cfg.disclaimer.address_line", label: "Address on the disclaimer", ph: "PO Box 404, Rivertown, ST 00000" })}
        ${note("warn", "Call your election office or state campaign finance agency to confirm the exact wording, any required treasurer name or address, the minimum type size, and whether it needs a box. Then tick it off in “Before you print”.")}`,
      help: ["What usually varies by state?", "<p>• The exact words (“Paid for by”, “Authorized by”, the committee name)<br>• Whether to include an address or a treasurer's name<br>• Minimum type size and whether it needs a border<br>• Which small items are exempt (buttons, pens, tiny ads)<br>• Whether translated materials need a translated disclaimer</p>"] }
  ];
  // Directory card for the chosen place: election office, results, finance, and a search the candidate opens on purpose.
  const placeCard = (withOffice) => {
    const pl = st.cfg.place;
    if (!pl.state) return "";
    const dir = PL.dir(pl.state), cty = PL.county(pl.state, pl.county), sn = PL.stateName(pl.state);
    const link = (url, label) => `<a class="item" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="grow">${label}<br><span class="tiny muted">${esc(U.domain(url).split("/")[0])}</span></span>${I.chev()}</a>`;
    const search = (what, label) => `<a class="item" href="${esc(PL.searchUrl(pl, what))}" target="_blank" rel="noopener noreferrer"><span class="grow">${label}<br><span class="tiny muted">Opens a web search for “${esc([pl.county ? pl.county + " County" : "", sn, what].filter(Boolean).join(" "))}”</span></span>${I.chev()}</a>`;
    let h = "";
    if (cty) h += `<div class="card"><h2>${esc(cty.name)} County elections</h2><p class="small" style="margin:4px 0 0">${esc(cty.address)}<br><a href="tel:${esc(cty.phone.replace(/[^\d]/g, ""))}">${esc(cty.phone)}</a></p>
      ${withOffice && (st.cfg.election.election_office !== `${cty.name} County Clerk — Elections`) ? '<button type="button" class="btn secondary small" style="margin-top:10px" data-act="pl-use">Use this as my election office</button>' : ""}</div>`;
    h += `<div class="card flush list">`;
    if (cty) { h += link(cty.url, `${esc(cty.name)} County elections page`); if (cty.results) h += link(cty.results, `${esc(cty.name)} County election results`); }
    if (dir) {
      dir.results.forEach((r) => { h += link(r.url, esc(r.label)); });
      h += link(dir.office.url, esc(dir.office.name));
      h += link(dir.finance.url, esc(dir.finance.name));
    }
    h += search("election results by precinct", `Find ${pl.county ? esc(pl.county) + " County's" : "your county's"} past results`);
    if (!dir) h += search("state election office", `Find ${esc(sn)}'s state election office`);
    h += `</div>`;
    if (dir) h += `<p class="tiny muted" style="margin:8px 4px 0">${esc(sn)} listings from <a href="${esc(dir.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(dir.source)}</a>, checked ${U.fmtDate(dir.checked, "en", "long")}. Links open the office's own site.</p>${withOffice ? dir.tips.map((t) => note("info", esc(t))).join("") : ""}`;
    else h += `<p class="tiny muted" style="margin:8px 4px 0">The app's built-in directory covers Utah so far. Searches open in a new tab — the only time your county name leaves the app.</p>`;
    return h;
  };
  const officeFill = () => {
    const pl = st.cfg.place, cty = PL.county(pl.state, pl.county);
    if (!cty || st.cfg.election.election_office === `${cty.name} County Clerk — Elections`) return "";
    return note("info", `${esc(cty.name)} County's details are in the app's directory. <button type="button" class="linkbtn" data-act="pl-use">Fill them in</button>`);
  };
  const oeCount = (state) => {
    const n = (window.CIB_OE_COUNTS || {})[state];
    return n == null ? "files" : n ? `${n} files` : "no precinct files yet";
  };

  const QI = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, i]));
  const FLOW = ["q/name", "q/office", "q/where", "q/eday", "q/dates", "q/officeinfo", "q/source", "q/precincts", "q/budget", "q/language", "plan", "q/bio", "q/issues", "q/photo", "message", "slogans", "q/web", "q/signup", "q/disclaimer", "materials"];
  const nextOf = (here) => { const i = FLOW.indexOf(here); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : "home"; };
  const prevOf = (here) => { const i = FLOW.indexOf(here); return i > 0 ? FLOW[i - 1] : ""; };

  /* ------------------------------------------------------------ precincts */
  const quickBody = () => `<div class="card">${field({ bind: "strategy.quick.registered", label: "Registered voters in the district", im: "numeric", sm: true })}
    ${field({ bind: "strategy.quick.turnout", label: "Typical turnout in elections like this (%)", im: "decimal", sm: true, ph: "30" })}
    ${field({ bind: "strategy.quick.rolloff", label: "Voters who mark this race (%)", im: "decimal", sm: true, hint: "Some voters skip races at the bottom of the ballot. 90% is a common guess." })}
    ${field({ bind: "strategy.quick.baseline", label: "Share a candidate like you usually gets (%)", opt: "optional", im: "decimal", sm: true })}</div>
    <div data-live="pstatus"></div>`;

  const nEl = () => Math.max(1, Math.min(4, st.strategy.electionLabels.length || 3));
  const precinctBody = () => {
    const n = nEl(), P = st.strategy.precincts;
    const head1 = `<tr><th rowspan="2">Precinct</th><th rowspan="2">Registered now</th>${Array.from({ length: n }, (_, j) => `<th colspan="4" class="eh"><input class="sm" style="width:150px" aria-label="Name of past election ${j + 1}" placeholder="Past election ${j + 1}" data-bind="strategy.electionLabels.${j}" value="${esc(st.strategy.electionLabels[j] || "")}"></th>`).join("")}<th rowspan="2">Notes</th><th rowspan="2"><span class="sr">Remove</span></th></tr>`;
    const head2 = `<tr>${Array.from({ length: n }, () => `<th class="el">Registered</th><th>Ballots</th><th>Like you</th><th>Race total</th>`).join("")}</tr>`;
    const rows = P.map((p, i) => `<tr><td><input class="name" aria-label="Precinct name, row ${i + 1}" data-bind="strategy.precincts.${i}.precinct" value="${esc(p.precinct)}"></td>
      <td><input inputmode="numeric" aria-label="Registered now, precinct ${esc(p.precinct || i + 1)}" data-bind="strategy.precincts.${i}.registered_now" value="${esc(p.registered_now)}"></td>
      ${Array.from({ length: n }, (_, j) => ["registered", "ballots_cast", "baseline_votes", "race_total_votes"].map((k, kk) => `<td${kk === 0 ? ' class="el"' : ""}><input inputmode="numeric" aria-label="${["Registered", "Ballots cast", "Votes for a candidate like you", "Total votes in race"][kk]}, ${esc(st.strategy.electionLabels[j] || "past election " + (j + 1))}, precinct ${esc(p.precinct || i + 1)}" data-bind="strategy.precincts.${i}.elections.${j}.${k}" value="${esc(((p.elections || [])[j] || {})[k] || "")}"></td>`).join("")).join("")}
      <td><input class="note" aria-label="Notes, precinct ${esc(p.precinct || i + 1)}" data-bind="strategy.precincts.${i}.notes" value="${esc(p.notes || "")}"></td>
      <td><button type="button" class="iconbtn" data-act="prow-del" data-arg="${i}" aria-label="Remove precinct ${esc(p.precinct || i + 1)}">${I.trash()}</button></td></tr>`).join("");
    return `${st.strategy.precinctSource === "unofficial" ? note("warn", "Estimating from unofficial results. When the county sends the official numbers, replace these.") : ""}
      ${st.strategy.precinctSource === "utah" ? note("info", `From Utah's official results site. Unofficial results can change at the canvass, and precincts matched across years are marked in the notes. Replace <b>Registered now</b> with today's counts when you can. <a href="#/oe/utah">Change elections or precincts</a>`) : ""}
      ${st.strategy.precinctSource === "file" ? note("info", `From the results file you opened. Check a few numbers against the county's report. <a href="#/oe">Change</a>`) : ""}
      ${st.strategy.precinctSource === "openelections" ? note("info", `From OpenElections (certified results, compiled by volunteers). Check a few numbers against the county's report, and replace <b>Registered now</b> with today's counts from your county clerk. <a href="#/oe">Change elections or precincts</a>`) : ""}
      <div class="card" style="padding:8px 8px 4px"><div class="scrollx" role="region" aria-label="Precinct results table"><table class="pgrid">${head1}${head2}<tbody>${rows}</tbody></table></div>
      <div class="linkrow" style="padding:4px 8px"><button type="button" class="linkbtn" data-act="prow-add">+ Add a precinct</button>${n < 4 ? '<button type="button" class="linkbtn" data-act="pel-add">+ Add a past election</button>' : ""}${n > 1 ? '<button type="button" class="linkbtn" data-act="pel-del">− Remove the last election</button>' : ""}</div></div>
      <details class="help"><summary>${I.plus({ c: "var(--blue)" })}Paste from a spreadsheet</summary><div>
        <p>Copy rows from Excel, Google Sheets or the county's download and paste below. Columns: precinct, registered now, then for each past election: registered, ballots cast, votes for a candidate like you, total votes in the race. A header row from the kit's template also works.</p>
        <textarea class="field sm" rows="5" id="paste" aria-label="Pasted rows" placeholder="401, 1450, 1300, 261, 148, 240, …"></textarea>
        <div class="linkrow"><button type="button" class="btn small" data-act="paste">Use these rows</button><button type="button" class="linkbtn" data-act="template">Download the blank template</button></div></div></details>
      <div data-live="pstatus"></div>`;
  };
  const precinctStatus = () => {
    const r = result();
    const prob = (r.problems || []).slice(0, 6).map((p) => `<li>${esc(p.text)}</li>`).join("");
    const dropped = (r.problems || []).filter((p) => !p.kept).length;
    const s = r.summary;
    return (prob ? note("warn", `<b>Check these rows:</b><ul style="margin:6px 0 0;padding-left:18px">${prob}</ul>${r.problems.length > 6 ? `<p>…and ${r.problems.length - 6} more.</p>` : ""}`) : "")
      + (s ? note("ok", `Win number so far: <b>${U.int(s.winNumber)}</b> votes${s.mode === "precincts" ? ` from ${r.rows.length} precinct${r.rows.length === 1 ? "" : "s"}${dropped ? ` (${dropped} left out until fixed)` : ""}` : ""}.`) : "");
  };
  const parsePaste = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const delim = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const split = (l) => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === delim && !q) { out.push(cur.trim()); cur = ""; } else cur += ch; } out.push(cur.trim()); return out; };
    let rows = lines.map(split);
    const hdr = rows[0].map((h) => h.toLowerCase());
    const out = [], labels = [];
    if (hdr.includes("precinct")) {
      rows = rows.slice(1);
      const ix = (k) => hdr.indexOf(k);
      for (let j = 1; j <= 4; j++) if (ix(`e${j}_registered`) >= 0) labels[j - 1] = rows[0] && ix(`e${j}_label`) >= 0 ? rows[0][ix(`e${j}_label`)] : "";
      rows.forEach((r) => {
        if (!r[ix("precinct")]) return;
        const els = [];
        for (let j = 1; j <= 4; j++) if (ix(`e${j}_registered`) >= 0 && r[ix(`e${j}_registered`)]) els.push({ registered: r[ix(`e${j}_registered`)], ballots_cast: r[ix(`e${j}_ballots_cast`)], baseline_votes: r[ix(`e${j}_baseline_votes`)], race_total_votes: r[ix(`e${j}_race_total_votes`)] });
        out.push({ precinct: r[ix("precinct")], registered_now: r[ix("registered_now")], notes: ix("notes") >= 0 ? r[ix("notes")] || "" : "", elections: els });
      });
    } else {
      rows.forEach((r) => {
        if (!r[0] || /^precinct/i.test(r[0])) return;
        const nums = r.slice(2), els = [];
        for (let k = 0; k + 3 < nums.length && els.length < 4; k += 4) els.push({ registered: nums[k], ballots_cast: nums[k + 1], baseline_votes: nums[k + 2], race_total_votes: nums[k + 3] });
        const leftover = nums.length % 4 ? nums[nums.length - 1] : "";
        out.push({ precinct: r[0], registered_now: r[1], notes: U.num(leftover) == null ? leftover : "", elections: els });
      });
    }
    return out.length ? { rows: out, labels } : null;
  };

  /* --------------------------------------------------------------- screens */
  const SCREENS = {};
  const backLink = (href, label) => `<a class="back" href="#/${href}">${I.back()}${esc(label || "Back")}</a>`;

  SCREENS.welcome = () => ({
    title: "", bare: true,
    html: `<div class="welcome">
      <div class="applogo">${I.house({ s: 38, w: 2 })}</div>
      <h1 class="big">Let's build your campaign.</h1>
      <p class="lede" style="font-size:17px">Answer a few questions in plain English. We'll turn them into a plan and everything you need to print, post and send.</p>
      <div class="feature"><span class="ic" style="background:var(--blue-soft)">${I.target({ c: "var(--blue)" })}</span><div><b>Your plan</b><span>How many votes you need, and which neighborhoods to focus on.</span></div></div>
      <div class="feature"><span class="ic" style="background:var(--amber-soft)">${I.chat({ c: "var(--amber)" })}</span><div><b>Your message</b><span>One sentence that says why you're running.</span></div></div>
      <div class="feature"><span class="ic" style="background:var(--green-soft)">${I.screen({ c: "var(--green)" })}</span><div><b>Your materials</b><span>Yard signs, mailers, a website and emails — ready for the printer.</span></div></div>
      <p class="privacy">${I.lock()} Saved only on this device. Nothing you type leaves it. Free and open source.</p>
    </div>`,
    actions: `<a class="btn" href="#/q/name" data-act="start">Get started</a><button type="button" class="btn quiet" data-act="example">See an example campaign</button>
      <label class="btn quiet" for="restore-w">Open a backup file</label><input type="file" id="restore-w" class="sr" accept=".json,application/json" data-act="restore">`
  });

  const progressOf = () => {
    const r = result(), mb = st.cfg.message_box;
    const planDone = !!r.summary, msgDone = !!mb.core_message.trim() && (st.cfg.slogans || []).length >= 1;
    const pieces = R.activePieces(st), ctx = R.context(st);
    const ready = pieces.map((p) => R.piece(st, p, ctx)).filter((x) => x.ready).length;
    const need = lockList();
    return { planDone, msgDone, ready, total: pieces.length, need };
  };

  SCREENS.home = () => {
    const p = progressOf(), r = result(), c = st.cfg.candidate;
    const card = (href, icon, bg, title, sub, status) => `<a class="item" href="#/${href}"><span class="ic" style="flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:${bg}">${icon}</span><span class="grow"><b>${title}</b><br><span class="small muted">${sub}</span></span>${status}${I.chev()}</a>`;
    return {
      title: "Your campaign",
      html: `${st.meta.example ? note("info", `You're looking at a <b>fictional example</b> (Chris Porter, Rivertown). Change anything to see how it works. <button type="button" class="linkbtn" data-act="new">Start your own campaign</button>`) : ""}
        <h1>${esc(c.full_name || "Your campaign")}</h1>
        <p class="lede">${esc([c.office, c.district].filter(Boolean).join(" · ") || "Let's get the basics in.")}${st.cfg.election.election_day ? ` · Election Day ${U.fmtDate(st.cfg.election.election_day, "en", "long")}` : ""}</p>
        <div class="card flush list">
          ${card("q/name", I.house({ c: "var(--ink)" }), "var(--chip)", "Your race", "Name, office, dates, election office", st.cfg.election.election_day && c.office ? I.done() : I.todo())}
          ${card("plan", I.target({ c: "var(--blue)" }), "var(--blue-soft)", "Your plan", r.summary ? `Win number ${U.int(r.summary.winNumber)} votes` : "Win number and where to knock", p.planDone ? I.done() : I.todo())}
          ${card("message", I.chat({ c: "var(--amber)" }), "var(--amber-soft)", "Your message", st.cfg.message_box.core_message ? "Message box, one sentence, slogans" : "Why you're running, in one sentence", p.msgDone ? I.done() : I.todo())}
          ${card("materials", I.screen({ c: "var(--green)" }), "var(--green-soft)", "Your materials", `${p.ready} of ${p.total} print pieces ready`, p.ready === p.total ? I.done() : I.todo())}
          ${card("checklist", I.tick({ c: "var(--ink)" }), "var(--chip)", "Before you print", p.need.length ? `${p.need.length} thing${p.need.length > 1 ? "s" : ""} to confirm` : "Ready for the printer", p.need.length ? I.todo() : I.done())}
        </div>
        <p class="section-label">Saving</p>
        <div class="card">${note("info", "Your campaign is saved <b>only in this browser on this device</b>. Your phone and laptop aren't connected. To move between them, download a backup file and open it on the other device.")}
          <div class="linkrow" style="margin-top:8px"><button type="button" class="linkbtn" data-act="backup">Download a backup</button><a class="linkbtn" href="#/save">More saving options</a></div></div>`,
      actions: `<a class="btn" href="#/${!c.office ? "q/name" : !p.planDone ? "plan" : !p.msgDone ? "message" : "materials"}">Continue</a>`
    };
  };

  SCREENS.q = (id) => {
    const q = QUESTIONS[QI[id]] || QUESTIONS[0];
    const inSec = QUESTIONS.filter((x) => x.section === q.section), idx = inSec.indexOf(q);
    const here = "q/" + q.id, prev = prevOf(here) || "home";
    const pct = Math.round(((FLOW.indexOf(here) + 1) / FLOW.length) * 100);
    const t = (v) => (typeof v === "function" ? v() : v);
    return {
      title: `${SECTIONS[q.section]} · ${idx + 1} of ${inSec.length}`, back: [prev, "Back"], cls: q.id === "precincts" && st.strategy.dataMode !== "quick" ? "wide" : q.id === "issues" ? "mid" : "",
      html: `<div class="progress" role="progressbar" aria-label="Setup progress" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
        <h1 style="margin-top:28px">${esc(t(q.title))}</h1><p class="lede">${esc(t(q.sub) || "")}</p>${q.body()}${q.help ? help(q.help[0], q.help[1]) : ""}`,
      live: q.live,
      actions: `<a class="btn" href="#/${nextOf(here)}">Continue</a>`
    };
  };

  /* plan */
  SCREENS.plan = () => {
    const r = result(), s = r.summary, g = S.groups(r.rows), sg = st.strategy;
    if (!s) return {
      title: "Your plan", back: ["home", "Home"],
      html: `<h1>Your plan</h1><p class="lede">We need a few numbers to work out how many votes you need.</p>
        ${r.problems && r.problems.length ? note("warn", "Some precinct rows need fixing before we can count them.") : ""}
        <div class="card flush list"><a class="item" href="#/q/source"><span class="grow"><b>Add your numbers</b><br><span class="small muted">Precinct results, or a quick district estimate</span></span>${I.chev()}</a></div>`,
      actions: `<a class="btn" href="#/q/source">Add my numbers</a>`
    };
    const base = s.expectedBase, gap = s.gap;
    const basePct = base != null ? Math.min(100, (base / s.winNumber) * 100) : 0;
    const fc = S.field(st, r), b = S.budget(st, r), cal = S.calendar(st.cfg), prod = S.production(st.cfg);
    const today = U.today();
    const upcoming = cal.filter((m) => m.date >= today).slice(0, 4);
    const group = (k, color, title, why) => g[k].length ? `<div class="item" style="cursor:default"><span class="dot" style="background:${color}"></span><span class="grow"><b>${title}</b><br><span class="small muted">Precincts ${g[k].map((x) => esc(x.precinct)).join(", ")}</span></span><span class="small muted">${why}</span></div>` : "";
    return {
      title: "Your plan", back: [prevOf("plan") || "home", "Back"], cls: "mid",
      html: `<h1>Your plan</h1>
        ${sg.precinctSource === "utah" && sg.dataMode === "precincts" ? note("info", `Past results from Utah's official results site. Check matched precincts in the notes, and update “Registered now” with today's numbers. <a href="#/q/precincts">Review the table</a>`) : ""}
        ${sg.precinctSource === "openelections" && sg.dataMode === "precincts" ? note("info", `Past results from OpenElections. Check them against the county's report, and update “Registered now” with today's numbers. <a href="#/q/precincts">Review the table</a>`) : ""}
        ${sg.precinctSource === "unofficial" && sg.dataMode === "precincts" ? note("warn", `These numbers come from the county's <b>unofficial</b> results. When the county sends the official numbers, <a href="#/q/precincts">replace them</a> — the plan updates on its own.`) : ""}
        ${st.meta.example ? note("info", "Fictional example numbers (Rivertown).") : ""}
        <div class="cols"><div>
        <div class="card center"><div class="muted" style="font-weight:600;font-size:15px">To win, you need about</div>
          <div class="winbig">${U.int(s.winNumber)}</div><div style="font-weight:600">votes</div>
          <p class="small" style="margin:10px auto 0;max-width:320px;color:var(--ink2)">${s.multiSeat ? `About what the last winner got, scaled to this year's turnout, plus a ${U.pct(s.margin)} cushion.` : `About ${U.int(s.raceVotes)} people will vote in your race. Half of them plus one, plus a ${U.pct(s.margin)} cushion in case turnout surprises you.`}</p>
          ${S.RACE_TYPES[sg.raceType].note ? `<p class="tiny muted" style="margin:8px 0 0">⚖️ ${esc(S.RACE_TYPES[sg.raceType].note)}</p>` : ""}</div>
        ${base != null ? `<div class="card"><div class="row" style="justify-content:space-between;font-weight:600;font-size:15px"><span>Your estimated starting point</span><span>~${U.int(base)}</span></div>
          <div class="bar2" role="img" aria-label="Estimated starting point ${U.int(base)} of ${U.int(s.winNumber)} votes"><div style="width:${basePct}%;background:var(--blue)"></div><div style="width:${100 - basePct}%;background:#F2A33A"></div></div>
          <div class="legend"><span><span class="dot" style="background:var(--blue);width:10px;height:10px"></span>Votes a candidate like you usually gets here</span><span><span class="dot" style="background:#F2A33A;width:10px;height:10px"></span>${gap > 0 ? `~${U.int(gap)} more to win` : `~${U.int(-gap)} over the win number`}</span></div>
          ${note("warn", `<b>This is history, not supporters you've found.</b> It's based on how a similar candidate did in past elections here. An unusual issue in that race, or big changes in who lives here (new housing, people moving in or out, new district lines), can throw it off. <a href="#/how">How we worked this out</a>`)}</div>`
          : `<div class="card">${note("info", `Add the share a candidate like you usually gets to see your starting point. <a href="#/how">How we worked this out</a>`)}</div>`}
        </div><div>
        <div class="card flush"><p class="section-label" style="margin:12px 20px 4px">Where to spend your Saturdays</p>
          ${r.rows.length ? `<div class="list">${group("Persuade", "#F2A33A", "Persuade", "Close races")}${group("Turn Out", "var(--blue)", "Turn out", "Friendly, low turnout")}${group("Base - Light Touch", "var(--green)", "Light touch", "Friendly, already vote")}${group("Skip", "#AEAEB2", "Skip for now", "Hard to win")}</div>`
            : `<div style="padding:4px 20px 14px">${note("info", `Add precinct results to see which neighborhoods to knock. <a href="#/q/source">Add them</a>`)}</div>`}</div>
        <div class="card"><h2>Can your volunteers reach them?</h2>
          <div class="stat"><span>Doors you can knock by Election Day</span><b>${U.int(fc.doors)}</b></div>
          <div class="stat"><span>Conversations (about ${U.pct(st.strategy.field.contactRate)} answer)</span><b>${U.int(fc.conversations)}</b></div>
          <div class="stat"><span>Votes those conversations could add</span><b>~${U.int(fc.votesAdded)}</b></div>
          ${fc.needed ? `<div class="stat"><span>Votes still needed</span><b>${U.int(fc.needed)}</b></div>` : ""}
          ${fc.coverage != null ? note(fc.coverage >= 1 ? "ok" : "warn", fc.coverage >= 1 ? "Your door-knocking can cover the gap — if you keep the pace." : `Doors cover about ${U.pct(fc.coverage)} of the gap. Add volunteers or weeks, or lean on mail.`) : ""}
          <p class="tiny muted" style="margin:8px 0 0">${st.strategy.field.volunteers} volunteers × 1 shift a week × 40 doors, plus 150 candidate doors a week, for 10 weeks. One added vote per 15 conversations is a planning guess — track your real numbers.</p></div>
        </div></div>
        <div class="cols"><div>
        <div class="card"><h2>Calendar</h2>${upcoming.map((m) => `<div class="stat"><span>${esc(m.label)}${m.law ? ' <span class="law">⚖️</span>' : ""}</span><b>${U.fmtDate(m.date)}</b></div>`).join("") || '<p class="muted small">Add Election Day to build your calendar.</p>'}
          <p class="section-label" style="margin:14px 0 4px">Order by</p>${prod.filter((p) => p.startBy >= today).slice(0, 4).map((p) => `<div class="stat"><span>${esc(p.label)}</span><b>${U.fmtDate(p.startBy)}</b></div>`).join("")}
          <div class="linkrow"><a class="linkbtn" href="#/q/dates">Change dates</a></div></div>
        </div><div>
        ${b.likely ? `<div class="card"><h2>Budget · ${U.money(b.likely)}</h2>${b.lines.map((l) => `<div class="stat"><span>${l.key} <span class="muted tiny">${U.pct(l.share)}</span></span><b>${U.money(l.amount)}</b></div>`).join("")}
          <p class="small" style="margin:10px 0 0">Buys about <b>${U.int(b.buys.mailPieces)}</b> mail pieces, <b>${U.int(b.buys.signs)}</b> yard signs and <b>${U.int(b.buys.printed)}</b> palm cards or door hangers.</p>
          ${b.coverage != null ? note(b.coverage >= 1 ? "ok" : "warn", b.coverage >= 1 ? "Your mail budget covers every target household 3 times." : `Mail covers about ${U.pct(b.coverage)} of target households 3 times. Mail only the top-ranked precincts, or raise more.`) : ""}
          <p class="tiny muted" style="margin:8px 0 0">⚖️ Contribution limits and reporting rules vary by state.</p></div>`
          : `<div class="card"><h2>Budget</h2><p class="muted small">Add your likely budget to see the split.</p><a class="linkbtn" href="#/q/budget">Add budget</a></div>`}
        </div></div>
        <div class="linkrow" style="margin:16px 4px"><button type="button" class="linkbtn" data-act="plan-dl">Download the plan</button><a class="linkbtn" href="#/how">How we worked this out</a><a class="linkbtn" href="#/q/source">Change numbers</a></div>`,
      actions: `<a class="btn" href="#/${nextOf("plan")}">Next: ${st.cfg.candidate.bio_short ? "your message" : "about you"}</a>`
    };
  };

  SCREENS.how = () => {
    const r = result(), s = r.summary, sg = st.strategy;
    return {
      title: "How we worked this out", back: ["plan", "Plan"], cls: "mid",
      html: `<h1>How we worked this out</h1>
        <p class="lede">The same math as the kit's strategy workbook and <i>tools/targeting.py</i>. Change the settings below and the plan updates.</p>
        ${s ? `<div class="card"><h2>Win number</h2>
          <div class="stat"><span>Registered voters now</span><b>${U.int(s.registered)}</b></div>
          <div class="stat"><span>Turnout in past elections like this</span><b>${s.historicTurnouts.map((t) => U.pct(t, 1)).join(", ")}</b></div>
          <div class="stat"><span>Turnout we used</span><b>${U.pct(s.turnoutUsed, 1)}</b></div>
          <div class="stat"><span>Ballots expected</span><b>${U.int(s.projectedTurnout)}</b></div>
          <div class="stat"><span>Share who vote in this race</span><b>${U.pct(s.rolloff, 1)}</b></div>
          <div class="stat"><span>Votes expected in this race</span><b>${U.int(s.raceVotes)}</b></div>
          <div class="stat"><span>Half plus one</span><b>${U.int(s.votesToWin)}</b></div>
          <div class="stat"><span>Plus a ${U.pct(s.margin)} cushion = <b>win number</b></span><b>${U.int(s.winNumber)}</b></div>
          ${s.expectedBase != null ? `<div class="stat"><span>Votes a candidate like you usually gets here</span><b>~${U.int(s.expectedBase)}</b></div>` : ""}</div>` : ""}
        <div class="card"><h2>Settings</h2>
          <div class="two">${fieldPct("strategy.margin", "Cushion over 50% + 1")}${fieldPct("strategy.turnoutOverride", "Expected turnout", "Blank = average of past elections")}</div>
          <div class="two">${fieldPct("strategy.thresholds.base", "Friendly at or above")}${fieldPct("strategy.thresholds.persuadeLow", "Close at or above")}</div>
          <p class="hint">Precincts where a candidate like you got at least the “friendly” share are friendly: <b>Turn out</b> if turnout is below the district average, <b>Light touch</b> if not. Between the two shares: <b>Persuade</b>. Below: <b>Skip</b>. Within each group, precincts are ranked by how many votes are there to win.</p></div>
        ${r.rows.length ? `<div class="card"><h2>Every precinct</h2><div class="scrollx" tabindex="0" role="region" aria-label="Every precinct, scrollable table"><table class="data"><thead><tr><th>Precinct</th><th>Group</th><th>Turnout</th><th>Like you</th><th>Voters</th><th>Score</th></tr></thead><tbody>
          ${r.rows.map((x) => `<tr><td>${esc(x.precinct)}${x.flags.length ? `<br><span class="tiny muted">${esc(x.flags.join("; "))}</span>` : ""}</td><td>${esc(x.category === "Base - Light Touch" ? "Light touch" : x.category)}</td><td>${U.pct(x.avg_turnout, 1)}</td><td>${U.pct(x.avg_support, 1)}</td><td>${U.int(x.projected_race_voters)}</td><td>${U.int(x.priority_score)}</td></tr>`).join("")}</tbody></table></div>
          <p class="tiny muted">“Small sample” means fewer than ${S.SMALL_PRECINCT_VOTERS} expected voters — treat the numbers loosely.</p></div>` : ""}
        <div class="card"><h2>What this can't tell you</h2><p class="small">These are estimates from past elections, not a poll and not a list of supporters. They miss new residents, new district lines, and anything unusual about the past races. Your real door-knocking results beat these numbers — track them weekly.</p></div>`,
      live: { },
      actions: `<a class="btn" href="#/plan">Back to my plan</a>`
    };
  };
  const fieldPct = (bind, label, hint) => field({ bind, label, kind: "pct", im: "decimal", sm: true, hint, ph: bind === "strategy.turnoutOverride" ? "auto" : "" });

  /* message */
  SCREENS.message = () => {
    const mb = st.cfg.message_box, cc = M.coreCheck(mb.core_message);
    const q3left = (mb.q3_responses || []).filter((q) => q.attack && !String(q.response || "").trim()).length;
    const q2n = (mb.q2 || []).filter((q) => q.text).length, q2src = (mb.q2 || []).filter((q) => q.text && q.source).length;
    const quad = (q, txt, status, sub) => `<a class="quad" href="#/box/${q}"><span class="qh"><span class="qn ${M.QUADS[q].color}">${M.QUADS[q].name}</span>${status}</span><span class="qt">${txt || '<span class="muted">Tap to fill in</span>'}</span>${sub ? `<span class="qs">${sub}</span>` : ""}</a>`;
    const ok = (b) => (b ? `<span style="color:var(--green)">${I.tick({ s: 20 })}</span>` : "");
    return {
      title: "Your message", back: [prevOf("message"), "Back"], cls: "mid",
      html: `<h1>Think through the whole race</h1><p class="lede">Four short lists — what you'll say, and what they'll say. Then one sentence that says it all.</p>
        <div class="quads">
          ${quad("Q1", esc((mb.q1 || []).filter(Boolean).slice(0, 2).join(". ")), ok((mb.q1 || []).filter(Boolean).length))}
          ${quad("Q2", esc(((mb.q2 || []).find((q) => q.text) || {}).text || ""), q2n && q2src === q2n ? ok(true) : q2n ? '<span class="tag warn">source?</span>' : "", q2n ? `${q2src} of ${q2n} with a source` : "")}
          ${quad("Q3", esc((mb.q3_responses || []).filter((q) => q.attack).map((q) => `“${q.attack}”`).slice(0, 2).join(", ")), q3left ? `<span class="tag warn">${q3left} left</span>` : ok((mb.q3_responses || []).length), (mb.q3_responses || []).length ? `${(mb.q3_responses || []).length - q3left} answered` : "")}
          ${quad("Q4", esc((mb.q4 || []).filter(Boolean).slice(0, 2).join(". ")), ok((mb.q4 || []).filter(Boolean).length))}
        </div>
        <div class="card"><label class="lbl" for="core" style="margin-top:0">Your one sentence</label>
          <textarea class="field" id="core" rows="3" data-bind="cfg.message_box.core_message" placeholder="[Name] will [do this local thing], because [proof from your record] — [unlike / while] [the contrast].">${esc(mb.core_message)}</textarea>
          <div data-live="corecheck"></div>
          <div class="linkrow"><button type="button" class="linkbtn" data-act="suggest">Suggest one from my answers</button></div></div>
        ${help("What makes a good sentence?", "<p>Your strongest “why you” point plus your strongest contrast, tied to a local issue.</p><p>• Under 25 words.<br>• A neighbor could repeat it after hearing it once.<br>• It's true and you can prove it.<br>• It doesn't require knowing anything about politics.</p><p>The four lists are the Tully message box, used by campaigns of every party.</p>")}`,
      live: { corecheck: () => { const c = M.coreCheck(st.cfg.message_box.core_message); return `<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px"><span class="tag ${c.ok ? "ok" : "warn"}">${c.text}</span><span class="tag">Combine: why you + contrast</span></div>`; } },
      actions: `<a class="btn" href="#/slogans">Next: slogans</a>`
    };
  };

  SCREENS.box = (q) => {
    q = M.QUADS[q] ? q : "Q1";
    const mb = st.cfg.message_box, info = M.QUADS[q];
    let body = "";
    if (q === "Q1" || q === "Q4") {
      const key = q === "Q1" ? "q1" : "q4";
      body = (mb[key] || []).map((v, i) => `<div class="row entry"><div class="grow">${field({ bind: `cfg.message_box.${key}.${i}`, sm: true, id: `${key}-${i}`, ph: q === "Q1" ? "Civil engineer, 15 years in District 4" : "Experience and relationships at City Hall" })}<label class="sr" for="${key}-${i}">Point ${i + 1}</label></div><button type="button" class="iconbtn" data-act="box-del" data-arg="${key}.${i}" aria-label="Remove point ${i + 1}">${I.trash()}</button></div>`).join("");
      body += `<button type="button" class="linkbtn" data-act="box-add" data-arg="${key}">+ Add a point</button>`;
    } else if (q === "Q2") {
      body = (mb.q2 || []).map((v, i) => `<div class="entry">${field({ bind: `cfg.message_box.q2.${i}.text`, label: `Contrast ${i + 1}`, sm: true, rows: 2, ph: "The east-side drainage study has been “pending” for six years." })}${field({ bind: `cfg.message_box.q2.${i}.source`, label: "Source", sm: true, ph: "City Council minutes, 2021–2027" })}<button type="button" class="linkbtn" data-act="box-del" data-arg="q2.${i}">Remove</button></div>`).join("");
      body += `<button type="button" class="linkbtn" data-act="box-add" data-arg="q2">+ Add a contrast point</button>`;
    } else {
      body = (mb.q3_responses || []).map((v, i) => `<div class="entry">${field({ bind: `cfg.message_box.q3_responses.${i}.attack`, label: `What they'll say`, sm: true, ph: "No government experience" })}${field({ bind: `cfg.message_box.q3_responses.${i}.response`, label: "Your answer, in one sentence", sm: true, rows: 2, ph: "Acknowledge it, then pivot to why you." })}<button type="button" class="linkbtn" data-act="box-del" data-arg="q3_responses.${i}">Remove</button></div>`).join("");
      body += `<button type="button" class="linkbtn" data-act="box-add" data-arg="q3_responses">+ Add an attack</button>`;
    }
    const guide = {
      Q1: "Your strengths, record and values. Pull from your interview and the proof points you wrote about yourself.",
      Q2: "The honest contrast. Keep it factual and about their public record or positions. <b>Every point needs a source</b> — meeting minutes, a vote record, a news story. Nothing gets printed without one.",
      Q3: "Be brutally honest: what will they say about you? Give each one a one-sentence answer that acknowledges it and pivots back to why you.",
      Q4: "Why they say they're the right choice. You won't repeat these — knowing them helps you answer."
    }[q];
    return {
      title: info.name, back: ["message", "Message"], cls: "mid",
      html: `<h1>${esc(info.name)}</h1><p class="lede">${esc(info.long)}</p><div class="note info">${I.info()}<div>${guide}</div></div><div class="card">${body}</div>`,
      actions: `<a class="btn" href="#/message">Done</a>`
    };
  };

  SCREENS.slogans = () => {
    const sl = st.cfg.slogans || [];
    const QS = ["Q1", "Q2", "Q3"];
    return {
      title: "Slogans", back: ["message", "Message"], cls: "mid",
      html: `<h1>Slogans</h1><p class="lede">Write 5 to 10 short lines. Label each with the part of your message it uses. The main one goes on your yard sign.</p>
        <div class="card">${sl.map((s, i) => `<div class="entry">${field({ bind: `cfg.slogans.${i}.text`, sm: true, label: `Slogan ${i + 1}`, ph: "Fix the flooding. Finally." })}
          <div class="chips" role="group" aria-label="Which part of your message slogan ${i + 1} uses">${QS.map((q) => `<button type="button" class="chip" aria-pressed="${(s.quadrants || []).includes(q)}" data-act="sl-q" data-arg="${i}.${q}">${q === "Q3" ? "Answers an attack" : M.QUADS[q].name}</button>`).join("")}</div>
          <div class="row" style="justify-content:space-between;margin-top:6px"><label class="row small" style="gap:8px;min-height:44px"><input type="radio" name="primary" ${s.role === "primary" ? "checked" : ""} data-act="sl-primary" data-arg="${i}" style="width:20px;height:20px;accent-color:var(--blue)"> Main slogan (yard sign)</label>
          <span data-live="slw${i}"></span><button type="button" class="linkbtn" data-act="sl-del" data-arg="${i}">Remove</button></div></div>`).join("")}
          <button type="button" class="linkbtn" data-act="sl-add">+ Add a slogan</button></div>
        <div data-live="slprob"></div>
        ${help("What makes a good slogan?", "<p>Short enough to read from a car (six words or fewer for the sign). Specific to your race. True.</p><p><b>Why you</b> lines say what you'll do or have done. <b>The contrast</b> lines point at their record — only with a source. <b>Answers an attack</b> lines get ahead of what they'll say about you; use them only where that attack is live.</p><p>Never repeat your opponent's pitch, even to argue with it.</p>")}`,
      live: Object.assign({ slprob: () => { const p = M.sloganProblems(st.cfg); return p.length ? note("warn", p.map(esc).join("<br>")) : note("ok", "Your slogans are labeled and ready to test."); } },
        Object.fromEntries(sl.map((s, i) => [`slw${i}`, () => { const n = U.words((st.cfg.slogans[i] || {}).text); return n ? `<span class="tag ${n <= 6 ? "ok" : ""}">${n} words</span>` : ""; }]))),
      actions: `<a class="btn" href="#/${nextOf("slogans")}">Next: contact details</a>`
    };
  };

  /* materials */
  const thumbSvg = (doc) => doc.svg({ preview: true });
  const paletteButtons = () => {
    const B = K.brand().palettes, cur = st.cfg.brand.palette;
    return Object.entries(B).map(([k, p]) => `<button type="button" class="sw" aria-pressed="${cur === k}" aria-label="${esc(p.name)}${cur === k ? ", selected" : ""}" data-act="palette" data-arg="${k}"><span style="background:${p.primary};box-shadow:inset -9px -9px 0 ${p.secondary}"></span></button>`).join("")
      + (cur === "custom" ? `<button type="button" class="sw" aria-pressed="true" aria-label="Your colors, selected" data-act="palette" data-arg="custom"><span style="background:${st.cfg.brand.custom.main};box-shadow:inset -9px -9px 0 ${st.cfg.brand.custom.accent}"></span></button>` : "")
      + `<a class="sw add" href="#/colors" aria-label="Make your own colors">+</a>`;
  };
  const typeSelect = () => {
    const T = K.brand().type_pairings;
    return `<label class="lbl" for="tp">Type style</label><select class="field sm" id="tp" data-act="type">${Object.entries(T).map(([k, t]) => `<option value="${k}"${st.cfg.brand.type_pairing === k ? " selected" : ""}>${esc(t.name.split(" — ")[0])} — ${esc(t.name.split(" — ")[1] || "")}</option>`).join("")}</select><p class="hint" data-live="tpwhy"></p>`;
  };

  SCREENS.materials = () => {
    if (!planReady()) return {
      title: "Your materials", back: ["home", "Home"],
      html: `<h1>Your materials</h1><p class="lede">Strategy comes first, so every piece is aimed at the right voters with the right words.</p>
        <div class="card flush list">
          <a class="item" href="#/plan"><span class="grow"><b>Your plan</b><br><span class="small muted">Win number and where to focus</span></span>${result().summary ? I.done() : I.todo()}${I.chev()}</a>
          <a class="item" href="#/message"><span class="grow"><b>Your one sentence</b><br><span class="small muted">The message every piece repeats</span></span>${st.cfg.message_box.core_message.trim() ? I.done() : I.todo()}${I.chev()}</a></div>`,
      actions: `<a class="btn" href="#/${result().summary ? "message" : "plan"}">Finish ${result().summary ? "your message" : "your plan"}</a>`
    };
    return {
      title: "Your materials", back: ["home", "Home"], right: `<a class="textbtn" href="#/checklist">Checklist</a>`, cls: "mid",
      html: `<h1>Your materials</h1>
        <div class="card"><div class="row" style="flex-wrap:wrap"><b class="grow">Colors</b><div class="swatches" data-live="swatches">${paletteButtons()}</div></div><div data-live="party"></div>${typeSelect()}</div>
        <div data-live="tiles"></div>`,
      live: { tiles: materialTiles, swatches: paletteButtons, party: partyNote,
        tpwhy: () => esc((K.brand().type_pairings[st.cfg.brand.type_pairing] || {}).why || "") },
      actions: `<button type="button" class="btn" data-act="dl-all">${I.download()} Download everything</button><button type="button" class="btn quiet" data-act="dl-proofs">Download PROOF copies to review</button>`
    };
  };
  const partyNote = () => {
    const P = K.palette(st.cfg);
    return K.partySignal(P.primary, P.secondary) ? note("info", "Heads up: many voters read bright red or blue as a party signal. That's fine if you mean it; in a nonpartisan race you may prefer something else.") : "";
  };
  const materialTiles = () => {
    if (!fontsReady) return '<p class="muted center">Loading fonts…</p>';
    const ctx = R.context(st);
    const pieces = R.activePieces(st).map((p) => R.piece(st, p, ctx));
    const tile = (href, thumb, title, status) => `<a class="tile" href="#/${href}"><div class="thumb">${thumb}</div><b>${esc(title)}</b>${status}</a>`;
    const statusOf = (x) => { const n = x.warnings.length; return x.ready && !n ? '<span class="st ok">Ready</span>' : x.ready ? `<span class="st muted">${n} note${n > 1 ? "s" : ""}</span>` : `<span class="st warn">${x.warnings.filter((w) => !/photo/.test(w)).length || 1} thing${n > 1 ? "s" : ""} to fix</span>`; };
    const social = R.social(st, ctx);
    const em = O.emails(st, ctx);
    const sq = social.find((s) => s.fmt === "square");
    return `<div class="tiles">${pieces.map((x) => tile(`piece/${x.piece.id}`, x.pages.map((p) => thumbSvg(p.doc)).join(""), x.name, statusOf(x))).join("")}
      ${tile("website", `<svg viewBox="0 0 124 80" width="124" height="80" aria-hidden="true"><rect width="124" height="80" rx="4" fill="#fff"/><rect width="124" height="8" fill="#E5E5EA"/><rect y="8" width="124" height="40" fill="${ctx.P.primary}"/><rect x="6" y="15" width="60" height="5" rx="2" fill="${ctx.P.onPrimary}"/><rect x="6" y="23" width="44" height="5" rx="2" fill="${ctx.P.onPrimary}"/><rect x="6" y="34" width="22" height="7" rx="2" fill="${ctx.P.secondary}"/><rect x="5" y="54" width="35" height="20" fill="${ctx.P.tint}"/><rect x="45" y="54" width="35" height="20" fill="${ctx.P.tint}"/><rect x="85" y="54" width="34" height="20" fill="${ctx.P.tint}"/></svg>`, "Website", `<span class="st muted">${st.cfg.web.base_url ? esc(U.domain(st.cfg.web.base_url)) : "Add your address"}</span>`)}
      ${tile("social", sq ? thumbSvg(sq.doc) : "", "Social & ads", `<span class="st muted">${social.length} images</span>`)}
      ${tile("emails", `<div style="display:flex;flex-direction:column;gap:5px;width:100%;padding:4px">${em.rows.slice(0, 3).map((r) => `<div style="background:var(--card);border-radius:5px;padding:5px 7px;font-size:10px;font-weight:600;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject.replace(/\{\{[^}]*\}\}/g, "Sam"))}</div>`).join("")}</div>`, "Emails", `<span class="st muted">${em.rows.length}, timed to your dates</span>`)}
      ${st.cfg.language.secondary === "es" ? tile("spanish", `<div style="font-size:28px;font-weight:800;color:var(--ink2)">ES</div>`, "Spanish text", `<span class="st ${st.cfg.language.es.core_message ? "muted" : "warn"}">${st.checks.translation ? "Checked" : "Needs a fluent reader"}</span>`) : ""}
    </div>`;
  };

  /* one piece */
  const PIECE_FIELDS = {
    yard_sign: [["slogan", "Slogan"]],
    door_hanger: [["headline", "Headline"], ["qr_label", "Next to the QR code"], ["missed_you", "Back of the hanger"]],
    palm_card: [["slogan", "Slogan"], ["qr_label", "Next to the QR code"]],
    mailer: [["front_kicker", "Small line on top"], ["front_headline", "Headline"], ["front_sub", "Under the headline"], ["back_headline", "Back headline"], ["qr_label", "Next to the QR code"]],
    flier: [["headline", "Headline"], ["cta_title", "Sign-up box title"], ["cta_text", "Sign-up box text"], ["qr_label", "QR code label"]]
  };
  const pieceIndex = (id) => st.cfg.pieces.findIndex((p) => p.id === id);

  SCREENS.piece = (id) => {
    const i = pieceIndex(id);
    if (i < 0) return SCREENS.materials();
    const piece = st.cfg.pieces[i];
    const side = view.side[id] || "front";
    const all = R.activePieces(st);
    const ctxName = R.pieceName(piece).replace("{first}", st.cfg.candidate.first_name || "you");
    const r = result(), g = S.groups(r.rows);
    const tg = (piece.targets || []).map((t) => `${g[t] ? g[t].length : 0} ${TARGET_PLAIN[t]}`).join(" + ");
    const precincts = (piece.targets || []).flatMap((t) => (g[t] || []).map((x) => x.precinct));
    const D = S.dates(st.cfg), ready = D[piece.anchor] ? U.addDays(D[piece.anchor], piece.in_hand_offset || 0) : "";
    const startBy = ready ? U.addDays(ready, -(piece.lead_days || 0)) : "";
    const isSign = piece.type === "yard_sign";
    const fields = (PIECE_FIELDS[piece.type] || []).map(([k, l]) => field({ bind: `cfg.pieces.${i}.content.${k}`, label: l, sm: true, id: `pf-${k}`, ph: R.defaults(st, piece)[k] || "", hint: k.includes("headline") || k === "slogan" ? "Blank = uses your slogans automatically." : "" })).join("");
    const signPickers = isSign && piece.lang === "en" ? `<p class="lbl">Colors</p><div class="row" data-live="signpal">${signPalettes()}</div>
      <p class="lbl">Pick from your slogans</p><div class="card flush" data-live="signslogans">${signSlogans(i)}</div>` : "";
    const sidebar = `<nav class="side sidelist" aria-label="Materials"><div class="h">Print</div>${all.map((p) => `<a href="#/piece/${p.id}"${p.id === id ? ' aria-current="page"' : ""}>${esc(R.pieceName(p).replace("{first}", st.cfg.candidate.first_name || "you"))}</a>`).join("")}<div class="h">Online</div><a href="#/website">Website</a><a href="#/social">Social &amp; ads</a><a href="#/emails">Emails</a></nav>`;
    const info = `<div class="card"><div class="tiny muted" style="font-weight:600">Who gets it</div><div class="small">${!r.rows.length ? `${esc((piece.targets || []).map((t) => TARGET_PLAIN[t]).join(" + ") || "Everyone")} precincts<br><span class="tiny muted">Add precinct results to see which ones.</span>` : tg ? `${precincts.length} precincts: ${esc(tg)}` : "Everyone"}${precincts.length ? `<br><span class="tiny muted">${precincts.map(esc).join(", ")}</span>` : ""}</div>
        <div class="tiny muted" style="font-weight:600;margin-top:10px">Uses</div><div class="small">${esc(M.quadLabel(piece.quadrants))}</div>
        ${startBy ? `<div class="tiny muted" style="font-weight:600;margin-top:10px">Send to printer by</div><div class="small"><b>${U.fmtDate(startBy, "en", "long")}</b><br><span class="tiny muted">In hand ${U.fmtDate(ready)} · ${piece.lead_days} days for design, print and delivery</span></div>` : ""}
        <div class="tiny muted" style="font-weight:600;margin-top:10px">Printer specs</div><div class="tiny">${esc(R.TYPES[piece.type].spec)}</div></div>`;
    const downloadBtns = `<button type="button" class="btn secondary small" data-act="piece-share" data-arg="${id}">${I.share()} Share proof</button><button type="button" class="btn small" data-act="piece-dl" data-arg="${id}">${lockList().length ? I.lock({ s: 16 }) : I.download({ s: 18 })} Download for printer</button>`;
    return {
      title: ctxName, back: ["materials", "Materials"], cls: "wide",
      html: `<div class="studio">${sidebar}
        <div><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:8px"><div><h1 style="margin:0 4px">${esc(ctxName)}</h1><div class="small muted" style="margin:2px 4px">${esc(R.TYPES[piece.type].size)}${piece.lang === "es" ? " · Español" : ""}</div></div>
          ${R.TYPES[piece.type] && piece.type !== "yard_sign" && piece.type !== "flier" ? `<div class="seg" role="group" aria-label="Side">${["front", "back"].map((s) => `<button type="button" aria-pressed="${side === s}" data-act="side" data-arg="${id}.${s}">${s === "front" ? "Front" : "Back"}</button>`).join("")}</div>` : ""}</div>
          <div class="stage"><div class="art" data-live="preview"></div></div>
          <div data-live="pwarn"></div>
          <div class="studio-actions" style="margin-top:12px"><div class="row" style="flex-wrap:wrap">${downloadBtns}</div><button type="button" class="linkbtn" data-act="piece-proof" data-arg="${id}">Download a PROOF copy to review</button></div>
        </div>
        <div><div class="card">${fields}</div>${signPickers}${info}</div>
      </div>`,
      live: {
        preview: () => { if (!fontsReady) return ""; const x = R.piece(st, st.cfg.pieces[i]); const pg = x.pages.find((p) => p.side === (view.side[id] || "front")) || x.pages[0]; return pg.doc.svg({ preview: true }); },
        pwarn: () => {
          if (!fontsReady) return "";
          const x = R.piece(st, st.cfg.pieces[i]);
          let h = "";
          if (x.legibility) {
            const nm = x.legibility.filter((l) => /name/i.test(l.label)).pop();
            if (nm) h += note(nm.inches >= 3.5 ? "ok" : "warn", `<b>${nm.inches >= 3.5 ? "Readable from a car." : "Hard to read from a car."}</b> Your name is ${nm.inches.toFixed(1)} inches tall — readable from about ${Math.round(nm.feet)} feet, or ${nm.seconds.toFixed(1)} seconds at 35 mph.${nm.inches < 3.5 ? (st.cfg.brand.type_pairing !== "condensed" ? ' <button type="button" class="linkbtn" data-act="condensed">Try the Condensed type style</button>' : " Use fewer letters if you can — a nickname or just your last name.") : ""}`, I.car({ s: 20 }));
          }
          h += x.warnings.filter((w) => !(x.legibility && /^Your name is/.test(w))).map((w) => note(/photo/.test(w) ? "info" : "warn", esc(w))).join("");
          return h;
        },
        signpal: signPalettes, signslogans: () => signSlogans(i)
      },
      actions: `<div class="phone-only" style="display:flex;gap:10px;width:100%;flex-wrap:wrap">${downloadBtns}</div>`
    };
  };
  const signPalettes = () => Object.entries(K.brand().palettes).map(([k, p]) => `<button type="button" class="palbtn" aria-pressed="${st.cfg.brand.palette === k}" data-act="palette" data-arg="${k}"><span class="pd" style="background:${p.primary};box-shadow:inset -6px -6px 0 ${p.secondary}"></span>${esc(p.name.split(" ")[0])}</button>`).join("");
  const signSlogans = (i) => {
    const cur = CIB.pieceContent(st, st.cfg.pieces[i]).slogan;
    return (st.cfg.slogans || []).filter((s) => s.text).slice(0, 6).map((s) => `<button type="button" class="sloganbtn" aria-pressed="${s.text === cur}" data-act="sign-slogan" data-arg="${esc(s.text)}"><span>${esc(s.text)} <span class="tiny muted">· ${esc(M.quadLabel(s.quadrants))}</span></span>${s.text === cur ? `<span style="color:var(--blue)">${I.tick()}</span>` : ""}</button>`).join("") || '<p class="small muted" style="padding:12px 14px;margin:0">Add slogans first.</p>';
  };

  /* custom colors */
  SCREENS.colors = () => {
    const c = st.cfg.brand.custom;
    return {
      title: "Your colors", back: ["materials", "Cancel"], right: `<a class="textbtn" href="#/materials" data-act="use-custom">Done</a>`,
      html: `<h1>Make your own colors</h1><p class="lede">Pick a main color and an accent. We check that everything stays readable.</p>
        <div data-live="ccsign"></div>
        <div class="card flush"><div class="toggle" style="cursor:default"><input type="color" id="cmain" value="${c.main}" data-bind="cfg.brand.custom.main" data-kind="color" aria-label="Main color"><span class="grow"><b>Main color</b><br><span class="small muted">Sign background, headlines, buttons</span></span><input class="field sm hex" value="${c.main}" data-bind="cfg.brand.custom.main" data-kind="hex" aria-label="Main color code"></div>
          <div class="toggle" style="cursor:default;border-top:1px solid var(--line)"><input type="color" id="caccent" value="${c.accent}" data-bind="cfg.brand.custom.accent" data-kind="color" aria-label="Accent color"><span class="grow"><b>Accent color</b><br><span class="small muted">The stripe, highlights, small labels</span></span><input class="field sm hex" value="${c.accent}" data-bind="cfg.brand.custom.accent" data-kind="hex" aria-label="Accent color code"></div></div>
        <p class="section-label">We check it for you</p><div data-live="cchecks"></div>`,
      live: {
        ccsign: () => { const m = st.cfg.brand.custom.main, a = st.cfg.brand.custom.accent, ni = K.best(m), bi = K.best(a), cn = st.cfg.candidate;
          return `<div class="card" style="background:${m};aspect-ratio:2/1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;overflow:hidden;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.18)" role="img" aria-label="Yard sign preview in your colors">
            <div style="color:${ni};font:700 14px 'Public Sans',sans-serif;letter-spacing:.12em">${esc((cn.first_name || "YOUR").toUpperCase())}</div><div style="color:${ni};font:900 clamp(32px,11vw,52px)/.92 'Public Sans',sans-serif">${esc((cn.last_name || "NAME").toUpperCase())}</div>
            <div style="background:${a};color:${bi};font:800 13px 'Public Sans',sans-serif;letter-spacing:.04em;width:100%;text-align:center;padding:6px 0;margin-top:10px">${esc([cn.office, cn.district].filter(Boolean).join(" · ").toUpperCase() || "OFFICE")}</div></div>`; },
        cchecks: () => { const m = st.cfg.brand.custom.main, a = st.cfg.brand.custom.accent, checks = K.customChecks(m, a);
          return `<div class="card flush list">${checks.map((x) => `<div class="check">${x.ok ? I.done() : I.fix()}<div class="grow"><b>${x.title}</b><div class="small" style="color:var(--ink2)">${x.detail}</div></div></div>`).join("")}</div>
            ${checks.some((x) => !x.ok) ? '<button type="button" class="btn secondary" style="width:100%;margin-top:12px" data-act="fix-colors">Fix it for me — keep my colors, just darker or lighter</button>' : ""}
            ${K.partySignal(m, a) ? note("info", "Heads up: many voters read bright red or blue as a party signal. That's fine if you mean it; in a nonpartisan race you may prefer something else.") : ""}`; }
      },
      actions: `<button type="button" class="btn" data-act="use-custom">Use these colors everywhere</button>`
    };
  };

  /* checklist */
  SCREENS.checklist = () => {
    const ctx = R.context(st), mb = st.cfg.message_box;
    const sign = R.piece(st, st.cfg.pieces.find((p) => p.type === "yard_sign"), ctx);
    const nm = (sign.legibility || []).filter((l) => /name/i.test(l.label)).pop();
    const auto = [
      [!!st.photo, "Your photo is added", "q/photo"],
      [!M.contrastProblems(st.cfg).length, "Every contrast claim has a source", "box/Q2"],
      [!!(nm && nm.inches >= 3.5 && sign.primaryWords <= 7), "Yard sign reads from a car", "piece/yard-sign"],
      [!!st.cfg.web.base_url, "Website address added, so QR codes work", "q/web"]
    ];
    const manual = [["qr", "QR codes scanned from a printed proof", "Print a PROOF copy and scan each code with your phone."]];
    const law = [["disclaimer", "“Paid for by” wording confirmed", "Rules differ by state. Call your election office or campaign finance agency."],
      ["dates", "Voting dates confirmed", "Same call. Ask about every date marked ⚖️ on your calendar."]];
    if (st.cfg.language.secondary === "es") law.push(["translation", "Spanish checked by a fluent speaker", "Someone from the district who reads Spanish. Send them the PROOF copies."]);
    const done = auto.filter((a) => a[0]).length + manual.concat(law).filter((m) => st.checks[m[0]]).length, total = auto.length + manual.length + law.length;
    const need = lockList();
    const prod = S.production(st.cfg).filter((p) => p.startBy >= U.today()).slice(0, 4);
    return {
      title: "Before you print", back: ["materials", "Materials"], cls: "mid",
      html: `<h1>Before you print</h1><p class="lede">${done} of ${total} done. The rest take a phone call or a friend.</p>
        <div class="progress green" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}" aria-label="Checklist progress"><div style="width:${(done / total) * 100}%"></div></div>
        <div class="card flush list" style="margin-top:16px">
          ${auto.map(([ok, label, href]) => `<a class="item" href="#/${href}">${ok ? I.done() : I.fix()}<span class="grow">${label}</span>${ok ? "" : I.chev()}</a>`).join("")}
          ${manual.map(([k, label, sub]) => `<label class="check manual"><input type="checkbox" data-act="check" data-arg="${k}" ${st.checks[k] ? "checked" : ""}><span class="grow">${label}<br><span class="tiny muted">${sub}</span></span></label>`).join("")}
        </div>
        <p class="section-label">⚖️ Set by law — must be confirmed</p>
        <div class="card flush list">${law.map(([k, label, sub]) => `<label class="check manual"><input type="checkbox" data-act="check" data-arg="${k}" ${st.checks[k] ? "checked" : ""}><span class="grow">${label}<br><span class="tiny muted">${sub}</span></span></label>`).join("")}</div>
        ${help("What to ask your election office", "<p>• What exact “Paid for by” wording do I need? Committee name, treasurer, address?<br>• Minimum type size? Does it need a box? Is it needed on small items and online ads?<br>• Does a translated piece need a translated disclaimer?<br>• Confirm: registration deadline, when ballots go out, early voting dates, Election Day, polls closing time.<br>• When may yard signs go up, where are they allowed, and when must they come down?</p>")}
        ${st.strategy.precinctSource === "unofficial" ? `<p class="section-label">Recommended</p><div class="card flush"><label class="check manual"><input type="checkbox" data-act="official"><span class="grow">I've replaced the unofficial numbers with official ones<br><span class="tiny muted">Ask the county clerk to email the certified precinct results.</span></span></label></div>` : ""}
        ${prod.length ? `<div class="card"><p class="section-label" style="margin:0 0 6px">Order by</p>${prod.map((p) => `<div class="stat"><span>${esc(p.label)}</span><b>${U.fmtDate(p.startBy, "en", "short")}</b></div>`).join("")}</div>` : ""}`,
      actions: need.length ? `<button type="button" class="btn" disabled>${I.lock({ s: 16 })} Finish ${need.length} item${need.length > 1 ? "s" : ""} to download for printing</button><button type="button" class="btn quiet" data-act="dl-proofs">Download a marked “PROOF” copy to review</button>`
        : `<button type="button" class="btn" data-act="dl-all">${I.download()} Download everything for the printer</button><button type="button" class="btn quiet" data-act="dl-proofs">Download PROOF copies</button>`
    };
  };

  /* website */
  const sitePreviewHtml = (files, page, ctx) => {
    const f = files.find((x) => x.name === page) || files[0];
    const { css } = O.siteCss(ctx);
    const fontCss = css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (m, file) => `url(data:font/woff2;base64,${window.CIB_FONTS[file]})`);
    return f.data.replace(/<link rel="stylesheet"[^>]*>/, `<style>${fontCss} a{pointer-events:none}</style>`)
      .replace(/src="(\.\.\/)*photo\.jpg"/g, `src="${st.photo || ""}"`).replace(/<link rel="icon"[^>]*>/, "");
  };
  SCREENS.website = () => {
    const pages = [["index.html", "Home"], ["issues/index.html", "Priorities"], ["about/index.html", "About"], ["vote/index.html", "Vote"], ["volunteer/index.html", "Volunteer"], ["donate/index.html", "Donate"]];
    if (st.cfg.language.secondary === "es" && st.cfg.language.es.core_message) pages.push(["es/index.html", "Español"]);
    return {
      title: "Website", back: ["materials", "Materials"], cls: "wide",
      html: `<div class="studio"><nav class="side sidelist" aria-label="Pages"><div class="h">Pages</div>${pages.map(([p, l]) => `<a href="#/website" data-act="sitepage" data-arg="${p}"${view.sitePage === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
        <div><h1>Your website</h1><p class="lede">${pages.length} pages, fast and accessible, no tracking. Built from your answers.</p>
          <div class="chips phone-only">${pages.map(([p, l]) => `<button type="button" class="chip" aria-pressed="${view.sitePage === p}" data-act="sitepage" data-arg="${p}">${l}</button>`).join("")}</div>
          <div class="stage" style="padding:8px"><iframe class="frame" title="Website preview: ${esc((pages.find((p) => p[0] === view.sitePage) || pages[0])[1])}" data-live-frame="site" sandbox=""></iframe></div></div>
        <div><div class="card"><h2>Put it online — free, on your own account</h2>
          <p class="small">The kit doesn't host your site. You publish it yourself, so you stay in control:</p>
          <ol class="small" style="padding-left:20px;margin:0">
            <li>Download your website (a .zip file) and unzip it.</li>
            <li>Make a free account at <b>Netlify</b> (app.netlify.com/drop), <b>Cloudflare Pages</b> or <b>GitHub Pages</b>.</li>
            <li>Netlify: drag the unzipped folder onto the page. You get a link in seconds.</li>
            <li>Add the address you bought under the host's domain settings.</li>
            <li>Open every page on your phone. Test the Donate and Volunteer buttons.</li></ol>
          <p class="tiny muted">The zip includes PUBLISH-ME.txt with these steps for all three hosts.</p></div>
          ${!st.cfg.web.base_url ? note("warn", `Add your website address so QR codes and share links point to it. <a href="#/q/web">Add it</a>`) : ""}
          ${!st.cfg.web.donate_processor_url ? note("info", `No donation link yet — the Donate page asks people to email you. <a href="#/q/web">Add one</a>`) : ""}
        </div></div>`,
      after: () => updateSiteFrame(),
      actions: `<button type="button" class="btn" data-act="dl-site">${lockList().length ? I.lock({ s: 16 }) : I.download()} Download website</button>`
    };
  };
  const updateSiteFrame = () => {
    const fr = document.querySelector('[data-live-frame="site"]');
    if (!fr || !fontsReady) return;
    const ctx = R.context(st);
    fr.srcdoc = sitePreviewHtml(O.website(st, ctx), view.sitePage, ctx);
  };

  /* social */
  SCREENS.social = () => ({
    title: "Social & ads", back: ["materials", "Materials"], cls: "wide",
    html: `<h1>Social &amp; ads</h1><p class="lede">Sized for each platform, with your “Paid for by” line. Download them all at once.</p>
      ${note("warn", "<b>Political ads need verification first.</b> Meta and Google make you verify your identity and add a “Paid for by” label before political ads run — it can take days or weeks, so start early. Google's rules for local races vary by state. ⚖️ Some states also require disclosure of AI-generated or altered images.")}
      <div data-live="socialgrid"></div>`,
    live: { socialgrid: () => {
      if (!fontsReady) return "";
      const items = R.social(st);
      return ["Social", "Ads"].map((grp) => `<p class="section-label">${grp === "Social" ? "Posts and stories" : "Display ads and covers"}</p><div class="social">${items.filter((x) => x.group === grp).map((x) => `<figure><div class="art">${thumbSvg(x.doc)}</div><figcaption><b>${esc(x.fmt)}</b> · ${x.w}×${x.h}<br>${esc(x.use)}</figcaption></figure>`).join("")}</div>`).join("");
    } },
    actions: `<button type="button" class="btn" data-act="dl-social">${lockList().length ? I.lock({ s: 16 }) : I.download()} Download all images</button><button type="button" class="btn quiet" data-act="dl-social-proof">PROOF copies</button>`
  });

  /* emails */
  SCREENS.emails = () => {
    const E = O.emails(st), cur = Math.min(view.email, E.messages.length - 1);
    const seqName = { welcome: "Welcome", volunteer: "Volunteers", donate: "Fundraising", gotv: "Get out the vote" };
    return {
      title: "Emails", back: ["materials", "Materials"], cls: "wide",
      html: `<div class="studio"><nav class="side sidelist" aria-label="Emails">${Object.keys(seqName).map((s) => `<div class="h">${seqName[s]}</div>${E.messages.map((m, i) => m.sequence === s ? `<a href="#/emails" data-act="email" data-arg="${i}"${i === cur ? ' aria-current="page"' : ""}>${esc(m.file)}</a>` : "").join("")}`).join("")}</nav>
        <div><h1>Emails</h1><p class="lede">${E.messages.length} emails in four sequences, with send dates worked out from your calendar.</p>
          <div class="card flush list phone-only">${E.messages.map((m, i) => `<button type="button" class="item" data-act="email" data-arg="${i}" aria-pressed="${i === cur}"><span class="grow"><b>${esc(m.preview.subject)}</b><br><span class="tiny muted">${esc(seqName[m.sequence])} · ${m.send_date ? U.fmtDate(m.send_date) : m.trigger.split(" (")[0]}</span></span>${i === cur ? `<span style="color:var(--blue)">${I.tick()}</span>` : ""}</button>`).join("")}</div>
          <div class="card" style="margin-top:16px"><b>${esc(E.messages[cur].preview.subject)}</b><div class="tiny muted">${esc(E.messages[cur].send_date ? "Send " + U.fmtDate(E.messages[cur].send_date, "en", "long") : E.messages[cur].trigger)} · To: ${esc(E.messages[cur].segment)}</div></div>
          <div class="stage" style="padding:8px"><iframe class="frame" title="Email preview" data-live-frame="email" sandbox=""></iframe></div></div>
        <div><div class="card"><h2>Sending them</h2><p class="small">Use a free, open-source tool you control: <b>listmonk</b> (scheduled sends) or <b>Mautic</b> (automatic drips). The download has both versions, a schedule, and setup steps.</p>
          ${note("warn", "Before sending: set up SPF, DKIM and DMARC for your email domain, and send yourself a test. ⚖️ Email disclaimer rules vary by state.")}</div></div></div>`,
      after: () => { const fr = document.querySelector('[data-live-frame="email"]'); if (fr) fr.srcdoc = E.messages[cur].preview.html.replace("<head>", "<head><style>a{pointer-events:none}</style>"); },
      actions: `<button type="button" class="btn" data-act="dl-email">${lockList().length ? I.lock({ s: 16 }) : I.download()} Download emails</button>`
    };
  };

  /* spanish */
  SCREENS.spanish = () => {
    const c = st.cfg.candidate, mb = st.cfg.message_box, sl = R.slogans(st.cfg);
    const en = (t) => `<p class="hint" lang="en">English: ${esc(t || "—")}</p>`;
    return {
      title: "Spanish", back: ["materials", "Materials"], cls: "mid",
      html: `<h1 lang="es">Español</h1><p class="lede">Write or paste the Spanish versions. A fluent speaker from the district must check them before printing.</p>
        <div class="card" lang="es">
          ${field({ bind: "cfg.language.es.office_line", label: "Office line", sm: true, ph: "Concejo Municipal · Distrito 4" })}${en([c.office, c.district].filter(Boolean).join(" · "))}
          ${field({ bind: "cfg.language.es.slogan", label: "Main slogan", sm: true })}${en(sl.primary)}
          ${field({ bind: "cfg.language.es.core_message", label: "Your one sentence", rows: 3 })}${en(mb.core_message)}
          ${field({ bind: "cfg.language.es.bio_short", label: "Short bio", rows: 2 })}${en(c.bio_short)}
          ${[0, 1, 2].map((i) => field({ bind: `cfg.language.es.bio_points.${i}`, label: `Proof point ${i + 1}`, sm: true }) + en(c.bio_points[i])).join("")}
          ${[0, 1, 2].map((i) => `<p class="lbl">Issue ${i + 1}</p>${field({ bind: `cfg.language.es.issues.${i}.title`, label: "Title", sm: true, id: `esi${i}t` })}${en((mb.issues[i] || {}).title)}${field({ bind: `cfg.language.es.issues.${i}.short`, label: "In one sentence", sm: true, rows: 2, id: `esi${i}s` })}${en((mb.issues[i] || {}).short)}${field({ bind: `cfg.language.es.issues.${i}.detail`, label: "More detail", opt: "website", sm: true, rows: 3, id: `esi${i}d` })}`).join("")}
        </div>
        <div class="card flush" style="margin-top:12px"><label class="check manual"><input type="checkbox" data-act="check" data-arg="translation" ${st.checks.translation ? "checked" : ""}><span class="grow">A fluent speaker from the district checked this<br><span class="tiny muted">Send them the Spanish PROOF copies to read.</span></span></label></div>`,
      actions: `<button type="button" class="btn secondary" data-act="piece-share" data-arg="door-hanger-es">${I.share()} Send the Spanish door hanger to a reviewer</button>`
    };
  };


  /* Results importer: Utah's official results (built in), OpenElections (opt-in download), or a file the candidate drops in. */
  const PROV = {
    utah: {
      name: "Utah's official results", short: "Utah results",
      intro: "Official precinct results from Utah's election results site, collected into this app — including city and town races. Pick up to 4 past elections and the race most like yours; the race picks your precincts.",
      privacy: () => note("ok", "These results are part of the app. Nothing is downloaded from anyone else.", I.lock({ s: 18 })),
      index: () => CIB.utah.index(),
      files: (idx, county) => CIB.utah.filesFor(idx, county),
      label: (f) => f.label, source: (idx, f) => f.source,
      load: (idx, f) => CIB.utah.load(f),
      about: () => `<p>Utah's results site (electionresults.utah.gov, from the Lieutenant Governor's Office) posts every county's results by precinct, including city and town races. Other websites can't read it directly, so a scheduled job copies the precinct results into this app after each election${CIB.utah && idxDate() ? ` — last copied ${idxDate()}` : ""}.</p><p>Results marked unofficial on the state site may change at the canvass. Precinct names sometimes change between years; the app lines them up by name and notes each match so you can check it.</p>`
    },
    openelections: {
      name: "OpenElections", short: "OpenElections",
      intro: "Free, certified results compiled by OpenElections volunteers. Pick up to 4 past elections, the race most like yours in each, and the precincts in your district.",
      privacy: () => note("info", "<b>What gets sent:</b> when you tap below, this device downloads public files from GitHub, where OpenElections keeps them. GitHub sees your internet address and which file you asked for — nothing you've typed. The files are read here and not kept.", I.lock({ s: 18 })),
      index: (state) => OE.index(state),
      files: (idx, county) => OE.filesFor(idx, county),
      label: (f) => OE.label(f), source: (idx, f) => OE.sourceUrl(idx, f),
      load: async (idx, f, county, onP) => OE.summarize(OE.parseCsv(await OE.download(idx, f, onP)), county),
      about: () => `<p>OpenElections is a volunteer project that collects certified election results from official sources and publishes them as free files, one collection per state on GitHub. Coverage is mostly state and federal races in even years; city and school races are often missing.</p><p>If your race isn't there, pick the race on the same ballot most like yours — for a nonpartisan city race, a candidate on the same side of the big local issue, or the same party in a partisan race. Write down why you picked them.</p><p>Always check a few numbers against the county's own report. This app's file list was built ${window.CIB_OE_INDEXED ? U.fmtDate(window.CIB_OE_INDEXED, "en", "long") : "recently"}.</p>`
    }
  };
  let utIdxDate = "";
  const idxDate = () => utIdxDate;
  const oeView = { provider: "", estimate: true, idx: null, state: "", county: "", busy: "", picked: [], chosen: null, filter: "", showAll: false };
  const pickedRace = (x) => x.sum.races.find((r) => r.key === x.raceKey);

  SCREENS.oe = (prov) => {
    const pl = st.cfg.place, sn = PL.stateName(pl.state);
    prov = PROV[prov] ? prov : pl.state === "UT" ? "utah" : "openelections";
    if (oeView.provider !== prov || oeView.state !== pl.state || oeView.county !== pl.county)
      Object.assign(oeView, { provider: prov, idx: null, state: pl.state, county: pl.county, picked: [], chosen: null, filter: "", showAll: false });
    const P = PROV[prov];
    const other = prov === "utah" ? `<a href="#/oe/openelections">Try OpenElections instead</a>` : pl.state === "UT" ? `<a href="#/oe/utah">Use Utah's official results instead</a>` : "";
    const head = `<h1>${esc(P.name)}</h1><p class="lede">${esc(P.intro)}</p>`;
    const dropIn = `<div class="card"><h2>Have a results file?</h2><p class="small" style="margin:4px 0 10px">Drop in an Excel or CSV file of precinct results — for example Utah's “All Results Excel” download, or your county's precinct report. It's read on this device and not sent anywhere.</p>
      <label class="btn secondary small" for="oe-file">Open a results file</label><input id="oe-file" type="file" class="sr" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-act="oe-file"></div>`;
    if (!pl.state || !pl.county) return { title: P.short, back: ["q/source", "Back"], cls: "mid",
      html: head + note("warn", `First tell us your ${pl.state ? "county" : "state and county"}. <a href="#/q/where">Where are you running?</a>`) + dropIn };
    let body = "";
    if (!oeView.idx) {
      const n = prov === "openelections" ? (window.CIB_OE_COUNTS || {})[pl.state] : null;
      body = P.privacy() + (n === 0 ? note("warn", `OpenElections doesn't have precinct files for ${esc(sn)} yet. Try your county's results page instead.`) + placeCard(false)
        : `<div class="card center"><p class="small" style="margin:0 0 10px">${n ? `${n} precinct files for ${esc(sn)}. ` : ""}We'll show the ones for ${esc(pl.county)} County.</p>
          <button type="button" class="btn" data-act="oe-list"${oeView.busy ? " disabled" : ""}>${oeView.busy ? esc(oeView.busy) : `Show ${esc(pl.county)} County's elections`}</button></div>`);
    } else {
      const files = P.files(oeView.idx, pl.county), pickedPaths = new Set(oeView.picked.map((x) => x.file.path));
      const shown = oeView.showAll || prov === "utah" ? files : files.filter((f) => f.kind === "general" || pickedPaths.has(f.path)).slice(0, 12);
      body += `<p class="section-label">1 · Pick past elections <span class="muted">(${oeView.picked.length} of 4)</span></p><div class="card flush list">`
        + (shown.length ? shown.map((f) => `<div class="item" style="cursor:default"><span class="grow"><b>${esc(P.label(f))}</b><br><span class="tiny muted">${f.scope === "state" ? `Whole-state file — larger; we keep only ${esc(pl.county)} County` : `${esc(pl.county)} County`}${f.races ? ` · ${f.races.length} races` : ""} · <a href="${esc(P.source(oeView.idx, f))}" target="_blank" rel="noopener noreferrer">source</a></span></span>
          ${pickedPaths.has(f.path) ? `<button type="button" class="btn danger small" data-act="oe-remove" data-arg="${esc(f.path)}">Remove</button>` : `<button type="button" class="btn secondary small" data-act="oe-add" data-arg="${esc(f.path)}"${oeView.picked.length >= 4 || oeView.busy ? " disabled" : ""}>Add</button>`}</div>`).join("")
          : `<div class="item">${prov === "utah" ? `No ${esc(pl.county)} County results in the app yet. They're added after each election — or drop in a results file below.` : `No files for ${esc(pl.county)} County. Check the spelling of the county, or use your county's results page.`}</div>`)
        + `</div>${prov !== "utah" && (files.length > shown.length || oeView.showAll) ? `<button type="button" class="linkbtn" data-act="oe-all">${oeView.showAll ? "Show fewer" : `Show all ${files.length} (primaries, specials, older years)`}</button>` : ""}`
        + (oeView.busy ? `<p class="small muted" role="status">${esc(oeView.busy)}</p>` : "");
    }
    if (oeView.picked.length) body += pickedHtml(pl);
    body += dropIn;
    return {
      title: P.short, back: ["q/source", "Back"], cls: "mid",
      html: head + (other ? `<p class="small" style="margin:-6px 4px 12px">${other}</p>` : "") + body + help(`About ${P.name}`, P.about()),
      actions: oeView.picked.length ? `<button type="button" class="btn" data-act="oe-use">Use these numbers</button>` : ""
    };
  };

  const pickedHtml = (pl) => {
    let body = `<p class="section-label">2 · In each election, the race and candidate most like you</p>`;
    oeView.picked.forEach((x, i) => {
      const race = pickedRace(x);
      const cands = race ? [...race.cands.entries()].sort((a, b) => b[1].total - a[1].total) : [];
      body += `<div class="card"><h2>${esc(x.label)}</h2>
        <label class="lbl" for="oer${i}">Race</label><select class="field sm" id="oer${i}" data-act="oe-race" data-arg="${i}">${x.sum.races.map((r) => `<option value="${esc(r.key)}"${r.key === x.raceKey ? " selected" : ""}>${esc(r.key)}${r.voteFor > 1 ? ` (vote for ${r.voteFor})` : ""} · ${U.int(r.total)} votes</option>`).join("")}</select>
        <label class="lbl" for="oec${i}">Candidate like you</label><select class="field sm" id="oec${i}" data-act="oe-cand" data-arg="${i}">${cands.map(([k, c]) => `<option value="${esc(k)}"${k === x.cand ? " selected" : ""}>${esc(k)}${c.party ? ` (${esc(c.party)})` : ""} · ${U.int(c.total)}</option>`).join("")}</select>
        ${race && race.voteFor > 1 ? note("info", `Voters picked ${race.voteFor} in this race, so we count the race's voters as total votes ÷ ${race.voteFor}.`) : ""}
        ${!x.sum.reg.size ? note("warn", `This ${x.dropped ? "file" : "election"} doesn't list registered voters by precinct, so it can't be used for turnout until you type them in from the county's “Statement of Votes Cast”.${!x.sum.bal.size && oeView.estimate ? " Ballots cast aren't listed either; we'll use the race with the most voters as a close stand-in." : ""} Precincts keep their other elections meanwhile.`) : !x.sum.bal.size ? note("info", oeView.estimate ? "This file doesn't list ballots cast, so we'll use the race with the most voters as a close stand-in, and mark those precincts." : "This file doesn't list ballots cast. Type them in from the county's report.") : ""}
        <p class="tiny muted" style="margin:8px 0 0">${x.sum.precincts.length} precincts${x.sum.asOf ? ` · results as of ${U.fmtDate(String(x.sum.asOf).slice(0, 10), "en", "short")}` : ""} · <button type="button" class="linkbtn" style="min-height:0;padding:0" data-act="oe-remove" data-arg="${esc(x.file.path)}">Remove this election</button></p></div>`;
    });
    const groups = OE.groupPrecincts(oeView.picked);
    if (!oeView.chosen) oeView.chosen = defaultChosen(groups);
    const f = oeView.filter.toLowerCase(), vis = groups.filter((g) => !f || g.names.some((n) => n.toLowerCase().includes(f)))
      .sort((a, b) => (oeView.chosen.has(b.key) - oeView.chosen.has(a.key)) || a.display.localeCompare(b.display, "en", { numeric: true }));
    const nChosen = groups.filter((g) => oeView.chosen.has(g.key)).length;
    body += `<p class="section-label">3 · The precincts in your district <span class="muted">(${nChosen} of ${groups.length})</span></p>
      <div class="card">${oeView.districtFrom ? `<p class="small" style="margin:0 0 8px">Started with the precincts that voted in <b>${esc(oeView.districtFrom)}</b>. Adjust if your district is different.</p>` : ""}
      <label class="lbl" for="oef" style="margin-top:0">Filter</label><input class="field sm" id="oef" data-oe-filter value="${esc(oeView.filter)}" placeholder="Type part of a precinct name, like SMI">
      <div class="linkrow"><button type="button" class="linkbtn" data-act="oe-sel" data-arg="all">Select ${f ? "these" : "all"}</button><button type="button" class="linkbtn" data-act="oe-sel" data-arg="none">Clear ${f ? "these" : "all"}</button></div>
      <div class="scrollx" style="max-height:320px;overflow-y:auto" role="group" aria-label="Precincts" tabindex="0">${vis.map((g) => `<label class="toggle" style="min-height:40px;padding:6px 4px"><input type="checkbox" data-act="oe-p" data-arg="${esc(g.key)}"${oeView.chosen.has(g.key) ? " checked" : ""}><span>${esc(g.display)}${g.names.length > 1 ? ` <span class="tiny muted">= ${esc(g.names.slice(1).join(", "))}</span>` : ""}${g.inCount < oeView.picked.length ? ' <span class="tiny muted">· not in every election</span>' : ""}</span></label>`).join("")}</div>
      <label class="toggle" style="padding:8px 0 0"><input type="checkbox" data-act="oe-est"${oeView.estimate ? " checked" : ""}><span class="small">When a file is missing ballots cast, use the race with the most voters as a stand-in (marked in the notes)</span></label>
      <p class="hint">Ask your county clerk or city recorder which precincts are in your district — many counties have a precinct map. Names that look like the same precinct in different years are matched (shown after “=”); check them.</p></div>`;
    return body;
  };

  // The district starts as the precincts that voted in the newest local race picked (a city council race picks the city).
  const defaultChosen = (groups) => {
    const all = new Set(groups.map((g) => g.key));
    oeView.districtFrom = "";
    const x = oeView.picked[0], race = x && pickedRace(x);
    if (!race) return all;
    const voted = [...race.byP.entries()].filter(([, m]) => [...m.values()].some((v) => v > 0)).map(([p]) => OE.pkey(p));
    if (voted.length && voted.length < x.sum.precincts.length * 0.9) { oeView.districtFrom = `${x.label}: ${race.key}`; return new Set(voted); }
    return all;
  };

  // A first guess at the race: one named for the candidate's town and office, else the top of the ticket.
  const guessRace = (sum, prev) => {
    const prevRace = prev && pickedRace(prev);
    const town = (st.cfg.place.town || "").toLowerCase(), office = (st.cfg.candidate.office || "").toLowerCase();
    const officeWord = /mayor/.test(office) ? "mayor" : /council/.test(office) ? "council" : /school/.test(office) ? "school" : /commission/.test(office) ? "commission" : "";
    return (prevRace && sum.races.find((r) => r.office === prevRace.office && r.district === prevRace.district))
      || (town && officeWord && sum.races.find((r) => r.key.toLowerCase().includes(town) && r.key.toLowerCase().includes(officeWord)))
      || (town && sum.races.find((r) => r.key.toLowerCase().includes(town)))
      || (prevRace && sum.races.find((r) => r.office === prevRace.office)) || OE.defaultRace(sum);
  };
  const addPicked = (file, label, sum, dropped) => {
    if (!sum.precincts.length) throw new Error(`No ${st.cfg.place.county ? st.cfg.place.county + " County " : ""}precincts in that ${dropped ? "file" : "election"}.`);
    const prev = oeView.picked[0], race = guessRace(sum, prev);
    const cands = race ? [...race.cands.entries()].sort((a, b) => b[1].total - a[1].total) : [];
    const prevRace = prev && pickedRace(prev), prevParty = prevRace ? (prevRace.cands.get(prev.cand) || {}).party : "";
    const cand = (prevParty && cands.find(([, c]) => c.party === prevParty)) || cands[0];
    oeView.picked.push({ file, label, sum, dropped, raceKey: race ? race.key : "", cand: cand ? cand[0] : "" });
    oeView.picked.sort((a, b) => (b.file.date || "").localeCompare(a.file.date || ""));
    oeView.chosen = null;
  };

  /* saving */
  SCREENS.save = () => ({
    title: "Saving", back: ["home", "Home"],
    html: `<h1>Saving and moving your work</h1>
      ${note("info", "Your campaign lives <b>only in this browser on this device</b>. Nothing you type is sent to us or anyone else. Your phone and laptop are not connected — use a backup file to move between them.")}
      <div class="card flush list">
        <button type="button" class="item" data-act="backup">${I.download({ c: "var(--blue)" })}<span class="grow"><b>Download a backup</b><br><span class="small muted">One small file with all your answers and your photo</span></span></button>
        <label class="item" for="restore-s">${I.share({ c: "var(--blue)" })}<span class="grow"><b>Open a backup file</b><br><span class="small muted">From your other device. Replaces what's here.</span></span></label><input type="file" id="restore-s" class="sr" accept=".json,application/json" data-act="restore">
        <button type="button" class="item" data-act="cli">${I.download({ c: "var(--blue)" })}<span class="grow"><b>Export campaign.json</b><br><span class="small muted">For a tech volunteer using the kit's command-line tools</span></span></button>
      </div>
      <p class="section-label">Start over</p>
      <div class="card flush list">
        <button type="button" class="item" data-act="example">${I.house({ c: "var(--ink)" })}<span class="grow"><b>Load the fictional example</b><br><span class="small muted">Chris Porter, Rivertown. Replaces what's here.</span></span></button>
        <button type="button" class="item" data-act="wipe" style="color:var(--red)">${I.trash({ c: "var(--red)" })}<span class="grow"><b>Delete everything on this device</b><br><span class="small muted">Download a backup first if you want to keep it.</span></span></button>
      </div>
      <p class="tiny muted center" style="margin-top:24px">Campaign-in-a-Box is free and open source (MIT). Not legal advice.</p>`
  });

  /* -------------------------------------------------------------- shell */
  const route = () => {
    const h = (location.hash || "").replace(/^#\/?/, "");
    const [nm, ...rest] = h.split("/");
    return { name: nm || "", arg: rest.join("/") };
  };
  const GROUP = { oe: "plan", plan: "plan", how: "plan", message: "message", box: "message", slogans: "message", materials: "materials", piece: "materials", colors: "materials", website: "materials", social: "materials", emails: "materials", spanish: "materials", checklist: "launch" };
  let live = {}, after = null, lastRoute = "";

  const render = (keepScroll) => {
    let { name: nm, arg } = route();
    if (!st) { if (nm && nm !== "q") nm = ""; }
    if (!nm) nm = st && st.meta.seenWelcome ? "home" : "welcome";
    if (!st && nm !== "welcome") { st = ST.blank(); }
    const fn = SCREENS[nm] || SCREENS.home;
    const scr = fn(arg);
    const routeKey = nm + "/" + arg;
    const y = window.scrollY;
    const focusId = keepScroll && document.activeElement ? document.activeElement.id : null;
    const bar = document.getElementById("bar"), main = document.getElementById("main");
    const g = GROUP[nm] || (nm === "q" ? (["bio", "issues", "photo"].includes(arg) ? "message" : ["web", "signup", "disclaimer"].includes(arg) ? "materials" : "plan") : "");
    bar.innerHTML = scr.bare ? "" : `<div class="bar-inner"><div class="bar-left">${scr.back ? backLink(scr.back[0], scr.back[1]) : ""}<a class="brandmark" href="#/home"><span class="logo">${I.house({ s: 18, w: 2.2 })}</span><span>${esc(name() ? `${name()} for ${st.cfg.candidate.office || "office"}` : "Campaign-in-a-Box")}</span></a></div>
      <div class="bar-title">${esc(scr.title || "")}</div>
      <nav class="segs" aria-label="Steps">${[["plan", "Plan"], ["message", "Message"], ["materials", "Materials"], ["checklist", "Launch"]].map(([h, l]) => `<a href="#/${h}"${g === (h === "checklist" ? "launch" : h) ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div class="bar-right"><span class="saved wide-only" data-saved>${savedText()}</span>${scr.right || ""}</div></div>`;
    main.innerHTML = `<div class="screen ${scr.cls || ""}">${scr.html}</div>${scr.actions ? `<div class="actions"><div class="inner">${scr.actions}</div></div>` : ""}`;
    document.title = (scr.title ? scr.title + " · " : "") + "Campaign-in-a-Box";
    live = scr.live || {};
    after = scr.after || null;
    refreshLive(true);
    if (keepScroll && routeKey === lastRoute) {
      window.scrollTo(0, y);
      if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
    } else {
      window.scrollTo(0, 0);
      const h1 = main.querySelector("h1");
      if (h1 && lastRoute) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    }
    lastRoute = routeKey;
  };
  let liveTimer = null;
  const refreshLive = (now) => {
    clearTimeout(liveTimer);
    const go = () => {
      Object.entries(live).forEach(([k, fn]) => {
        const el = document.querySelector(`[data-live="${k}"]`);
        if (!el || (!now && el.contains(document.activeElement) && document.activeElement.matches("input,textarea,select"))) return;
        const html = fn();
        if (el.innerHTML !== html) el.innerHTML = html;
      });
      if (after) after();
    };
    if (now) go(); else liveTimer = setTimeout(go, 120);
  };

  /* ------------------------------------------------------------ events */
  const readInput = (el) => {
    const kind = el.dataset.kind || "text";
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (kind === "pct") { const n = U.num(v); return n == null ? null : n / 100; }
    if (kind === "int") { const n = U.num(v); return n == null ? 0 : Math.max(0, Math.round(n)); }
    if (kind.startsWith("off:")) { if (!v || !st.cfg.election.election_day) return undefined; return U.daysBetween(st.cfg.election.election_day, v); }
    if (kind === "hex") { const n = K.norm(v); return n || undefined; }
    if (kind === "color") return K.norm(v);
    return v;
  };
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches && el.matches("[data-oe-filter]")) { oeView.filter = el.value; clearTimeout(oeView.t); oeView.t = setTimeout(() => render(true), 250); return; }
    if (!el.dataset || !el.dataset.bind) return;
    const v = readInput(el);
    if (v === undefined) return;
    if (el.dataset.kind === "hex" || el.dataset.kind === "color") {
      document.querySelectorAll(`[data-bind="${el.dataset.bind}"]`).forEach((o) => { if (o !== el) o.value = v; });
    }
    setP(el.dataset.bind, v);
    if (/^cfg\.place\.|^cfg\.candidate\.office$/.test(el.dataset.bind) && st.cfg.place.state) st.cfg.candidate.jurisdiction = PL.jurisdiction(st.cfg.place, st.cfg.candidate.office);
    if (st.meta.example && !/^cfg\.brand|^strategy\.(thresholds|margin|turnoutOverride)|^cfg\.pieces/.test(el.dataset.bind)) st.meta.exampleEdited = true;
    ST.normalize(st);
    save();
    refreshLive();
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.bind && (el.type === "date")) { const v = readInput(el); if (v !== undefined) { setP(el.dataset.bind, v); save(); refreshLive(); } }
    if (el.dataset && el.dataset.act) act(el.dataset.act, el.dataset.arg, el, e);
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
    if (el.tagName === "A" && !["sitepage", "email", "start", "use-custom"].includes(el.dataset.act)) return;
    if (["sitepage", "email"].includes(el.dataset.act)) e.preventDefault();
    act(el.dataset.act, el.dataset.arg, el, e);
  });
  window.addEventListener("hashchange", () => render(false));
  window.addEventListener("scroll", () => { const b = document.getElementById("bar"); if (b) b.classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });

  const busy = async (label, fn) => {
    toast(label + "…", 60000);
    try { await fn(); } catch (err) { console.error(err); toast("Something went wrong: " + (err && err.message ? err.message : err), 6000); return; }
  };
  const gate = () => {
    const need = lockList();
    if (!need.length) return true;
    toast(`First confirm: ${need.map((n) => n.label).join(", ")}. You can download PROOF copies any time.`, 5500);
    location.hash = "#/checklist";
    return false;
  };
  const fileBase = () => U.slug(st.cfg.candidate.full_name || "campaign");

  const ACT = {
    start: () => { if (!st) st = ST.blank(); st.meta.seenWelcome = true; save(true); },
    example: () => {
      if (st && !st.meta.example && st.cfg.candidate.first_name && !confirm("Load the fictional example? It replaces the campaign on this device. Download a backup first if you want to keep yours.")) return;
      st = ST.example(); ST.normalize(st); save(true); location.hash = "#/home"; render();
      toast("Loaded the Rivertown example");
    },
    new: () => {
      if (!confirm("Start your own campaign? This clears the example from this device.")) return;
      st = ST.blank(); st.meta.seenWelcome = true; save(true); location.hash = "#/q/name";
    },
    wipe: () => {
      if (!confirm("Delete everything on this device? This can't be undone.")) return;
      ST.clear(); st = null; location.hash = ""; render(); toast("Deleted");
    },
    backup: () => { O.share(O.backupBlob(st), O.backupName(st), "Campaign backup").then((r) => r !== "cancelled" && toast("Backup ready — keep it somewhere safe")); },
    restore: async (arg, el) => {
      const f = el.files && el.files[0]; if (!f) return;
      try {
        const ns = await O.readBackup(f);
        if (st && st.cfg.candidate.first_name && !st.meta.example && !confirm(`Replace the campaign on this device with “${ns.cfg.candidate.full_name || "this backup"}”?`)) return;
        st = ns; st.meta.seenWelcome = true; save(true); location.hash = "#/home"; render(); toast("Backup opened");
      } catch (err) { toast(err.message || "Couldn't open that file", 5000); }
      el.value = "";
    },
    cli: () => O.download(new Blob([JSON.stringify(ST.toCampaignJson(st), null, 2)], { type: "application/json" }), "campaign.json"),
    "oe-list": async () => {
      const P = PROV[oeView.provider];
      oeView.busy = "Loading the list…"; render(true);
      try { oeView.idx = await P.index(st.cfg.place.state); if (oeView.provider === "utah") utIdxDate = oeView.idx.collected ? U.fmtDate(oeView.idx.collected, "en", "long") : ""; }
      catch (err) { toast(err.message || "Couldn't load the list", 6000); }
      oeView.busy = ""; render(true);
    },
    "oe-all": () => { oeView.showAll = !oeView.showAll; render(true); },
    "oe-add": async (path) => {
      const P = PROV[oeView.provider], f = P.files(oeView.idx, st.cfg.place.county).find((x) => x.path === path);
      if (!f || oeView.picked.length >= 4) return;
      oeView.busy = `Opening ${P.label(f)}…`; render(true);
      try {
        const sum = await P.load(oeView.idx, f, st.cfg.place.county, (got) => { const el = document.querySelector('[role="status"]'); if (el) el.textContent = `Downloading ${P.label(f)}… ${(got / 1048576).toFixed(1)} MB`; });
        addPicked(f, P.label(f), sum, false);
        toast(`Added ${P.label(f)} — check the race and candidate`);
      } catch (err) { toast(err.message || "Couldn't open that", 6000); }
      oeView.busy = ""; render(true);
    },
    "oe-file": async (a, el) => {
      const file = el.files && el.files[0]; if (!file) return;
      if (oeView.picked.length >= 4) { toast("You already have 4 elections. Remove one first."); el.value = ""; return; }
      oeView.busy = `Reading ${file.name}…`; render(true);
      try {
        const rows = await CIB.xlsx.readResultsFile(file);
        const hasCounty = rows.some((r) => r.county);
        const sum = OE.summarize(rows, hasCounty ? st.cfg.place.county : "");
        const year = (file.name.match(/(19|20)\d\d/) || [""])[0];
        addPicked({ path: "file:" + file.name + ":" + file.size, date: year ? year + "0000" : "", kind: "file", label: file.name }, file.name, sum, true);
        toast(`Read ${sum.precincts.length} precincts and ${sum.races.length} races from ${file.name}`);
      } catch (err) { toast(err.message || "Couldn't read that file", 7000); }
      oeView.busy = ""; el.value = ""; render(true);
    },
    "oe-remove": (path) => { oeView.picked = oeView.picked.filter((x) => x.file.path !== path); oeView.chosen = null; render(true); },
    "oe-race": (i, el) => {
      const x = oeView.picked[i]; x.raceKey = el.value;
      const race = pickedRace(x);
      x.cand = race ? [...race.cands.entries()].sort((a, b) => b[1].total - a[1].total)[0][0] : "";
      if (Number(i) === 0) oeView.chosen = null;
      render(true);
    },
    "oe-est": (a, el) => { oeView.estimate = el.checked; render(true); },
    "oe-cand": (i, el) => { oeView.picked[i].cand = el.value; },
    "oe-p": (k, el) => { if (el.checked) oeView.chosen.add(k); else oeView.chosen.delete(k); render(true); },
    "oe-sel": (how) => {
      const f = oeView.filter.toLowerCase();
      OE.groupPrecincts(oeView.picked).filter((g) => !f || g.names.some((n) => n.toLowerCase().includes(f))).forEach((g) => how === "all" ? oeView.chosen.add(g.key) : oeView.chosen.delete(g.key));
      render(true);
    },
    "oe-use": () => {
      const chosen = OE.groupPrecincts(oeView.picked).filter((g) => oeView.chosen.has(g.key)).map((g) => g.key);
      if (!chosen.length) { toast("Pick at least one precinct"); return; }
      if (st.strategy.precincts.some((p) => p.precinct) && !["openelections", "utah", "file"].includes(st.strategy.precinctSource) && !confirm("Replace the precinct numbers you already have?")) return;
      st.strategy.precincts = OE.build(oeView.picked, chosen, oeView.estimate);
      st.strategy.electionLabels = oeView.picked.map((x) => `${x.label} · ${pickedRace(x).key}`);
      st.strategy.dataMode = "precincts";
      st.strategy.precinctSource = oeView.picked.every((x) => x.dropped) ? "file" : oeView.provider;
      st.strategy.importSource = { provider: oeView.provider, elections: oeView.picked.map((x) => ({ label: x.label, path: x.dropped ? x.label : x.file.path, race: x.raceKey, candidate: x.cand })) };
      if (pickedRace(oeView.picked[0]).voteFor > 1 && st.strategy.raceType === "two") toast("Tip: if your race elects more than one person, set “How is this race won?” to several seats.", 6000);
      save(true); location.hash = "#/q/precincts";
      toast(`Added ${chosen.length} precincts. Check the table, then update “Registered now” with today's numbers.`, 6000);
    },
    "pl-state": (a, el) => { st.cfg.place.state = el.value; if (!PL.counties(el.value).includes(st.cfg.place.county) && PL.counties(el.value).length) st.cfg.place.county = ""; placeChanged(); render(true); },
    "pl-county": (a, el) => { st.cfg.place.county = el.value; placeChanged(); render(true); },
    "pl-use": () => {
      const pl = st.cfg.place, cty = PL.county(pl.state, pl.county);
      if (!cty) return;
      Object.assign(st.cfg.election, { election_office: `${cty.name} County Clerk — Elections`, election_office_phone: cty.phone, voter_info_url: cty.url });
      save(); render(true); toast(`Using ${cty.name} County's election office`);
    },
    pronoun: (v) => { st.cfg.candidate.pronoun_subject = v; save(); render(true); },
    office: (v) => { st.cfg.candidate.office = v; if (st.cfg.place.state) st.cfg.candidate.jurisdiction = PL.jurisdiction(st.cfg.place, v); save(); render(true); },
    raceType: (v) => { st.strategy.raceType = v; save(); refreshLive(); },
    source: (v) => {
      if (v === "openelections" || v === "utah") { save(); location.hash = "#/oe/" + v; return; }
      if (v === "quick") st.strategy.dataMode = "quick";
      else {
        st.strategy.dataMode = "precincts";
        if (v === "example") { const ex = ST.example(); st.strategy.precincts = ex.strategy.precincts; st.strategy.electionLabels = ex.strategy.electionLabels; }
        else if (st.strategy.precinctSource === "example") { st.strategy.precincts = []; st.strategy.electionLabels = ["", "", ""]; }
        st.strategy.precinctSource = v;
        if (!st.strategy.precincts.length) st.strategy.precincts = [1, 2, 3].map(() => ({ precinct: "", registered_now: "", notes: "", elections: [{}, {}, {}] }));
      }
      save();
    },
    official: (a, el) => { if (el.checked) { st.strategy.precinctSource = "official"; save(); toast("Marked as official numbers"); render(true); } },
    spanish: (a, el) => { st.cfg.language.secondary = el.checked ? "es" : ""; st.cfg.language.secondary_name = el.checked ? "Español" : ""; save(); },
    photo: async (a, el) => {
      const f = el.files && el.files[0]; if (!f) return;
      try { const p = await O.loadPhoto(f); st.photo = p.dataUrl; save(true); render(true); if (p.w < 1200) toast("This photo is small — it may look soft on a mailer. A larger one is better.", 5000); }
      catch (err) { toast(err.message, 5000); }
    },
    "photo-remove": () => { st.photo = null; save(); render(true); },
    signup: (v) => {
      st.view_signup = v;
      st.cfg.web.forms = st.cfg.web.forms || {};
      if (v === "listmonk") { st.cfg.web.forms.provider = "listmonk"; st.cfg.web.forms.lists = st.cfg.web.forms.lists || {}; }
      else { st.cfg.web.forms.provider = "none"; if (v === "email") st.cfg.web.volunteer_form_url = ""; }
      save(); refreshLive();
    },
    "prow-add": () => { st.strategy.precincts.push({ precinct: "", registered_now: "", notes: "", elections: Array.from({ length: nEl() }, () => ({})) }); save(); render(true); },
    "prow-del": (i) => { st.strategy.precincts.splice(Number(i), 1); save(); render(true); },
    "pel-add": () => { st.strategy.electionLabels.push(""); save(); render(true); },
    "pel-del": () => { const n = nEl(); st.strategy.electionLabels.length = n - 1; st.strategy.precincts.forEach((p) => { if (p.elections) p.elections.length = Math.min(p.elections.length, n - 1); }); save(); render(true); },
    paste: () => {
      const t = document.getElementById("paste").value, parsed = parsePaste(t);
      if (!parsed) { toast("Couldn't find any rows in that. Check the columns."); return; }
      const keepEmpty = st.strategy.precincts.filter((p) => p.precinct);
      st.strategy.precincts = keepEmpty.concat(parsed.rows);
      const maxEl = Math.max(...st.strategy.precincts.map((p) => (p.elections || []).length), 1);
      st.strategy.electionLabels = Array.from({ length: Math.min(4, maxEl) }, (_, j) => parsed.labels[j] || st.strategy.electionLabels[j] || "");
      save(); render(true); toast(`Added ${parsed.rows.length} precinct${parsed.rows.length > 1 ? "s" : ""}`);
    },
    template: () => O.download(new Blob(["precinct,registered_now,e1_label,e1_registered,e1_ballots_cast,e1_baseline_votes,e1_race_total_votes,e2_label,e2_registered,e2_ballots_cast,e2_baseline_votes,e2_race_total_votes,e3_label,e3_registered,e3_ballots_cast,e3_baseline_votes,e3_race_total_votes,notes\n"], { type: "text/csv" }), "precinct-results-template.csv"),
    suggest: () => {
      const s = M.suggestCore(st.cfg), old = st.cfg.message_box.core_message;
      st.cfg.message_box.core_message = s; save(); render(true);
      toast("Suggested from your answers — edit it to sound like you");
      if (old) st._undoCore = old;
    },
    "box-add": (k) => { const mb = st.cfg.message_box; mb[k] = mb[k] || []; mb[k].push(k === "q2" ? { text: "", source: "" } : k === "q3_responses" ? { attack: "", response: "" } : ""); save(); render(true); },
    "box-del": (a) => { const [k, i] = a.split("."); st.cfg.message_box[k].splice(Number(i), 1); save(); render(true); },
    "sl-add": () => { st.cfg.slogans.push({ text: "", quadrants: ["Q1"], role: st.cfg.slogans.length ? "secondary" : "primary" }); save(); render(true); },
    "sl-del": (i) => { const was = st.cfg.slogans[i].role === "primary"; st.cfg.slogans.splice(Number(i), 1); if (was && st.cfg.slogans[0]) st.cfg.slogans[0].role = "primary"; save(); render(true); },
    "sl-q": (a) => { const [i, q] = a.split("."); const s = st.cfg.slogans[i]; s.quadrants = s.quadrants || []; s.quadrants = s.quadrants.includes(q) ? s.quadrants.filter((x) => x !== q) : s.quadrants.concat(q).sort(); if (s.role !== "primary") s.role = q === "Q3" && s.quadrants.length === 1 ? "inoculation" : s.quadrants.length === 1 && s.quadrants[0] === "Q2" ? "contrast" : "secondary"; save(); render(true); },
    "sl-primary": (i) => { st.cfg.slogans.forEach((s, j) => { if (j === Number(i)) s.role = "primary"; else if (s.role === "primary") s.role = "secondary"; }); save(); render(true); },
    palette: (k) => { st.cfg.brand.palette = k; save(); refreshLive(true); document.querySelectorAll('[data-act="palette"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.arg === k))); },
    condensed: () => { st.cfg.brand.type_pairing = "condensed"; save(); render(true); toast("Switched to the Condensed type style"); },
    type: (a, el) => { st.cfg.brand.type_pairing = el.value; save(); refreshLive(true); },
    "use-custom": () => { st.cfg.brand.palette = "custom"; save(true); location.hash = "#/materials"; },
    "fix-colors": () => { const f = K.fix(st.cfg.brand.custom.main, st.cfg.brand.custom.accent); st.cfg.brand.custom = f; save(); render(true); toast("Adjusted lightness — your colors, now readable"); },
    side: (a) => { const [id, s] = a.split("."); view.side[id] = s; render(true); },
    "sign-slogan": (t) => { const i = st.cfg.pieces.findIndex((p) => p.type === "yard_sign" && p.lang === "en"); st.cfg.pieces[i].content.slogan = t; save(); render(true); },
    check: (k, el) => { st.checks[k] = el.checked; save(true); if (lastRoute.startsWith("checklist")) render(true); },
    sitepage: (p) => { view.sitePage = p; render(true); },
    email: (i) => { view.email = Number(i); render(true); },
    "plan-dl": () => busy("Making your plan", async () => {
      const files = [{ name: "plan.md", data: O.planMarkdown(st) }, { name: "targeting.csv", data: O.targetingCsv(st) }, { name: "calendar.csv", data: O.calendarCsv(st) }];
      O.download(O.zip(files), `${fileBase()}-plan.zip`); toast("Plan downloaded");
    }),
    "piece-dl": (id) => { if (!gate()) return; const x = renderPiece(id); if (!x.ready) { toast("Fix the notes on this piece first: " + x.warnings[0], 5000); return; } busy("Making the printer file", async () => { O.download(await O.piecePdf(x, R.context(st), false), `${fileBase()}-${id}-print.pdf`); toast("Ready for the printer"); }); },
    "piece-proof": (id) => busy("Making a PROOF copy", async () => { const x = renderPiece(id); O.download(await O.piecePdf(x, R.context(st), true), `${fileBase()}-${id}-PROOF.pdf`); toast("PROOF copy downloaded"); }),
    "piece-share": (id) => busy("Making a PROOF copy", async () => { const x = renderPiece(id); const r = await O.share(await O.piecePdf(x, R.context(st), true), `${fileBase()}-${id}-PROOF.pdf`, `${x.name} — PROOF`); toast(r === "shared" ? "Shared" : r === "cancelled" ? "Cancelled" : "PROOF copy downloaded"); }),
    "dl-proofs": () => busy("Making PROOF copies", async () => {
      const ctx = R.context(st), files = [];
      for (const p of R.activePieces(st)) { const x = R.piece(st, p, ctx); files.push({ name: `PROOF-${p.id}.pdf`, data: new Uint8Array(await (await O.piecePdf(x, ctx, true)).arrayBuffer()) }); toast(`Making PROOF copies… ${files.length} of ${R.activePieces(st).length}`, 60000); }
      O.download(O.zip(files), `${fileBase()}-PROOFS.zip`); toast("PROOF copies downloaded");
    }),
    "dl-social": () => { if (!gate()) return; busy("Making images", async () => O.download(O.zip(await socialFiles(false)), `${fileBase()}-social-and-ads.zip`)).then(() => toast("Images downloaded")); },
    "dl-social-proof": () => busy("Making PROOF images", async () => O.download(O.zip(await socialFiles(true)), `${fileBase()}-social-PROOFS.zip`)).then(() => toast("PROOF images downloaded")),
    "dl-site": () => { if (!gate()) return; busy("Making your website", async () => O.download(O.zip(await siteFiles()), `${fileBase()}-website.zip`)).then(() => toast("Website downloaded — see PUBLISH-ME.txt inside")); },
    "dl-email": () => { if (!gate()) return; O.download(O.zip(O.emailFiles(st)), `${fileBase()}-emails.zip`); toast("Emails downloaded"); },
    "dl-all": () => { if (!gate()) return; busy("Making everything", downloadEverything); }
  };
  const placeChanged = () => {
    st.cfg.candidate.jurisdiction = PL.jurisdiction(st.cfg.place, st.cfg.candidate.office);
    save();
  };
  const act = (name, arg, el, e) => { const f = ACT[name]; if (f) f(arg, el, e); };
  const renderPiece = (id) => R.piece(st, st.cfg.pieces.find((p) => p.id === id));

  const socialFiles = async (proof) => {
    const ctx = R.context(st), items = R.social(st, ctx), files = [];
    for (const x of items) { files.push({ name: `${x.group === "Ads" ? "ads" : "social"}/${proof ? "PROOF-" : ""}${x.id}.png`, data: new Uint8Array(await (await O.png(x.doc, ctx, proof)).arrayBuffer()) }); }
    files.push({ name: "README.txt", data: `Social posts and ads\n\n${items.map((x) => `${x.id} (${x.w}×${x.h}): ${x.use}`).join("\n")}\n\nPolitical ads on Meta and Google need identity verification and a "Paid for by" label first — start early.\n⚖️ Disclaimer rules for online ads vary by state.\n` });
    return files;
  };
  const siteFiles = async () => {
    const ctx = R.context(st), social = R.social(st, ctx);
    const land = social.find((x) => x.card === "core" && x.fmt === "landscape");
    const icon = new R.Doc(512, 512, { unit: "px" });
    icon.rect("background", 0, 0, 512, 512, ctx.P.primary);
    const ini = (ctx.cand.first_name[0] || "") + (ctx.cand.last_name[0] || ""), fs = ctx.head.fit(ini, 380, 300);
    icon.text("text", 256, 256 + ctx.head.cap(fs) / 2, ini, ctx.head, fs, ctx.P.onPrimary, "middle");
    icon.rect("art", 120, 410, 272, 26, ctx.P.secondary, { rx: 13 });
    return O.website(st, ctx, {
      photo: st.photo ? O.dataUrlBytes(st.photo) : null,
      share: land ? new Uint8Array(await (await O.png(land.doc, ctx, false)).arrayBuffer()) : null,
      icon: new Uint8Array(await (await O.png(icon, ctx, false)).arrayBuffer())
    });
  };
  const downloadEverything = async () => {
    const ctx = R.context(st), files = [];
    const pieces = R.activePieces(st).map((p) => R.piece(st, p, ctx));
    const blocked = pieces.filter((x) => !x.ready);
    let n = 0;
    for (const x of pieces.filter((p) => p.ready)) {
      toast(`Making printer files… ${++n} of ${pieces.length - blocked.length}`, 60000);
      files.push({ name: `print/${x.piece.id}-print.pdf`, data: new Uint8Array(await (await O.piecePdf(x, ctx, false)).arrayBuffer()) });
      x.pages.forEach((pg) => files.push({ name: `print/editable-svg/${x.piece.id}-${pg.side}.svg`, data: O.svgFile(pg.doc, ctx, false) }));
    }
    toast("Making social images…", 60000);
    (await socialFiles(false)).forEach((f) => files.push({ ...f, name: f.name === "README.txt" ? "social/README.txt" : f.name }));
    toast("Making your website…", 60000);
    (await siteFiles()).forEach((f) => files.push({ ...f, name: "website/" + f.name }));
    O.emailFiles(st, ctx).forEach((f) => files.push(f));
    files.push({ name: "plan/plan.md", data: O.planMarkdown(st) }, { name: "plan/targeting.csv", data: O.targetingCsv(st) }, { name: "plan/calendar.csv", data: O.calendarCsv(st) },
      { name: "plan/traceability.csv", data: O.traceability(st) }, { name: "plan/utm-plan.csv", data: O.utmPlan(st) });
    files.push({ name: "campaign.json", data: JSON.stringify(ST.toCampaignJson(st), null, 2) });
    files.push({ name: "backup/" + O.backupName(st), data: JSON.stringify({ kind: "campaign-in-a-box-backup", savedAt: new Date().toISOString(), state: st }) });
    files.push({ name: "START-HERE.txt", data: `${st.cfg.candidate.full_name} — campaign files\nMade with Campaign-in-a-Box (free, open source) on ${U.today()}.\n\nprint/     PDFs for your printer (one per piece, every side; trim and bleed set) and editable SVGs\nsocial/    posts and stories for each platform\nads/       display ads and a Facebook cover\nwebsite/   your whole website — see website/PUBLISH-ME.txt\nemail/     welcome, volunteer, fundraising and get-out-the-vote emails, with a send schedule\nplan/      win number, precinct targets, calendar, and how every piece traces to your message\ncampaign.json   for a tech volunteer using the kit's command-line tools\nbackup/    open this in the app on another device\n\nBefore printing: ask your printer for a proof, and scan every QR code from it with your phone.\n${blocked.length ? `\nNOT INCLUDED (fix in the app first): ${blocked.map((b) => b.name + " — " + b.warnings[0]).join("; ")}\n` : ""}\n⚖️ Not legal advice. Disclaimer wording, dates and sign rules vary by state.\n` });
    toast("Packing it up…", 60000);
    O.download(O.zip(files), `${fileBase()}-campaign-files.zip`);
    toast(blocked.length ? `Downloaded. ${blocked.length} piece${blocked.length > 1 ? "s" : ""} left out until fixed — see START-HERE.txt` : "Everything downloaded", 6000);
  };

  /* --------------------------------------------------------------- boot */
  R.loadFonts().then(() => { fontsReady = true; refreshLive(true); });
  if (st) ST.normalize(st);
  render();
  CIB.ui = { get state() { return st; }, render };
})();
