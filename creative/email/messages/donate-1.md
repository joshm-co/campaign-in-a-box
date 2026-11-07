---
sequence: donate
step: 1
trigger: Scheduled — 7 days before the last pre-election finance report
anchor: finance_report
offset_days: -7
segment: All subscribers except recent donors (last 30 days)
quadrants: Q1 Q2
subject: What $25 does in District 4
preheader: Our last report before the election closes {{date.finance_report}}.
---
{{first_name}},

Our last campaign finance report before the election closes on **{{date.finance_report}}**. That report is public, and it's how neighbors, reporters and endorsers judge whether this campaign is serious.

Here's what small gifts buy:

- **$25** prints 100 door hangers for the neighbors we miss at home
- **$50** puts a mailer in front of about 70 households
- **$100** pays for ten yard signs

[[button: Give $25 | {{cfg.web.donate_url}}?amount=25&utm_source=email&utm_medium=email&utm_campaign=donate]]

> {{t.core}}

Thank you,

{{cfg.candidate.first_name}}
