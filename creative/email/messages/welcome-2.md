---
sequence: welcome
step: 2
trigger: 3 days after welcome-1
anchor: signup
offset_days: 3
segment: New subscribers
quadrants: Q1
subject: The story behind the campaign
preheader: {{cfg.message_box.q1.1}}.
---
{{first_name}},

People ask why {{cfg.candidate.first_name}} is running. The short answer is that {{cfg.candidate.pronoun_subject}} has already done the work.

- {{cfg.candidate.bio_points.0}}
- {{cfg.candidate.bio_points.1}}
- {{cfg.candidate.bio_points.2}}

That record is the reason for the three priorities:

## {{cfg.message_box.issues.0.title}}
{{cfg.message_box.issues.0.short}}

## {{cfg.message_box.issues.1.title}}
{{cfg.message_box.issues.1.short}}

## {{cfg.message_box.issues.2.title}}
{{cfg.message_box.issues.2.short}}

[[button: Read the details | {{cfg.web.base_url}}/issues/?utm_source=email&utm_medium=email&utm_campaign=welcome]]
