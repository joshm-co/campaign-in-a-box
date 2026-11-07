---
sequence: gotv
step: 4
trigger: Scheduled — Election Day morning
anchor: election_day
offset_days: 0
segment: Supporters who have not voted
quadrants: Q1
subject: Today's the day
preheader: Polls close at {{cfg.election.polls_close}}.
---
{{first_name}}, today is Election Day. Polls close at **{{cfg.election.polls_close}}**.

> {{t.core}}

[[button: Find my polling place | {{cfg.election.voter_info_url}}]]

Thank you for everything.

{{cfg.candidate.first_name}}
