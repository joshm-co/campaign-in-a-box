/* Campaign-in-a-Box app — files the candidate takes away.
 * PDFs for the printer, PNGs for social, the website folder, emails, the plan,
 * and backup files. Everything is made on this device; nothing is uploaded.
 * MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const U = CIB.util, S = CIB.strategy, R = CIB.render, K = CIB.color, M = CIB.message;
  const O = (CIB.out = {});
  const enc = new TextEncoder();
  const PT = 72;

  /* ------------------------------------------------------------- downloads */
  O.download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  // Uses the device's own share sheet (email, text, AirDrop) when it can share files; otherwise downloads.
  O.share = async (blob, name, title) => {
    try {
      const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || name });
        return "shared";
      }
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
    O.download(blob, name);
    return "downloaded";
  };
  O.canShareFiles = () => {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.txt", { type: "text/plain" })] })); }
    catch (e) { return false; }
  };

  /* --------------------------------------------------------------------- zip */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // Store-only zip (files are already compressed: PDF, PNG, woff2). Works with every unzip tool.
  O.zip = (files) => {
    const parts = [], central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true);
      c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const csize = central.reduce((s, p) => s + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
  };

  /* ---------------------------------------------------- SVG → image → PDF */
  O.svgFile = (doc, ctx, proof) => doc.svg({ proof, fontCSS: R.fontCSS(ctx) });

  O.rasterize = (svg, wPx, hPx, type = "image/png", quality = 0.92) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const draw = () => {
        const cv = document.createElement("canvas");
        cv.width = wPx; cv.height = hPx;
        const g = cv.getContext("2d");
        g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, wPx, hPx);
        g.drawImage(img, 0, 0, wPx, hPx);
        cv.toBlob((b) => { URL.revokeObjectURL(url); cv.width = cv.height = 0; b ? resolve(b) : reject(new Error("Could not make the image")); }, type, quality);
      };
      setTimeout(draw, 60); // Safari needs a moment before fonts inside an SVG image are ready.
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not draw the piece")); };
    img.src = url;
  });

  // A print PDF: one page per side, each a full-bleed image at print resolution, with TrimBox and BleedBox set.
  O.pdfFromJpegs = (pages) => {
    const chunks = [], offsets = [];
    let pos = 0;
    const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); pos += b.length; };
    const objStart = (n) => { offsets[n] = pos; push(`${n} 0 obj\n`); };
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const n = pages.length;
    const pageIds = pages.map((_, i) => 3 + i * 3);
    objStart(1); push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objStart(2); push(`<< /Type /Pages /Kids [${pageIds.map((id) => id + " 0 R").join(" ")}] /Count ${n} >>\nendobj\n`);
    pages.forEach((p, i) => {
      const id = pageIds[i], W = p.wPt, H = p.hPt, b = p.bleedPt;
      objStart(id);
      push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /BleedBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /TrimBox [${b.toFixed(2)} ${b.toFixed(2)} ${(W - b).toFixed(2)} ${(H - b).toFixed(2)}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>\nendobj\n`);
      const content = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q`;
      objStart(id + 1); push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
      objStart(id + 2);
      push(`<< /Type /XObject /Subtype /Image /Width ${p.wPx} /Height ${p.hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg); push("\nendstream\nendobj\n");
    });
    const total = 3 + n * 3;
    const xref = pos;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    push(x); push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: "application/pdf" });
  };

  // Render a print piece (all sides) as a PDF. proof = magenta guides, ⚖️ notes and a PROOF stamp.
  O.piecePdf = async (rendered, ctx, proof) => {
    const T = R.TYPES[rendered.piece.type];
    const dpi = proof ? Math.min(T.dpi, 150) : T.dpi;
    const pages = [];
    for (const pg of rendered.pages) {
      const d = pg.doc, W = d.w + 2 * d.b, H = d.h + 2 * d.b;
      const wPx = Math.round((W / PT) * dpi), hPx = Math.round((H / PT) * dpi);
      const blob = await O.rasterize(O.svgFile(d, ctx, proof), wPx, hPx, "image/jpeg", proof ? 0.85 : 0.93);
      pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), wPx, hPx, wPt: W, hPt: H, bleedPt: d.b });
    }
    return O.pdfFromJpegs(pages);
  };

  O.png = async (doc, ctx, proof) => O.rasterize(O.svgFile(doc, ctx, proof), Math.round(doc.w), Math.round(doc.h), "image/png");

  /* --------------------------------------------------------------- CSV */
  const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  O.csv = (rows, cols) => [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";

  /* ------------------------------------------------------------- the plan */
  O.planMarkdown = (st) => {
    const cfg = st.cfg, c = cfg.candidate, res = S.result(st), s = res.summary, g = S.groups(res.rows);
    const L = [];
    L.push(`# ${c.full_name || "Your campaign"} — ${c.office}${c.district ? ", " + c.district : ""}`, "");
    L.push(`Made with Campaign-in-a-Box on ${U.fmtDate(U.today(), "en", "long")}. A planning aid, not a prediction. ⚖️ = set by state or local law — confirm with your election office.`, "");
    L.push("## Win number", "");
    if (s) {
      L.push(`- **To win, aim for about ${U.int(s.winNumber)} votes.**`);
      L.push(`- About ${U.int(s.raceVotes)} people will vote in this race (registered ${U.int(s.registered)} × turnout ${U.pct(s.turnoutUsed, 1)} × ${U.pct(s.rolloff, 1)} who vote in this race).`);
      L.push(`- Half plus one is ${U.int(s.votesToWin)}; the cushion is ${U.pct(s.margin)}.`);
      if (s.expectedBase != null) L.push(`- Votes a candidate like you usually gets here (an estimate from past results, not supporters you've found): ~${U.int(s.expectedBase)}. ${s.gap > 0 ? `About ${U.int(s.gap)} more to win.` : `About ${U.int(-s.gap)} over the win number.`}`);
      L.push(`- How the race is won: ${S.RACE_TYPES[st.strategy.raceType].label} ⚖️. ${S.RACE_TYPES[st.strategy.raceType].note}`);
      if (st.strategy.precinctSource === "unofficial") L.push("- ⚠️ These numbers come from the county's unofficial results. Replace them with the official numbers when the county sends them.");
    } else L.push("Not worked out yet — add your numbers in the app.");
    L.push("", "## Where to spend your Saturdays", "");
    [["Persuade", "Close races — knock doors and persuade"], ["Turn Out", "Friendly but low turnout — make sure supporters vote"], ["Base - Light Touch", "Friendly and they already vote — a light touch"], ["Skip", "Hard to win — skip for now"]].forEach(([k, d]) => {
      if (g[k].length) L.push(`- **${k}** (${d}): ${g[k].map((r) => r.precinct).join(", ")}`);
    });
    L.push("", "## Message", "", `> ${cfg.message_box.core_message || "—"}`, "");
    Object.entries(M.QUADS).forEach(([q, info]) => {
      const mb = cfg.message_box;
      const items = q === "Q1" ? mb.q1 : q === "Q2" ? (mb.q2 || []).map((x) => `${x.text} (Source: ${x.source || "MISSING"})`) : q === "Q3" ? (mb.q3_responses || []).map((x) => `“${x.attack}” → ${x.response}`) : mb.q4 || [];
      L.push(`**${info.name}** — ${info.long}`);
      (items || []).filter(Boolean).forEach((i) => L.push(`- ${i}`));
      L.push("");
    });
    L.push("## Slogans", "");
    (cfg.slogans || []).forEach((sl) => L.push(`- ${sl.text} — *${M.quadLabel(sl.quadrants)}*${sl.role === "primary" ? " (main)" : ""}`));
    L.push("", "## Calendar", "");
    S.calendar(cfg).forEach((m) => L.push(`- ${U.fmtDate(m.date, "en", "long")}: ${m.label}${m.law ? " ⚖️" : ""}`));
    L.push("", "### When to order", "");
    S.production(cfg).forEach((p) => L.push(`- Start by ${U.fmtDate(p.startBy, "en", "long")}: ${p.label} (needed ${U.fmtDate(p.ready)})`));
    const b = S.budget(st, res);
    if (b.likely) {
      L.push("", `## Budget (likely: ${U.money(b.likely)})`, "");
      b.lines.forEach((l) => L.push(`- ${l.key}: ${U.money(l.amount)} (${U.pct(l.share)}) — ${l.covers}`));
      L.push(`- Buys about ${U.int(b.buys.mailPieces)} mail pieces, ${U.int(b.buys.signs)} yard signs, ${U.int(b.buys.printed)} palm cards or door hangers.`);
    }
    L.push("", "---", "⚖️ This kit is not legal advice. Contribution limits, disclaimers, dates and sign rules vary by state.");
    return L.join("\n") + "\n";
  };

  O.targetingCsv = (st) => O.csv(S.result(st).rows.map((r) => ({ ...r, avg_turnout: r.avg_turnout.toFixed(3), avg_support: r.avg_support.toFixed(3),
    projected_race_voters: Math.round(r.projected_race_voters), projected_baseline_votes: Math.round(r.projected_baseline_votes),
    priority_score: Math.round(r.priority_score), flags: r.flags.join("; ") })),
  ["precinct", "category", "rank_in_category", "registered_now", "avg_turnout", "avg_support", "projected_race_voters", "projected_baseline_votes", "priority_score", "flags"]);

  O.calendarCsv = (st) => {
    const rows = S.calendar(st.cfg).map((m) => ({ date: m.date, what: m.label, law: m.law ? "⚖️ confirm" : "", note: m.note || "" }))
      .concat(S.production(st.cfg).map((p) => ({ date: p.startBy, what: `Start: ${p.label} (needed ${p.ready})`, law: "", note: p.note || "" })))
      .concat(O.emails(st).rows.filter((r) => r.send_date).map((r) => ({ date: r.send_date, what: `Email: ${r.subject}`, law: "", note: r.segment })));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return O.csv(rows, ["date", "what", "law", "note"]);
  };

  // Every piece traced back to the message box, the targets and the calendar (Step 2 traceability.csv).
  O.traceability = (st) => {
    const prod = Object.fromEntries(S.production(st.cfg).map((p) => [p.id, p]));
    const D = S.dates(st.cfg);
    return O.csv(R.activePieces(st).map((p) => {
      const ready = D[p.anchor] ? U.addDays(D[p.anchor], p.in_hand_offset || 0) : "";
      return { piece: p.id, type: p.type, lang: p.lang, quadrants: (p.quadrants || []).join(" "), message_parts: M.quadLabel(p.quadrants),
        targets: (p.targets || []).join(" + "), anchor: p.anchor, in_hand: ready, start_by: ready ? U.addDays(ready, -(p.lead_days || 0)) : "",
        budget_line: p.budget, utm_campaign: (p.utm || {}).campaign || "" };
    }), ["piece", "type", "lang", "quadrants", "message_parts", "targets", "anchor", "in_hand", "start_by", "budget_line", "utm_campaign"]);
  };
  O.utmPlan = (st) => {
    const base = st.cfg.web.base_url || "https://yourname.example";
    return O.csv(R.activePieces(st).filter((p) => p.utm).map((p) => ({ piece: p.id, url: R.utmUrl(base, p.qr_path, p.utm), utm_source: p.utm.source, utm_medium: p.utm.medium, utm_campaign: p.utm.campaign })),
      ["piece", "url", "utm_source", "utm_medium", "utm_campaign"]);
  };

  /* ---------------------------------------------------------------- emails */
  const TOKENS = {
    listmonk: { first_name: "{{ .Subscriber.FirstName }}", unsubscribe: "{{ UnsubscribeURL }}", view_online: "{{ MessageURL }}" },
    mautic: { first_name: "{contactfield=firstname|friend}", unsubscribe: "{unsubscribe_url}", view_online: "{webview_url}" },
    preview: { first_name: "Sam", unsubscribe: "#", view_online: "#" }
  };
  const parseMessage = (raw) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta = {};
    m[1].split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    return { meta, body: m[2] };
  };
  const mdInline = (s) => U.esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:{link};">$1</a>');
  const mdToEmail = (body, P) => {
    const out = [], lst = [];
    const flush = () => { if (lst.length) { out.push('<ul style="margin:0 0 16px 20px;padding:0;">' + lst.map((i) => `<li style="margin:0 0 6px 0;">${mdInline(i)}</li>`).join("") + "</ul>"); lst.length = 0; } };
    body.trim().split(/\n\s*\n/).forEach((block) => {
      const lines = block.trim().split("\n");
      if (lines.every((l) => l.startsWith("- "))) { lst.push(...lines.map((l) => l.slice(2))); return; }
      flush();
      const b = block.trim(), mb = b.match(/^\[\[button:\s*(.+?)\s*\|\s*(.+?)\s*\]\]$/);
      if (mb) out.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;"><tr><td style="background:${P.accent};border-radius:6px;"><a href="${U.esc(mb[2])}" style="display:inline-block;padding:14px 26px;color:${P.paper};font-weight:700;text-decoration:none;font-family:Arial,sans-serif;font-size:17px;">${U.esc(mb[1])}</a></td></tr></table>`);
      else if (b.startsWith("> ")) out.push(`<p style="margin:0 0 18px 0;padding:14px 18px;background:${P.tint};border-left:5px solid ${P.secondary};font-size:18px;line-height:1.45;">${mdInline(b.slice(2))}</p>`);
      else if (b.startsWith("## ")) { out.push(`<h2 style="margin:8px 0 6px 0;font-size:20px;color:${P.primary};font-family:Arial,sans-serif;">${mdInline(lines[0].slice(3))}</h2>`); if (lines.length > 1) out.push(`<p style="margin:0 0 16px 0;">${mdInline(lines.slice(1).join(" "))}</p>`); }
      else out.push(`<p style="margin:0 0 16px 0;">${mdInline(lines.join(" "))}</p>`);
    });
    flush();
    return out.join("\n").replace(/\{link\}/g, P.primary);
  };
  const emailShell = (ctx, inner, preheader, platform, lang) => {
    const P = ctx.P, t = ctx.tr(lang), tok = TOKENS[platform];
    const unsub = lang === "es" ? "Cancelar suscripción" : "Unsubscribe";
    return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${U.esc(ctx.cand.full_name)}</title></head>
<body style="margin:0;padding:0;background:${P.tint};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${U.esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${P.tint};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${P.paper};border-radius:8px;overflow:hidden;">
<tr><td style="background:${P.primary};padding:22px 28px;font-family:Arial,sans-serif;">
<div style="color:${P.onPrimary};font-size:13px;letter-spacing:2px;font-weight:700;">${U.esc(ctx.cand.first_name.toUpperCase())}</div>
<div style="color:${P.onPrimary};font-size:32px;font-weight:900;line-height:1.05;">${U.esc(ctx.cand.last_name.toUpperCase())}</div>
<div style="color:${P.hiOnPrimary};font-size:12px;letter-spacing:1px;font-weight:700;margin-top:4px;">${U.esc(t.office_line.toUpperCase())}</div>
</td></tr>
<tr><td style="padding:28px;font-family:Georgia,'Source Serif 4',serif;font-size:17px;line-height:1.55;color:${P.ink};">
${inner}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${P.tint};font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:${P.ink};">
<div style="border:1px solid ${P.ink};padding:6px 8px;display:inline-block;">${U.esc(t.disclaimer)}</div><br>
${U.esc(ctx.cfg.web.mailing_address || ctx.cfg.disclaimer.address_line || "")}<br>
<a href="${tok.unsubscribe}" style="color:${P.primary};">${unsub}</a> · <a href="${tok.view_online}" style="color:${P.primary};">View online</a>
</td></tr></table></td></tr></table></body></html>
`;
  };
  const fill = (text, ctx, platform, lang) => {
    const cfg = U.clone(ctx.cfg);
    cfg.candidate = { ...cfg.candidate, ...ctx.cand };
    cfg.web = { ...cfg.web, base_url: ctx.base, donate_url: ctx.base + "/donate/", volunteer_url: ctx.base + "/volunteer/" };
    cfg.message_box = { ...cfg.message_box, q1: (cfg.message_box.q1 || []).filter(Boolean), q2: (cfg.message_box.q2 || []).filter((q) => q.text),
      q3_responses: (cfg.message_box.q3_responses || []).filter((q) => q.attack), issues: ctx.tr("en").issues };
    const data = { cfg, t: ctx.tr(lang), date: Object.fromEntries(Object.entries(ctx.dates).map(([k, v]) => [k, U.fmtDate(v, lang, "long")])) };
    const missing = [];
    const out = text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (all, key) => {
      if (TOKENS[platform][key] != null) return TOKENS[platform][key];
      const v = U.get(data, key);
      if (v == null || v === "") { missing.push(key); return `[${key.split(".").pop().replace(/_/g, " ")}]`; }
      return String(v);
    });
    return { text: out, missing };
  };
  O.emails = (st, ctx) => {
    ctx = ctx || R.context(st);
    const C = root.CIB_CONTENT || {}, rows = [], messages = [];
    Object.entries(C.emails || {}).forEach(([name, raw]) => {
      const { meta, body } = parseMessage(raw);
      const lang = name.endsWith("-es") ? "es" : meta.lang || "en";
      if (lang === "es" && st.cfg.language.secondary !== "es") return;
      const render = (platform) => {
        const subj = fill(meta.subject, ctx, platform, lang), pre = fill(meta.preheader || "", ctx, platform, lang), b = fill(body, ctx, platform, lang);
        const inner = mdToEmail(b.text, ctx.P);
        return { subject: subj.text, preheader: pre.text, inner, html: emailShell(ctx, inner, pre.text, platform, lang), missing: [...new Set([...subj.missing, ...b.missing])] };
      };
      const anchor = meta.anchor || "signup", off = parseInt(meta.offset_days || "0", 10);
      const send = ctx.dates[anchor] ? U.addDays(ctx.dates[anchor], off) : "";
      const preview = render("preview");
      const row = { file: name, sequence: meta.sequence, step: meta.step, lang, trigger: meta.trigger || "", anchor, offset_days: off, send_date: send,
        segment: meta.segment || "", quadrants: meta.quadrants || "", subject: render("listmonk").subject };
      rows.push(row);
      messages.push({ ...row, preview, render });
    });
    const order = { welcome: 0, volunteer: 1, donate: 2, gotv: 3 };
    const sortFn = (a, b) => (order[a.sequence] - order[b.sequence]) || String(a.step).localeCompare(String(b.step), "en", { numeric: true }) || a.lang.localeCompare(b.lang);
    rows.sort(sortFn); messages.sort(sortFn);
    return { rows, messages, csv: () => O.csv(rows, Object.keys(rows[0] || { file: 1 })) };
  };
  O.emailFiles = (st, ctx) => {
    ctx = ctx || R.context(st);
    const E = O.emails(st, ctx), files = [];
    E.messages.forEach((m) => {
      files.push({ name: `email/listmonk/${m.file}.html`, data: m.render("listmonk").inner });
      files.push({ name: `email/mautic/${m.file}.html`, data: m.render("mautic").html });
    });
    files.push({ name: "email/listmonk/_listmonk-template.html", data: emailShell(ctx, '{{ template "content" . }}', "", "listmonk", "en") });
    files.push({ name: "email/sequences.csv", data: E.csv() });
    files.push({ name: "email/README.txt", data: EMAIL_README });
    return files;
  };
  const EMAIL_README = `Campaign emails
================
sequences.csv lists every email: what starts it, who gets it, and the date to send it.

listmonk (free, open source, you host it):
  1. Settings → Templates → New → paste listmonk/_listmonk-template.html.
  2. For each row in sequences.csv, create a campaign, pick that template, paste the matching listmonk/*.html body,
     set the subject from the CSV, choose the list/segment, and schedule it for send_date.
  3. "signup" emails (welcome, volunteer) have no fixed date: send them to new subscribers each week, or use Mautic for automatic drips.

Mautic (free, open source): Channels → Emails → New → "Code mode", paste mautic/*.html (complete pages), then build a
Campaign with the timing in sequences.csv.

Before you send anything: set up SPF, DKIM and DMARC for your sending domain (your email provider's help pages explain
how), and send a test to Gmail, Outlook and Apple Mail. ⚖️ Email disclaimer rules vary by state.
`;

  /* ---------------------------------------------------------------- website */
  const UI = {
    en: { skip: "Skip to main content", nav_issues: "Priorities", nav_about: "About", nav_vote: "Vote", nav_volunteer: "Volunteer", nav_donate: "Donate",
      other_lang: "Español", other_code: "es", meet: "Meet", priorities: "Priorities", read_plan: "Read the plan", get_involved: "Get involved",
      volunteer_title: "Volunteer", volunteer_lede: "Give one Saturday morning. We train you, pair you with a partner, and hand you everything you need.",
      name: "Your name", email: "Email address", interests: "I can help with", doors: "Knocking doors", phones: "Phone calls and texts", sign: "Hosting a yard sign",
      updates: "Email updates only", submit: "Sign me up", signup_link: "Sign up to volunteer", email_us: "Email us to help",
      privacy_note: "We'll only use your email for campaign updates. Unsubscribe any time.", privacy: "Privacy",
      donate_title: "Donate", donate_lede: "Small gifts pay for the door hangers, mailers and yard signs that reach your neighbors.", donate_button: "Donate securely",
      donate_soon: "Online giving is coming soon. To give now, email us.",
      donate_law: "Contributions are not tax deductible. State law may require us to collect your name, address, employer and occupation, and may limit how much you can give.",
      vote_title: "How to vote", vote_lede: "Everything you need to vote in this election. Always confirm with your election office.", register_by: "Register to vote by",
      ballots_out: "Ballots mailed", early: "Early voting begins", eday: "Election Day", polls_close: "Polls close at", official: "Official voting information",
      office: "Election office", placeholder: "Dates are set by law. Confirm every date with your election office before relying on it.", ballot_line: "On your ballot, look for",
      record: "The record", source: "Source", you_may_hear: "You may hear", notfound: "Page not found", back_home: "Back to the home page", photo: "Photo of", why: "Why {first} is running" },
    es: { skip: "Saltar al contenido principal", nav_issues: "Prioridades", nav_about: "Conózcalo", nav_vote: "Votar", nav_volunteer: "Ayude", nav_donate: "Done",
      other_lang: "English", other_code: "en", meet: "Conozca a", priorities: "Prioridades", read_plan: "Lea el plan", get_involved: "Participe",
      volunteer_title: "Sea voluntario", volunteer_lede: "Regale un sábado por la mañana. Le capacitamos, le asignamos un compañero y le damos todo lo necesario.",
      name: "Su nombre", email: "Correo electrónico", interests: "Puedo ayudar con", doors: "Tocar puertas", phones: "Llamadas y mensajes", sign: "Poner un letrero en mi jardín",
      updates: "Solo recibir noticias", submit: "Inscribirme", signup_link: "Inscríbase como voluntario", email_us: "Escríbanos para ayudar",
      privacy_note: "Solo usaremos su correo para noticias de la campaña. Puede cancelar en cualquier momento.", privacy: "Privacidad",
      vote_title: "Cómo votar", vote_lede: "Todo lo que necesita para votar en esta elección. Confirme siempre con la oficina electoral.", register_by: "Inscríbase para votar antes del",
      ballots_out: "Se envían las boletas", early: "Comienza la votación anticipada", eday: "Día de las elecciones", polls_close: "Las casillas cierran a las",
      official: "Información oficial para votar", office: "Oficina electoral", placeholder: "Las fechas las fija la ley. Confírmelas con la oficina electoral.",
      ballot_line: "En su boleta, busque a", photo: "Foto de" }
  };

  O.siteCss = (ctx) => {
    const p = ctx.P, ty = ctx.tp;
    const fonts = [ty.head, ty.sub, ty.body, { family: ty.body.family, weight: ctx.bodyB.weight }]
      .filter((f, i, a) => a.findIndex((g) => g.family === f.family && g.weight === f.weight) === i)
      .map((f) => ({ ...f, file: (R.FONT_FILES[f.family] || {})[f.weight] })).filter((f) => f.file);
    return { fonts, css: `${fonts.map((f) => `@font-face { font-family: "${f.family}"; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url("../fonts/${f.file}") format("woff2"); }`).join("\n")}
:root {
  --primary: ${p.primary}; --secondary: ${p.secondary}; --accent: ${p.accent}; --ink: ${p.ink}; --paper: ${p.paper}; --tint: ${p.tint};
  --on-primary: ${p.onPrimary}; --hi-on-primary: ${p.hiOnPrimary}; --on-secondary: ${p.onSecondary};
  --head: "${ty.head.family}", ${ty.head.fallback}; --head-w: ${ty.head.weight};
  --sub: "${ty.sub.family}", ${ty.sub.fallback}; --sub-w: ${ty.sub.weight};
  --body: "${ty.body.family}", ${ty.body.fallback};
  --max: 68rem; --measure: 38rem;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 1.125rem/1.6 var(--body); }
img { max-width: 100%; height: auto; }
a { color: var(--primary); text-underline-offset: 0.15em; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.wrap { max-width: var(--max); margin: 0 auto; padding: 0 1rem; }
.skip { position: absolute; left: -999px; top: 0; background: var(--secondary); color: var(--on-secondary); padding: .75rem 1rem; z-index: 10; font-weight: 700; }
.skip:focus { left: 1rem; }
h1, h2, h3 { font-family: var(--sub); font-weight: var(--sub-w); line-height: 1.15; color: var(--primary); margin: 0 0 .5em; }
h1 { font-family: var(--head); font-weight: var(--head-w); font-size: clamp(2.2rem, 6vw, 3.6rem); letter-spacing: -0.01em; }
h2 { font-size: clamp(1.5rem, 3.5vw, 2.1rem); }
h3 { font-size: 1.3rem; }
p, ul, ol { max-width: var(--measure); }
.site-header { background: var(--primary); color: var(--on-primary); }
.header-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem 1.5rem; padding-top: .9rem; padding-bottom: .9rem; }
.brand { color: var(--on-primary); text-decoration: none; display: grid; line-height: 1; }
.brand-first { font: var(--sub-w) .85rem/1 var(--sub); letter-spacing: .12em; }
.brand-last { font: var(--head-w) 2rem/1 var(--head); }
.brand-office { font: var(--sub-w) .7rem/1.4 var(--sub); letter-spacing: .08em; color: var(--hi-on-primary); }
nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .25rem 1.1rem; align-items: center; }
nav a { color: var(--on-primary); font: var(--sub-w) 1rem/1 var(--sub); text-decoration: none; padding: .6rem 0; display: inline-block; }
nav a[aria-current="page"] { box-shadow: inset 0 -3px var(--secondary); }
.btn { display: inline-block; background: var(--accent); color: var(--paper) !important; font: var(--sub-w) 1.1rem/1 var(--sub); padding: .95rem 1.4rem; border-radius: .4rem; text-decoration: none; border: 0; cursor: pointer; min-height: 44px; }
.btn:hover { filter: brightness(1.1); }
.btn-small { padding: .6rem .9rem !important; }
.btn-alt { background: var(--secondary); color: var(--on-secondary) !important; }
.hero { background: var(--primary); color: var(--on-primary); padding: 2.5rem 0 3rem; border-top: 1px solid rgba(255,255,255,.15); }
.hero h1 { color: var(--on-primary); max-width: 18ch; }
.hero .core { font-size: 1.3rem; max-width: 40rem; }
.hero .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
.photo { background: var(--tint); color: var(--primary); display: grid; place-items: center; aspect-ratio: 4/5; font: var(--sub-w) 1rem var(--sub); border-radius: .5rem; overflow: hidden; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.split { display: grid; gap: 2rem; grid-template-columns: 1fr; align-items: center; }
@media (min-width: 52rem) { .split { grid-template-columns: 3fr 2fr; } }
section { padding: 2.5rem 0; }
.band { background: var(--tint); }
.kicker { font: var(--sub-w) .85rem/1 var(--sub); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin-bottom: .75rem; }
.hero .kicker { color: var(--hi-on-primary); }
.cards { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); padding: 0; list-style: none; max-width: none; }
.cards li { background: var(--paper); border-top: 4px solid var(--secondary); padding: 1.25rem; border-radius: .25rem; }
.dates { border-collapse: collapse; width: 100%; max-width: var(--measure); }
.dates th, .dates td { text-align: left; padding: .7rem .5rem; border-bottom: 1px solid var(--tint); }
.dates td { font-weight: 700; }
.note { border-left: 4px solid var(--accent); background: var(--tint); padding: .75rem 1rem; max-width: var(--measure); }
form { max-width: 32rem; }
label { display: block; font-weight: 700; margin: 1rem 0 .3rem; }
input[type=text], input[type=email] { width: 100%; font: inherit; padding: .7rem .8rem; border: 2px solid var(--ink); border-radius: .3rem; background: var(--paper); color: var(--ink); }
fieldset { border: 0; padding: 0; margin: 1rem 0; }
legend { font-weight: 700; margin-bottom: .3rem; }
.check { display: flex; gap: .6rem; align-items: center; font-weight: 400; margin: .4rem 0; }
.check input { width: 1.3rem; height: 1.3rem; accent-color: var(--primary); }
.hp { position: absolute; left: -5000px; }
.site-footer { background: var(--ink); color: var(--paper); padding: 1.5rem 0; font-size: .95rem; }
.site-footer a { color: var(--paper); }
.disclaimer { display: inline-block; border: 1px solid var(--paper); padding: .35rem .6rem; font-weight: 700; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
` };
  };

  // Static website: plain HTML with relative links, so it works on any free host (or opened from a folder).
  O.website = (st, ctx, extras = {}) => {
    ctx = ctx || R.context(st);
    const cfg = st.cfg, c = ctx.cand, mb = cfg.message_box, D = ctx.dates, el = cfg.election;
    const hasEs = ctx.spanish && (cfg.language.es || {}).core_message;
    const sl = R.slogans(cfg);
    const T = { en: { ...ctx.tr("en"), slogan: sl.primary }, es: { ...ctx.tr("es"), slogan: (cfg.language.es || {}).slogan || sl.primary } };
    const files = [];
    const forms = cfg.web.forms || {};
    const page = (path, lang, title, body, alt = {}) => {
      const depth = path.split("/").length - 1, up = "../".repeat(depth), u = UI[lang], tt = T[lang];
      const pre = lang === "es" ? "es/" : "";
      const href = (p) => up + p;
      const cur = (p) => (path === p ? ' aria-current="page"' : "");
      const altHref = alt[lang === "en" ? "es" : "en"];
      const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title ? U.esc(title) + " · " : ""}${U.esc(c.full_name)} for ${U.esc(c.office || "office")}</title>
<meta name="description" content="${U.esc(tt.core)}">
<meta property="og:title" content="${U.esc(c.full_name)} — ${U.esc(tt.office_line)}">
<meta property="og:description" content="${U.esc(tt.core)}">
${cfg.web.base_url ? `<meta property="og:image" content="${U.esc(cfg.web.base_url)}/share.png">` : ""}
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${ctx.P.primary}">
<link rel="icon" href="${href("icon.png")}">
<link rel="stylesheet" href="${href("css/site.css")}">
</head>
<body>
<a class="skip" href="#main">${u.skip}</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${href(pre + "index.html")}">
      <span class="brand-first">${U.esc(c.first_name.toUpperCase())}</span>
      <span class="brand-last">${U.esc(c.last_name.toUpperCase())}</span>
      <span class="brand-office">${U.esc(tt.office_line.toUpperCase())}</span>
    </a>
    <nav aria-label="Main">
      <ul>
        <li><a href="${href(pre + "issues/index.html")}"${cur(pre + "issues/index.html")}>${u.nav_issues}</a></li>
        ${lang === "en" ? `<li><a href="${href("about/index.html")}"${cur("about/index.html")}>${u.nav_about}</a></li>` : ""}
        <li><a href="${href(pre + "vote/index.html")}"${cur(pre + "vote/index.html")}>${u.nav_vote}</a></li>
        <li><a href="${href(pre + "volunteer/index.html")}"${cur(pre + "volunteer/index.html")}>${u.nav_volunteer}</a></li>
        <li><a class="btn btn-small" href="${href("donate/index.html")}">${u.nav_donate}</a></li>
        ${hasEs && altHref ? `<li><a href="${href(altHref)}" hreflang="${u.other_code}" lang="${u.other_code}">${u.other_lang}</a></li>` : ""}
      </ul>
    </nav>
  </div>
</header>
<main id="main" tabindex="-1">
${body(u, tt, href, pre)}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p class="disclaimer">${U.esc(tt.disclaimer)}</p>
    <p>${U.esc(cfg.disclaimer.address_line || "")}${cfg.web.email ? ` · <a href="mailto:${U.esc(cfg.web.email)}">${U.esc(cfg.web.email)}</a>` : ""} · <a href="${href("privacy/index.html")}">${u.privacy}</a></p>
  </div>
</footer>
</body>
</html>
`;
      files.push({ name: path, data: html });
    };
    const photo = (href, lang) => st.photo ? `<div class="photo"><img src="${href("photo.jpg")}" alt="${UI[lang].photo} ${U.esc(c.full_name)}" width="800" height="1000"></div>`
      : `<div class="photo" role="img" aria-label="${UI[lang].photo} ${U.esc(c.full_name)}">Candidate photo</div>`;
    const li = (arr) => arr.map((b) => `<li>${U.esc(b)}</li>`).join("");
    const home = (lang) => (u, tt, href, pre) => `<div class="hero">
  <div class="wrap split">
    <div>
      <p class="kicker">${U.esc(c.jurisdiction || "")} ${U.esc(tt.office_line)}</p>
      <h1>${U.esc(tt.slogan)}</h1>
      <p class="core">${U.esc(tt.core)}</p>
      <div class="actions">
        <a class="btn btn-alt" href="${href(pre + "volunteer/index.html")}">${u.nav_volunteer}</a>
        <a class="btn" href="${href("donate/index.html")}">${u.nav_donate}</a>
      </div>
    </div>
    ${photo(href, lang)}
  </div>
</div>
<section><div class="wrap">
  <p class="kicker">${u.meet} ${U.esc(c.first_name)}</p>
  <h2>${U.esc(tt.bio_short)}</h2>
  <ul>${li(tt.bio_points)}</ul>
</div></section>
<section class="band"><div class="wrap">
  <p class="kicker">${u.priorities}</p>
  <ul class="cards">${tt.issues.map((i) => `<li><h3>${U.esc(i.title)}</h3><p>${U.esc(i.short)}</p></li>`).join("")}</ul>
  <p><a href="${href(pre + "issues/index.html")}">${u.read_plan} →</a></p>
</div></section>
<section><div class="wrap">
  <h2>${u.vote_title}</h2>
  <p>${u.eday}: <strong>${U.fmtDate(D.election_day, lang, "long")}</strong>. <a href="${href(pre + "vote/index.html")}">${u.vote_lede}</a></p>
</div></section>`;
    const issues = (lang) => (u, tt, href, pre) => `<section><div class="wrap">
  <h1>${u.priorities}</h1>
  <p class="core">${U.esc(tt.core)}</p>
  ${tt.issues.map((i, n) => `<h2 id="issue-${n + 1}">${U.esc(i.title)}</h2><p>${U.esc(i.detail || i.short)}</p>`).join("\n  ")}
  ${lang === "en" && (mb.q2 || []).some((q) => q.text) ? `<h2>${u.record}</h2><ul>${mb.q2.filter((q) => q.text).map((q) => `<li>${U.esc(q.text)}<br><small>${u.source}: ${U.esc(q.source || "")}</small></li>`).join("")}</ul>` : ""}
  ${lang === "en" && (mb.q3_responses || []).some((q) => q.attack && q.response) ? `<h2>${u.you_may_hear}…</h2>${mb.q3_responses.filter((q) => q.attack && q.response).map((q) => `<h3>“${U.esc(q.attack)}”</h3><p>${U.esc(q.response)}</p>`).join("")}` : ""}
  <p><a class="btn" href="${href(pre + "volunteer/index.html")}">${u.get_involved}</a></p>
</div></section>`;
    const vote = (lang) => (u, tt) => `<section><div class="wrap">
  <h1>${u.vote_title}</h1>
  <p>${u.vote_lede}</p>
  <table class="dates">
    <caption class="kicker" style="text-align:left">${U.esc(c.jurisdiction || "")}</caption>
    ${[[u.ballots_out, D.ballots_out], [u.register_by, D.register_deadline], [u.early, D.early_vote_starts], [u.eday, D.election_day]].filter((r) => r[1])
      .map(([a, b]) => `<tr><th scope="row">${a}</th><td>${U.fmtDate(b, lang, "long")}</td></tr>`).join("\n    ")}
    <tr><th scope="row">${u.polls_close}</th><td>${U.esc(el.polls_close || "")}</td></tr>
  </table>
  <p class="note">${u.placeholder}</p>
  <h2>${u.official}</h2>
  <p>${el.voter_info_url ? `<a href="${U.esc(el.voter_info_url)}">${U.esc(U.domain(el.voter_info_url))}</a><br>` : ""}${el.election_office ? `${u.office}: ${U.esc(el.election_office)}` : ""}${el.election_office_phone ? `, <a href="tel:${U.esc(el.election_office_phone.replace(/[^\d+]/g, ""))}">${U.esc(el.election_office_phone)}</a>` : ""}</p>
  <p>${u.ballot_line} <strong>${U.esc(c.full_name)}</strong> — ${U.esc(tt.office_line)}.</p>
</div></section>`;
    const volunteer = (lang) => (u) => {
      let form;
      if (forms.provider === "listmonk" && forms.listmonk_url && forms.lists && forms.lists.updates) {
        const L = forms.lists;
        form = `<form method="post" action="${U.esc(forms.listmonk_url.replace(/\/+$/, ""))}/subscription/form">
    <input type="hidden" name="nonce" class="hp">
    <label for="name">${u.name}</label><input type="text" id="name" name="name" autocomplete="name" required>
    <label for="email">${u.email}</label><input type="email" id="email" name="email" autocomplete="email" required>
    <fieldset><legend>${u.interests}</legend>
      ${L.volunteer_doors ? `<label class="check"><input type="checkbox" name="l" value="${U.esc(L.volunteer_doors)}"> ${u.doors}</label>` : ""}
      ${L.volunteer_phones ? `<label class="check"><input type="checkbox" name="l" value="${U.esc(L.volunteer_phones)}"> ${u.phones}</label>` : ""}
      ${L.yard_sign ? `<label class="check"><input type="checkbox" name="l" value="${U.esc(L.yard_sign)}"> ${u.sign}</label>` : ""}
      <label class="check"><input type="checkbox" name="l" value="${U.esc(lang === "es" && L.updates_es ? L.updates_es : L.updates)}" checked> ${u.updates}</label>
    </fieldset>
    <button class="btn" type="submit">${u.submit}</button>
    <p><small>${u.privacy_note}</small></p>
  </form>`;
      } else if (cfg.web.volunteer_form_url) {
        form = `<p><a class="btn" href="${U.esc(cfg.web.volunteer_form_url)}">${u.signup_link}</a></p><p><small>${u.privacy_note}</small></p>`;
      } else if (cfg.web.email) {
        const subj = encodeURIComponent(lang === "es" ? "Quiero ayudar" : "I want to help");
        const bod = encodeURIComponent(lang === "es" ? "Puedo ayudar con: tocar puertas / llamadas / un letrero en mi jardín\nNombre:\nTeléfono:" : "I can help with: knocking doors / phone calls / a yard sign\nName:\nPhone:");
        form = `<p><a class="btn" href="mailto:${U.esc(cfg.web.email)}?subject=${subj}&amp;body=${bod}">${u.email_us}</a></p><p>${U.esc(cfg.web.email)}${cfg.web.phone ? " · " + U.esc(cfg.web.phone) : ""}</p>`;
      } else form = `<p class="note">Add a sign-up link or an email address in the app.</p>`;
      return `<section><div class="wrap">
  <h1>${u.volunteer_title}</h1>
  <p>${u.volunteer_lede}</p>
  ${form}
</div></section>`;
    };
    const proc = cfg.web.donate_processor_url;
    const donateHref = proc ? R.utmUrl(proc.replace(/\/+$/, ""), "", { source: "website", medium: "web", campaign: "donate" }).replace(/\/\?/, "?") : "";
    const hasEsFull = hasEs;
    page("index.html", "en", "", home("en"), { es: "es/index.html" });
    page("about/index.html", "en", "About", (u, tt, href) => `<section><div class="wrap split">
  <div>
    <h1>${u.meet} ${U.esc(c.first_name)}</h1>
    <p class="core">${U.esc(tt.bio_short)}</p>
    <ul>${li(tt.bio_points)}</ul>
    <h2>${u.why.replace("{first}", U.esc(c.first_name))}</h2>
    <p>${U.esc(tt.core)}</p>
    <p><a class="btn" href="${href("issues/index.html")}">${u.read_plan}</a></p>
  </div>
  ${photo(href, "en")}
</div></section>`, { es: "es/index.html" });
    page("issues/index.html", "en", "Priorities", issues("en"), { es: "es/issues/index.html" });
    page("vote/index.html", "en", "Vote", vote("en"), { es: "es/vote/index.html" });
    page("volunteer/index.html", "en", "Volunteer", volunteer("en"), { es: "es/volunteer/index.html" });
    page("donate/index.html", "en", "Donate", (u) => `<section><div class="wrap">
  <h1>${u.donate_title}</h1>
  <p class="core">${u.donate_lede}</p>
  <ul>
    <li><strong>$25</strong> prints about 100 door hangers</li>
    <li><strong>$50</strong> mails to about 70 households</li>
    <li><strong>$100</strong> pays for about 10 yard signs</li>
  </ul>
  ${donateHref ? `<p><a class="btn" href="${U.esc(donateHref)}">${u.donate_button}</a></p>` : `<p class="note">${u.donate_soon}${cfg.web.email ? ` <a href="mailto:${U.esc(cfg.web.email)}">${U.esc(cfg.web.email)}</a>` : ""}</p>`}
  <p class="note">${u.donate_law}</p>
</div></section>`, { es: "es/index.html" });
    page("privacy/index.html", "en", "Privacy", () => `<section><div class="wrap">
  <h1>Privacy</h1>
  <p>This site is run by ${U.esc(ctx.tr("en").disclaimer.replace(/^Paid for by /, ""))}.</p>
  <ul>
    <li><strong>What we collect:</strong> the name, email address and interests you give us, and donation details collected by our payment processor.</li>
    <li><strong>Why:</strong> to send campaign updates, organize volunteers, and meet campaign finance reporting rules.</li>
    <li><strong>What we don't do:</strong> sell your information.</li>
    <li><strong>Analytics:</strong> none. This site uses no cookies and no tracking.</li>
    ${cfg.web.email ? `<li><strong>Unsubscribe or delete:</strong> use the link in any email, or write to <a href="mailto:${U.esc(cfg.web.email)}">${U.esc(cfg.web.email)}</a>.</li>` : ""}
  </ul>
  <p class="note">Campaigns: have this reviewed. Donor information may be public under campaign finance law, and some states have privacy laws that apply.</p>
</div></section>`, { es: "es/index.html" });
    page("404.html", "en", "Not found", (u, tt, href) => `<section><div class="wrap"><h1>${u.notfound}</h1><p><a href="${href("index.html")}">${u.back_home}</a></p></div></section>`);
    if (hasEsFull) {
      page("es/index.html", "es", "", home("es"), { en: "index.html" });
      page("es/issues/index.html", "es", "Prioridades", issues("es"), { en: "issues/index.html" });
      page("es/vote/index.html", "es", "Votar", vote("es"), { en: "vote/index.html" });
      page("es/volunteer/index.html", "es", "Ayude", volunteer("es"), { en: "volunteer/index.html" });
    }
    const { css, fonts } = O.siteCss(ctx);
    files.push({ name: "css/site.css", data: css });
    fonts.forEach((f) => files.push({ name: "fonts/" + f.file, data: new Uint8Array(R.fontBytes(f.file)) }));
    if (extras.photo) files.push({ name: "photo.jpg", data: extras.photo });
    if (extras.share) files.push({ name: "share.png", data: extras.share });
    if (extras.icon) files.push({ name: "icon.png", data: extras.icon });
    files.push({ name: "robots.txt", data: "User-agent: *\nAllow: /\n" });
    files.push({ name: "PUBLISH-ME.txt", data: PUBLISH });
    return files;
  };
  const PUBLISH = `How to put this website online (free, about 10 minutes)
=========================================================
This folder is your whole website. It has no database and no tracking.
Campaign-in-a-Box doesn't host it — you publish it on your own free account,
so you stay in control.

EASIEST — Netlify Drop (no software to install)
  1. Go to app.netlify.com/drop and create a free account.
  2. Drag this whole folder onto the page. In a few seconds you get a link.
  3. Site settings → Domain management → add your own domain if you bought one.
  To update later: Deploys → drag the new folder onto the page.

Cloudflare Pages
  1. Create a free Cloudflare account → Workers & Pages → Create → Pages → Upload assets.
  2. Upload this folder. Add your domain under Custom domains.

GitHub Pages
  1. Create a free GitHub account and a new public repository.
  2. "Add file" → "Upload files" → drag everything in this folder → Commit.
  3. Settings → Pages → Deploy from a branch → main / (root) → Save.

Before you share the link
  - ⚖️ Confirm the "Paid for by" wording and the voting dates with your election office.
  - Open every page on your phone. Check the Donate and Volunteer buttons go where you expect.
`;

  /* ------------------------------------------------------------- backups */
  O.backupBlob = (st) => new Blob([JSON.stringify({ kind: "campaign-in-a-box-backup", savedAt: new Date().toISOString(), state: st }, null, 1)], { type: "application/json" });
  O.backupName = (st) => `${U.slug(st.cfg.candidate.full_name || "campaign")}-${U.today()}.campaign.json`;
  O.readBackup = async (file) => {
    const txt = await file.text();
    const j = JSON.parse(txt);
    if (j && j.kind === "campaign-in-a-box-backup" && j.state) return CIB.state.migrate(j.state);
    if (j && j.candidate && j.message_box) { // a campaign.json from the command-line kit
      const st = CIB.state.blank(); Object.assign(st.cfg, j); delete st.cfg._about; return CIB.state.migrate(st);
    }
    throw new Error("This isn't a Campaign-in-a-Box backup file.");
  };

  /* ---------------------------------------------------- photo handling */
  // Shrink a chosen photo to a sensible size so it fits in the device's storage.
  O.loadPhoto = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const max = 1800, s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: cv.toDataURL("image/jpeg", 0.86), w: img.width, h: img.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a photo this browser can open.")); };
    img.src = url;
  });
  O.dataUrlBytes = (u) => { const b = atob(u.split(",")[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
})(typeof window !== "undefined" ? window : globalThis);
