# Language Versions

If your neighbors can't read your materials, you haven't reached them. Step 1 set the trigger; Step 2 builds the versions.

## When to translate

**Trigger (from Step 1):** at least **5% of adults** in your district speak a language other than English at home **and** speak English less than "very well."

Find this in the Census Bureau's American Community Survey at [data.census.gov](https://data.census.gov): table **C16001** (language spoken at home by ability to speak English) or **S1601**, for your city, county or legislative district. For a city council district, add up the census tracts or block groups inside it.

Below 5%, consider translating at least the voter-info page and a palm card if a neighborhood inside your district is well above it.

Separately, the federal Voting Rights Act requires some **counties** to provide official election materials in certain languages. If your county is covered, that's a strong signal your campaign should be too, and the county's translated election materials are a good vocabulary reference.

## What to translate first

| Priority | Piece | Why |
|---|---|---|
| 1 | Website **vote** page | Accurate voting information is the most important thing you can give anyone |
| 2 | **Palm card** and **door hanger** | Canvassers can hand the right one over at the door |
| 3 | Website **home**, **priorities**, **volunteer** | Lets people learn about you and join |
| 4 | **Welcome** and **GOTV** emails | For people who sign up in that language |
| 5 | Mailers and ads | Bilingual mail to precincts above the threshold; ads targeted by language |

The kit builds 1–4 automatically for Spanish when `language.secondary` is `"es"` in `campaign.json`. Fill in `language.es` with your translated core message, slogan, office line, bio and issues.

## How to translate well

1. **Don't machine-translate and print.** Use a draft (including the Rivertown drafts in this kit) only as a starting point.
2. **Have a fluent speaker from your district review everything.** Vocabulary differs by community: *banqueta* and *acera* both mean sidewalk; which one your neighbors use matters.
3. **Translate meaning, not words.** Slogans often need rewriting, not translating. Test them in Step 3 with speakers of that language.
4. **Use the official names** your election office uses for offices, ballots and deadlines in that language.
5. **Keep the candidate's name, colors and layout identical** across languages so both versions are clearly the same campaign.
6. **Plan for length.** Spanish typically runs about 20–30% longer than English. The build warns when text overflows.
7. **Train bilingual canvassers** and mark language preference on walk lists.

## Other languages

The templates use Latin-script fonts. For Vietnamese, Public Sans, Source Serif 4 and Barlow Condensed include the needed characters if you install the full font files (Atkinson Hyperlegible does not; pick another pairing). For Chinese, Korean, Arabic, Russian or other scripts, add a font with that script (Noto Sans covers most) and add a language block to `website/src/_data/ui.js` and the `LABELS` table in `tools/build_creative.py`. Right-to-left languages need layout changes; ask a contributor who has done it.

## ⚖️

Some states and localities have rules on translated campaign materials, including whether the disclaimer must also be translated. The Spanish templates use a translated disclaimer (`disclaimer.text_es`); confirm that's acceptable in your state.
