# Email and Newsletters

Four sequences, 16 emails (14 English, 2 Spanish), written as templates that fill themselves in from `campaign.json`. The build renders each one for **listmonk** and **Mautic**, both open source and self-hostable.

## The sequences

| Sequence | Emails | Starts when | Goal | Quadrant |
|---|---|---|---|---|
| **Welcome** | 3 (+ Spanish) | Someone joins your list | Core message → story → one ask | Q1 |
| **Donate** | 3 + thank-you | 7 days before your last pre-election finance report ⚖️ | Small-dollar gifts before the report closes | Q1, Q2 |
| **Volunteer** | 3 | Someone checks a volunteer box on the site | First shift → door script (with Q3 answers) → GOTV shifts | Q1, Q3 |
| **GOTV** | 4 (+ Spanish) | Ballots go out | Dates → fill it out → make a plan → Election Day | Q1 |

Every send date comes from your Step 1 calendar. After a build, `email/sequences.csv` lists each email's trigger, segment and exact send date. The dated ones also appear in `creative-calendar.csv`.

| Email | Timing | Rivertown example |
|---|---|---|
| welcome-1 / 2 / 3 | Signup day, +3 days, +7 days | — |
| donate-1 / 2 / 3 | Report deadline −7, −2, deadline day | Oct 16, 21, 23 |
| volunteer-1 / 2 | Signup day, +2 days | — |
| volunteer-3 | GOTV start −5 days | Oct 24 |
| gotv-1 | Ballots out | Oct 3 |
| gotv-2 | Ballots out +5 days | Oct 8 |
| gotv-3 | Final GOTV push begins | Oct 29 |
| gotv-4 | Election Day morning | Nov 2 |

GOTV emails go **only to supporters** — people you've identified at the door or who signed up — not your whole list.

## Editing the emails

The source files are in `messages/*.md`. Each has a header (subject, preheader, trigger, timing, segment, quadrant) and a body in simple Markdown:

```markdown
Hi {{first_name}},

> {{t.core}}

[[button: See the plan | {{cfg.web.base_url}}/issues/]]
```

- `{{first_name}}` becomes the subscriber's first name in your email tool.
- `{{cfg.…}}` pulls anything from `campaign.json`; `{{t.core}}` is your core message; `{{date.ballots_out}}` is a calendar date.
- `> ` is a highlighted quote, `## ` a small heading, `- ` a bullet, `[[button: Text | link]]` a button.

The donation amounts in `donate-1` ("$25 prints 100 door hangers") use Step 1's cost ranges. Replace them with your real printer quotes.

## Option A: listmonk (simplest)

[listmonk](https://listmonk.app) is a fast, lightweight newsletter tool you host yourself (a $5–10/month server or a one-click host). It handles lists, scheduled campaigns and the website's signup forms. **It doesn't run automatic drip sequences triggered by signup**, so:

1. **Setup:** create lists `updates`, `volunteer_doors`, `volunteer_phones`, `yard_sign` (and `updates_es` if you have Spanish). Paste their UUIDs into `campaign.json → web.forms.lists`. Turn on double opt-in.
2. **Template:** Campaigns → Templates → New, paste `build/<slug>/email/listmonk/_listmonk-template.html`.
3. **Dated emails (donate, GOTV, volunteer-3):** create a campaign for each, paste the body from `build/<slug>/email/listmonk/<name>.html`, choose the right list or segment, and schedule it for the date in `sequences.csv`. Do this in one sitting early in the campaign.
4. **Welcome and new-volunteer emails:** once or twice a week, send welcome-1 to people who joined since the last send (filter subscribers by `subscribers.created_at`). It's a small manual step that keeps listmonk simple.

## Option B: Mautic (true automation)

[Mautic](https://mautic.org) is a full marketing-automation platform with a visual campaign builder. More setup, but sequences run on their own.

1. Create segments: `New subscribers`, `Volunteers`, `Supporters`, `Donors`.
2. Channels → Emails → New → code mode, paste each file from `build/<slug>/email/mautic/`.
3. Build three campaigns: **Welcome** (segment `New subscribers` → send welcome-1 → wait 3 days → welcome-2 → wait 4 days → welcome-3), **Volunteer** (form submit → volunteer-1 → wait 2 days → volunteer-2), **Donate thanks** (donor added → donate-thanks).
4. Schedule the dated emails (donate, GOTV, volunteer-3) as segment emails on the dates in `sequences.csv`.

The website's volunteer form posts to listmonk by default. For Mautic, replace the form in `website/src/volunteer.njk` with a Mautic form embed.

## Deliverability (before your first send)

- Send from **your campaign domain** (e.g. `hello@yourname.org`), never a free Gmail or Yahoo address.
- Set up **SPF, DKIM and DMARC** records with your domain host and sending service. Gmail and Yahoo require these for bulk senders.
- Use a transactional sending service (Amazon SES, Postmark, Mailgun, etc.) behind listmonk or Mautic.
- Keep **one-click unsubscribe** and your **mailing address** in every email (both templates include them).
- **Only email people who opted in.** Never upload a purchased list or the voter file to your email tool.
- Step 3 has the deliverability test with pass thresholds.

## ⚖️ State law

Some states require a "Paid for by" disclaimer in campaign email, and campaign finance rules decide what donor information you must collect. The templates include a boxed disclaimer in the footer. Political email is generally treated differently from commercial email under federal anti-spam law, but unsubscribe links and an address are best practice and required by major inbox providers anyway.
