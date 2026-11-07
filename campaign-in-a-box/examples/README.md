# Worked Example: Rivertown, District 4

**Everything here is fictional** — the city, the candidate, and the numbers. It exists so you can see what finished Step 1 outputs look like before you enter your own.

| File | What it shows |
|---|---|
| `rivertown-precincts.csv` | 12 precincts, 3 past municipal elections, in the kit's input format |
| `rivertown-targeting-output.csv` | What `tools/targeting.py` produces from that file |
| `rivertown-message-box.md` | A completed message box and core message |

The strategy workbook (`strategy/strategy-workbook.xlsx`) ships pre-filled with this same data.

## What the numbers say

- **Win number: 2,728.** About 17,960 registered voters × ~30.6% turnout × ~90% who vote in this race ≈ 4,960 votes in the race. Half plus one is 2,480; a 5% margin adds 248.
- **Baseline support gets about 2,430 votes**, so the campaign needs roughly **300 more** from persuasion and turnout work.
- **Persuade:** 403, 410, 404, 406. Close precincts; door-knocking priority. Precinct 406 has new apartments, so old results may understate change.
- **Turn Out:** 412, 401, 409, 405. Supportive but lower turnout. Precinct 405 is flagged as a small sample.
- **Base - Light Touch:** 402. Supportive and already voting.
- **Skip:** 407, 408, 411.
- **Field reality check:** 15 volunteers plus the candidate over 10 weeks reach about 2,250 conversations — roughly half of the gap at the workbook's default assumptions. Chris needs more volunteers, more weeks, or a mail program aimed at the top-ranked precincts. That's the kind of finding Step 1 is for.

## Step 2 — Creative (`rivertown-creative/`)

Everything `tools/build_creative.py` makes from `creative/campaign.example.json`. Open the PDFs and PNGs to see finished pieces; open the `.proof.svg` files to see bleed, safe zones, die lines and disclaimer slots.

| Folder / file | What it shows |
|---|---|
| `brand/` | Logo lockups (color, reversed, one-color), brand sheet, contrast report |
| `print/` | Yard sign, door hanger (EN + ES), palm card (EN + ES), intro mailer, contrast mailer, flier |
| `social/`, `ads/` | Organic posts in 5 sizes and Google/Meta ad templates |
| `email/` | All sequences rendered for listmonk and Mautic, plus `sequences.csv` with send dates |
| `traceability.csv` | Each piece → quadrant, targets, due date, budget line |
| `creative-calendar.csv` | Production start dates and in-home dates next to election milestones |
| `utm-plan.csv`, `legibility.md`, `BUILD-NOTES.md` | QR destinations, 35-mph check, warnings |

**What the build caught:** the example core message is actually **27 words**, over Step 1's 25-word limit. That's left in on purpose as a warning example. A tighter version: *"Chris Porter will finally fix east-side flooding. He's an engineer who already cleared Mill Creek — City Hall left it 'pending' six years."*

The Spanish text is a **draft** and would need review by a fluent speaker from the district.
