# Step 2 — Creative

Step 2 turns your Step 1 strategy into a full set of campaign materials. **Every piece traces back to your message box and your target precincts**, and every date comes from your Step 1 calendar. Nothing here should be designed from a blank page.

> **You need Step 1 finished first:** a core message, a filled-in message box (with sources for every Q2 contrast point), your precinct categories, and your calendar.

## How it works

One file — `campaign.json` — holds your words, colors, dates and links. One command builds everything from it.

```bash
cp creative/campaign.example.json creative/campaign.json   # then edit it
pip install segno fonttools                                 # once
python3 tools/build_creative.py creative/campaign.json
```

Output lands in `creative/build/<your-slug>/`. See a finished example (fictional Rivertown) in [`../examples/rivertown-creative/`](../examples/rivertown-creative/).

**Not a command-line person?** Open the example SVGs in [Inkscape](https://inkscape.org) (free) and edit the text by hand. Every file is layered (`background`, `art`, `text`, `qr`, `disclaimer`), so you can change words without breaking the layout. Then re-check the [print checklist](print/README.md#before-you-send-anything-to-the-printer).

## What you get

| Folder | What's in it | Guide |
|---|---|---|
| `brand/` | 3 color palettes (WCAG-checked), 3 type pairings, logo lockups in color / reversed / one-color, a brand sheet | [brand/README.md](brand/README.md) |
| `slogans.md` | How to write 5–10 slogans, each labeled with its message-box quadrant | [slogans.md](slogans.md) |
| `print/` | Yard sign, door hanger, palm card, 2 mailers, flier — print PDFs, proofs with bleed/safe/die guides, QR codes with UTM tags, disclaimer slots | [print/README.md](print/README.md) |
| `website/` | Static Eleventy site: home, about, priorities, donate, volunteer, voter info, privacy, plus Spanish pages. No JavaScript, self-hosted fonts, accessible | [website/README.md](website/README.md) |
| `social/` | Organic posts in 5 sizes and digital ad templates (Meta, Google display) with political-ad verification notes | [social/README.md](social/README.md) |
| `email/` | 16 emails in 4 sequences (welcome, donate, volunteer, GOTV) for listmonk or Mautic, timed to your calendar | [email/README.md](email/README.md) |
| `language-versions.md` | When to translate, how, and who must review it | [language-versions.md](language-versions.md) |

The build also writes four planning files you should actually use:

| File | Use it to… |
|---|---|
| `traceability.csv` | Check every piece: which quadrant it serves, which precincts it targets, when it's due, which budget line pays for it |
| `creative-calendar.csv` | See every "start production by" and "in homes by" date next to your election milestones |
| `utm-plan.csv` | Know which QR code or link drove which website visit |
| `legibility.md` | Confirm your yard sign reads at 35 mph |

## The traceability rule

Before anything is printed, posted or sent, you should be able to answer three questions about it from `traceability.csv`:

1. **Which quadrant does it serve?** Q1 (us on us) and Q2 (us on them) carry the campaign. Q3 pieces *answer* attacks. Nothing should promote Q4 (what your opponent says about themselves). The builder refuses Q4 slogans.
2. **Who is it for?** Persuade, Turn Out, or Base precincts. The builder refuses pieces aimed at Skip precincts.
3. **When must it land?** Mail lands around ballot arrival, door materials when canvassing starts, GOTV pieces in the final days.

| Piece | Quadrant | Targets | Lands | Why |
|---|---|---|---|---|
| Yard sign | Q1 | Base, Turn Out | ~2 weeks before ballots | Name recognition in low-information races |
| Door hanger | Q1 + Q2 | Persuade | Persuasion canvassing starts | Left when nobody's home; the contrast is sourced |
| Palm card | Q1 | Persuade, Turn Out | Persuasion canvassing starts | Handed over at the door; voting dates on the back |
| Mailer 1 — Intro | Q1 | Persuade, Turn Out | ~1 week before ballots | Introduce the candidate before the ballot arrives |
| Mailer 2 — Contrast | Q2 + Q3 | Persuade only | As ballots arrive | Sourced contrast plus answers to the attacks you'll face |
| Flier | Q1 | Persuade, Turn Out | Persuasion canvassing starts | Community boards, events; recruits volunteers |
| Social / ads | Q1, Q2 | Geo-targeted to Persuade + Turn Out | From persuasion start | Repeats the mail message online |
| Email | Q1 (Q2 in donate) | List segments | By sequence | Converts supporters into volunteers, donors and voters |

The Step 1 workbook plans a third (GOTV) mailer. It reuses the mailer template: add a third `mailer` piece in `campaign.json` aimed at Turn Out precincts with a ballot-return message.

## ⚖️ State law in Step 2

Disclaimers ("Paid for by…"), sign timing and placement, digital-ad disclosure, AI-generated content in ads, and translated-materials rules all vary. Every place that's affected is listed in [`STATE-LAW-FLAGS.md`](../STATE-LAW-FLAGS.md#materials). The templates show a **⚖️ DISCLAIMER SLOT** in proof files; confirm wording, size and placement before you print.

## Next: Step 3

Step 3 (Validation) tests your slogans and messages with real district voters, checks compliance, runs accessibility/Lighthouse/deliverability checks, and tracks doors, IDs, dollars and list growth against your win number. **Test before you print in volume.**
