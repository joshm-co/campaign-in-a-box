# Campaign-in-a-Box — the app

The no-code version of the kit. A candidate opens a link, answers plain questions one screen at a time, and gets a win number, precinct targets, a message box, and every Step 2 material — yard sign, door hanger, palm card, two mailers, flier, website, social posts, ads and emails — ready for the printer.

**Live link (once GitHub Pages is on):** https://joshm-co.github.io/campaign-in-a-box/

## Privacy: nothing leaves the device

- Everything runs in the browser. There is no server, no account, and no analytics.
- Answers and the candidate photo are saved in that browser's local storage only. The maintainer never sees them.
- The page's Content Security Policy only lets the app connect to its own files and, for the optional OpenElections import, to GitHub (`raw.githubusercontent.com`, plus `api.github.com` as a fallback for the file list). It can't send data anywhere else. Fonts, the QR encoder, the election-office directory and the OpenElections file index are bundled.
- Utah's official precinct results are copied into the app (`data/utah/`) by a scheduled GitHub Action, so Utah candidates load them from the app's own address — no third party sees anything.
- The OpenElections import is opt-in. When the candidate taps it, the device downloads one public results file from GitHub; GitHub sees the device's internet address and which file was asked for, nothing the candidate typed. The screen says so before anything downloads.
- Directory links and “Find my county's results” open in a new tab only when tapped — the search is the one time a county name leaves the app.
- Phone and laptop are not connected. The app says so, and a backup file (Saving → Download a backup) moves a campaign between devices.
- Downloads and the share sheet use the device's own features (`navigator.share`, file downloads).

## What it does (and where the logic comes from)

| Screen | Same method as |
|---|---|
| Questions, one per screen, each with “Where do I find this?” | `inputs/intake-checklist.md`, `inputs/candidate-interview.md` |
| Where are you running? State, county, town — sets the city/county/state on materials and shows the county's election office, results pages and finance site | `js/places.js` (Utah's 29 counties so far, from vote.utah.gov) |
| Precinct results: type, paste, the template CSV, **Utah's official results (built in)**, **OpenElections**, **a dropped-in results file (Excel or CSV)**, or a quick district estimate | `inputs/precinct-results-template.csv`, `js/utahresults.js`, `js/openelections.js`, `js/xlsx.js` |
| Win number, starting point, where to spend Saturdays, “How we worked this out” | `tools/targeting.py` and the workbook — `tests/strategy.test.js` checks the app against `targeting.py` |
| Field capacity, calendar and order-by dates, budget split | Workbook `Field Capacity`, `Calendar`, `Budget` tabs |
| Message box (Why you / The contrast / Their attacks / Their pitch), one sentence, slogans with labels | `strategy/message-box.md`, `creative/slogans.md`, Step 2 builder rules |
| Colors (3 presets or your own, with readability checks and “Fix it for me”), type styles | `creative/brand/brand.json`, `tools/contrast_check.py` |
| Print pieces with live warnings (35-mph legibility, overflow, missing sources) | `tools/build_creative.py` layouts and checks |
| Website, social and ad images, emails with send dates | `creative/website/`, `creative/social/`, `creative/email/messages/` |
| “Before you print” checklist; printer files locked until ⚖️ items are confirmed; PROOF copies always available | `STATE-LAW-FLAGS.md`, `creative/print/README.md` |

**Printer files:** each piece downloads as a PDF with bleed and trim boxes set, rendered at 300 dpi (150 dpi for the 24 × 18 in yard sign), plus an editable SVG with fonts embedded. PROOF copies show the trim, safe zone, die line and ⚖️ notes, and are stamped PROOF.

**Website:** plain HTML with relative links, so it works on any free host (Netlify Drop, Cloudflare Pages, GitHub Pages) or straight from a folder. `PUBLISH-ME.txt` in the download walks the candidate through it.

**Hand-off to the command-line kit:** Saving → Export campaign.json gives a file `tools/build_creative.py` can read.

## Files

```
app/
  index.html            the whole app shell
  app.css               interface styles (system fonts, light and dark)
  js/core.js            helpers, color checks, strategy math, saved state
  js/render.js          SVG print pieces, social cards and ads
  js/outputs.js         PDF, PNG, zip, website, emails, backups
  js/ui.js              screens and navigation
  js/places.js          election-office directory (Utah first) and place helpers
  js/openelections.js   optional precinct-results import from OpenElections
  js/utahresults.js     Utah's official precinct results, read from data/utah/
  js/xlsx.js            reads a dropped-in Excel (.xlsx) or CSV results file on the device
  js/oe-counts.js       GENERATED: OpenElections file counts per state
  data/utah/            GENERATED by tools/collect_utah_results.py (scheduled Action)
  data/openelections/   GENERATED: one file index per state (XX.json)
  js/content.js         GENERATED: brand.json, the Rivertown example, email templates
  js/fonts-data.js      GENERATED: brand fonts as base64
  js/vendor/qrcode.js   QR encoder (qrcode-generator, MIT, Kazuhiko Arase)
  fonts/                brand fonts (SIL Open Font License) + licenses
  tests/strategy.test.js
```

No build step. To change the example campaign, palettes or email templates, edit the source files in the kit and run:

```bash
cd campaign-in-a-box
python3 tools/sync_app_content.py   # rewrites app/js/content.js and app/js/fonts-data.js
python3 tools/sync_openelections_index.py   # refreshes the OpenElections file index (needs git)
node app/tests/strategy.test.js     # checks the math still matches targeting.py
```

## Running it locally

Open `app/index.html` in a browser — it works from a folder with no server. Or serve it: `python3 -m http.server -d campaign-in-a-box/app 8000`.

## Utah's official results (scheduled collector)

Utah's results site (electionresults.utah.gov) has every county's results by precinct, including city and town races, plus ballots cast and registered voters by precinct. Browsers on other websites can't read it, so `.github/workflows/collect-utah.yml` runs `tools/collect_utah_results.py` on the 3rd and 18th of each month (and on demand from the Actions tab). It:

- reads the state's list of elections and its 29 counties;
- takes precinct votes from the state's statewide results export (2024 general onward) or, for older elections, each contest's precinct breakdown;
- takes ballots cast and registered voters per precinct from each county's results page;
- skips elections that haven't changed, pauses between requests, and identifies itself;
- commits `app/data/utah/` and republishes the app.

The repo ships with Cache County's 2025 municipal general results so the feature works before the first run. Run the Action once by hand after uploading (Actions → Collect Utah results → Run workflow). If the state changes its site, the job's self-test and logs will show it; the drop-in file option keeps working meanwhile.

**Fallback:** on the importer screen, a candidate can open the state's “All Results Excel” download (or any precinct results CSV) and the app reads it on the device.

**Courtesy:** before relying on the schedule, let the Lieutenant Governor's elections office know a free candidate tool re-shares their public precinct results, and ask if they'd prefer a different schedule or source.

## Publishing with GitHub Pages

The repo includes `.github/workflows/pages.yml`, which publishes this folder. In the repository: **Settings → Pages → Source: GitHub Actions**. Every push to `main` that touches `campaign-in-a-box/app/` republishes it.

## Known limits

- Spanish is the only second language with built-in labels. Spanish text is typed in by the campaign and must be checked by a fluent speaker (the checklist enforces this before printing).
- The app can't read a county results website directly (browsers block that). Candidates copy or paste the numbers, or import from OpenElections, and the app flags unofficial numbers until they're replaced.
- OpenElections covers mostly even-year state and federal races; city and school races are often missing, so candidates pick the race most like theirs. Many files don't list registered voters by precinct — those elections are skipped for turnout until the candidate types the numbers in, and missing ballots-cast counts are estimated from the race with the most votes (marked in the precinct notes). Maryland, North Carolina and Virginia had no precinct files when the index was built.
- Utah results: precinct names sometimes change between years (Cache County's 2025 "3SMI1:I" was "SMI01:I"); the app matches them by name and notes each match. Some elections list zero registered voters for a county (for example Cache County's 2024 general); those are skipped for turnout until typed in. Results marked unofficial on the state site may still change.
- The election-office directory covers Utah. Other states get a web-search button until someone adds their listings to `js/places.js` (cite the official source and the date checked).
- PDFs are high-resolution images, not vector files. Printers accept them; for vector output, use the editable SVGs or the command-line builder.
- ⚖️ Nothing here is legal advice. Every place state law varies is flagged in the app and in `STATE-LAW-FLAGS.md`.
