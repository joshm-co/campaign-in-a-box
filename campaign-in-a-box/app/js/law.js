/* Campaign-in-a-Box app — the legal checklist ("Check the rules").
 * A list of questions for the election office or an election lawyer, built from what this campaign
 * actually uses (signs, mail, ads, email, Spanish, a voter list), with what we found for the state
 * and where we found it. Not legal advice: every answer says to confirm it.
 * To add a state: copy the UT block, cite each source, and set `checked` to the date you read them.
 * MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const LW = (CIB.law = {});

  // Questions. `when(st, use)` decides whether this campaign needs to ask it; `check` ties an answer to
  // the "Before you print" checklist (confirming here confirms there).
  LW.GROUPS = { running: "Running", money: "Money", materials: "Materials", signs: "Yard signs", voting: "Voting dates and Election Day", data: "Voter lists" };
  LW.ITEMS = [
    { key: "filing", group: "running", q: "When is the filing period, where do I file, and is there a fee or petition?", why: "Miss it and you're not on the ballot." },
    { key: "qualify", group: "running", q: "What are the residency and other qualifications for this office? Can I keep my current job if I win?", why: "Opponents check this." },
    { key: "method", group: "running", q: "How is this race decided — most votes, a majority with a runoff, ranked choice, or several seats at once? Is there a primary?", why: "It changes the win number." },
    { key: "committee", group: "money", q: "Do I need a committee, a treasurer or a separate bank account? When must I register it?", why: "Usually before you raise or spend money." },
    { key: "limits", group: "money", q: "Are there limits on how much one person or business can give? Anyone who can't give (corporations, unions, out-of-state)?", why: "Shown on your donate page." },
    { key: "reports", group: "money", q: "When are finance reports due, and what must each one list? What happens if one is late?", why: "Goes on your calendar." },
    { key: "anonymous", group: "money", q: "Is there a cap on cash or anonymous donations? Do I need donors' employer and occupation?", why: "Your donate and volunteer forms collect this." },
    { key: "personal", group: "money", q: "What counts as personal use of campaign money? Can I pay myself, family, or for childcare?", why: "Common complaint against first-time candidates." },
    { key: "disclaimer", group: "materials", check: "disclaimer", q: "What exact “Paid for by” wording do I need? Committee name, treasurer, address? Minimum size? A box?", why: "Printed on every piece." },
    { key: "exempt", group: "materials", q: "Which items don't need the “Paid for by” line (small signs, buttons, pens, small online ads)?", why: "Decides what goes on the yard sign." },
    { key: "online", group: "materials", when: (st, u) => u.ads || u.social, q: "Does the line have to be inside online ads and social graphics, or can it be on the page they link to? Do I report online ad spending separately?", why: "You have ads and social posts." },
    { key: "email", group: "materials", q: "Do campaign emails and texts need the “Paid for by” line? Are there rules on texting people who didn't sign up?", why: "Your email sequence uses it in the footer." },
    { key: "ai", group: "materials", q: "Do I have to label images, audio or video that were made or changed with AI?", why: "Some states now require a label." },
    { key: "translation", group: "materials", check: "translation", when: (st) => st.cfg.language.secondary === "es", q: "Does my Spanish material need the “Paid for by” line in Spanish too?", why: "You have Spanish pieces." },
    { key: "photos", group: "materials", q: "Can I use photos taken in a public building, or of public employees in uniform?", why: "Check your photos before printing." },
    { key: "signs-when", group: "signs", when: (st, u) => u.signs, q: "How early can yard signs go up, and where are they allowed (sidewalk strips, road edges, near polling places)? Is there a size limit?", why: "City and county rules apply too." },
    { key: "signs-down", group: "signs", when: (st, u) => u.signs, q: "When must signs come down after the election?", why: "On your calendar as “Take down yard signs by”." },
    { key: "dates", group: "voting", check: "dates", q: "Confirm: registration deadline, when ballots go out, early voting dates, Election Day, and when ballots must arrive.", why: "Printed on the palm card, GOTV emails and your website." },
    { key: "electioneering", group: "voting", q: "How far from a polling place or ballot drop box must campaigning stop? Does that include signs, shirts and buttons?", why: "For you and every volunteer." },
    { key: "ballots", group: "voting", q: "Can volunteers offer to carry someone's ballot to a drop box?", why: "Often limited to family or household." },
    { key: "voterlist", group: "data", q: "Where do I get the voter list, what does it cost, and what am I allowed to use it for? Can I upload it to Facebook or Google to target ads?", why: "Your walk lists come from it." }
  ];

  // Utah. Read 2026-11-08. Sources are the state code, the 2026 session law and the state elections office.
  const UT_CODE = (t, c, s) => `https://le.utah.gov/xcode/Title${t}/Chapter${c}/${s}.html`;
  LW.STATES = {
    UT: {
      name: "Utah", checked: "2026-11-08",
      sources: {
        disclaimer: { title: "Utah Code 20A-11-901, political advertisements", url: UT_CODE("20A", "11", "20A-11-S901") },
        hb33: { title: "H.B. 33 (2026), Political Signs Amendments", url: "https://le.utah.gov/~2026/bills/static/HB0033.html" },
        muni: { title: "Utah Code 10-3-208, municipal campaign finance", url: UT_CODE("10", "3", "10-3-S208") },
        filing: { title: "Utah Code 10-3-301, municipal declarations of candidacy", url: UT_CODE("10", "3", "10-3-S301") },
        polls: { title: "Utah Code 20A-3a-501, prohibited conduct at polling places", url: UT_CODE("20A", "3A", "20A-3a-S501") },
        hb300: { title: "H.B. 300 (2025), election amendments (mail ballots)", url: "https://le.utah.gov/~2025/bills/static/HB0300.html" },
        voterdata: { title: "vote.utah.gov — voter registration and election data", url: "https://vote.utah.gov/obtain-voter-registration-or-election-data/" },
        limits: { title: "Ballotpedia — campaign finance requirements in Utah", url: "https://ballotpedia.org/Campaign_finance_requirements_in_Utah" },
        votegov: { title: "vote.utah.gov — Utah's election office", url: "https://vote.utah.gov/" }
      },
      answers: {
        filing: { text: "City and town offices: file a declaration of candidacy with the city recorder in early June of the election year (odd years) — the recorder posts the exact days. County and state offices file with the county clerk or the Lieutenant Governor on different dates.", cite: ["filing"], local: true },
        limits: { text: "State law sets no contribution limits for state candidates. Some cities and counties set their own — ask your city recorder or county clerk.", cite: ["limits"], local: true },
        reports: { text: "City and town candidates: reports are due 7 days before the primary, 28 and 7 days before the general election, and 30 days after it (also 30 days after the primary if you're eliminated). Itemize every contribution and expense unless both stay at $500 or less. Reports are posted online. A late report brings a fine, and filing the last report before the election more than a day late can remove you from the ballot.", cite: ["muni"] },
        anonymous: { text: "City and town candidates may not keep anonymous contributions over $50; the extra must be given away within 30 days.", cite: ["muni"] },
        personal: { text: "City and town candidates must keep campaign money in a separate account and may not use it personally.", cite: ["muni"] },
        disclaimer: { text: "Ads paid for by the campaign must say so (for example “Paid for by Friends of …”). If someone else pays with your OK, the line names who paid and that you authorized it. From January 1, 2027 the line must “clearly and conspicuously” identify who paid.", cite: ["disclaimer", "hb33"] },
        exempt: { text: "Through 2026: lawn signs 4 × 8 ft or smaller, bumper stickers, buttons, pens and other small items are exempt. From January 1, 2027: signs smaller than 24 × 18 in, and signs paid for by the candidate that clearly name the candidate. The kit's yard sign is exactly 24 × 18 in — keeping the line on it is the safe choice.", cite: ["disclaimer", "hb33"] },
        email: { text: "The rule covers “general public political advertising”. Email and texts aren't named — ask.", cite: ["disclaimer"] },
        "signs-when": { text: "From 2026: no signs on utility poles, light poles, traffic signals or railroad signals (an infraction). The owner next to a park strip may put signs there. Local sign rules must be the same for all signs, whatever they say, and a city can't ban signs more than 150 ft from a polling place. Ask your city about timing and right-of-way rules.", cite: ["hb33", "polls"], local: true },
        "signs-down": { text: "Signs on a road right-of-way must come down within 14 days after the election.", cite: ["hb33"], local: true },
        dates: { text: "Every active voter gets a mail ballot about 3 weeks before Election Day (2026: 21 days); from 2029 voters must ask for one. The deadline to register online or by mail is 11 days before — ask about registering in person after that. Ballots must be received by 8 p.m. on Election Day — a postmark no longer counts — so tell supporters to drop ballots off or mail them early. From 2026 voters write the last four digits of their ID or Social Security number on the return envelope. Early voting dates are set by each county.", cite: ["hb300", "votegov"], dates: { ballots_out: -21, register_deadline: -11 } },
        electioneering: { text: "No campaigning in a polling place or in public areas within 150 ft of the building — and a ballot drop box counts as a polling place. A class A misdemeanor.", cite: ["polls"] },
        ballots: { text: "Carrying someone else's voted ballot is limited to household members, people helping a voter who needs it, and election and postal workers. Don't offer ballot pickup.", cite: ["polls"] },
        voterlist: { text: "The state sells the statewide list for $1,050 (no updates, no refunds); county lists come from the county clerk. Birth dates are withheld (age range only), and protected voters' records are left out. “Who has voted” lists are $35 per election. Ask what uses are allowed before uploading the list to an ad platform.", cite: ["voterdata"] }
      }
    }
  };

  // What this campaign uses, from its materials.
  LW.uses = (st) => {
    const p = (CIB.render && CIB.render.activePieces ? CIB.render.activePieces(st) : st.cfg.pieces) || [];
    return { signs: p.some((x) => x.type === "yard_sign"), ads: true, social: true, mail: p.some((x) => /mailer/.test(x.type || x.id)) };
  };

  LW.state = (st) => LW.STATES[(st.cfg.place && st.cfg.place.state) || ""] || null;

  // The checklist for this campaign: items with this state's answer (if any) and the saved status.
  LW.items = (st) => {
    const u = LW.uses(st), S = LW.state(st), saved = (st.run && st.run.law) || {};
    return LW.ITEMS.filter((it) => !it.when || it.when(st, u)).map((it) => {
      const a = S && S.answers[it.key];
      const rec = saved[it.key] || {};
      const linked = it.check && st.checks[it.check];
      return { ...it, answer: a || null, sources: a ? a.cite.map((k) => S.sources[k]) : [], status: rec.status || (linked ? "ok" : ""), note: rec.note || "" };
    });
  };
  LW.progress = (items) => ({ done: items.filter((i) => i.status).length, total: items.length, diff: items.filter((i) => i.status === "diff").length });

  // A stand-alone page to print or email to the election office or a lawyer.
  LW.document = (st) => {
    const U = CIB.util, esc = U.esc, c = st.cfg.candidate, S = LW.state(st), items = LW.items(st);
    const where = [st.cfg.place.town, st.cfg.place.county && st.cfg.place.county + " County", S ? S.name : st.cfg.place.state].filter(Boolean).join(", ");
    const st8 = { ok: "Confirmed", diff: "Different — see note", "": "Not asked yet" };
    const groups = Object.entries(LW.GROUPS).map(([g, label]) => {
      const rows = items.filter((i) => i.group === g);
      if (!rows.length) return "";
      return `<h2>${esc(label)}</h2>` + rows.map((i, n) => `<div class="q"><p class="ask"><b>${esc(i.q)}</b></p>
        ${i.answer ? `<p class="found"><span>What we found${i.answer.local ? " (state law — your city or county may add rules)" : ""}:</span> ${esc(i.answer.text)}<br><span class="src">${i.sources.map((s) => `${esc(s.title)} — ${esc(s.url)}`).join("<br>")}</span></p>` : ""}
        <p class="status">Status: ${st8[i.status]}${i.note ? ` — ${esc(i.note)}` : ""}</p><div class="line">Answer:</div></div>`).join("");
    }).join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rules to confirm — ${esc(c.full_name || "campaign")}</title>
<style>body{font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px;border-bottom:2px solid #111;padding-bottom:4px}.meta{color:#444;margin:0 0 16px}
.q{border:1px solid #bbb;border-radius:8px;padding:10px 14px;margin:10px 0;break-inside:avoid}.ask{margin:0 0 6px}.found{margin:0 0 6px;font-size:14px}
.found span:first-child{font-weight:600}.src{font-size:12px;color:#444;word-break:break-all}.status{font-size:13px;margin:0 0 6px}.line{border-bottom:1px solid #888;height:44px;font-size:12px;color:#666}
.note{background:#f4f4f4;padding:10px 14px;border-radius:8px;font-size:14px}@media print{body{margin:0}}</style></head><body>
<h1>Rules to confirm before we print, raise money and campaign</h1>
<p class="meta">${esc(c.full_name || "Candidate")} · ${esc([c.office, c.district].filter(Boolean).join(", ") || "office")} · ${esc(where)}<br>Prepared ${esc(U.fmtDate(U.today(), "en", "long"))}${S ? ` · State answers read ${esc(U.fmtDate(S.checked, "en", "long"))}` : ""}</p>
<p class="note">For review by the election office or an election lawyer. “What we found” comes from the sources listed and may be out of date or incomplete — it is not legal advice. Please correct anything that's wrong or missing for this office and place.</p>
${groups}
<p class="note">Made with Campaign-in-a-Box (free, open source). Nothing in this checklist was sent anywhere.</p></body></html>`;
  };
})(typeof window !== "undefined" ? window : globalThis);
