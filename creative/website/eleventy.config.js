// Campaign-in-a-Box website — Eleventy config.
// All content comes from ../campaign.json (or CAMPAIGN_JSON=path). No client-side JavaScript.
import fs from "node:fs";
import path from "node:path";

export default function (eleventyConfig) {
  // Self-hosted fonts (no third-party requests, faster, more private)
  for (const pkg of ["public-sans", "source-serif-4", "atkinson-hyperlegible", "barlow-condensed"]) {
    const dir = `node_modules/@fontsource/${pkg}/files`;
    if (fs.existsSync(dir)) {
      eleventyConfig.addPassthroughCopy({ [`${dir}/${pkg}-latin-*-normal.woff2`]: "fonts" });
    }
  }
  // Share image and icon built by tools/build_creative.py (your build, or the shipped example)
  const slug = JSON.parse(fs.readFileSync(campaignPath(), "utf8")).slug || "campaign";
  const buildDirs = [process.env.CREATIVE_BUILD, path.join("..", "build", slug),
                     slug === "rivertown-d4" ? path.join("..", "..", "examples", "rivertown-creative") : null].filter(Boolean);
  const buildDir = buildDirs.find((d) => fs.existsSync(path.join(d, "social", "core-landscape.png")));
  if (buildDir) {
    eleventyConfig.addPassthroughCopy({ [path.join(buildDir, "social", "core-landscape.png")]: "share.png" });
    eleventyConfig.addPassthroughCopy({ [path.join(buildDir, "brand", "logo-mark-color.png")]: "icon.png" });
  }

  eleventyConfig.addFilter("fmtDate", (iso, lang = "en") => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(lang === "es" ? "es-US" : "en-US",
      { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  });
  eleventyConfig.addFilter("domain", (url) => (url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""));
  eleventyConfig.addFilter("utm", (url, source, campaign) =>
    `${url}${url.includes("?") ? "&" : "?"}utm_source=${source}&utm_medium=web&utm_campaign=${campaign}`);

  return { dir: { input: "src", output: "_site" }, templateFormats: ["njk", "md"] };
}

export function campaignPath() {
  const p = process.env.CAMPAIGN_JSON || (fs.existsSync("../campaign.json") ? "../campaign.json" : "../campaign.example.json");
  return path.resolve(p);
}
