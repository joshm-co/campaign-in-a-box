---
sequence: volunteer
step: 3
trigger: Scheduled — 5 days before GOTV starts
anchor: gotv_starts
offset_days: -5
segment: All volunteers
quadrants: Q1
subject: The last four days decide it
preheader: Help us reach every supporter who hasn't voted yet.
---
{{first_name}}, the final push starts **{{date.gotv_starts}}**.

For the last four days, we only knock on the doors of supporters who haven't voted yet. It's the highest-value volunteer time of the whole campaign.

[[button: Sign up for a GOTV shift | {{cfg.web.volunteer_url}}?utm_source=email&utm_medium=email&utm_campaign=gotv]]
