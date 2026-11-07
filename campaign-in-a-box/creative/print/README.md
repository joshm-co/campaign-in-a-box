# Print Pieces

Six templates, built from `campaign.json` by `tools/build_creative.py`. For each piece the build writes:

| File | What it is | Send to printer? |
|---|---|---|
| `<piece>-print.pdf` | All sides, fonts embedded, 0.125 in bleed, no guides | **Yes** |
| `<piece>-front.svg` / `-back.svg` | Editable source, in layers | If they ask for source files |
| `<piece>-front.proof.svg` | Same, plus trim (cyan), safe zone (magenta), bleed (gray), die lines, disclaimer slot and placeholder notes | No — for you and your reviewers |
| `<piece>-front.png` | Quick preview | No |

## Specs

| Piece | Size | Stock (typical) | Quadrant | Targets | When it must be ready |
|---|---|---|---|---|---|
| **Yard sign** | 24 × 18 in | 4 mm corrugated plastic, 2-sided, H-stakes | Q1 | Base, Turn Out | ~2 weeks before ballots go out ⚖️ |
| **Door hanger** | 4.25 × 11 in, 1.25 in die-cut hole + slit | 100 lb gloss cover or 14 pt | Q1 + Q2 | Persuade | Persuasion canvassing starts |
| **Palm card** | 4 × 9 in | 100 lb gloss cover | Q1 | Persuade, Turn Out | Persuasion canvassing starts |
| **Mailer 1 — Intro** | 6 × 11 in postcard | 100 lb gloss cover or 10 pt | Q1 | Persuade, Turn Out | In homes ~1 week before ballots |
| **Mailer 2 — Contrast** | 6 × 11 in postcard | 100 lb gloss cover or 10 pt | Q2 + Q3 | Persuade only | In homes as ballots arrive |
| **Flier** | 8.5 × 11 in | 80–100 lb text, or a home printer | Q1 | Persuade, Turn Out | Persuasion canvassing starts |

"Start production by" dates for each piece are in `creative-calendar.csv`, using the Step 1 lead times. **Ask your printer and mail house for their real timelines** — they get busy before elections.

**Mail:** 6 × 11 is a common political postcard size, but whether it mails at letter or flat rates depends on thickness and your mail class. Confirm size, paper thickness, indicia and address-block placement with your mail house before final design. The proof files mark the postage indicia box, the address area and the 4.75 × 0.625 in barcode clear zone — **keep ink out of the clear zone.** Check [USPS Postal Explorer](https://pe.usps.com) for current rules.

## Legible at 35 mph (yard signs)

A driver passing at 35 mph covers about 51 feet a second and gives your sign two or three seconds. The build checks your sign and writes `legibility.md`.

| Rule | Target | Rivertown example |
|---|---|---|
| Name cap height | ≥ 3.5 in (≈ 100+ ft readable) | PORTER: 3.9 in → ~117 ft |
| Words in the primary read (name + office) | ≤ 7 | 6 |
| Contrast | ≥ 7:1 | 9.2:1 |
| Fonts | Bold, no scripts, no thin weights | Public Sans Black |
| Photos | None | None |

The rule of thumb is roughly 30 feet of readable distance per inch of capital-letter height for bold type in high contrast. If your last name is long and the build warns the name is under 3.5 in, switch to the `condensed` type pairing.

The web address and disclaimer on a sign aren't meant to be read from a car — they're for neighbors walking by and for compliance.

## QR codes with UTM tags

Every QR code points to a page on your site with UTM tags, so you can see in your analytics which piece drove the visit:

```
https://chrisporter.example/issues/?utm_source=doorhanger&utm_medium=print&utm_campaign=persuade
```

`utm-plan.csv` lists every code. Rules the build enforces or you should:

- **Minimum 0.8 in (2 cm) square**, including the white quiet zone. The templates use 0.85–1.3 in.
- **Dark on light only.** Never reverse a QR code.
- **No QR on yard signs.** Nobody scans at 35 mph.
- **Scan every code from the printer's proof** with two different phones before approving. (Step 3 has the checklist.)
- Point each code at the most useful page for that piece: issues for persuasion pieces, voter info for palm cards, volunteer for fliers.

## ⚖️ Disclaimer slots

Every piece has a disclaimer (`Paid for by …`) in its own layer. In proof files it's outlined in magenta with a ⚖️ note. **What varies by state:** exact wording, whether you need an address or treasurer's name, minimum type size, whether it must be boxed, where it must appear, and which small items (pens, buttons, some signs) are exempt. Some states also require a union "bug" on printing done by union shops if you claim it. Set the wording in `campaign.json → disclaimer` once and every piece updates.

## Photos

Templates show a `CANDIDATE PHOTO` box. Use a real, recent, well-lit photo of the candidate, at least 300 dpi at print size, with written permission from the photographer. Place it in the `art` layer in Inkscape (or replace the box in the SVG). Don't use photos of other people without their consent, and check your state's rules on using images of public employees in uniform or public buildings ⚖️.

## Before you send anything to the printer

- [ ] Every fact on Q2 (contrast) pieces has its source printed on the piece
- [ ] Disclaimer wording and size confirmed for your state ⚖️
- [ ] Dates on the palm card and vote page confirmed with the election office ⚖️
- [ ] Real photo placed; placeholder text gone (search the PDF for "PLACEHOLDER" and "CANDIDATE PHOTO")
- [ ] QR codes scanned from the printer's proof
- [ ] Spanish (or other language) versions reviewed by a fluent speaker from the district
- [ ] Read aloud once by someone who didn't write it
- [ ] `BUILD-NOTES.md` shows no unresolved warnings
- [ ] Message tested with real voters (Step 3)
