/* Campaign-in-a-Box app — read a results spreadsheet the candidate drops in (Excel .xlsx or CSV).
 * Runs on the device; the file never leaves it. Uses the browser's built-in decompression,
 * so there's no library to load. Understands Utah's "All Results Excel" download
 * (sheet "Precinct Results") and files in the OpenElections layout. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const X = (CIB.xlsx = {});

  const unzip = (buf) => {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eocd = buf.length - 22;
    while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd--;
    if (eocd < 0) throw new Error("That doesn't look like an Excel file.");
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
        el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      files[new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl))] = { method, csize, off };
      p += 46 + nl + el + cl;
    }
    const read = async (name) => {
      const f = files[name];
      if (!f) return null;
      const lnl = dv.getUint16(f.off + 26, true), lel = dv.getUint16(f.off + 28, true);
      const data = buf.subarray(f.off + 30 + lnl + lel, f.off + 30 + lnl + lel + f.csize);
      if (f.method === 0) return new TextDecoder().decode(data);
      if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open Excel files. Save the sheet as CSV and try that.");
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
    };
    return { files, read };
  };

  const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

  // All sheets as arrays of rows (arrays of strings).
  X.readXlsx = async (arrayBuffer) => {
    const { read } = unzip(new Uint8Array(arrayBuffer));
    const wb = await read("xl/workbook.xml"), rels = await read("xl/_rels/workbook.xml.rels");
    if (!wb) throw new Error("That doesn't look like an Excel file.");
    const attr = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="([^"]*)"`)); return m ? m[1] : ""; };
    const target = Object.fromEntries([...(rels || "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id"), attr(m[0], "Target").replace(/^\/?xl\//, "")]));
    const ssXml = await read("xl/sharedStrings.xml");
    const ss = ssXml ? [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))) : [];
    const sheets = [];
    for (const tag of wb.match(/<sheet\b[^>]*>/g) || []) {
      const m = [tag, attr(tag, "name"), attr(tag, "r:id")];
      const xml = await read("xl/" + (target[m[2]] || ""));
      if (!xml) continue;
      const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
        const out = [];
        for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const v = (c[3] || "").match(/<v>([\s\S]*?)<\/v>/) || (c[3] || "").match(/<t[^>]*>([\s\S]*?)<\/t>/);
          out[colIndex(c[1])] = v ? (/t="s"/.test(c[2]) ? ss[+v[1]] : decode(v[1])) : "";
        }
        return Array.from(out, (x) => (x == null ? "" : String(x)));
      });
      sheets.push({ name: decode(m[1]), rows });
    }
    return sheets;
  };

  // Rows (with a header row) → objects in the OpenElections layout: county, precinct, office, district, party, candidate, votes.
  X.toResultRows = (rows) => {
    const head = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
    const col = (...names) => names.map((n) => head.indexOf(n)).find((i) => i >= 0);
    const ip = col("precinct", "ward", "town"), io = col("office", "office name", "contest", "contest name"), ic = col("candidate", "ballot name", "choice", "choice name");
    const iv = col("votes", "total", "total votes", "vote count"), ipty = col("party"), id = col("district"), icty = col("county");
    if ([ip, io, ic, iv].some((i) => i == null)) return null;
    return rows.slice(1).filter((r) => r[ip]).map((r) => {
      const cand = String(r[ic] || "").trim();
      const ballots = /^ballots cast$/i.test(cand);
      return { county: icty != null ? r[icty] : "", precinct: String(r[ip]).trim(), office: ballots ? "Ballots Cast" : String(r[io] || "").trim(),
        district: id != null ? r[id] : "", party: ipty != null ? r[ipty] : "", candidate: ballots ? "" : cand, votes: r[iv] };
    });
  };

  // A dropped-in file → result rows, or a plain-language error.
  X.readResultsFile = async (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || file.type === "text/csv") {
      const rows = CIB.oe.parseCsv(await file.text());
      if (!rows.length) throw new Error("That file is empty.");
      const keys = Object.keys(rows[0]);
      return X.toResultRows([keys, ...rows.map((r) => keys.map((k) => r[k]))]) || (() => { throw new Error("We couldn't find precinct, office, candidate and vote columns in that file."); })();
    }
    if (!name.endsWith(".xlsx")) throw new Error("Use an Excel (.xlsx) or CSV file. Older .xls files: open in Excel or Google Sheets and save as .xlsx or CSV.");
    const sheets = await X.readXlsx(await file.arrayBuffer());
    const order = [...sheets].sort((a, b) => score(b.name) - score(a.name));
    for (const s of order) { const r = X.toResultRows(s.rows); if (r && r.length) return r; }
    throw new Error("We couldn't find a precinct-by-precinct table in that file. Utah's “All Results Excel” download has one on the “Precinct Results” sheet.");
  };
  const score = (n) => (/precinct results$/i.test(n) ? 3 : /precinct/i.test(n) && !/group/i.test(n) ? 2 : /precinct/i.test(n) ? 1 : 0);
})(typeof window !== "undefined" ? window : globalThis);
