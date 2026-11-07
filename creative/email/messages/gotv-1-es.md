---
sequence: gotv
step: 1
lang: es
trigger: Programado — se envían las boletas
anchor: ballots_out
offset_days: 0
segment: Simpatizantes (español)
quadrants: Q1
subject: Su boleta ya viene en camino
preheader: Cómo votar y las fechas importantes.
---
{{first_name}}, las boletas para la elección de {{cfg.candidate.jurisdiction}} se envían el **{{date.ballots_out}}**.

- **Comienza la votación anticipada:** {{date.early_vote_starts}}
- **Día de las elecciones:** {{date.election_day}}

[[button: Mi información para votar | {{cfg.web.base_url}}/es/vote/?utm_source=email&utm_medium=email&utm_campaign=gotv-es]]

Busque a {{cfg.candidate.full_name}} para {{t.office_line}}.
