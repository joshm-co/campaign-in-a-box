# ⚖️ Where State Law Varies

Every item below depends on your state (and sometimes your county or city). The kit uses placeholders for these; **replace them with your local rules before you rely on them.** Your state or county election office answers candidate questions for free. For anything touching eligibility or campaign finance, consider an election lawyer.

This kit is not legal advice.

## Running

| Topic | Where it appears |
|---|---|
| Filing deadline, fee, petition signatures | START-HERE, intake checklist |
| Residency and other qualifications | intake checklist, vulnerability checklist |
| Whether public employees can run for this office | vulnerability checklist |
| Partisan vs. nonpartisan race | intake checklist |

## Winning

| Topic | Where it appears |
|---|---|
| Plurality, majority + runoff, ranked choice, multi-seat | win-number.md, workbook `Win Number` |
| Primary type (open, closed, top-two) and who can vote in it | win-number.md |

## Voting dates

| Topic | Where it appears |
|---|---|
| Voter registration deadline / same-day registration | calendar-guide.md, workbook `Calendar` |
| Mail ballot send dates and who gets one automatically | calendar-guide.md, workbook `Calendar` |
| Early in-person voting dates (or none) | calendar-guide.md, workbook `Calendar` |
| Electioneering distance from polling places | intake checklist |

## Data

| Topic | Where it appears |
|---|---|
| Who can get the voter file, the cost, and permitted uses | intake checklist, precinct-targeting.md |

## Money

| Topic | Where it appears |
|---|---|
| Contribution limits and permitted donors | budget-guide.md |
| Treasurer, bank account and committee registration | budget-guide.md |
| Reporting deadlines, in-kind rules | budget-guide.md, calendar-guide.md |
| Personal use of campaign funds | budget-guide.md |

## Materials (Step 2)

| Topic | Where it appears |
|---|---|
| "Paid for by" disclaimer: wording, required name/address/treasurer, minimum type size, box/border, placement | `campaign.json → disclaimer`; every print, social, email and web template (magenta ⚖️ slot in proof files); creative/print/README.md |
| Which items are exempt from disclaimers (small signs, buttons, pens, small digital ads) | creative/print/README.md, creative/social/README.md |
| Disclaimer inside digital ad images vs. a click-through; reporting digital ad spending | creative/social/README.md |
| Disclosure of AI-generated or altered images, audio or video in political ads | creative/social/README.md |
| Yard sign timing (how early they may go up), placement (right-of-way, distance from polls), size limits, removal deadline | intake checklist, calendar-guide.md, creative/print/README.md, `election.offsets.sign_removal` |
| Use of photos taken in public buildings or of public employees in uniform | creative/print/README.md |
| Union "bug" requirements or claims | `disclaimer.union_bug`, creative/print/README.md |
| Translated materials, including whether the disclaimer must be translated | creative/language-versions.md, `disclaimer.text_es` |
| Uploading voter-file audiences to ad platforms (permitted uses of the voter file) | creative/social/README.md, precinct-targeting.md |
| Disclaimers in campaign email; donor information you must collect (employer, occupation); contribution limits shown on the donate page | creative/email/README.md, creative/website/README.md, website `donate` page |
| Voting dates and rules printed on palm cards, emails and the website vote page | `campaign.json → election` (all marked PLACEHOLDER), palm card back, website `/vote/`, GOTV emails |

Not state law, but also varies and must be confirmed: **USPS mail rules** (postcard size and thickness, indicia, address area, barcode clear zone — ask your mail house) and **platform political-ad policies** (Meta, Google and others change them often, and Google's rules for local races differ by state).

---

**Help wanted:** if you've confirmed the rules for your state, contribute a `states/XX.md` file with sources so the next candidate doesn't have to start from scratch. To add your state's election offices to the app, copy the Utah block in `app/js/places.js`, cite the official source and the date you checked it.
