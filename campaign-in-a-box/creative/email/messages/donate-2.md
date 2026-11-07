---
sequence: donate
step: 2
trigger: Scheduled — 2 days before the finance report deadline
anchor: finance_report
offset_days: -2
segment: Opened or clicked donate-1, has not given
quadrants: Q2
subject: Two days left before the report
preheader: The record on the drainage study speaks for itself.
---
{{first_name}},

Quick reminder: our pre-election report closes **{{date.finance_report}}**.

Why it matters: {{cfg.message_box.q2.0.text}} ({{cfg.message_box.q2.0.source}}.) Changing that takes a campaign that can reach every door in the district.

[[button: Chip in before the deadline | {{cfg.web.donate_url}}?utm_source=email&utm_medium=email&utm_campaign=donate]]
