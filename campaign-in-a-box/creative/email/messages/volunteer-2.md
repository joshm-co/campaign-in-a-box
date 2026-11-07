---
sequence: volunteer
step: 2
trigger: 2 days after volunteer-1
anchor: signup
offset_days: 2
segment: New volunteers
quadrants: Q1 Q3
subject: What to say at the door (it's short)
preheader: One sentence, one question, and how to answer the tough ones.
---
{{first_name}}, here's the whole door script. You'll have it on a card too.

**1. Introduce yourself:** "Hi, I'm a neighbor volunteering for {{cfg.candidate.full_name}} for {{cfg.candidate.office}}."

**2. One sentence:**

> {{t.core}}

**3. Ask:** "What's the biggest issue on your street?" Then listen. That's most of the job.

**If you hear "{{cfg.message_box.q3_responses.0.attack}}":** {{cfg.message_box.q3_responses.0.response}}

**If you hear "{{cfg.message_box.q3_responses.1.attack}}":** {{cfg.message_box.q3_responses.1.response}}

**4. Leave a palm card**, and mark the result on your list: supporter, undecided, or not supporting.
