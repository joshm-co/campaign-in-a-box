// Loads campaign.json + brand.json once and exposes them to every page as `site`.
import fs from "node:fs";
import path from "node:path";
import { campaignPath } from "../../eleventy.config.js";

export default function () {
  const cfg = JSON.parse(fs.readFileSync(campaignPath(), "utf8"));
  const brand = JSON.parse(fs.readFileSync(path.resolve("../brand/brand.json"), "utf8"));
  const palette = brand.palettes[cfg.brand.palette];
  const type = brand.type_pairings[cfg.brand.type_pairing];
  const eday = new Date(cfg.election.election_day + "T12:00:00Z");
  const dates = { election_day: cfg.election.election_day };
  for (const [k, v] of Object.entries(cfg.election.offsets)) {
    if (k.startsWith("_")) continue;
    const d = new Date(eday); d.setUTCDate(d.getUTCDate() + v);
    dates[k] = d.toISOString().slice(0, 10);
  }
  const es = (cfg.language && cfg.language.es) || {};
  const c = cfg.candidate;
  const t = {
    en: { office_line: `${c.office} · ${c.district}`, core: cfg.message_box.core_message, bio_short: c.bio_short,
          bio_points: c.bio_points, issues: cfg.message_box.issues, disclaimer: cfg.disclaimer.text,
          slogan: cfg.slogans[0].text },
    es: { office_line: es.office_line, core: es.core_message, bio_short: es.bio_short, bio_points: es.bio_points,
          issues: es.issues, disclaimer: cfg.disclaimer.text_es || cfg.disclaimer.text, slogan: es.slogan }
  };
  const fontFile = (f) => `${f.family.toLowerCase().replace(/ /g, "-")}-latin-${f.weight}-normal.woff2`;
  return {
    cfg, palette, type, dates, t,
    hasSpanish: cfg.language && cfg.language.secondary === "es",
    fonts: [type.head, type.sub, type.body, { ...type.body, weight: 700 }]
      .filter((f, i, a) => a.findIndex(g => g.family === f.family && g.weight === f.weight) === i)
      .map(f => ({ ...f, file: fontFile(f) })),
    year: new Date().getFullYear()
  };
}
