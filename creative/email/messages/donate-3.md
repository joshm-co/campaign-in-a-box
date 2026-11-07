---
sequence: donate
step: 3
trigger: Scheduled — deadline day
anchor: finance_report
offset_days: 0
segment: Clicked but did not give
quadrants: Q1
subject: Tonight's the deadline
preheader: Last call before our pre-election report closes.
---
{{first_name}}, this is the last email about money before the report closes tonight. Thanks for reading all of them.

[[button: Give before midnight | {{cfg.web.donate_url}}?utm_source=email&utm_medium=email&utm_campaign=donate]]
