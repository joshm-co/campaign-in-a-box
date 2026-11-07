---
sequence: donate
step: thanks
trigger: Donation received (from your donation processor's webhook or a daily import)
anchor: signup
offset_days: 0
segment: New donors
quadrants: Q1
subject: Thank you, {{first_name}}
preheader: Here's exactly where your gift goes.
---
{{first_name}},

Thank you. Every dollar goes to reaching voters: door hangers, mailers and the yard signs you'll start seeing around the district.

You're also welcome to give your time. Most of our volunteers started as donors.

[[button: Volunteer one Saturday | {{cfg.web.volunteer_url}}?utm_source=email&utm_medium=email&utm_campaign=donate-thanks]]

{{cfg.candidate.first_name}}

*Your donation receipt comes separately from our payment processor. Campaign finance law may require us to ask for your employer and occupation.*
