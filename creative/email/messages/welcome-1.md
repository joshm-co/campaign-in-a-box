---
sequence: welcome
step: 1
trigger: Joins the "updates" list (website signup, event sign-in, door-knock)
anchor: signup
offset_days: 0
segment: New subscribers
quadrants: Q1
subject: Thanks for joining, {{first_name}}
preheader: Here's why {{cfg.candidate.first_name}} is running — in one sentence.
---
Hi {{first_name}},

Thanks for signing up. Here's the whole campaign in one sentence:

> {{t.core}}

{{cfg.candidate.first_name}} is a neighbor first. {{cfg.candidate.bio_short}}

Over the next week we'll send two more short notes: the story behind the campaign, and the one thing that would help most right now. After that, we'll only write when it matters.

[[button: See the plan | {{cfg.web.base_url}}/issues/?utm_source=email&utm_medium=email&utm_campaign=welcome]]

Thanks for being part of this,

The {{cfg.candidate.full_name}} campaign
