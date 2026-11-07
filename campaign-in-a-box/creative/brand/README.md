# Brand System

A campaign brand has one job: make the candidate's name easy to recognize and remember. It doesn't need to be clever. It needs to be **consistent, legible, and the same everywhere** — sign, mailer, website, email.

Everything here is defined in [`brand.json`](brand.json). Pick a palette and a type pairing in your `campaign.json`:

```json
"brand": { "palette": "river", "type_pairing": "civic" }
```

## Palettes

| Palette | Colors | Feels | Good for |
|---|---|---|---|
| **River** | Deep teal, gold, rust | Calm, competent, local | Infrastructure, environment, any race |
| **Forest** | Green, cream, terracotta | Rooted, steady | Parks, schools, rural and land-use races |
| **Plum** | Plum, sun yellow, teal | Warm, distinctive | Standing out in a crowded field |

**Why no red-and-blue default?** In the US, red and blue signal party. That's fine if it's what you want, but in nonpartisan local races many candidates prefer colors that don't. Change the hex values in `brand.json` to anything you like — then re-run the contrast check.

Each palette has six roles: `primary` (backgrounds, headlines), `secondary` (accent bands, office line), `accent` (buttons, small labels), `ink` (body text), `paper` (light background), `tint` (soft panels).

## Contrast is checked, not assumed

```bash
python3 tools/contrast_check.py              # every palette
python3 tools/contrast_check.py --fg "#FFFFFF" --bg "#0B4F5C"   # any pair
```

The kit's minimums are **stricter than the web standard** where it matters:

| Pair | Kit minimum | Why |
|---|---|---|
| Name/headline on primary (signs) | **7:1** (WCAG AAA) | Read at 35 mph, at dusk, by older eyes |
| Body text on paper or tint | **7:1** | Mailers are read fast and often by older voters |
| Slogan/office on primary, accent text, buttons | 4.5:1 (WCAG AA) | Larger or shorter text |

All three shipped palettes pass. The build tool refuses to build with a palette that fails.

## Type pairings

All fonts are free under the SIL Open Font License from [Google Fonts](https://fonts.google.com). Install them on any computer you'll edit files on.

| Pairing | Headline | Body | Choose it when |
|---|---|---|---|
| **Civic** | Public Sans Black | Source Serif 4 | Default. Public Sans was built for US government sites: plain and trustworthy. |
| **Hyperlegible** | Atkinson Hyperlegible Bold | Atkinson Hyperlegible | Your district skews older, or accessibility is a campaign theme. Designed by the Braille Institute. |
| **Condensed** | Barlow Condensed ExtraBold | Public Sans | The candidate has a long last name. Condensed type fits a bigger name on the sign. |

Rules: no script or thin fonts on anything read at a distance; no more than two families; never stretch or squash type.

## Logo lockups

The build makes three lockups, each in three color versions:

| Lockup | Use |
|---|---|
| `logo-horizontal-*` | Website header, letterhead, email header, wide ads |
| `logo-stacked-*` | Square social avatars, buttons, T-shirts |
| `logo-mark-*` | Favicon, small profile images, stickers (initials only) |

| Version | Use |
|---|---|
| `-color` | On white or light backgrounds |
| `-reversed` | On the primary color |
| `-one-color` | Single-ink printing (screen-printed signs, T-shirts, newspaper ads, fax) |

Keep clear space around a logo equal to the height of the first-name line. Don't recolor, outline, add shadows, or put the logo on busy photos.

## Brand sheet

`brand-sheet.pdf` shows all palettes with their contrast ratios and all type pairings. Hand it to anyone making something for the campaign — a volunteer designer, the printer, the T-shirt shop.
