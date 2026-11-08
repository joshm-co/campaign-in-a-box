/* Campaign-in-a-Box app — materials renderer.
 * Builds every print piece, social card and ad as SVG from the campaign answers.
 * Layouts follow tools/build_creative.py (Step 2) so the app and the command-line
 * builder make the same pieces. Text is measured with the real brand fonts.
 * MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const U = CIB.util, K = CIB.color, S = CIB.strategy;
  const R = (CIB.render = {});
  const PT = 72;

  /* -------------------------------------------------------------------- fonts */
  R.FONT_FILES = {
    "Public Sans": { 400: "public-sans-latin-400-normal.woff2", 700: "public-sans-latin-700-normal.woff2", 900: "public-sans-latin-900-normal.woff2" },
    "Source Serif 4": { 400: "source-serif-4-latin-400-normal.woff2", 600: "source-serif-4-latin-600-normal.woff2" },
    "Atkinson Hyperlegible": { 400: "atkinson-hyperlegible-latin-400-normal.woff2", 700: "atkinson-hyperlegible-latin-700-normal.woff2" },
    "Barlow Condensed": { 700: "barlow-condensed-latin-700-normal.woff2", 800: "barlow-condensed-latin-800-normal.woff2" }
  };
  // Cap height / em, read from the font files (OS/2 sCapHeight).
  const CAP = { "Public Sans": 0.723, "Source Serif 4": 0.67, "Atkinson Hyperlegible": 0.668, "Barlow Condensed": 0.7 };
  let measureCtx = null;
  R.fontBytes = (file) => {
    const bin = atob(root.CIB_FONTS[file]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  };

  // Load the brand fonts into the page so text can be measured and previewed.
  R.loadFonts = () => {
    const jobs = [];
    Object.entries(R.FONT_FILES).forEach(([fam, ws]) => Object.entries(ws).forEach(([w, file]) => {
      if (!root.FontFace || !root.CIB_FONTS || !root.CIB_FONTS[file]) return;
      const f = new FontFace(fam, R.fontBytes(file), { weight: String(w), style: "normal" });
      jobs.push(f.load().then((ff) => { document.fonts.add(ff); }).catch(() => {}));
    }));
    return Promise.all(jobs);
  };

  class Font {
    constructor(spec) {
      this.family = spec.family; this.weight = spec.weight; this.fallback = spec.fallback || "sans-serif";
      this.cap_ratio = CAP[this.family] || 0.7; this.cache = new Map();
    }
    width(text, size) {
      if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
      let w = this.cache.get(text);
      if (w == null) {
        measureCtx.font = `${this.weight} 100px "${this.family}", ${this.fallback}`;
        w = measureCtx.measureText(text).width / 100;
        this.cache.set(text, w);
      }
      return w * size;
    }
    cap(size) { return this.cap_ratio * size; }
    fit(text, maxWidth, maxSize, minSize = 4) { const w = this.width(text, 1); return Math.max(minSize, Math.min(maxSize, w ? maxWidth / w : maxSize)); }
    wrap(text, size, maxWidth) {
      const lines = []; let cur = "";
      String(text || "").split(/\s+/).filter(Boolean).forEach((word) => {
        const trial = (cur + " " + word).trim();
        if (this.width(trial, size) <= maxWidth || !cur) cur = trial; else { lines.push(cur); cur = word; }
      });
      if (cur) lines.push(cur);
      return lines;
    }
    attrs() { return `font-family="${U.esc(`'${this.family}', ${this.fallback}`)}" font-weight="${this.weight}"`; }
  }
  const fontCache = {};
  const font = (spec) => { const k = spec.family + spec.weight; return fontCache[k] || (fontCache[k] = new Font(spec)); };

  /* ---------------------------------------------------------- SVG document */
  const LAYERS = ["background", "art", "text", "qr", "disclaimer", "proof-only", "guides"];
  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  let clipId = 0;

  class Doc {
    constructor(w, h, { unit = "in", bleed = 0.125, safe = 0.25, title = "" } = {}) {
      this.unit = unit;
      if (unit === "in") { this.w = w * PT; this.h = h * PT; this.b = bleed * PT; this.s = safe * PT; this.sizeIn = [w, h]; }
      else { this.w = w; this.h = h; this.b = 0; this.s = 0; this.sizeIn = null; }
      this.title = title; this.L = Object.fromEntries(LAYERS.map((k) => [k, []])); this.warnings = []; this.defs = [];
    }
    warn(m) { if (!this.warnings.includes(m)) this.warnings.push(m); }
    mark() { return Object.fromEntries(LAYERS.map((k) => [k, this.L[k].length])); }
    reset(m) { LAYERS.forEach((k) => { this.L[k].length = m[k]; }); }
    rect(layer, x, y, w, h, fill, o = {}) {
      if (o.bleed) {
        if (x <= 0.5) { w += x + this.b; x = -this.b; }
        if (y <= 0.5) { h += y + this.b; y = -this.b; }
        if (x + w >= this.w - 0.5) w = this.w + this.b - x;
        if (y + h >= this.h - 0.5) h = this.h + this.b - y;
      }
      let a = `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${fill || "none"}"`;
      if (o.rx) a += ` rx="${f2(o.rx)}"`;
      if (o.stroke) a += ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"`;
      if (o.dash) a += ` stroke-dasharray="${o.dash}"`;
      if (o.opacity != null) a += ` opacity="${o.opacity}"`;
      this.L[layer].push(a + "/>");
    }
    line(layer, x1, y1, x2, y2, stroke, sw = 1, dash) {
      this.L[layer].push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
    }
    circle(layer, cx, cy, r, fill, stroke, sw = 1, dash) {
      this.L[layer].push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${fill || "none"}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
    }
    text(layer, x, y, s, fnt, size, fill, anchor = "start", spacing = 0) {
      this.L[layer].push(`<text x="${f2(x)}" y="${f2(y)}" ${fnt.attrs()} font-size="${f2(size)}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${f2(spacing)}"` : ""}>${U.esc(s)}</text>`);
    }
    para(layer, x, y, width, s, fnt, size, fill, o = {}) {
      const leading = o.leading || 1.28, indent = o.bullet ? size * 0.9 : 0;
      let lines = fnt.wrap(s, size, width - indent);
      if (o.maxLines && lines.length > o.maxLines) {
        this.warn(`“${String(s).slice(0, 40)}…” is too long to fit. Shorten it.`);
        lines = lines.slice(0, o.maxLines);
      }
      if (o.bullet && lines.length) this.circle(layer, x + size * 0.28, y - fnt.cap(size) * 0.42, size * 0.16, o.bullet);
      lines.forEach((ln, i) => this.text(layer, x + indent, y + i * size * leading, ln, fnt, size, fill, o.anchor || "start"));
      return y + lines.length * size * leading;
    }
    fitted(layer, x, y, width, s, fnt, maxSize, fill, o = {}) {
      const maxLines = o.maxLines || 3, minSize = o.minSize || 8, leading = o.leading || 1.08;
      let size = maxSize, lines;
      while (size > minSize) {
        lines = fnt.wrap(s, size, width);
        if (lines.length <= maxLines && lines.every((l) => fnt.width(l, size) <= width)) break;
        size -= Math.max(1, maxSize / 60);
      }
      lines = fnt.wrap(s, size, width);
      if (lines.length > maxLines) { this.warn(`“${String(s).slice(0, 40)}…” is too long for this space. Shorten it.`); lines = lines.slice(0, maxLines); }
      const base = y + fnt.cap(size);
      const tx = o.anchor === "middle" ? x + width / 2 : x;
      lines.forEach((ln, i) => this.text(layer, tx, base + i * size * leading, ln, fnt, size, fill, o.anchor || "start"));
      return { y: base + Math.max(0, lines.length - 1) * size * leading, size, lines };
    }
    image(layer, x, y, w, h, href) {
      const id = "clip" + ++clipId;
      this.defs.push(`<clipPath id="${id}"><rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}"/></clipPath>`);
      this.L[layer].push(`<image href="${href}" x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`);
    }
    raw(layer, s) { this.L[layer].push(s); }
    guides(die) {
      if (this.unit !== "in") return;
      this.rect("guides", -this.b, -this.b, this.w + 2 * this.b, this.h + 2 * this.b, null, { stroke: "#999999", sw: 0.5, dash: "2 2" });
      this.rect("guides", 0, 0, this.w, this.h, null, { stroke: "#00AEEF", sw: 0.75 });
      this.rect("guides", this.s, this.s, this.w - 2 * this.s, this.h - 2 * this.s, null, { stroke: "#EC008C", sw: 0.75, dash: "6 3" });
      this.text("guides", this.s + 2, this.s + 8, "SAFE ZONE (magenta) · TRIM (cyan) · BLEED (gray)", font({ family: "Public Sans", weight: 400 }), 6, "#EC008C");
      if (die) die(this);
    }
    // proof: show guides and ⚖️ notes, and stamp PROOF across the page.
    svg({ proof = false, fontCSS = "", preview = false } = {}) {
      const W = this.w + 2 * this.b, H = this.h + 2 * this.b;
      const dims = this.unit === "in" ? `width="${(W / PT).toFixed(4)}in" height="${(H / PT).toFixed(4)}in"` : `width="${Math.round(W)}" height="${Math.round(H)}"`;
      const out = [`<svg xmlns="http://www.w3.org/2000/svg" ${preview ? `width="${f2(W)}" height="${f2(H)}"` : dims} viewBox="0 0 ${f2(W)} ${f2(H)}" role="img" aria-label="${U.esc(this.title)}">`,
        `<title>${U.esc(this.title)}</title>`];
      if (fontCSS) out.push(`<style>${fontCSS}</style>`);
      if (this.defs.length) out.push(`<defs>${this.defs.join("")}</defs>`);
      out.push(`<g transform="translate(${f2(this.b)},${f2(this.b)})">`);
      LAYERS.forEach((n) => {
        if ((n === "guides" || n === "proof-only") && !proof) return;
        out.push(`<g id="${n}">`, ...this.L[n], "</g>");
      });
      if (proof && !preview) {
        const s = Math.min(this.w, this.h) * 0.16, cx = this.w / 2, cy = this.h / 2;
        const ang = (-Math.atan2(this.h, this.w) * 180) / Math.PI;
        out.push(`<g opacity="0.22" transform="rotate(${f2(ang)} ${f2(cx)} ${f2(cy)})"><text x="${f2(cx)}" y="${f2(cy + s * 0.35)}" font-family="'Public Sans', Arial, sans-serif" font-weight="900" font-size="${f2(s)}" fill="#EC008C" text-anchor="middle">PROOF</text>`
          + `<text x="${f2(cx)}" y="${f2(cy + s * 0.9)}" font-family="'Public Sans', Arial, sans-serif" font-weight="700" font-size="${f2(s * 0.22)}" fill="#EC008C" text-anchor="middle">NOT FOR PRINTING — CHECK EVERY ⚖️ ITEM FIRST</text></g>`);
      }
      out.push("</g></svg>");
      return out.join("\n");
    }
  }
  R.Doc = Doc;

  /* ------------------------------------------------------------------ QR codes */
  R.utmUrl = (base, path, utm) => {
    const q = Object.entries(utm || {}).filter(([, v]) => v).map(([k, v]) => `utm_${k}=${encodeURIComponent(v)}`).join("&");
    return (base || "").replace(/\/+$/, "") + (path || "/") + (q ? "?" + q : "");
  };
  R.qrMatrix = (text) => {
    const q = root.qrcode(0, "M");
    q.addData(text); q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
    return m;
  };
  function drawQr(doc, layer, x, y, size, url, dark, light = "#FFFFFF") {
    const mat = R.qrMatrix(url), n = mat.length, border = 4, m = size / (n + 2 * border);
    if (doc.unit === "in" && m < 0.72) doc.warn("A QR code is too small to scan reliably. Use a shorter web address.");
    doc.rect(layer, x, y, size, size, light);
    const d = [];
    mat.forEach((row, r) => {
      for (let c = 0; c < n;) {
        if (row[c]) { const s = c; while (c < n && row[c]) c++; d.push(`M${f2(x + (s + border) * m)} ${f2(y + (r + border) * m)}h${f2((c - s) * m)}v${f2(m)}h${f2(-(c - s) * m)}z`); }
        else c++;
      }
    });
    doc.raw(layer, `<path d="${d.join("")}" fill="${dark}"/>`);
  }

  /* ------------------------------------------------------------------ labels */
  const LABELS = {
    en: { meet: "Meet {first}", priorities: "{first}'s priorities", key_dates: "Key dates", register: "Register by", ballots: "Ballots mailed",
      early: "Early voting begins", eday: "Election Day", polls: "Polls close at {time}", confirm: "Confirm at", photo: "CANDIDATE PHOTO",
      note: "A note from your neighbor:", record: "The record", source: "Source", you_may_hear: "You may hear", answer: "{first}'s answer",
      vote_by: "Vote by {date}", return: "Return your ballot", learn: "Learn more" },
    es: { meet: "Conozca a {first}", priorities: "Las prioridades de {first}", key_dates: "Fechas clave", register: "Inscríbase antes del",
      ballots: "Se envían las boletas", early: "Comienza la votación anticipada", eday: "Día de las elecciones", polls: "Las casillas cierran a las {time}",
      confirm: "Confirme en", photo: "FOTO DEL CANDIDATO", note: "Una nota de su vecino:", record: "Los hechos", source: "Fuente",
      you_may_hear: "Tal vez escuche", answer: "La respuesta de {first}", vote_by: "Vote antes del {date}", return: "Devuelva su boleta", learn: "Más información" }
  };

  /* ------------------------------------------------------------- context */
  // Everything a piece needs, built once per render from the saved answers.
  R.context = (st) => {
    const cfg = st.cfg, brand = K.brand();
    const P = K.palette(cfg);
    const tp = brand.type_pairings[cfg.brand.type_pairing] || brand.type_pairings.civic;
    const head = font(tp.head), sub = font(tp.sub), body = font(tp.body);
    const bodyB = font({ ...tp.body, weight: tp.body.family === "Source Serif 4" ? 600 : 700 });
    const cand = { ...cfg.candidate };
    if (!cand.first_name) cand.first_name = "Your";
    if (!cand.last_name) cand.last_name = "Name";
    cand.full_name = `${cand.first_name} ${cand.last_name}`;
    const base = cfg.web.base_url || "https://yourname.example";
    const dates = S.dates(cfg);
    const disc = cfg.disclaimer.text || cfg.disclaimer.autoText || `Paid for by Friends of ${cand.full_name}`;
    const mb = cfg.message_box;
    const es = (cfg.language && cfg.language.es) || {};
    const ctx = { st, cfg, P, tp, head, sub, body, bodyB, cand, mb, dates, base, domain: U.domain(base), photo: st.photo,
      hasWeb: !!cfg.web.base_url, spanish: cfg.language.secondary === "es" };
    ctx.L = (lang, key, kw = {}) => LABELS[lang][key].replace("{first}", cand.first_name).replace("{time}", kw.time || "").replace("{date}", kw.date || "");
    const pick = (a, b) => (Array.isArray(a) ? (a.filter((x) => (x && typeof x === "object" ? x.title : x)).length ? a : b) : a || b);
    ctx.tr = (lang) => {
      const e = lang === "es" ? es : {};
      const issuesEn = (mb.issues || []).filter((i) => i.title);
      return {
        office_line: e.office_line || `${cand.office || "Office"}${cand.district ? " · " + cand.district : ""}`,
        core: e.core_message || mb.core_message || "",
        bio_short: e.bio_short || cand.bio_short || "",
        bio_points: (pick(e.bio_points, cand.bio_points) || []).filter(Boolean),
        issues: (lang === "es" ? pick((e.issues || []).filter((i) => i.title), issuesEn) : issuesEn),
        disclaimer: lang === "es" ? cfg.disclaimer.text_es || disc : disc,
        slogan: e.slogan || ""
      };
    };
    return ctx;
  };

  // The slogan a piece uses unless the candidate typed a different one.
  R.slogans = (cfg) => {
    const sl = (cfg.slogans || []).filter((s) => s.text);
    const primary = sl.find((s) => s.role === "primary") || sl[0];
    const has = (s, q) => (s.quadrants || []).includes(q);
    return {
      primary: primary ? primary.text : "",
      proof: (sl.find((s) => s !== primary && has(s, "Q1") && has(s, "Q2")) || primary || {}).text || "",
      contrast: (sl.find((s) => s.role === "contrast") || sl.find((s) => has(s, "Q2") && !has(s, "Q1")) || {}).text || "",
      q1only: (sl.find((s) => s !== primary && has(s, "Q1") && (s.quadrants || []).length === 1 && s.role !== "inoculation" && /\..+\./.test(s.text))
        || sl.find((s) => s !== primary && has(s, "Q1") && (s.quadrants || []).length === 1) || primary || {}).text || ""
    };
  };

  // Default wording for each piece's fields, used when the candidate leaves a field blank.
  R.defaults = (st, piece) => {
    const cfg = st.cfg, c = cfg.candidate, mb = cfg.message_box, sl = R.slogans(cfg), es = cfg.language.es || {};
    const first = c.first_name || "Your name", isEs = piece.lang === "es";
    const q2 = (mb.q2 || []).find((q) => q.text);
    const proof = (mb.q1 || []).filter(Boolean)[1] || (mb.q1 || []).filter(Boolean)[0] || "";
    switch (piece.type) {
      case "yard_sign": return { slogan: isEs ? es.slogan || sl.primary : sl.primary };
      case "door_hanger": return isEs ? { headline: es.slogan || sl.proof, qr_label: `Escanee para ver el plan de ${first}`, missed_you: "¡Perdón, no lo encontramos!" }
        : { headline: sl.proof, qr_label: `Scan to see ${first}'s plan`, missed_you: "Sorry we missed you!" };
      case "palm_card": return isEs ? { slogan: es.slogan || sl.primary, qr_label: "Su información para votar" } : { slogan: sl.primary, qr_label: "Your voting info" };
      case "mailer":
        if (piece.id.includes("contrast")) return { front_kicker: "Your ballot is here", front_headline: sl.contrast || (q2 ? q2.text : ""),
          front_sub: q2 && sl.contrast ? `${q2.text.replace(/\.$/, "")}. ${first} won't wait.` : "", back_headline: sl.proof !== sl.primary ? sl.proof : "The record",
          back_mode: "contrast", qr_label: "Read the record" };
        return { front_kicker: "Meet your neighbor", front_headline: sl.primary, front_sub: proof ? proof.replace(/\.?$/, ".") : c.bio_short,
          back_headline: `${c.full_name || first} gets things done.`, back_mode: "bio_issues", qr_label: `Meet ${first}` };
      case "flier": return { headline: sl.q1only, cta_title: `Help ${first} win${c.district ? " " + c.district : ""}`,
        cta_text: "Knock doors, make calls, or host a yard sign. One Saturday makes a difference.", qr_label: "Sign up to help" };
      default: return {};
    }
  };
  CIB.pieceContent = (st, piece) => {
    const d = R.defaults(st, piece), c = piece.content || {}, out = { ...d };
    Object.keys(c).forEach((k) => { if (c[k] != null && String(c[k]).trim() !== "") out[k] = c[k]; });
    return out;
  };

  /* --------------------------------------------------------- shared blocks */
  function photoSlot(d, ctx, x, y, w, h, lang, bleed) {
    if (ctx.photo) {
      if (bleed) {
        let X = x, Y = y, W = w, H = h;
        if (X <= 0.5) { W += X + d.b; X = -d.b; } if (Y <= 0.5) { H += Y + d.b; Y = -d.b; }
        if (X + W >= d.w - 0.5) W = d.w + d.b - X; if (Y + H >= d.h - 0.5) H = d.h + d.b - Y;
        d.image("art", X, Y, W, H, ctx.photo);
      } else d.image("art", x, y, w, h, ctx.photo);
      return;
    }
    d.rect("art", x, y, w, h, ctx.P.tint, { bleed });
    const size = Math.max(7, Math.min(14, w / 14));
    d.text("art", x + w / 2, y + h / 2, ctx.L(lang, "photo"), ctx.sub, size, ctx.P.primary, "middle");
    d.text("proof-only", x + w / 2, y + h / 2 + size * 1.6, "Add a real photo (300 dpi at print size)", ctx.body, size * 0.6, ctx.P.ink, "middle");
    d.warn("No candidate photo yet — the piece shows a placeholder box.");
  }

  function nameLockup(d, ctx, x, y, width, o = {}) {
    const P = ctx.P, onDark = o.onDark !== false;
    const fg = onDark ? P.onPrimary : P.primary, hi = onDark ? P.hiOnPrimary : P.accent;
    const anchor = o.center ? "middle" : "start", tx = o.center ? x + width / 2 : x;
    const first = ctx.cand.first_name.toUpperCase(), last = ctx.cand.last_name.toUpperCase();
    const ls = ctx.head.fit(last, width, o.lastMax || 60);
    const fs = Math.min(ctx.sub.fit(first, width, ls * 0.42), ls * 0.42);
    let yb = y + ctx.sub.cap(fs);
    d.text("text", tx, yb, first, ctx.sub, fs, fg, anchor, fs * 0.08);
    yb += fs * 0.28 + ctx.head.cap(ls);
    d.text("text", tx, yb, last, ctx.head, ls, fg, anchor);
    if (o.office !== false) {
      const off = ctx.tr(o.lang || "en").office_line.toUpperCase();
      const os = Math.min(ctx.sub.fit(off, width * 0.9, ls * 0.26), ls * 0.26);
      yb += os * 0.5 + ctx.sub.cap(os) + 2;
      d.text("text", tx, yb, off, ctx.sub, os, hi, anchor, os * 0.06);
    }
    return { y: yb, size: ls };
  }

  function disclaimer(d, ctx, x, y, width, lang, color, o = {}) {
    const size = o.size || 8;
    let t = ctx.tr(lang).disclaimer;
    if (o.address !== false && ctx.cfg.disclaimer.address_line) t += ". " + ctx.cfg.disclaimer.address_line;
    if (o.shrink) { const tw = Math.min(width, ctx.body.width(t, size) + 12); x = x + width - tw; width = tw; }
    const tx = o.anchor === "middle" ? x + width / 2 : x;
    const lines = ctx.body.wrap(t, size, width - (o.boxed ? 8 : 0));
    const h = lines.length * size * 1.25 + (o.boxed ? 6 : 0);
    if (o.boxed) d.rect("disclaimer", x, y, width, h, null, { stroke: color, sw: 0.75 });
    lines.forEach((ln, i) => d.text("disclaimer", tx + (o.boxed && o.anchor !== "middle" ? 4 : 0), y + (o.boxed ? 3 : 0) + ctx.body.cap(size) + i * size * 1.25 + 1, ln, ctx.body, size, color, o.anchor || "start"));
    d.rect("proof-only", x - 1, y - 1, width + 2, h + 2, null, { stroke: "#EC008C", sw: 0.5, dash: "2 1" });
    d.text("proof-only", x, y - 2, "⚖️ DISCLAIMER — confirm wording, size and placement for your state", ctx.body, Math.max(5, size * 0.6), "#EC008C");
    return y + h;
  }

  function dateRows(ctx, lang) {
    const D = ctx.dates;
    const rows = [[ctx.L(lang, "register"), D.register_deadline], [ctx.L(lang, "ballots"), D.ballots_out],
      [ctx.L(lang, "early"), D.early_vote_starts], [ctx.L(lang, "eday"), D.election_day]]
      .filter((r) => r[1]).sort((a, b) => a[1].localeCompare(b[1])).map(([a, b]) => [a, U.fmtDate(b, lang)]);
    rows.push([ctx.L(lang, "polls", { time: ctx.cfg.election.polls_close || "" }), ""]);
    return rows;
  }

  function qrUrl(ctx, piece) {
    return R.utmUrl(ctx.base, piece.qr_path, piece.utm);
  }

  /* -------------------------------------------------------------- the pieces */
  const FT_PER_INCH = 30, MPH35_FT_S = (35 * 5280) / 3600;

  function yardSign(ctx, piece, c) {
    const P = ctx.P, lang = piece.lang;
    const d = new Doc(24, 18, { bleed: 0.125, safe: 0.75, title: `Yard sign — ${ctx.cand.full_name}` });
    const w = d.w, h = d.h, m = 0.75 * PT;
    d.rect("background", 0, 0, w, h, P.primary, { bleed: true });
    const first = ctx.cand.first_name.toUpperCase(), last = ctx.cand.last_name.toUpperCase(), full = `${first} ${last}`;
    let yb, nameRows;
    const single = ctx.head.fit(full, w - 2 * m, 420);
    if (ctx.head.cap(single) / PT >= 4.0) {
      yb = 70 + ctx.head.cap(single);
      d.text("text", w / 2, yb, full, ctx.head, single, P.onPrimary, "middle");
      nameRows = [["Name", full, ctx.head.cap(single)]];
    } else {
      const ls = ctx.head.fit(last, w - 2 * m, 470);
      const fs = Math.min(ctx.sub.fit(first, w - 2 * m, ls * 0.45), ls * 0.45);
      yb = 66 + ctx.sub.cap(fs);
      d.text("text", w / 2, yb, first, ctx.sub, fs, P.onPrimary, "middle", fs * 0.06);
      yb += 34 + ctx.head.cap(ls);
      d.text("text", w / 2, yb, last, ctx.head, ls, P.onPrimary, "middle");
      nameRows = [["First name", first, ctx.sub.cap(fs)], ["Last name", last, ctx.head.cap(ls)]];
    }
    const office = ctx.tr(lang).office_line.toUpperCase();
    const os = ctx.sub.fit(office, (w - 2 * m) * 0.93, 112);
    const slogan = c.slogan || "";
    const ss = slogan ? ctx.sub.fit(slogan, w - 2 * m, 120) : 0;
    const bandH = 150, fy = h - m - 52;
    const used = bandH + (slogan ? ctx.sub.cap(ss) : 0);
    const gap = Math.max(40, (fy - yb - used) / (slogan ? 3 : 2));
    const bandTop = yb + gap;
    d.rect("art", 0, bandTop, w, bandH, P.secondary, { bleed: true });
    d.text("text", w / 2, bandTop + bandH / 2 + ctx.sub.cap(os) / 2, office, ctx.sub, os, P.onSecondary, "middle", os * 0.04);
    if (slogan) d.text("text", w / 2, bandTop + bandH + gap + ctx.sub.cap(ss), slogan, ctx.sub, ss, P.onPrimary, "middle");
    const us = 40;
    d.text("text", m, fy + 36, ctx.domain, ctx.sub, us, P.hiOnPrimary);
    disclaimer(d, ctx, w - m - 640, fy + 6, 640, lang, P.onPrimary, { size: 26, boxed: true, address: false, shrink: true });
    d.guides();
    const words = U.words(full + " " + office);
    const leg = nameRows.concat([["Office line", office, ctx.sub.cap(os)], ["Slogan", slogan, slogan ? ctx.sub.cap(ss) : 0], ["Web address", ctx.domain, ctx.sub.cap(us)]])
      .filter((r) => r[1]).map(([label, txt, cap]) => ({ label, text: txt, inches: cap / PT, feet: (cap / PT) * FT_PER_INCH, seconds: ((cap / PT) * FT_PER_INCH) / MPH35_FT_S }));
    if (words > 7) d.warn(`Your name and office are ${words} words. Aim for 7 or fewer so drivers can read it at 35 mph.`);
    const nameCap = nameRows[nameRows.length - 1][2] / PT;
    if (nameCap < 3.5) d.warn(`Your name is ${nameCap.toFixed(1)} inches tall. Try the Condensed type style to make it bigger.`);
    if (U.words(slogan) > 6) d.warn("The slogan is long for a yard sign. Six words or fewer reads best from a car.");
    return { front: d, legibility: leg, primaryWords: words };
  }

  function dieDoorhanger(doc) {
    const cx = doc.w / 2, cy = 0.875 * PT, r = 0.625 * PT;
    doc.circle("guides", cx, cy, r, null, "#EC008C", 0.75);
    doc.line("guides", cx, 0, cx, cy - r, "#EC008C", 0.75);
    doc.circle("guides", cx, cy, r + 0.25 * PT, null, "#EC008C", 0.5, "3 2");
    doc.text("guides", cx + r + 0.3 * PT, cy, "DIE CUT: 1.25 in hole + slit", font({ family: "Public Sans", weight: 700 }), 6, "#EC008C");
  }

  function doorHanger(ctx, piece, c) {
    const P = ctx.P, lang = piece.lang, t = ctx.tr(lang), m = 0.25 * PT;
    let d = new Doc(4.25, 11, { title: `Door hanger front (${lang})` });
    const w = d.w, h = d.h;
    d.rect("background", 0, 0, w, h, P.paper, { bleed: true });
    d.rect("art", 0, 0, w, 262, P.primary, { bleed: true });
    nameLockup(d, ctx, m + 6, 140, w - 2 * m - 12, { lastMax: 70, center: true, lang });
    photoSlot(d, ctx, 0, 262, w, 190, lang, true);
    let r = d.fitted("text", m, 470, w - 2 * m, c.headline || "", ctx.sub, 22, P.primary, { maxLines: 3 });
    d.para("text", m, r.y + 28, w - 2 * m, t.core, ctx.body, 12.5, P.ink, { maxLines: 8 });
    const qs = 72, qy = h - m - 34 - qs;
    drawQr(d, "qr", m, qy, qs, qrUrl(ctx, piece), P.ink, P.paper);
    d.para("text", m + qs + 10, qy + 26, w - 2 * m - qs - 10, c.qr_label || "", ctx.sub, 12, P.primary);
    d.text("text", m + qs + 10, qy + qs - 8, ctx.domain, ctx.body, 9.5, P.ink);
    disclaimer(d, ctx, m, h - m - 24, w - 2 * m, lang, P.ink, { size: 7.5 });
    d.guides(dieDoorhanger);
    const front = d;
    d = new Doc(4.25, 11, { title: `Door hanger back (${lang})` });
    d.rect("background", 0, 0, w, h, P.paper, { bleed: true });
    d.rect("art", 0, 0, w, 178, P.primary, { bleed: true });
    d.fitted("text", m, 132, w - 2 * m, c.missed_you || "", ctx.sub, 22, P.onPrimary, { maxLines: 1 });
    d.rect("art", m, 192, w - 2 * m, 98, P.tint, { rx: 4 });
    d.text("text", m + 8, 208, ctx.L(lang, "note"), ctx.sub, 9, P.primary);
    for (let i = 0; i < 3; i++) d.line("art", m + 8, 232 + i * 20, w - m - 8, 232 + i * 20, P.primary, 0.5);
    let y = 318;
    d.text("text", m, y, ctx.L(lang, "priorities").toUpperCase(), ctx.sub, 11, P.accent, 0.8);
    y += 20;
    t.issues.forEach((iss) => {
      y = d.para("text", m, y, w - 2 * m, iss.title, ctx.sub, 13, P.primary, { maxLines: 2 });
      y = d.para("text", m, y - 1, w - 2 * m, iss.short, ctx.body, 10.5, P.ink, { maxLines: 4 }) + 10;
    });
    const q2 = (ctx.mb.q2 || []).find((q) => q.text);
    if ((piece.quadrants || []).includes("Q2") && q2 && lang === "en") {
      d.text("text", m, y + 4, ctx.L(lang, "record").toUpperCase(), ctx.sub, 9, P.accent, 0.8);
      y = d.para("text", m, y + 18, w - 2 * m, q2.text, ctx.bodyB, 10.5, P.ink, { maxLines: 3 });
      y = d.para("text", m, y, w - 2 * m, `${ctx.L(lang, "source")}: ${q2.source || "⚖️ ADD A SOURCE"}`, ctx.body, 8, P.ink, { maxLines: 2 });
    }
    const bottom = h - m - 34;
    if (y > bottom) d.warn(`The back runs into the disclaimer. Shorten the priorities text.`);
    d.rect("art", 0, h - m - 46, w, 46 + m, P.primary, { bleed: true });
    disclaimer(d, ctx, m, h - m - 30, w - 2 * m, lang, P.onPrimary, { size: 7.5 });
    d.guides(dieDoorhanger);
    return { front, back: d };
  }

  function palmCard(ctx, piece, c) {
    const P = ctx.P, lang = piece.lang, t = ctx.tr(lang), m = 0.25 * PT;
    let d = new Doc(4, 9, { title: `Palm card front (${lang})` });
    const w = d.w, h = d.h;
    d.rect("background", 0, 0, w, h, P.primary, { bleed: true });
    photoSlot(d, ctx, 0, 0, w, 300, lang, true);
    const nl = nameLockup(d, ctx, m, 330, w - 2 * m, { lastMax: 76, lang });
    d.fitted("text", m, nl.y + 30, w - 2 * m, c.slogan || "", ctx.sub, 26, P.onPrimary, { maxLines: 2 });
    d.text("text", m, h - m - 30, ctx.domain, ctx.sub, 12, P.hiOnPrimary);
    disclaimer(d, ctx, m, h - m - 18, w - 2 * m, lang, P.onPrimary, { size: 7, address: false });
    d.guides();
    const front = d;
    d = new Doc(4, 9, { title: `Palm card back (${lang})` });
    d.rect("background", 0, 0, w, h, P.paper, { bleed: true });
    let y = m + 22;
    d.text("text", m, y, ctx.L(lang, "meet"), ctx.sub, 18, P.primary);
    y += 18;
    t.bio_points.forEach((b) => { y = d.para("text", m, y, w - 2 * m, b, ctx.body, 9.5, P.ink, { bullet: P.accent, maxLines: 3 }) + 3; });
    y += 10;
    d.text("text", m, y, ctx.L(lang, "priorities"), ctx.sub, 14, P.primary);
    y += 16;
    t.issues.forEach((iss) => { y = d.para("text", m, y, w - 2 * m, iss.title, ctx.bodyB, 9.5, P.ink, { bullet: P.accent, maxLines: 2 }) + 2; });
    y += 8;
    const rows = dateRows(ctx, lang), boxH = 22 + rows.length * 13 + 16;
    d.rect("art", 0, y, w, boxH, P.tint, { bleed: true });
    d.text("text", m, y + 16, ctx.L(lang, "key_dates").toUpperCase(), ctx.sub, 9, P.accent, 0.8);
    let yy = y + 31;
    rows.forEach(([a, b]) => { d.text("text", m, yy, a, ctx.body, 9, P.ink); d.text("text", w - m, yy, b, ctx.bodyB, 9, P.ink, "end"); yy += 13; });
    if (ctx.cfg.election.voter_info_url) d.text("text", m, yy + 1, `${ctx.L(lang, "confirm")} ${U.domain(ctx.cfg.election.voter_info_url)}`, ctx.body, 7.5, P.ink);
    d.text("proof-only", w - m, y + 16, "⚖️ CONFIRM EVERY DATE", ctx.sub, 6, "#EC008C", "end");
    y += boxH + 12;
    const qs = 70, room = h - m - 30 - qs - y;
    if (room > 70) y = d.para("text", m, y + 16, w - 2 * m, t.core, ctx.body, 10.5, P.primary, { maxLines: Math.floor((room - 20) / 13.5) });
    const qy = Math.max(y, h - m - 30 - qs);
    drawQr(d, "qr", m, qy, qs, qrUrl(ctx, piece), P.ink, P.paper);
    d.para("text", m + qs + 10, qy + 26, w - 2 * m - qs - 10, c.qr_label || "", ctx.sub, 11, P.primary);
    d.text("text", m + qs + 10, qy + qs - 8, ctx.domain, ctx.body, 8.5, P.ink);
    if (qy + qs > h - m - 22) d.warn("The back is too full. Shorten the bio points or priority titles.");
    disclaimer(d, ctx, m, h - m - 18, w - 2 * m, lang, P.ink, { size: 7 });
    d.guides();
    return { front, back: d };
  }

  function mailPanel(d, ctx, x0, lang) {
    const P = ctx.P, m = 0.25 * PT;
    d.rect("art", x0, 0, d.w - x0, d.h, P.paper, { bleed: true });
    d.line("art", x0, m, x0, d.h - m, P.tint, 1);
    const rx = x0 + 14, ry = m + 10;
    d.text("text", rx, ry, ctx.tr(lang).disclaimer.replace(/^Paid for by /, "").replace(/^Pagado por /, ""), ctx.bodyB, 8, P.ink);
    d.text("text", rx, ry + 11, ctx.cfg.disclaimer.address_line || "", ctx.body, 8, P.ink);
    const iw = 1.0 * PT, ih = 0.8 * PT, small = font({ family: "Public Sans", weight: 700 });
    d.rect("guides", d.w - m - iw, m, iw, ih, null, { stroke: "#EC008C", sw: 0.75, dash: "3 2" });
    d.text("guides", d.w - m - iw / 2, m + ih / 2 + 2, "POSTAGE INDICIA", small, 6, "#EC008C", "middle");
    d.text("guides", d.w - m - iw / 2, m + ih / 2 + 10, "from your mail house", ctx.body, 5, "#EC008C", "middle");
    const ax = x0 + 0.5 * PT, ay = d.h * 0.42;
    d.rect("guides", ax, ay, d.w - ax - m, 1.2 * PT, null, { stroke: "#00AEEF", sw: 0.75, dash: "3 2" });
    d.text("guides", ax + 6, ay + 12, "ADDRESS BLOCK AREA — keep clear (mail house prints here)", ctx.body, 6, "#00AEEF");
    const bw = 4.75 * PT, bh = 0.625 * PT;
    d.rect("guides", d.w - bw, d.h - bh, bw, bh, "#EC008C", { opacity: 0.12 });
    d.text("guides", d.w - bw + 6, d.h - bh + 12, "BARCODE CLEAR ZONE 4.75 × 0.625 in — no ink", ctx.body, 6, "#EC008C");
  }

  function mailer(ctx, piece, c) {
    const P = ctx.P, lang = piece.lang, t = ctx.tr(lang), m = 0.25 * PT;
    let d = new Doc(11, 6, { title: `${piece.label || piece.id} front` });
    const w = d.w, h = d.h, split = w * 0.56, x = m + 10;
    d.rect("background", 0, 0, w, h, P.primary, { bleed: true });
    photoSlot(d, ctx, split, 0, w - split, h, lang, true);
    d.text("text", x, m + 26, String(c.front_kicker || "").toUpperCase(), ctx.sub, 13, P.hiOnPrimary, 1.2);
    let r = d.fitted("text", x, m + 44, split - x - 24, c.front_headline || "", ctx.head, 54, P.onPrimary, { maxLines: 3, leading: 1.02 });
    d.para("text", x, r.y + 44, split - x - 30, c.front_sub || "", ctx.body, 16, P.onPrimary, { maxLines: 3 });
    nameLockup(d, ctx, x, h - m - 92, 230, { lastMax: 44, lang });
    d.guides();
    const front = d;
    d = new Doc(11, 6, { title: `${piece.label || piece.id} back` });
    d.rect("background", 0, 0, w, h, P.paper, { bleed: true });
    const panelX = w - 5.0 * PT;
    mailPanel(d, ctx, panelX, lang);
    const cw = panelX - m - x - 14;
    r = d.fitted("text", x, m + 10, cw, c.back_headline || "", ctx.sub, 28, P.primary, { maxLines: 1 });
    const y0 = r.y + 22;
    const content = (k) => {
      let y = y0;
      if (c.back_mode === "contrast") {
        d.text("text", x, y, ctx.L(lang, "record").toUpperCase(), ctx.sub, 9 * k, P.accent, 0.8);
        y += 19 * k;
        (ctx.mb.q2 || []).filter((q) => q.text).forEach((q) => {
          y = d.para("text", x, y, cw, q.text, ctx.bodyB, 13.5 * k, P.ink, { bullet: P.accent, maxLines: 3 });
          y = d.para("text", x + 10, y - 1, cw - 10, `${ctx.L(lang, "source")}: ${q.source || "⚖️ ADD A SOURCE"}`, ctx.body, 9.5 * k, P.ink, { maxLines: 2 }) + 6 * k;
        });
        y += 4 * k;
        const inner = (ctx.mb.q3_responses || []).filter((q) => q.attack && q.response).slice(0, 2);
        if (inner.length) {
          const boxTop = y - 6;
          const bh = (22 + inner.reduce((s, q) => s + 19 + 15.5 * ctx.body.wrap(q.response, 11.5 * k, cw - 8).length + 4, 0)) * k;
          d.rect("art", x - 6, boxTop, cw + 12, bh, P.tint, { rx: 3 });
          d.text("text", x, boxTop + 14 * k, ctx.L(lang, "answer").toUpperCase(), ctx.sub, 9 * k, P.accent, 0.8);
          let yy = boxTop + 32 * k;
          inner.forEach((q) => {
            d.text("text", x, yy, `${ctx.L(lang, "you_may_hear")}: “${q.attack}”`, ctx.bodyB, 11.5 * k, P.ink);
            yy = d.para("text", x, yy + 15.5 * k, cw - 8, q.response, ctx.body, 11.5 * k, P.ink, { leading: 1.35, maxLines: 3 }) + 4 * k;
          });
          y = boxTop + bh + 4;
        }
      } else {
        t.bio_points.forEach((b) => { y = d.para("text", x, y, cw, b, ctx.body, 12.5 * k, P.ink, { bullet: P.accent, maxLines: 2 }) + 4 * k; });
        y += 10 * k;
        d.text("text", x, y, ctx.L(lang, "priorities").toUpperCase(), ctx.sub, 10 * k, P.accent, 0.8);
        y += 20 * k;
        t.issues.forEach((iss) => {
          d.text("text", x, y, iss.title, ctx.sub, 13 * k, P.primary);
          y = d.para("text", x, y + 16 * k, cw, iss.short, ctx.body, 11.5 * k, P.ink, { maxLines: 2 }) + 6 * k;
        });
      }
      return y;
    };
    const qs = 62, qy = h - m - 22 - qs;
    let k = 1, y;
    const before = d.warnings.length;
    for (k of [1, 0.95, 0.9, 0.85, 0.8, 0.75]) {
      const mk = d.mark(); d.warnings.length = before;
      y = content(k);
      if (y <= qy - 4 || k === 0.75) break;
      d.reset(mk);
    }
    if (y > qy - 4) d.warn("The back is too full even with smaller type. Shorten the text.");
    else if (k < 1) d.warn(`The back is a little crowded, so the type was shrunk to ${Math.round(k * 100)}% to fit. Shorten one line for easier reading.`);
    drawQr(d, "qr", x, qy, qs, qrUrl(ctx, piece), P.ink, P.paper);
    d.text("text", x + qs + 10, qy + 26, c.qr_label || "", ctx.sub, 12, P.primary);
    d.text("text", x + qs + 10, qy + 42, ctx.domain, ctx.body, 9.5, P.ink);
    disclaimer(d, ctx, x, h - m - 14, cw, lang, P.ink, { size: 7.5, address: false });
    d.guides();
    return { front, back: d };
  }

  function flier(ctx, piece, c) {
    const P = ctx.P, lang = piece.lang, t = ctx.tr(lang), m = 0.5 * PT;
    const d = new Doc(8.5, 11, { title: "Flier" });
    const w = d.w, h = d.h;
    d.rect("background", 0, 0, w, h, P.paper, { bleed: true });
    d.rect("art", 0, 0, w, 168, P.primary, { bleed: true });
    nameLockup(d, ctx, m, m - 6, w - 2 * m, { lastMax: 74, lang });
    const r = d.fitted("text", m, 192, w - 2 * m, c.headline || "", ctx.head, 34, P.primary, { maxLines: 2 });
    const top = r.y + 18, pw = 220;
    photoSlot(d, ctx, m, top, pw, 180, lang, false);
    const rx = m + pw + 20;
    let yy = d.para("text", rx, top + 14, w - m - rx, t.core, ctx.body, 13, P.ink, { maxLines: 6 }) + 6;
    t.bio_points.forEach((b) => { yy = d.para("text", rx, yy, w - m - rx, b, ctx.body, 10.5, P.ink, { bullet: P.accent, maxLines: 3 }) + 2; });
    let y = Math.max(top + 180, yy) + 24;
    d.text("text", m, y, ctx.L(lang, "priorities").toUpperCase(), ctx.sub, 10, P.accent, 1);
    y += 18;
    const gap = 16, cw = (w - 2 * m - gap * 2) / 3;
    let bottom = y;
    t.issues.slice(0, 3).forEach((iss, i) => {
      const cx = m + i * (cw + gap);
      d.rect("art", cx, y - 4, cw, 3, P.secondary);
      let yy2 = d.para("text", cx, y + 16, cw, iss.title, ctx.sub, 13, P.primary, { maxLines: 3 });
      yy2 = d.para("text", cx, yy2, cw, iss.short, ctx.body, 10, P.ink, { maxLines: 6 });
      bottom = Math.max(bottom, yy2);
    });
    const by = h - m - 140;
    if (bottom > by - 8) d.warn("The priorities run into the sign-up box. Shorten them.");
    d.rect("art", 0, by, w, 140 - 26, P.tint, { bleed: true });
    const qs = 92;
    drawQr(d, "qr", w - m - qs, by + 10, qs, qrUrl(ctx, piece), P.ink, P.paper);
    d.text("text", m, by + 30, c.cta_title || "", ctx.sub, 20, P.primary);
    d.para("text", m, by + 52, w - 2 * m - qs - 20, c.cta_text || "", ctx.body, 11.5, P.ink, { maxLines: 2 });
    d.text("text", m, by + 92, `${c.qr_label || ""}: ${ctx.domain}/volunteer`, ctx.sub, 11, P.accent);
    disclaimer(d, ctx, m, h - m - 14, w - 2 * m, lang, P.ink, { size: 8 });
    d.guides();
    return { front: d };
  }

  R.TYPES = {
    yard_sign: { fn: yardSign, name: "Yard sign", size: "24 × 18 in", spec: "24 × 18 in, 4 mm corrugated plastic, 2-sided, H-stakes. 0.125 in bleed.", dpi: 150 },
    door_hanger: { fn: doorHanger, name: "Door hanger", size: "4.25 × 11 in", spec: "4.25 × 11 in, 100 lb gloss cover or 14 pt, full color 2-sided, 1.25 in die-cut hole + slit. 0.125 in bleed.", dpi: 300 },
    palm_card: { fn: palmCard, name: "Palm card", size: "4 × 9 in", spec: "4 × 9 in, 100 lb gloss cover, full color 2-sided. 0.125 in bleed.", dpi: 300 },
    mailer: { fn: mailer, name: "Mailer", size: "6 × 11 in postcard", spec: "6 × 11 in postcard, 100 lb gloss cover or 10 pt, full color 2-sided. 0.125 in bleed. Confirm size, thickness and mail class with your mail house.", dpi: 300 },
    flier: { fn: flier, name: "Flier", size: "8.5 × 11 in", spec: "8.5 × 11 in, 80–100 lb text, full color 1-sided. Print at 100% on a home printer (edges may show white).", dpi: 300 }
  };

  R.pieceName = (p) => {
    const lang = p.lang === "es" ? " (Español)" : "";
    if (p.type === "mailer") return (p.id.includes("contrast") ? "Mailer 2 — The record" : "Mailer 1 — Meet " + "{first}") + lang;
    return R.TYPES[p.type].name + lang;
  };

  // Which pieces are in play: Spanish pieces only when the campaign has Spanish turned on.
  R.activePieces = (st) => st.cfg.pieces.filter((p) => p.lang !== "es" || st.cfg.language.secondary === "es");

  // Render one print piece. Returns pages, warnings, and (for the sign) legibility rows.
  R.piece = (st, piece, ctx) => {
    ctx = ctx || R.context(st);
    const T = R.TYPES[piece.type];
    const c = CIB.pieceContent(st, piece);
    const out = T.fn(ctx, piece, c);
    const pages = Object.entries(out).filter(([, v]) => v instanceof Doc).map(([side, doc]) => ({ side, doc }));
    const warnings = [];
    pages.forEach((p) => p.doc.warnings.forEach((w) => { if (!warnings.includes(w)) warnings.push(w); }));
    // Plain-language rule checks (Step 2 builder rules).
    if ((piece.quadrants || []).includes("Q2")) {
      const missing = (ctx.mb.q2 || []).filter((q) => q.text && !String(q.source || "").trim());
      if (missing.length) warnings.unshift("Every contrast point needs a source before this can be printed.");
      if (!(ctx.mb.q2 || []).some((q) => q.text) && piece.id.includes("contrast")) warnings.unshift("Add at least one contrast point (with a source) to use this mailer.");
    }
    if (!ctx.hasWeb && piece.type !== "yard_sign") warnings.push("Add your website address so the QR code goes somewhere.");
    if (piece.lang === "es") {
      const es = st.cfg.language.es || {};
      if (!es.core_message || !es.office_line) warnings.unshift("Some Spanish text is missing, so English is showing. Fill it in under Spanish.");
    }
    const ready = !warnings.some((w) => /needs a source|Add at least one contrast|too long|too full|runs into|Spanish text is missing/.test(w));
    return { piece, content: c, pages, warnings, ready, legibility: out.legibility || null, primaryWords: out.primaryWords || 0, name: R.pieceName(piece).replace("{first}", ctx.cand.first_name) };
  };

  /* ----------------------------------------------------------- social and ads */
  R.SOCIAL = {
    square: { w: 1080, h: 1080, use: "Instagram/Facebook feed, Meta ads, Nextdoor", safe: [0, 0] },
    portrait: { w: 1080, h: 1350, use: "Instagram/Facebook feed (4:5) — biggest in the feed", safe: [0, 0] },
    story: { w: 1080, h: 1920, use: "Stories and Reels covers. Text stays out of the top 250 px and bottom 340 px.", safe: [250, 340] },
    landscape: { w: 1200, h: 630, use: "Link previews (Facebook, LinkedIn, X), Nextdoor, website share image", safe: [0, 0] },
    wide: { w: 1600, h: 900, use: "X in-stream image, YouTube community, email header", safe: [0, 0] }
  };
  R.ADS = {
    "display-1200x628": { w: 1200, h: 628, use: "Google responsive display — landscape" },
    "display-1200x1200": { w: 1200, h: 1200, use: "Google responsive display — square" },
    "display-300x250": { w: 300, h: 250, use: "Google display — medium rectangle" },
    "display-728x90": { w: 728, h: 90, use: "Google display — leaderboard" },
    "display-160x600": { w: 160, h: 600, use: "Google display — wide skyscraper" },
    "display-320x50": { w: 320, h: 50, use: "Google display — mobile banner" },
    "facebook-cover": { w: 1640, h: 624, use: "Facebook page cover (sides crop on phones — text stays centered)" }
  };

  R.socialCards = (st) => {
    const sl = R.slogans(st.cfg), q2 = (st.cfg.message_box.q2 || []).find((q) => q.text);
    const cards = [{ id: "core", kicker: st.cfg.candidate.district || st.cfg.candidate.jurisdiction || "Vote", text: sl.primary, quadrants: ["Q1"] }];
    if (sl.contrast && q2) cards.push({ id: "contrast", kicker: "The record", text: sl.contrast, source: q2.source, quadrants: ["Q2"] });
    cards.push({ id: "gotv", kicker: "Ballots are out", gotv: true, quadrants: ["Q1"] });
    return cards;
  };

  function socialCard(ctx, card, fmt, w, h, safe) {
    const P = ctx.P, d = new Doc(w, h, { unit: "px", title: `Social ${card.id} ${fmt}` });
    d.rect("background", 0, 0, w, h, P.primary);
    const m = Math.round(Math.min(w, h) * 0.075), top = m + safe[0], bottom = h - m - safe[1];
    d.rect("art", m, top, w * 0.12, Math.max(6, h * 0.008), P.secondary);
    const ks = Math.min(w, h) * 0.04;
    d.text("text", m, top + ks * 2.2, String(card.kicker).toUpperCase(), ctx.sub, ks, P.hiOnPrimary, ks * 0.08);
    const main = card.gotv ? `${ctx.L("en", "return")}. ${ctx.L("en", "vote_by", { date: U.fmtDate(ctx.dates.election_day, "en", "long") })}.` : card.text || "";
    const lockH = Math.min(w, h) * 0.22, availH = bottom - lockH - (top + ks * 3.4) - m * 0.5;
    let size = Math.min(w, h) * (w / h > 1.5 ? 0.19 : 0.13);
    while (size > 14) {
      const lines = ctx.head.wrap(main, size, w - 2 * m);
      if (lines.length * size * 1.05 <= availH && lines.every((l) => ctx.head.width(l, size) <= w - 2 * m)) break;
      size -= 2;
    }
    d.fitted("text", m, top + ks * 3.4, w - 2 * m, main, ctx.head, size, P.onPrimary, { maxLines: 6, leading: 1.05 });
    if (card.source) d.text("text", m, bottom - lockH - ks * 0.5, `Source: ${card.source}`, ctx.body, ks * 0.7, P.onPrimary);
    const ly = bottom - lockH + ks * 0.4, name = ctx.cand.full_name.toUpperCase();
    const ns = Math.min(ctx.head.fit(name, (w - 2 * m) * 0.75, lockH * 0.42), lockH * 0.42), os = ns * 0.42;
    d.text("text", m, ly + ctx.head.cap(ns), name, ctx.head, ns, P.onPrimary);
    d.text("text", m, ly + ctx.head.cap(ns) + os * 1.7, ctx.tr("en").office_line.toUpperCase(), ctx.sub, os, P.hiOnPrimary, os * 0.06);
    d.text("text", m, ly + ctx.head.cap(ns) + os * 3.4, ctx.domain, ctx.body, os * 0.9, P.onPrimary);
    const dy = safe[1] === 0 ? h - m * 0.45 : bottom + ks * 1.6;
    d.text("disclaimer", w - m, dy, ctx.tr("en").disclaimer, ctx.body, Math.max(10, Math.min(w, h) * 0.018), P.onPrimary, "end");
    return d;
  }

  function markLogo(d, ctx, x, y, s, bg, fg, bar) {
    d.rect("art", x, y, s, s, bg, { rx: s * 0.14 });
    const ini = (ctx.cand.first_name[0] || "") + (ctx.cand.last_name[0] || "");
    const fsz = ctx.head.fit(ini, s * 0.74, s * 0.62);
    d.text("text", x + s / 2, y + s * 0.5 + ctx.head.cap(fsz) / 2 - s * 0.04, ini, ctx.head, fsz, fg, "middle");
    d.rect("art", x + s * 0.2, y + s * 0.78, s * 0.6, s * 0.06, bar, { rx: s * 0.03 });
  }

  function banner(ctx, fmt, w, h, slogan) {
    const P = ctx.P, d = new Doc(w, h, { unit: "px", title: `Ad ${fmt}` });
    d.rect("background", 0, 0, w, h, P.primary);
    const name = ctx.cand.full_name.toUpperCase(), office = ctx.tr("en").office_line.toUpperCase(), btn = ctx.L("en", "learn");
    if (h <= 100) {
      const pad = h * 0.14, bw = w > 400 ? ctx.sub.width(btn, h * 0.24) + h * 0.5 : 0;
      const ns = ctx.head.fit(name, (w - bw) * (w > 400 ? 0.42 : 0.95), h * 0.42);
      d.text("text", pad, h * 0.52 + (w > 400 ? 0 : -h * 0.05), name, ctx.head, ns, P.onPrimary);
      const os = Math.min(h * 0.2, ctx.sub.fit(office, (w - bw) * 0.4, h * 0.2));
      d.text("text", pad, h * 0.52 + os * 1.4, office, ctx.sub, os, P.hiOnPrimary);
      if (w > 400) {
        const sx = pad + (w - bw) * 0.45, ss = ctx.sub.fit(slogan, w - bw - sx - pad * 2, h * 0.3);
        d.text("text", sx, h / 2 + ctx.sub.cap(ss) / 2, slogan, ctx.sub, ss, P.onPrimary);
        d.rect("art", w - bw - pad, h * 0.25, bw, h * 0.5, P.secondary, { rx: 4 });
        d.text("text", w - bw / 2 - pad, h / 2 + ctx.sub.cap(h * 0.24) / 2, btn, ctx.sub, h * 0.24, P.onSecondary, "middle");
      }
    } else if (w <= 200) {
      const m = 14;
      markLogo(d, ctx, m, m, w - 2 * m, P.onPrimary, P.primary, P.secondary);
      const nl = nameLockup(d, ctx, m, w + 10, w - 2 * m, { lastMax: 40 });
      d.fitted("text", m, nl.y + 30, w - 2 * m, slogan, ctx.sub, 22, P.onPrimary, { maxLines: 5 });
      d.rect("art", m, h - 70, w - 2 * m, 40, P.secondary, { rx: 4 });
      d.text("text", w / 2, h - 44, btn, ctx.sub, 15, P.onSecondary, "middle");
    } else {
      const m = Math.min(w, h) * 0.08;
      if (fmt === "facebook-cover") {
        const sl = (w - 1200) / 2;
        d.rect("proof-only", sl, 0, 1200, h, null, { stroke: "#EC008C", sw: 2, dash: "10 6" });
        nameLockup(d, ctx, sl + 40, h * 0.18, 620, { lastMax: 150 });
        d.fitted("text", sl + 700, h * 0.32, 460, slogan, ctx.sub, 64, P.hiOnPrimary, { maxLines: 3 });
      } else {
        const nl = nameLockup(d, ctx, m, m, w - 2 * m, { lastMax: h * 0.2 });
        d.fitted("text", m, nl.y + m * 0.6, w - 2 * m, slogan, ctx.sub, h * 0.11, P.onPrimary, { maxLines: 2 });
        const bs = Math.max(11, h * 0.045), bw = ctx.sub.width(btn, bs) + bs * 2;
        d.rect("art", m, h - m - bs * 2.4, bw, bs * 2.2, P.secondary, { rx: 4 });
        d.text("text", m + bw / 2, h - m - bs * 0.9, btn, ctx.sub, bs, P.onSecondary, "middle");
      }
    }
    return d;
  }

  R.social = (st, ctx) => {
    ctx = ctx || R.context(st);
    const out = [];
    R.socialCards(st).forEach((card) => Object.entries(R.SOCIAL).forEach(([fmt, f]) => {
      out.push({ id: `social-${card.id}-${fmt}`, group: "Social", card: card.id, fmt, use: f.use, w: f.w, h: f.h, doc: socialCard(ctx, card, fmt, f.w, f.h, f.safe) });
    }));
    const slogan = R.slogans(st.cfg).primary;
    Object.entries(R.ADS).forEach(([fmt, f]) => out.push({ id: fmt, group: "Ads", fmt, use: f.use, w: f.w, h: f.h, doc: banner(ctx, fmt, f.w, f.h, slogan) }));
    return out;
  };

  /* -------------------------------------------------------------- font CSS */
  // Standalone SVG files and PNG/PDF exports carry their fonts inside them.
  R.fontCSS = (ctx) => {
    const specs = [ctx.tp.head, ctx.tp.sub, ctx.tp.body, { family: ctx.tp.body.family, weight: ctx.bodyB.weight }, { family: "Public Sans", weight: 400 }, { family: "Public Sans", weight: 700 }, { family: "Public Sans", weight: 900 }];
    const css = [];
    const seen = new Set();
    for (const s of specs) {
      const file = (R.FONT_FILES[s.family] || {})[s.weight];
      if (!file || seen.has(file)) continue;
      seen.add(file);
      css.push(`@font-face{font-family:'${s.family}';font-weight:${s.weight};src:url(data:font/woff2;base64,${root.CIB_FONTS[file]}) format('woff2');}`);
    }
    return css.join("");
  };
})(typeof window !== "undefined" ? window : globalThis);
