# Step 3 — Validation

Steps 1 and 2 make a plan and materials. Step 3 checks them against the real world, with a pass mark for each check, before you spend money and every week after. In the app, all of this is under **Run** (`#/run`); the logic is in `app/js/run.js` and `app/js/law.js`, and `app/tests/strategy.test.js` checks it.

## 1. Test your message with real voters

Test in the precincts you're targeting (Step 1's **Persuade** and **Turn out** groups), never on supporters. Cheapest first.

| Test | Cost and time | How | Decision rule |
|---|---|---|---|
| Listening sessions | Free · 1–2 weeks | 2–3 sessions of 6–10 voters. Ask about local problems, read the one sentence, show each slogan card in a different order, then ask which one they remember. Tally *remembered* and *liked*. | Use the most-remembered slogan unless a stronger test disagrees. Under 15 people is a hint, not a result. |
| A/B ads | $100–300 · 1–2 weeks | Two ads identical except the slogan: same image, audience (target ZIP codes), budget and dates. Separate links: `utm_campaign=message-test`, `utm_content=a` / `b`. | Wait for ≥ 30 clicks on each ad. A winner needs a two-proportion z-test of ≥ 1.96 (95%). After 400+ clicks with no winner, call it a tie. |
| Quick poll | Volunteer calls or texts · 2–3 weeks | Alternate message A and B down the list; then “Does that make you more likely to vote for …?” | Winner only if the difference is bigger than the 95% margin of error for the two halves. One number from *n* people is ±1.96·√(0.25/*n*): ±9.8 pts at 100, ±6.9 at 200, ±4.9 at 400. |

When tests disagree, trust the poll over the ads, and the ads over the sessions — but use the sessions' words in your copy. Never decide by what the candidate, family or volunteers like.

⚖️ Political ads need platform identity checks and a “Paid for by” label; texting people who didn't give you their number is limited by federal and state rules.

## 2. Check the rules

A checklist for your election office or an election lawyer, built from what the campaign uses (signs, mail, ads, email, Spanish, the voter list): 21 questions in six groups — running, money, materials, yard signs, voting dates and Election Day, voter lists. It covers every ⚖️ row in [`STATE-LAW-FLAGS.md`](../STATE-LAW-FLAGS.md).

- Each question is marked *Not asked*, *Confirmed* or *Different here* (with a note). Confirming the “Paid for by” wording, the voting dates or the Spanish disclaimer also confirms it on the app's “Before you print” list, which unlocks printer files.
- For states we've researched, each question shows what we found and where (see [`states/`](../states/)). Utah is first.
- The app downloads the list as a printable page to take to the office.

Not legal advice. Every answer says to confirm it.

## 3. Quality checks and pass marks

| Check | Pass mark | Where |
|---|---|---|
| Website pages: language set, title, search description, phone viewport, one main heading, image descriptions, labeled form boxes, no broken links between pages | All pages pass | Run automatically in the app on the pages it builds |
| Home page weight before photos (HTML + CSS + fonts) | Under 500 KB | Automatic |
| Lighthouse (mobile), via PageSpeed Insights | Performance ≥ 90 · Accessibility ≥ 95 · Best practices ≥ 90 · SEO ≥ 90 | Type the scores in |
| Keyboard-only use, 200% zoom on a phone, WAVE checker | No problems · 0 WAVE errors | Checkboxes |
| Color contrast | 7:1 signs and body text, 4.5:1 elsewhere (Step 2) | Colors screen |
| Email setup | Own domain; SPF, DKIM and DMARC records; Gmail “Show original” says PASS for all three; test lands in the inbox at Gmail, Outlook and Yahoo; one-click unsubscribe; opt-in list only | Checkboxes |
| mail-tester.com | 9/10 or higher | Type the score |
| Spam complaint rate | Under 0.1%, never 0.3% or more (Gmail's blocking threshold) | After each send |
| Bounce rate | Under 2% (stop and clean the list at 5%) | After each send |
| QR codes | Every code scanned from a printed PROOF, by two phones | One checkbox per piece; all checked = “QR codes scanned” on Before you print |

The Rivertown example site measured 0 axe violations and Lighthouse 100/100/100/100 in Step 2.

## 4. Weekly numbers against the win number

Five numbers, entered once a week (numbers for that week, not running totals), compared with where the plan says you should be by now.

| Number | Goal (editable) | Pace |
|---|---|---|
| Doors knocked | Step 1 field model: (volunteers × shifts × doors per shift + candidate doors) × weeks | Even across the campaign |
| Conversations | Doors × contact rate (30%) | Even |
| Supporters found | At least the votes still needed (win number − votes a candidate like you usually gets), and at least 10% of the win number | Even |
| Money raised | Likely budget | Due by the time ballots go out, when the big bills land |
| New email signups | 10% of the win number (a planning guess) | Even |

The campaign runs from when door-knocking starts (Step 1 calendar) to Election Day.

- **On track:** ≥ 90% of where the plan says you should be. **Behind:** 70–90%. **Well behind:** under 70%.
- **Against the win number:** votes a candidate like you usually gets + (conversations so far, projected at the current weekly pace to Election Day) ÷ 15. If that's short of the win number, the app says how many more doors a week close the gap at your real contact rate.
- Warns when fewer than 80% of the planned share of doors answer, and when a week's numbers are missing.

**Teams:** one person can keep the numbers in the app. If several people report, keep a shared spreadsheet with the columns in [`weekly-numbers-template.csv`](weekly-numbers-template.csv) and open its CSV download in the app each week (it matches headings loosely and replaces weeks already saved). The app never connects to Google or any other service, so nothing is sent anywhere.

## Files

- `validation/README.md` — this file
- `validation/weekly-numbers-template.csv` — the shared-sheet columns
- `states/UT.md` — Utah rules with sources
- `app/js/run.js`, `app/js/law.js` — the app's Step 3 logic
