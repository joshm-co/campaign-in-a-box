---
sequence: gotv
step: 1
trigger: Scheduled — ballots go out
anchor: ballots_out
offset_days: 0
segment: Supporters (IDs from doors + subscribers who have not opted out)
quadrants: Q1
subject: Your ballot is on its way
preheader: Here's how to vote and the dates to know.
---
{{first_name}}, ballots for the {{cfg.candidate.jurisdiction}} election go out **{{date.ballots_out}}**.

- **Ballots mailed:** {{date.ballots_out}}
- **Early voting begins:** {{date.early_vote_starts}}
- **Election Day:** {{date.election_day}} (polls close at {{cfg.election.polls_close}})

Check your registration and find your options with {{cfg.election.election_office}}:

[[button: Check my voting info | {{cfg.web.base_url}}/vote/?utm_source=email&utm_medium=email&utm_campaign=gotv]]

When you fill out your ballot, look for {{cfg.candidate.full_name}} for {{cfg.candidate.office}}, {{cfg.candidate.district}}.
