# Campaign-in-a-Box

An open-source, party-neutral kit that turns a candidate's raw inputs into a campaign strategy and (in later steps) a matching set of materials. Built for first-time candidates in local and state races: city council, school board, county commission, state legislature.

> **New here? Read [START-HERE.md](campaign-in-a-box/START-HERE.md) first.** It's one page.

## What's in this release (Steps 1 and 2)

### Step 1 — Strategy

Strategy comes before any creative work. Every slogan, mailer and ad built in later steps traces back to what you produce here.

| Folder / file | What it does |
|---|---|
| [`inputs/intake-checklist.md`](campaign-in-a-box/inputs/intake-checklist.md) | Every input the kit needs, and exactly where to get each one |
| [`inputs/candidate-interview.md`](campaign-in-a-box/inputs/candidate-interview.md) | Structured interview: biography, record, motivation, three local issues |
| [`inputs/precinct-results-template.csv`](campaign-in-a-box/inputs/precinct-results-template.csv) | Blank template for past election results by precinct |
| [`strategy/strategy-workbook.xlsx`](campaign-in-a-box/strategy/strategy-workbook.xlsx) | Live calculators: win number, precinct targeting, calendar, budget, field capacity |
| [`strategy/win-number.md`](campaign-in-a-box/strategy/win-number.md) | How the win number works and when to adjust it |
| [`strategy/precinct-targeting.md`](campaign-in-a-box/strategy/precinct-targeting.md) | Persuade / turn out / skip method, with the reasoning |
| [`strategy/message-box.md`](campaign-in-a-box/strategy/message-box.md) | Tully message box worksheet + one-sentence core message |
| [`strategy/vulnerability-checklist.md`](campaign-in-a-box/strategy/vulnerability-checklist.md) | Research yourself before your opponent does |
| [`strategy/calendar-guide.md`](campaign-in-a-box/strategy/calendar-guide.md) | Working backward from Election Day, with print lead times |
| [`strategy/budget-guide.md`](campaign-in-a-box/strategy/budget-guide.md) | How to split money across field, mail, digital, signs and print |
| [`tools/targeting.py`](campaign-in-a-box/tools/targeting.py) | Command-line precinct targeting for people with larger data files |
| [`examples/`](campaign-in-a-box/examples/) | A fully worked fictional campaign ("Chris Porter, Rivertown District 4") |
| [`STATE-LAW-FLAGS.md`](campaign-in-a-box/STATE-LAW-FLAGS.md) | Index of every place where state law changes the answer |


### Step 2 — Creative

Every slogan, sign, mailer, ad and email is built from your Step 1 message box, aimed at your target precincts and dated from your calendar. One file (`creative/campaign.json`) feeds everything; one command builds it.

| Folder / file | What it does |
|---|---|
| [`creative/README.md`](campaign-in-a-box/creative/README.md) | Start here for Step 2: how it works and the traceability rule |
| [`creative/campaign.example.json`](campaign-in-a-box/creative/campaign.example.json) | The one input file: words, colors, dates, links (fictional example) |
| [`tools/build_creative.py`](campaign-in-a-box/tools/build_creative.py) | Builds every piece below from `campaign.json` |
| [`creative/brand/`](campaign-in-a-box/creative/brand/) | 3 WCAG-checked palettes, 3 open-license type pairings, logo lockups |
| [`creative/slogans.md`](campaign-in-a-box/creative/slogans.md) | 5–10 slogans, each labeled by message-box quadrant |
| [`creative/print/`](campaign-in-a-box/creative/print/) | Yard sign, door hanger, palm card, 2 mailers, flier — print-ready PDFs, legible at 35 mph, QR codes with UTM tags, disclaimer slots |
| [`creative/website/`](campaign-in-a-box/creative/website/) | Static Eleventy site: bio, priorities, donate, volunteer, voter info; no JavaScript, accessible |
| [`creative/social/`](campaign-in-a-box/creative/social/) | Social and ad templates for each platform, with political-ad verification notes |
| [`creative/email/`](campaign-in-a-box/creative/email/) | Welcome, donate, volunteer and GOTV sequences for listmonk or Mautic, timed to your calendar |
| [`creative/language-versions.md`](campaign-in-a-box/creative/language-versions.md) | When and how to make Spanish or other language versions |
| [`tools/contrast_check.py`](campaign-in-a-box/tools/contrast_check.py) | WCAG contrast checker for any palette |
| [`examples/rivertown-creative/`](campaign-in-a-box/examples/rivertown-creative/) | Every Step 2 output for the fictional Rivertown campaign |

## Coming next

- **Step 3 — Validation:** message testing plan, compliance checklist, accessibility and deliverability checks, weekly dashboard against the win number.

## Using the tools

**Spreadsheet (most people):** open [`strategy/strategy-workbook.xlsx`](campaign-in-a-box/strategy/strategy-workbook.xlsx) in Excel, Google Sheets or LibreOffice. Yellow cells are inputs; everything else calculates. Start on the `Start` tab.

**Command line (optional):** if you have a large precinct file, `tools/targeting.py` does the same targeting math. It needs only Python 3, no extra packages.

```bash
cd campaign-in-a-box
python3 tools/targeting.py examples/rivertown-precincts.csv --out targeting.csv
```

**Creative (Step 2):** needs Python 3 plus two small packages, and optionally `rsvg-convert` for PDFs. See [`creative/README.md`](campaign-in-a-box/creative/README.md).

```bash
cd campaign-in-a-box
pip install segno fonttools
python3 tools/build_creative.py creative/campaign.example.json
```

## Principles

- **Party-neutral.** Nothing here assumes a party, ideology or issue position. The method works the same for any candidate.
- **Honest numbers.** Calculators show their assumptions. Change them when your local data says otherwise.
- **State law varies.** Anywhere a deadline, rule or disclaimer depends on your state, the kit marks it with **⚖️ STATE LAW VARIES**. Confirm with your state or county election office, or an election lawyer. This kit is not legal advice.

## Contributing

Corrections, state-specific notes and translations are welcome. Open an issue or pull request. Please keep contributions party-neutral.

## License

MIT — see [LICENSE](LICENSE). Use it, adapt it, share it.
