---
sequence: gotv
step: 2
trigger: Scheduled — ballots in homes
anchor: ballots_out
offset_days: 5
segment: Supporters who have not returned a ballot (update from the county's returned-ballot list if your state publishes one)
quadrants: Q1
subject: Fill it out today, {{first_name}}
preheader: Ballots that sit on the counter don't count.
---
{{first_name}}, your ballot should be in your mailbox now.

The races at the bottom of the ballot are often decided by a few hundred votes. Please fill yours out today and return it the way that's easiest for you.

[[button: How to return my ballot | {{cfg.web.base_url}}/vote/?utm_source=email&utm_medium=email&utm_campaign=gotv]]
