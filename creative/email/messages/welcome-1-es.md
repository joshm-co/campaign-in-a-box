---
sequence: welcome
step: 1
lang: es
trigger: Se inscribe en la lista en español
anchor: signup
offset_days: 0
segment: Nuevos suscriptores (español)
quadrants: Q1
subject: Gracias por unirse, {{first_name}}
preheader: Por qué se postula {{cfg.candidate.first_name}}, en una frase.
---
Hola, {{first_name}}:

Gracias por inscribirse. Esta es la campaña en una sola frase:

> {{t.core}}

{{t.bio_short}}

[[button: Vea el plan | {{cfg.web.base_url}}/es/?utm_source=email&utm_medium=email&utm_campaign=welcome-es]]

Gracias por ser parte de esto,

La campaña de {{cfg.candidate.full_name}}
