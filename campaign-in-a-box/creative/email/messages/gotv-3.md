---
sequence: gotv
step: 3
trigger: Scheduled — final GOTV push begins
anchor: gotv_starts
offset_days: 0
segment: Supporters who have not voted
quadrants: Q1
subject: Four days left
preheader: Make your plan to vote.
---
{{first_name}}, Election Day is **{{date.election_day}}**. If you haven't voted yet, take one minute to make a plan: when, where, and how you'll get there.

[[button: Make my plan | {{cfg.web.base_url}}/vote/?utm_source=email&utm_medium=email&utm_campaign=gotv]]
