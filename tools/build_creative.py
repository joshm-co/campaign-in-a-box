#!/usr/bin/env python3
"""
Campaign-in-a-Box — Step 2 creative builder.

Turns ONE file (creative/campaign.json) into the whole creative package:
  brand/    logo lockups (color, reversed, one-color) and a brand sheet
  print/    yard sign, door hangers, palm cards, mailers, flier — print SVGs,
            proof SVGs (with bleed/safe/die guides) and print-ready PDFs
  social/   organic posts and digital ad templates sized per platform (SVG + PNG)
  email/    listmonk and Mautic versions of every sequence email
  reports   traceability.csv, utm-plan.csv, calendar.csv, legibility.md, contrast.md

Every piece is traced back to the Step 1 message box (quadrants) and precinct
targets, and dated from the Step 1 calendar.

Requirements:
  Python 3.8+, and:  pip install segno fonttools
    segno     — QR codes (required for pieces with QR codes)
    fonttools — exact text measuring (optional; without it sizes are estimated)
  rsvg-convert (librsvg) for PDF/PNG export (optional; SVGs are always written)
    macOS: brew install librsvg    Debian/Ubuntu: apt install librsvg2-bin
  Fonts from creative/brand/brand.json installed on your computer (free from
  Google Fonts), or downloaded into a folder you pass with --fonts-dir.

Usage:
  python3 tools/build_creative.py creative/campaign.example.json
  python3 tools/build_creative.py creative/campaign.json --out creative/build
  python3 tools/build_creative.py creative/campaign.json --palette forest --pairing condensed
"""
import argparse
import csv
import datetime as dt
import glob
import html
import json
import os
import re
import shutil
import subprocess
import sys
from urllib.parse import urlencode

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
from contrast_check import check_palette, ratio  # noqa: E402

try:
    import segno
except ImportError:
    segno = None
try:
    from fontTools.ttLib import TTFont
except ImportError:
    TTFont = None

PT = 72.0                     # points per inch
WARNINGS = []


def warn(msg):
    WARNINGS.append(msg)
    print("  ! " + msg)


# ---------------------------------------------------------------------------
# Fonts and text measuring
# ---------------------------------------------------------------------------
STYLE = {300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold",
         700: "Bold", 800: "ExtraBold", 900: "Black"}


class Font:
    """A family+weight with measuring. Exact if fontTools finds the file."""
    _cache = {}
    fonts_dir = None

    def __new__(cls, spec):
        key = (spec["family"], spec["weight"])
        if key not in cls._cache:
            obj = super().__new__(cls)
            obj._init(spec)
            cls._cache[key] = obj
        return cls._cache[key]

    def _init(self, spec):
        self.family, self.weight = spec["family"], spec["weight"]
        self.fallback = spec.get("fallback", "sans-serif")
        self.exact, self.path = False, None
        self.cap_ratio = 0.70
        condensed = "condensed" in self.family.lower()
        self.avg = (0.47 if condensed else 0.60) + (self.weight - 400) / 5000
        path = self._find()
        if path and TTFont:
            try:
                f = TTFont(path, lazy=True)
                self.upm = f["head"].unitsPerEm
                self.cmap = f.getBestCmap()
                self.hmtx = f["hmtx"].metrics
                cap = getattr(f["OS/2"], "sCapHeight", 0) or 0
                if cap:
                    self.cap_ratio = cap / self.upm
                self.exact, self.path = True, path
            except Exception as e:  # pragma: no cover
                warn(f"Could not read font {path}: {e}")
        if not self.exact:
            warn(f"Font '{self.family}' {self.weight} not found or fontTools missing — "
                 "text sizes are estimated. Install the font (Google Fonts) and fonttools for exact fitting.")

    def _names(self, path):
        try:
            f = TTFont(path, lazy=True)
            n = f["name"]
            fam = (n.getDebugName(16) or n.getDebugName(1) or "").strip()
            return fam, f["OS/2"].usWeightClass
        except Exception:
            return "", 0

    def _find(self):
        if not TTFont:
            return None
        dirs = [d for d in [Font.fonts_dir, os.path.join(KIT, "creative", "brand", "fonts")] if d]
        for d in dirs:
            for p in glob.glob(os.path.join(d, "**", "*.[ot]tf"), recursive=True):
                fam, w = self._names(p)
                if fam.lower() == self.family.lower() and w == self.weight:
                    return p
        if shutil.which("fc-match"):
            q = f"{self.family}:style={STYLE.get(self.weight, 'Regular')}"
            try:
                out = subprocess.run(["fc-match", "-f", "%{file}", q], capture_output=True,
                                     text=True, timeout=10).stdout.strip()
            except Exception:
                return None
            if out and os.path.exists(out):
                fam, w = self._names(out)
                if fam.lower() == self.family.lower() and abs(w - self.weight) <= 100:
                    return out
        return None

    def width(self, text, size):
        if not self.exact:
            w = 0
            for ch in text:
                w += self.avg * (1.12 if ch.isupper() else 0.55 if ch in " .,'!:;|" else 1.0)
            return w * size
        units = 0
        for ch in text:
            g = self.cmap.get(ord(ch))
            units += self.hmtx[g][0] if g in self.hmtx else self.upm * self.avg
        return units / self.upm * size

    def cap(self, size):
        return self.cap_ratio * size

    def fit(self, text, max_width, max_size, min_size=4):
        w = self.width(text, 1.0)
        return max(min_size, min(max_size, max_width / w if w else max_size))

    def wrap(self, text, size, max_width):
        lines, cur = [], ""
        for word in text.split():
            trial = (cur + " " + word).strip()
            if self.width(trial, size) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        return lines

    def attrs(self):
        fam = f"'{self.family}', {self.fallback}"
        return f'font-family="{html.escape(fam)}" font-weight="{self.weight}"'


# ---------------------------------------------------------------------------
# SVG document with bleed, safe zone and named layers
# ---------------------------------------------------------------------------
def esc(s):
    return html.escape(str(s), quote=True)


class Doc:
    LAYERS = ["background", "art", "text", "qr", "disclaimer", "proof-only", "guides"]

    def __init__(self, w, h, unit="in", bleed=0.125, safe=0.25, title=""):
        """w,h in inches (unit='in') or pixels (unit='px', no bleed)."""
        self.unit = unit
        if unit == "in":
            self.w, self.h = w * PT, h * PT
            self.b, self.s = bleed * PT, safe * PT
            self.size_in = (w, h)
        else:
            self.w, self.h, self.b, self.s = float(w), float(h), 0.0, 0.0
            self.size_in = None
        self.title = title
        self.L = {k: [] for k in self.LAYERS}

    # coordinates are relative to the trim box; bleed extends beyond 0..w/0..h
    def rect(self, layer, x, y, w, h, fill, bleed=False, rx=0, stroke=None, sw=1, dash=None, opacity=None):
        if bleed:
            if x <= 0.5:
                w += x + self.b
                x = -self.b
            if y <= 0.5:
                h += y + self.b
                y = -self.b
            if x + w >= self.w - 0.5:
                w = self.w + self.b - x
            if y + h >= self.h - 0.5:
                h = self.h + self.b - y
        a = f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}"'
        a += f' fill="{fill}"' if fill else ' fill="none"'
        if rx:
            a += f' rx="{rx}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        if opacity is not None:
            a += f' opacity="{opacity}"'
        self.L[layer].append(a + "/>")

    def line(self, layer, x1, y1, x2, y2, stroke, sw=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.L[layer].append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
                             f'stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def circle(self, layer, cx, cy, r, fill=None, stroke=None, sw=1, dash=None):
        a = f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{fill or "none"}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        self.L[layer].append(a + "/>")

    def text(self, layer, x, y, s, font, size, fill, anchor="start", spacing=0, italic=False, ident=None):
        extra = f' letter-spacing="{spacing:.2f}"' if spacing else ""
        extra += ' font-style="italic"' if italic else ""
        extra += f' id="{ident}"' if ident else ""
        self.L[layer].append(f'<text x="{x:.2f}" y="{y:.2f}" {font.attrs()} font-size="{size:.2f}" '
                             f'fill="{fill}" text-anchor="{anchor}"{extra}>{esc(s)}</text>')

    def para(self, layer, x, y, width, s, font, size, fill, leading=1.28, anchor="start",
             max_lines=None, bullet=None, italic_free=False):
        """Wrapped text. y = first baseline. Returns the baseline after the last line."""
        indent = size * 0.9 if bullet else 0
        lines = font.wrap(s, size, width - indent)
        if max_lines and len(lines) > max_lines:
            warn(f"'{s[:40]}…' needs {len(lines)} lines; only {max_lines} fit. Shorten it.")
            lines = lines[:max_lines]
        if bullet:
            self.circle(layer, x + size * 0.28, y - font.cap(size) * 0.42, size * 0.16, fill=bullet)
        for i, ln in enumerate(lines):
            self.text(layer, x + indent, y + i * size * leading, ln, font, size, fill, anchor)
        return y + len(lines) * size * leading

    def fitted_block(self, layer, x, y, width, s, font, max_size, fill, max_lines=3, min_size=8,
                     leading=1.08, anchor="start", upper=False):
        """Largest size at which s wraps into max_lines. Returns (bottom baseline, size, lines)."""
        s = s.upper() if upper else s
        size = max_size
        while size > min_size:
            lines = font.wrap(s, size, width)
            if len(lines) <= max_lines and all(font.width(ln, size) <= width for ln in lines):
                break
            size -= 1
        lines = font.wrap(s, size, width)
        base = y + font.cap(size)
        for i, ln in enumerate(lines):
            self.text(layer, x, base + i * size * leading, ln, font, size, fill, anchor)
        return base + (len(lines) - 1) * size * leading, size, lines

    def raw(self, layer, s):
        self.L[layer].append(s)

    def guides(self, die=None):
        """Trim (cyan), safe (magenta), bleed edge (gray). Proof files only."""
        if self.unit != "in":
            return
        self.rect("guides", -self.b, -self.b, self.w + 2 * self.b, self.h + 2 * self.b, None,
                  stroke="#999999", sw=0.5, dash="2 2")
        self.rect("guides", 0, 0, self.w, self.h, None, stroke="#00AEEF", sw=0.75)
        self.rect("guides", self.s, self.s, self.w - 2 * self.s, self.h - 2 * self.s, None,
                  stroke="#EC008C", sw=0.75, dash="6 3")
        tiny = Font({"family": "Public Sans", "weight": 400, "fallback": "Arial, sans-serif"})
        self.text("guides", self.s + 2, self.s + 8, "SAFE ZONE (magenta) · TRIM (cyan) · BLEED (gray)",
                  tiny, 6, "#EC008C")
        if die:
            die(self)

    def svg(self, proof=False):
        W, H = self.w + 2 * self.b, self.h + 2 * self.b
        if self.unit == "in":
            dims = f'width="{W / PT:.4f}in" height="{H / PT:.4f}in"'
        else:
            dims = f'width="{int(W)}" height="{int(H)}"'
        out = [f'<?xml version="1.0" encoding="UTF-8"?>',
               f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" '
               f'{dims} viewBox="0 0 {W:.2f} {H:.2f}">',
               f'<title>{esc(self.title)}</title>',
               f'<g transform="translate({self.b:.2f},{self.b:.2f})">']
        for name in self.LAYERS:
            if name in ("guides", "proof-only") and not proof:
                continue
            out.append(f'<g id="{name}" inkscape:groupmode="layer" inkscape:label="{name}">')
            out.extend(self.L[name])
            out.append("</g>")
        out.append("</g></svg>")
        return "\n".join(out)


# ---------------------------------------------------------------------------
# QR codes with UTM tags
# ---------------------------------------------------------------------------
def utm_url(base, path, utm):
    url = base.rstrip("/") + (path or "/")
    q = {f"utm_{k}": v for k, v in utm.items() if v}
    return url + ("?" + urlencode(q) if q else "")


def qr(doc, layer, x, y, size, url, dark, light="#FFFFFF"):
    """Draw a QR code (with its 4-module quiet zone) inside a size×size box."""
    if segno is None:
        doc.rect(layer, x, y, size, size, light, stroke=dark, sw=1)
        warn("segno not installed — QR placeholders drawn. pip install segno")
        return
    q = segno.make(url, error="m", micro=False)
    mat = [list(r) for r in q.matrix]
    n = len(mat)
    border = 4
    m = size / (n + 2 * border)
    if m * 72 / PT < 0.0 or (doc.unit == "in" and m < 0.72):   # module < 0.01 in
        warn(f"QR modules are {m / PT * 25.4:.2f} mm — too small to scan reliably. Make the QR bigger or the URL shorter.")
    doc.rect(layer, x, y, size, size, light)
    d = []
    for r, row in enumerate(mat):
        c = 0
        while c < n:
            if row[c]:
                start = c
                while c < n and row[c]:
                    c += 1
                d.append(f"M{x + (start + border) * m:.3f} {y + (r + border) * m:.3f}"
                         f"h{(c - start) * m:.3f}v{m:.3f}h{-(c - start) * m:.3f}z")
            else:
                c += 1
    doc.raw(layer, f'<path d="{"".join(d)}" fill="{dark}"/>')
    return q.version


# ---------------------------------------------------------------------------
# Labels and dates (English / Spanish)
# ---------------------------------------------------------------------------
LABELS = {
    "en": {"meet": "Meet {first}", "priorities": "{first}'s priorities", "key_dates": "Key dates",
           "register": "Register by", "ballots": "Ballots mailed", "early": "Early voting begins",
           "eday": "Election Day", "polls": "Polls close at {time}", "confirm": "Confirm at",
           "photo": "CANDIDATE PHOTO", "note": "A note from your neighbor:", "record": "The record",
           "source": "Source", "you_may_hear": "You may hear", "answer": "{first}'s answer",
           "vote_by": "Vote by {date}", "return": "Return your ballot", "learn": "Learn more",
           "elect": "Elect", "donate": "Donate", "volunteer": "Volunteer"},
    "es": {"meet": "Conozca a {first}", "priorities": "Las prioridades de {first}", "key_dates": "Fechas clave",
           "register": "Inscríbase antes del", "ballots": "Se envían las boletas", "early": "Comienza la votación anticipada",
           "eday": "Día de las elecciones", "polls": "Las casillas cierran a las {time}", "confirm": "Confirme en",
           "photo": "FOTO DEL CANDIDATO", "note": "Una nota de su vecino:", "record": "Los hechos",
           "source": "Fuente", "you_may_hear": "Tal vez escuche", "answer": "La respuesta de {first}",
           "vote_by": "Vote antes del {date}", "return": "Devuelva su boleta", "learn": "Más información",
           "elect": "Vote por", "donate": "Done", "volunteer": "Ayude"},
}
MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
DAYS_ES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]


def fmt_date(d, lang="en", long=False):
    if lang == "es":
        return f"{DAYS_ES[d.weekday()]} {d.day} de {MONTHS_ES[d.month - 1]}"
    return d.strftime("%A, %B %-d" if long else "%a, %b %-d")


class Ctx:
    """Everything a renderer needs: config, palette, fonts, dates, language."""

    def __init__(self, cfg, brand, palette, pairing):
        self.cfg, self.brand = cfg, brand
        self.P = brand["palettes"][palette]
        tp = brand["type_pairings"][pairing]
        self.head, self.sub, self.body = Font(tp["head"]), Font(tp["sub"]), Font(tp["body"])
        self.body_b = Font({**tp["body"], "weight": 600 if tp["body"]["family"] == "Source Serif 4" else 700})
        self.cand = cfg["candidate"]
        self.mb = cfg["message_box"]
        el = cfg["election"]
        self.eday = dt.date.fromisoformat(el["election_day"])
        self.dates = {k: self.eday + dt.timedelta(days=v) for k, v in el["offsets"].items() if not k.startswith("_")}
        self.dates["election_day"] = self.eday
        self.base = cfg["web"]["base_url"]
        self.domain = re.sub(r"^https?://", "", self.base).rstrip("/")

    def L(self, lang, key, **kw):
        return LABELS[lang][key].format(first=self.cand["first_name"], **kw)

    def tr(self, lang):
        """Language-specific content with English fallback."""
        es = self.cfg.get("language", {}).get("es", {}) if lang == "es" else {}
        c = self.cand
        return {
            "office_line": es.get("office_line") or f"{c['office']} · {c['district']}",
            "core": es.get("core_message") or self.mb["core_message"],
            "bio_short": es.get("bio_short") or c["bio_short"],
            "bio_points": es.get("bio_points") or c["bio_points"],
            "issues": es.get("issues") or self.mb["issues"],
            "disclaimer": (self.cfg["disclaimer"].get("text_es") if lang == "es" else None)
                          or self.cfg["disclaimer"]["text"],
        }


# ---------------------------------------------------------------------------
# Shared building blocks
# ---------------------------------------------------------------------------
def photo_slot(doc, ctx, x, y, w, h, lang, bleed=False):
    doc.rect("art", x, y, w, h, ctx.P["tint"], bleed=bleed)
    f = ctx.sub
    size = max(7, min(14, w / 14))
    doc.text("art", x + w / 2, y + h / 2, ctx.L(lang, "photo"), f, size, ctx.P["primary"], anchor="middle")
    doc.text("proof-only", x + w / 2, y + h / 2 + size * 1.6, "Replace with a real photo (300 dpi at print size)",
             ctx.body, size * 0.6, ctx.P["ink"], anchor="middle")


def name_lockup(doc, ctx, x, y, width, on_dark=True, last_max=60, center=False, office=True, lang="en"):
    """First name over a big last name, then office line. y = top. Returns bottom y."""
    fg = ctx.P["paper"] if on_dark else ctx.P["primary"]
    hi = ctx.P["secondary"] if on_dark else ctx.P["accent"]
    anchor = "middle" if center else "start"
    tx = x + width / 2 if center else x
    first = ctx.cand["first_name"].upper()
    last = ctx.cand["last_name"].upper()
    ls = ctx.head.fit(last, width, last_max)
    fs = min(ctx.sub.fit(first, width, ls * 0.42), ls * 0.42)
    yb = y + ctx.sub.cap(fs)
    doc.text("text", tx, yb, first, ctx.sub, fs, fg, anchor, spacing=fs * 0.08)
    yb += fs * 0.28 + ctx.head.cap(ls)
    doc.text("text", tx, yb, last, ctx.head, ls, fg, anchor)
    if office:
        os_ = min(ctx.sub.fit(ctx.tr(lang)["office_line"].upper(), width * 0.9, ls * 0.26), ls * 0.26)
        yb += os_ * 0.5 + ctx.sub.cap(os_) + 2
        doc.text("text", tx, yb, ctx.tr(lang)["office_line"].upper(), ctx.sub, os_, hi, anchor, spacing=os_ * 0.06)
    return yb, ls


def disclaimer(doc, ctx, x, y, width, lang, color, size=8, boxed=False, anchor="start", address=True,
               shrink=False):
    """Compliant-disclaimer slot. ⚖️ wording/size/box rules vary by state."""
    d = ctx.tr(lang)["disclaimer"]
    if address and ctx.cfg["disclaimer"].get("address_line"):
        d += ". " + ctx.cfg["disclaimer"]["address_line"]
    if shrink:                       # right-align a box sized to its text
        tw = min(width, ctx.body.width(d, size) + 12)
        x, width = x + width - tw, tw
    tx = x + width / 2 if anchor == "middle" else x
    lines = ctx.body.wrap(d, size, width - (8 if boxed else 0))
    h = len(lines) * size * 1.25 + (6 if boxed else 0)
    if boxed:
        doc.rect("disclaimer", x, y, width, h, None, stroke=color, sw=0.75)
        tx += 4 if anchor == "start" else 0
    for i, ln in enumerate(lines):
        doc.text("disclaimer", tx, y + (3 if boxed else 0) + ctx.body.cap(size) + i * size * 1.25 + 1,
                 ln, ctx.body, size, color, anchor)
    doc.rect("proof-only", x - 1, y - 1, width + 2, h + 2, None, stroke="#EC008C", sw=0.5, dash="2 1")
    doc.text("proof-only", x, y - 2, "⚖️ DISCLAIMER SLOT — confirm wording, size and placement for your state",
             ctx.body, 5, "#EC008C")
    return y + h


def date_rows(ctx, lang):
    el = ctx.cfg["election"]
    rows = [(ctx.L(lang, "register"), ctx.dates.get("register_deadline")),
            (ctx.L(lang, "ballots"), ctx.dates.get("ballots_out")),
            (ctx.L(lang, "early"), ctx.dates.get("early_vote_starts")),
            (ctx.L(lang, "eday"), ctx.eday)]
    rows = [(a, fmt_date(b, lang)) for a, b in sorted([r for r in rows if r[1]], key=lambda r: r[1])]
    rows.append((ctx.L(lang, "polls", time=el.get("polls_close", "")), ""))
    return rows


# ---------------------------------------------------------------------------
# PRINT PIECES
# ---------------------------------------------------------------------------
LEGIBILITY = []      # rows for legibility.md
FT_PER_INCH = 30     # common sign-industry legibility rule of thumb for bold sans, high contrast
MPH35_FT_S = 35 * 5280 / 3600


def yard_sign(ctx, piece):
    P, lang = ctx.P, piece["lang"]
    d = Doc(24, 18, bleed=0.125, safe=0.75, title=f"Yard sign — {ctx.cand['full_name']}")
    w, h, m = d.w, d.h, 0.75 * PT
    d.rect("background", 0, 0, w, h, P["primary"], bleed=True)
    first, last = ctx.cand["first_name"].upper(), ctx.cand["last_name"].upper()
    full = f"{first} {last}"
    single = ctx.head.fit(full, w - 2 * m, 420)
    if ctx.head.cap(single) / PT >= 4.0:
        ls = single
        yb = 70 + ctx.head.cap(ls)
        d.text("text", w / 2, yb, full, ctx.head, ls, P["paper"], "middle")
        name_rows = [("Name", full, ctx.head.cap(ls))]
    else:
        ls = ctx.head.fit(last, w - 2 * m, 470)
        fs = min(ctx.sub.fit(first, w - 2 * m, ls * 0.45), ls * 0.45)
        yb = 66 + ctx.sub.cap(fs)
        d.text("text", w / 2, yb, first, ctx.sub, fs, P["paper"], "middle", spacing=fs * 0.06)
        yb += 34 + ctx.head.cap(ls)
        d.text("text", w / 2, yb, last, ctx.head, ls, P["paper"], "middle")
        name_rows = [("First name", first, ctx.sub.cap(fs)), ("Last name", last, ctx.head.cap(ls))]
    office = ctx.tr(lang)["office_line"].upper()
    os_ = ctx.sub.fit(office, (w - 2 * m) * 0.93, 112)
    slogan = piece["content"].get("slogan", "")
    ss = ctx.sub.fit(slogan, w - 2 * m, 120)
    band_h = 150
    fy = h - m - 52                                      # footer top
    used = band_h + ctx.sub.cap(ss)
    gap = max(40, (fy - yb - used) / 3)                   # spread leftover space evenly
    band_top = yb + gap
    d.rect("art", 0, band_top, w, band_h, P["secondary"], bleed=True)
    d.text("text", w / 2, band_top + band_h / 2 + ctx.sub.cap(os_) / 2, office, ctx.sub, os_, P["ink"], "middle",
           spacing=os_ * 0.04)
    sy = band_top + band_h + gap + ctx.sub.cap(ss)
    d.text("text", w / 2, sy, slogan, ctx.sub, ss, P["paper"], "middle")
    us = 40
    d.text("text", m, fy + 36, ctx.domain, ctx.sub, us, P["secondary"])
    disclaimer(d, ctx, w - m - 640, fy + 6, 640, lang, P["paper"], size=26, boxed=True, address=False, shrink=True)
    d.guides()
    words = len([x for x in (full + " " + office).split() if re.search(r"\w", x)])
    for label, txt, cap in name_rows + [("Office line", office, ctx.sub.cap(os_)), ("Slogan", slogan, ctx.sub.cap(ss)),
                                        ("Web address", ctx.domain, ctx.sub.cap(us))]:
        cin = cap / PT
        dist = cin * FT_PER_INCH
        LEGIBILITY.append((piece["id"], label, txt, cin, dist, dist / MPH35_FT_S))
    LEGIBILITY.append((piece["id"], "Primary read (name + office)", f"{words} words", None, None, None))
    if words > 7:
        warn(f"Yard sign primary read is {words} words — aim for 7 or fewer at 35 mph.")
    if name_rows[-1][2] / PT < 3.5:
        warn("Yard sign name cap height is under 3 inches — consider the 'condensed' type pairing.")
    return {"front": d}


def die_doorhanger(doc):
    cx, cy, r = doc.w / 2, 0.875 * PT, 0.625 * PT
    doc.circle("guides", cx, cy, r, stroke="#EC008C", sw=0.75)
    doc.line("guides", cx, 0, cx, cy - r, "#EC008C", 0.75)
    doc.circle("guides", cx, cy, r + 0.25 * PT, stroke="#EC008C", sw=0.5, dash="3 2")
    doc.text("guides", cx + r + 0.3 * PT, cy, "DIE CUT: 1.25 in hole + slit", Font(
        {"family": "Public Sans", "weight": 700, "fallback": "Arial"}), 6, "#EC008C")


def door_hanger(ctx, piece):
    P, lang, c = ctx.P, piece["lang"], piece["content"]
    t = ctx.tr(lang)
    pages = {}
    m = 0.25 * PT
    # FRONT
    d = Doc(4.25, 11, title=f"Door hanger front ({lang})")
    w, h = d.w, d.h
    d.rect("background", 0, 0, w, h, P["paper"], bleed=True)
    d.rect("art", 0, 0, w, 262, P["primary"], bleed=True)
    name_lockup(d, ctx, m + 6, 140, w - 2 * m - 12, on_dark=True, last_max=70, center=True, lang=lang)
    photo_slot(d, ctx, 0, 262, w, 190, lang, bleed=True)
    y, _, _ = d.fitted_block("text", m, 470, w - 2 * m, c["headline"], ctx.sub, 22, P["primary"], max_lines=3)
    y = d.para("text", m, y + 28, w - 2 * m, t["core"], ctx.body, 12.5, P["ink"], max_lines=8)
    url = utm_url(ctx.base, piece.get("qr_path"), piece["utm"])
    qs = 72
    qy = h - m - 34 - qs
    qr(d, "qr", m, qy, qs, url, P["ink"], P["paper"])
    d.para("text", m + qs + 10, qy + 26, w - 2 * m - qs - 10, c["qr_label"], ctx.sub, 12, P["primary"])
    d.text("text", m + qs + 10, qy + qs - 8, ctx.domain, ctx.body, 9.5, P["ink"])
    disclaimer(d, ctx, m, h - m - 24, w - 2 * m, lang, P["ink"], size=7.5)
    d.guides(die_doorhanger)
    pages["front"] = d
    # BACK
    d = Doc(4.25, 11, title=f"Door hanger back ({lang})")
    d.rect("background", 0, 0, w, h, P["paper"], bleed=True)
    d.rect("art", 0, 0, w, 178, P["primary"], bleed=True)
    d.fitted_block("text", m, 132, w - 2 * m, c["missed_you"], ctx.sub, 22, P["paper"], max_lines=1,
                   anchor="start")
    d.rect("art", m, 192, w - 2 * m, 98, P["tint"], rx=4)
    d.text("text", m + 8, 208, ctx.L(lang, "note"), ctx.sub, 9, P["primary"])
    for i in range(3):
        d.line("art", m + 8, 232 + i * 20, w - m - 8, 232 + i * 20, P["primary"], 0.5)
    y = 318
    d.text("text", m, y, ctx.L(lang, "priorities").upper(), ctx.sub, 11, P["accent"], spacing=0.8)
    y += 20
    for iss in t["issues"]:
        y = d.para("text", m, y, w - 2 * m, iss["title"], ctx.sub, 13, P["primary"], max_lines=2)
        y = d.para("text", m, y - 1, w - 2 * m, iss["short"], ctx.body, 10.5, P["ink"], max_lines=4) + 10
    if "Q2" in piece["quadrants"] and ctx.mb.get("q2") and lang == "en":
        q2 = ctx.mb["q2"][0]
        d.text("text", m, y + 4, ctx.L(lang, "record").upper(), ctx.sub, 9, P["accent"], spacing=0.8)
        y = d.para("text", m, y + 18, w - 2 * m, q2["text"], ctx.body_b, 10.5, P["ink"], max_lines=3)
        y = d.para("text", m, y, w - 2 * m, f"{ctx.L(lang, 'source')}: {q2['source']}", ctx.body, 8, P["ink"],
                   max_lines=2)
    bottom = h - m - 34
    if y > bottom:
        warn(f"{piece['id']} back: content runs into the disclaimer by {y - bottom:.0f} pt. Shorten issue text.")
    d.rect("art", 0, h - m - 46, w, 46 + m, P["primary"], bleed=True)
    disclaimer(d, ctx, m, h - m - 30, w - 2 * m, lang, P["paper"], size=7.5)
    d.guides(die_doorhanger)
    pages["back"] = d
    return pages


def palm_card(ctx, piece):
    P, lang, c = ctx.P, piece["lang"], piece["content"]
    t = ctx.tr(lang)
    m = 0.25 * PT
    d = Doc(4, 9, title=f"Palm card front ({lang})")
    w, h = d.w, d.h
    d.rect("background", 0, 0, w, h, P["primary"], bleed=True)
    photo_slot(d, ctx, 0, 0, w, 300, lang, bleed=True)
    y, _ = name_lockup(d, ctx, m, 330, w - 2 * m, on_dark=True, last_max=76, lang=lang)
    d.fitted_block("text", m, y + 30, w - 2 * m, c["slogan"], ctx.sub, 26, P["paper"], max_lines=2)
    d.text("text", m, h - m - 30, ctx.domain, ctx.sub, 12, P["secondary"])
    disclaimer(d, ctx, m, h - m - 18, w - 2 * m, lang, P["paper"], size=7, address=False)
    d.guides()
    front = d
    # back
    d = Doc(4, 9, title=f"Palm card back ({lang})")
    d.rect("background", 0, 0, w, h, P["paper"], bleed=True)
    y = m + 22
    d.text("text", m, y, ctx.L(lang, "meet", ), ctx.sub, 18, P["primary"])
    y += 18
    for b in t["bio_points"]:
        y = d.para("text", m, y, w - 2 * m, b, ctx.body, 9.5, P["ink"], bullet=P["accent"], max_lines=3) + 3
    y += 10
    d.text("text", m, y, ctx.L(lang, "priorities"), ctx.sub, 14, P["primary"])
    y += 16
    for iss in t["issues"]:
        y = d.para("text", m, y, w - 2 * m, iss["title"], ctx.body_b, 9.5, P["ink"], bullet=P["accent"],
                   max_lines=2) + 2
    y += 8
    rows = date_rows(ctx, lang)
    box_h = 22 + len(rows) * 13 + 16
    d.rect("art", 0, y, w, box_h, P["tint"], bleed=True)
    d.text("text", m, y + 16, ctx.L(lang, "key_dates").upper(), ctx.sub, 9, P["accent"], spacing=0.8)
    yy = y + 31
    for a, b in rows:
        d.text("text", m, yy, a, ctx.body, 9, P["ink"])
        d.text("text", w - m, yy, b, ctx.body_b, 9, P["ink"], anchor="end")
        yy += 13
    d.text("text", m, yy + 1, f"{ctx.L(lang, 'confirm')} {ctx.cfg['election']['voter_info_url'].replace('https://', '')}",
           ctx.body, 7.5, P["ink"])
    d.text("proof-only", w - m, y + 16, "⚖️ DATES ARE PLACEHOLDERS", ctx.sub, 6, "#EC008C", anchor="end")
    y += box_h + 12
    qs = 70
    room = (h - m - 30 - qs) - y
    if room > 70:   # use spare space for the core message
        y = d.para("text", m, y + 16, w - 2 * m, t["core"], ctx.body, 10.5, P["primary"], italic_free=True,
                   max_lines=int((room - 20) / 13.5))
    url = utm_url(ctx.base, piece.get("qr_path"), piece["utm"])
    qy = max(y, h - m - 30 - qs)
    qr(d, "qr", m, qy, qs, url, P["ink"], P["paper"])
    d.para("text", m + qs + 10, qy + 26, w - 2 * m - qs - 10, c["qr_label"], ctx.sub, 11, P["primary"])
    d.text("text", m + qs + 10, qy + qs - 8, ctx.domain, ctx.body, 8.5, P["ink"])
    if qy + qs > h - m - 22:
        warn(f"{piece['id']} back is overfull — shorten bio points or issue titles.")
    disclaimer(d, ctx, m, h - m - 18, w - 2 * m, lang, P["ink"], size=7)
    d.guides()
    return {"front": front, "back": d}


def mail_panel(d, ctx, x0, lang):
    """USPS mail panel: return address, indicia, address area, barcode clear zone."""
    P, m = ctx.P, 0.25 * PT
    d.rect("art", x0, 0, d.w - x0, d.h, P["paper"], bleed=True)
    d.line("art", x0, m, x0, d.h - m, P["tint"], 1)
    rx, ry = x0 + 14, m + 10
    d.text("text", rx, ry, ctx.tr(lang)["disclaimer"].replace("Paid for by ", "").replace("Pagado por ", ""),
           ctx.body_b, 8, P["ink"])
    d.text("text", rx, ry + 11, ctx.cfg["disclaimer"].get("address_line", ""), ctx.body, 8, P["ink"])
    iw, ih = 1.0 * PT, 0.8 * PT
    d.rect("guides", d.w - m - iw, m, iw, ih, None, stroke="#EC008C", sw=0.75, dash="3 2")
    d.text("guides", d.w - m - iw / 2, m + ih / 2 + 2, "POSTAGE INDICIA", Font(
        {"family": "Public Sans", "weight": 700, "fallback": "Arial"}), 6, "#EC008C", anchor="middle")
    d.text("guides", d.w - m - iw / 2, m + ih / 2 + 10, "from your mail house", ctx.body, 5, "#EC008C", anchor="middle")
    ax, ay = x0 + 0.5 * PT, d.h * 0.42
    d.rect("guides", ax, ay, d.w - ax - m, 1.2 * PT, None, stroke="#00AEEF", sw=0.75, dash="3 2")
    d.text("guides", ax + 6, ay + 12, "ADDRESS BLOCK AREA — keep clear (mail house prints here)", ctx.body, 6, "#00AEEF")
    bz_w, bz_h = 4.75 * PT, 0.625 * PT
    d.rect("guides", d.w - bz_w, d.h - bz_h, bz_w, bz_h, "#EC008C", opacity=0.12)
    d.text("guides", d.w - bz_w + 6, d.h - bz_h + 12, "BARCODE CLEAR ZONE 4.75 × 0.625 in — no ink",
           ctx.body, 6, "#EC008C")


def mailer(ctx, piece):
    P, lang, c = ctx.P, piece["lang"], piece["content"]
    t = ctx.tr(lang)
    m = 0.25 * PT
    # FRONT
    d = Doc(11, 6, title=f"{piece['id']} front")
    w, h = d.w, d.h
    split = w * 0.56
    d.rect("background", 0, 0, w, h, P["primary"], bleed=True)
    photo_slot(d, ctx, split, 0, w - split, h, lang, bleed=True)
    x = m + 10
    d.text("text", x, m + 26, c["front_kicker"].upper(), ctx.sub, 13, P["secondary"], spacing=1.2)
    y, _, _ = d.fitted_block("text", x, m + 44, split - x - 24, c["front_headline"], ctx.head, 54, P["paper"],
                             max_lines=3, leading=1.02)
    y = d.para("text", x, y + 44, split - x - 30, c["front_sub"], ctx.body, 16, P["paper"], max_lines=3)
    name_lockup(d, ctx, x, h - m - 92, 230, on_dark=True, last_max=44, lang=lang)
    d.guides()
    front = d
    # BACK
    d = Doc(11, 6, title=f"{piece['id']} back")
    d.rect("background", 0, 0, w, h, P["paper"], bleed=True)
    panel_x = w - 5.0 * PT
    mail_panel(d, ctx, panel_x, lang)
    cw = panel_x - m - x - 14
    y, _, _ = d.fitted_block("text", x, m + 10, cw, c["back_headline"], ctx.sub, 28, P["primary"], max_lines=1)
    y0 = y + 22
    def content(k):
        y = y0
        if c.get("back_mode") == "contrast":
            d.text("text", x, y, ctx.L(lang, "record").upper(), ctx.sub, 9 * k, P["accent"], spacing=0.8)
            y += 19 * k
            for q in ctx.mb["q2"]:
                y = d.para("text", x, y, cw, q["text"], ctx.body_b, 13.5 * k, P["ink"], bullet=P["accent"], max_lines=3)
                y = d.para("text", x + 10, y - 1, cw - 10, f"{ctx.L(lang, 'source')}: {q['source']}", ctx.body, 9.5 * k,
                           P["ink"], max_lines=2) + 6 * k
            y += 4 * k
            box_top = y - 6
            inner = []
            for q3 in ctx.mb.get("q3_responses", [])[:2]:
                inner.append(q3)
            bh = (22 + sum(19 + 15.5 * len(ctx.body.wrap(q["response"], 11.5 * k, cw - 8)) + 4 for q in inner)) * k
            d.rect("art", x - 6, box_top, cw + 12, bh, P["tint"], rx=3)
            d.text("text", x, box_top + 14 * k, ctx.L(lang, "answer").upper(), ctx.sub, 9 * k, P["accent"], spacing=0.8)
            yy = box_top + 32 * k
            for q in inner:
                d.text("text", x, yy, f"{ctx.L(lang, 'you_may_hear')}: “{q['attack']}”", ctx.body_b, 11.5 * k, P["ink"])
                yy = d.para("text", x, yy + 15.5 * k, cw - 8, q["response"], ctx.body, 11.5 * k, P["ink"], leading=1.35, max_lines=3) + 4 * k
            y = box_top + bh + 4
        else:
            for b in t["bio_points"]:
                y = d.para("text", x, y, cw, b, ctx.body, 12.5 * k, P["ink"], bullet=P["accent"], max_lines=2) + 4 * k
            y += 10 * k
            d.text("text", x, y, ctx.L(lang, "priorities").upper(), ctx.sub, 10 * k, P["accent"], spacing=0.8)
            y += 20 * k
            for iss in t["issues"]:
                d.text("text", x, y, iss["title"], ctx.sub, 13 * k, P["primary"])
                y = d.para("text", x, y + 16 * k, cw, iss["short"], ctx.body, 11.5 * k, P["ink"], max_lines=2) + 6 * k
        return y
    qs = 62
    qy = h - m - 22 - qs
    for k in (1.0, 0.95, 0.9, 0.85, 0.8, 0.75):
        marks = {n: len(v) for n, v in d.L.items()}
        y = content(k)
        if y <= qy - 4:
            break
        for n in d.L:
            del d.L[n][marks[n]:]
    else:
        y = content(0.75)
    if y > qy - 4:
        warn(f"{piece['id']} back is overfull by {y - qy + 4:.0f} pt even at 75% type — shorten text.")
    elif k < 1:
        warn(f"{piece['id']} back: type reduced to {int(k * 100)}% to fit. Shorter text reads better in the mail.")
    url = utm_url(ctx.base, piece.get("qr_path"), piece["utm"])
    qr(d, "qr", x, qy, qs, url, P["ink"], P["paper"])
    d.text("text", x + qs + 10, qy + 26, c["qr_label"], ctx.sub, 12, P["primary"])
    d.text("text", x + qs + 10, qy + 42, ctx.domain, ctx.body, 9.5, P["ink"])
    disclaimer(d, ctx, x, h - m - 14, cw, lang, P["ink"], size=7.5, address=False)
    d.guides()
    return {"front": front, "back": d}


def flier(ctx, piece):
    P, lang, c = ctx.P, piece["lang"], piece["content"]
    t = ctx.tr(lang)
    m = 0.5 * PT
    d = Doc(8.5, 11, title="Flier")
    w, h = d.w, d.h
    d.rect("background", 0, 0, w, h, P["paper"], bleed=True)
    d.rect("art", 0, 0, w, 168, P["primary"], bleed=True)
    name_lockup(d, ctx, m, m - 6, w - 2 * m, on_dark=True, last_max=74, lang=lang)
    y, _, _ = d.fitted_block("text", m, 192, w - 2 * m, c["headline"], ctx.head, 34, P["primary"], max_lines=2)
    top = y + 18
    pw = 220
    photo_slot(d, ctx, m, top, pw, 180, lang)
    rx = m + pw + 20
    yy = d.para("text", rx, top + 14, w - m - rx, t["core"], ctx.body, 13, P["ink"], max_lines=6) + 6
    for b in t["bio_points"]:
        yy = d.para("text", rx, yy, w - m - rx, b, ctx.body, 10.5, P["ink"], bullet=P["accent"], max_lines=3) + 2
    y = max(top + 180, yy) + 24
    d.text("text", m, y, ctx.L(lang, "priorities").upper(), ctx.sub, 10, P["accent"], spacing=1)
    y += 18
    cols, gap = 3, 16
    cw = (w - 2 * m - gap * (cols - 1)) / cols
    bottom = y
    for i, iss in enumerate(t["issues"][:3]):
        cx = m + i * (cw + gap)
        d.rect("art", cx, y - 4, cw, 3, P["secondary"])
        yy = d.para("text", cx, y + 16, cw, iss["title"], ctx.sub, 13, P["primary"], max_lines=3)
        yy = d.para("text", cx, yy, cw, iss["short"], ctx.body, 10, P["ink"], max_lines=6)
        bottom = max(bottom, yy)
    by = h - m - 140
    if bottom > by - 8:
        warn(f"Flier issue columns run into the call-to-action box by {bottom - by + 8:.0f} pt.")
    d.rect("art", 0, by, w, 140 - 26, P["tint"], bleed=True)
    qs = 92
    url = utm_url(ctx.base, piece.get("qr_path"), piece["utm"])
    qr(d, "qr", w - m - qs, by + 10, qs, url, P["ink"], P["paper"])
    d.text("text", m, by + 30, c["cta_title"], ctx.sub, 20, P["primary"])
    d.para("text", m, by + 52, w - 2 * m - qs - 20, c["cta_text"], ctx.body, 11.5, P["ink"], max_lines=2)
    d.text("text", m, by + 92, f"{c['qr_label']}: {ctx.domain}/volunteer", ctx.sub, 11, P["accent"])
    disclaimer(d, ctx, m, h - m - 14, w - 2 * m, lang, P["ink"], size=8)
    d.guides()
    return {"front": d}


PRINT_RENDERERS = {"yard_sign": yard_sign, "door_hanger": door_hanger, "palm_card": palm_card,
                   "mailer": mailer, "flier": flier}

PRINT_SPECS = {
    "yard_sign": "24 × 18 in, 4 mm corrugated plastic, 1 color or full color, 2-sided, H-stakes. 0.125 in bleed.",
    "door_hanger": "4.25 × 11 in, 100 lb gloss cover or 14 pt, full color 2-sided, 1.25 in die-cut hole + slit. 0.125 in bleed.",
    "palm_card": "4 × 9 in, 100 lb gloss cover, full color 2-sided. 0.125 in bleed.",
    "mailer": "6 × 11 in postcard, 100 lb gloss cover or 10 pt, full color 2-sided. 0.125 in bleed. Confirm size/thickness and mail class with your mail house.",
    "flier": "8.5 × 11 in, 80–100 lb text, full color 1-sided. Bleed included; trim 0.125 in if printed with bleed, or print at 100% on a home printer (edges may show white).",
}


# ---------------------------------------------------------------------------
# BRAND: lockups and brand sheet
# ---------------------------------------------------------------------------
def mark(d, ctx, x, y, s, bg, fg, bar):
    d.rect("art", x, y, s, s, bg, rx=s * 0.14)
    ini = ctx.cand.get("initials") or (ctx.cand["first_name"][0] + ctx.cand["last_name"][0])
    fsz = ctx.head.fit(ini, s * 0.74, s * 0.62)
    d.text("text", x + s / 2, y + s * 0.5 + ctx.head.cap(fsz) / 2 - s * 0.04, ini, ctx.head, fsz, fg, "middle")
    d.rect("art", x + s * 0.2, y + s * 0.78, s * 0.6, s * 0.06, bar, rx=s * 0.03)


def lockups(ctx):
    P = ctx.P
    out = {}
    variants = {"color": (P["paper"], P["primary"], P["primary"], P["paper"], P["secondary"], P["accent"]),
                "reversed": (P["primary"], P["paper"], P["paper"], P["primary"], P["secondary"], P["secondary"]),
                "one-color": ("#FFFFFF", "#000000", "#000000", "#FFFFFF", "#FFFFFF", "#000000")}
    first, last = ctx.cand["first_name"].upper(), ctx.cand["last_name"].upper()
    office = ctx.tr("en")["office_line"].upper()
    for v, (bg, fg, mbg, mfg, bar, hi) in variants.items():
        # horizontal
        d = Doc(1600, 480, unit="px", title=f"Logo horizontal {v}")
        d.rect("background", 0, 0, 1600, 480, bg)
        mark(d, ctx, 80, 80, 320, mbg, mfg, bar if v != "one-color" else "#FFFFFF")
        x = 450
        ls = ctx.head.fit(last, 1600 - x - 80, 230)
        fs = ls * 0.4
        d.text("text", x, 80 + ctx.sub.cap(fs), first, ctx.sub, fs, fg, spacing=fs * 0.08)
        d.text("text", x, 80 + ctx.sub.cap(fs) + 24 + ctx.head.cap(ls), last, ctx.head, ls, fg)
        os_ = min(ctx.sub.fit(office, 1600 - x - 80, 46), 46)
        d.text("text", x, 400, office, ctx.sub, os_, hi, spacing=os_ * 0.06)
        out[f"logo-horizontal-{v}"] = d
        # stacked
        d = Doc(1200, 1200, unit="px", title=f"Logo stacked {v}")
        d.rect("background", 0, 0, 1200, 1200, bg)
        mark(d, ctx, 440, 110, 320, mbg, mfg, bar if v != "one-color" else "#FFFFFF")
        ls = ctx.head.fit(last, 1000, 260)
        fs = ls * 0.42
        d.text("text", 600, 560 + ctx.sub.cap(fs), first, ctx.sub, fs, fg, "middle", spacing=fs * 0.08)
        yb = 560 + ctx.sub.cap(fs) + 30 + ctx.head.cap(ls)
        d.text("text", 600, yb, last, ctx.head, ls, fg, "middle")
        os_ = min(ctx.sub.fit(office, 1000, 60), 60)
        d.text("text", 600, yb + 110, office, ctx.sub, os_, hi, "middle", spacing=os_ * 0.06)
        out[f"logo-stacked-{v}"] = d
        # mark only
        d = Doc(1200, 1200, unit="px", title=f"Logo mark {v}")
        d.rect("background", 0, 0, 1200, 1200, bg)
        mark(d, ctx, 150, 150, 900, mbg, mfg, bar if v != "one-color" else "#FFFFFF")
        out[f"logo-mark-{v}"] = d
    return out


def brand_sheet(ctx, brand, chosen_palette, chosen_pairing):
    d = Doc(1700, 2200, unit="px", title="Brand sheet")
    ink = "#111111"
    d.rect("background", 0, 0, 1700, 2200, "#FFFFFF")
    H = Font({"family": "Public Sans", "weight": 900, "fallback": "Arial Black, sans-serif"})
    S = Font({"family": "Public Sans", "weight": 700, "fallback": "Arial, sans-serif"})
    B = Font({"family": "Public Sans", "weight": 400, "fallback": "Arial, sans-serif"})
    d.text("text", 80, 120, f"Brand system — {ctx.cand['full_name']}", H, 56, ink)
    d.text("text", 80, 170, f"Chosen: palette '{chosen_palette}', type pairing '{chosen_pairing}'. "
           "Ratios are WCAG 2.x contrast. Kit minimum shown in brackets.", B, 24, ink)
    y = 230
    for key, pal in brand["palettes"].items():
        d.text("text", 80, y + 34, pal["name"] + ("   ← chosen" if key == chosen_palette else ""), S, 32, ink)
        d.para("text", 80, y + 70, 1540, pal["why"], B, 22, "#333333", max_lines=2)
        sx = 80
        for role in ["primary", "secondary", "accent", "ink", "paper", "tint"]:
            d.rect("art", sx, y + 100, 230, 130, pal[role], stroke="#CCCCCC", sw=1)
            d.text("text", sx, y + 260, role, S, 22, ink)
            d.text("text", sx, y + 288, pal[role], B, 22, ink)
            sx += 258
        _, rows = check_palette(key, pal, brand["contrast_pairs"])
        rx, ry = 80, y + 330
        for i, r in enumerate(rows):
            cx = rx + (i % 4) * 390
            cy = ry + (i // 4) * 70
            d.rect("art", cx, cy, 120, 50, pal[r["bg"]], stroke="#CCCCCC", sw=1)
            d.text("text", cx + 60, cy + 34, "Aa", S, 28, pal[r["fg"]], "middle")
            d.text("text", cx + 134, cy + 22, f"{r['fg']} on {r['bg']}", B, 18, ink)
            d.text("text", cx + 134, cy + 46, f"{r['ratio']:.2f}:1 {r['wcag']} [{r['kit_min']}]"
                   + ("" if r["pass"] else " FAIL"), S, 18, ink if r["pass"] else "#B00020")
        y += 500
    d.text("text", 80, y + 40, "Type pairings (all SIL Open Font License, free from Google Fonts)", S, 32, ink)
    y += 80
    for key, tp in brand["type_pairings"].items():
        hf, bf = Font(tp["head"]), Font(tp["body"])
        d.text("text", 80, y + 50, ctx.cand["last_name"].upper(), hf, 64, ctx.P["primary"])
        d.text("text", 560, y + 26, tp["name"] + ("   ← chosen" if key == chosen_pairing else ""), S, 24, ink)
        d.para("text", 560, y + 60, 1060, "Fix the flooding. Finally. " + tp["why"], bf, 21, "#333333", max_lines=3)
        y += 150
    return d


# ---------------------------------------------------------------------------
# SOCIAL AND DIGITAL ADS
# ---------------------------------------------------------------------------
SOCIAL_FORMATS = {
    # id: (w, h, platforms, safe-zone note, (top_safe, bottom_safe) in px)
    "square": (1080, 1080, "Instagram/Facebook feed, Meta ads, Nextdoor", "", (0, 0)),
    "portrait": (1080, 1350, "Instagram/Facebook feed (4:5) — biggest feed footprint", "", (0, 0)),
    "story": (1080, 1920, "Stories/Reels covers (Instagram, Facebook), Meta story ads",
              "Keep text out of the top 250 px and bottom 340 px (app UI covers them).", (250, 340)),
    "landscape": (1200, 630, "Link previews (Facebook, LinkedIn, X), Nextdoor, website share image", "", (0, 0)),
    "wide": (1600, 900, "X/Twitter in-stream image, YouTube community, email header", "", (0, 0)),
}
AD_FORMATS = {
    "display-1200x628": (1200, 628, "Google responsive display — landscape image"),
    "display-1200x1200": (1200, 1200, "Google responsive display — square image"),
    "display-300x250": (300, 250, "Google display — medium rectangle"),
    "display-728x90": (728, 90, "Google display — leaderboard"),
    "display-160x600": (160, 600, "Google display — wide skyscraper"),
    "display-320x50": (320, 50, "Google display — mobile banner"),
    "facebook-cover": (1640, 624, "Facebook page cover (sides crop on mobile — keep text centered)"),
}


def card_text(ctx, card):
    sl = ctx.cfg["slogans"]
    if card.get("gotv"):
        return f"{ctx.L('en', 'return')}. {ctx.L('en', 'vote_by', date=fmt_date(ctx.eday, 'en', long=True))}."
    return sl[card["slogan_index"]]["text"]


def social_card(ctx, card, fmt, w, h, safe):
    P = ctx.P
    d = Doc(w, h, unit="px", title=f"Social {card['id']} {fmt}")
    d.rect("background", 0, 0, w, h, P["primary"])
    m = round(min(w, h) * 0.075)
    top = m + safe[0]
    bottom = h - m - safe[1]
    d.rect("art", m, top, w * 0.12, max(6, h * 0.008), P["secondary"])
    ks = min(w, h) * 0.04
    d.text("text", m, top + ks * 2.2, card["kicker"].upper(), ctx.sub, ks, P["secondary"], spacing=ks * 0.08)
    main = card_text(ctx, card)
    lockup_h = min(w, h) * 0.22
    avail_h = bottom - lockup_h - (top + ks * 3.4) - m * 0.5
    size = min(w, h) * (0.19 if w / h > 1.5 else 0.13)
    while size > 14:
        lines = ctx.head.wrap(main, size, w - 2 * m)
        if len(lines) * size * 1.05 <= avail_h and all(ctx.head.width(l, size) <= w - 2 * m for l in lines):
            break
        size -= 2
    d.fitted_block("text", m, top + ks * 3.4, w - 2 * m, main, ctx.head, size, P["paper"], max_lines=6,
                   leading=1.05)
    if card.get("source_from_q2") is not None:
        src = ctx.mb["q2"][card["source_from_q2"]]["source"]
        d.text("text", m, bottom - lockup_h - ks * 0.5, f"Source: {src}", ctx.body, ks * 0.7, P["paper"])
    ly = bottom - lockup_h + ks * 0.4
    name = ctx.cand["full_name"].upper()
    ns = min(ctx.head.fit(name, (w - 2 * m) * 0.75, lockup_h * 0.42), lockup_h * 0.42)
    d.text("text", m, ly + ctx.head.cap(ns), name, ctx.head, ns, P["paper"])
    os_ = ns * 0.42
    d.text("text", m, ly + ctx.head.cap(ns) + os_ * 1.7, ctx.tr("en")["office_line"].upper(), ctx.sub, os_,
           P["secondary"], spacing=os_ * 0.06)
    d.text("text", m, ly + ctx.head.cap(ns) + os_ * 3.4, ctx.domain, ctx.body, os_ * 0.9, P["paper"])
    disc = ctx.tr("en")["disclaimer"]
    dy = h - m * 0.45 if safe[1] == 0 else bottom + ks * 1.6
    d.text("disclaimer", w - m, dy, disc, ctx.body,
           max(10, min(w, h) * 0.018), P["paper"], anchor="end")
    return d


def banner(ctx, fmt, w, h):
    P = ctx.P
    d = Doc(w, h, unit="px", title=f"Ad {fmt}")
    d.rect("background", 0, 0, w, h, P["primary"])
    name = ctx.cand["full_name"].upper()
    slogan = ctx.cfg["slogans"][0]["text"]
    office = ctx.tr("en")["office_line"].upper()
    btn = ctx.L("en", "learn")
    if h <= 100:                                     # leaderboard / mobile banner: one row
        pad = h * 0.14
        bw = ctx.sub.width(btn, h * 0.24) + h * 0.5 if w > 400 else 0
        ns = ctx.head.fit(name, (w - bw) * (0.42 if w > 400 else 0.95), h * 0.42)
        d.text("text", pad, h * 0.52 + (0 if w > 400 else -h * 0.05), name, ctx.head, ns, P["paper"])
        os_ = min(h * 0.2, ctx.sub.fit(office, (w - bw) * 0.4, h * 0.2))
        d.text("text", pad, h * 0.52 + os_ * 1.4, office, ctx.sub, os_, P["secondary"])
        if w > 400:
            sx = pad + (w - bw) * 0.45
            ss = ctx.sub.fit(slogan, w - bw - sx - pad * 2, h * 0.3)
            d.text("text", sx, h / 2 + ctx.sub.cap(ss) / 2, slogan, ctx.sub, ss, P["paper"])
            d.rect("art", w - bw - pad, h * 0.25, bw, h * 0.5, P["secondary"], rx=4)
            d.text("text", w - bw / 2 - pad, h / 2 + ctx.sub.cap(h * 0.24) / 2, btn, ctx.sub, h * 0.24, P["ink"],
                   "middle")
    elif w <= 200:                                   # skyscraper
        m = 14
        mark(d, ctx, m, m, w - 2 * m, P["paper"], P["primary"], P["secondary"])
        y = w + 10
        y, _ = name_lockup(d, ctx, m, y, w - 2 * m, on_dark=True, last_max=40)
        d.fitted_block("text", m, y + 30, w - 2 * m, slogan, ctx.sub, 22, P["paper"], max_lines=5)
        d.rect("art", m, h - 70, w - 2 * m, 40, P["secondary"], rx=4)
        d.text("text", w / 2, h - 44, btn, ctx.sub, 15, P["ink"], "middle")
    else:                                            # rectangles and covers
        m = min(w, h) * 0.08
        if fmt == "facebook-cover":
            safe_l = (w - 1200) / 2
            d.rect("proof-only", safe_l, 0, 1200, h, None, stroke="#EC008C", sw=2, dash="10 6")
            name_lockup(d, ctx, safe_l + 40, h * 0.18, 620, on_dark=True, last_max=150)
            d.fitted_block("text", safe_l + 700, h * 0.32, 460, slogan, ctx.sub, 64, P["secondary"], max_lines=3)
        else:
            y, _ = name_lockup(d, ctx, m, m, w - 2 * m, on_dark=True, last_max=h * 0.2)
            d.fitted_block("text", m, y + m * 0.6, w - 2 * m, slogan, ctx.sub, h * 0.11, P["paper"], max_lines=2)
            bs = max(11, h * 0.045)
            bw = ctx.sub.width(btn, bs) + bs * 2
            d.rect("art", m, h - m - bs * 2.4, bw, bs * 2.2, P["secondary"], rx=4)
            d.text("text", m + bw / 2, h - m - bs * 0.9, btn, ctx.sub, bs, P["ink"], "middle")
    return d


# ---------------------------------------------------------------------------
# EMAIL: listmonk and Mautic renders of every sequence message
# ---------------------------------------------------------------------------
TOKENS = {
    "listmonk": {"first_name": "{{ .Subscriber.FirstName }}", "unsubscribe": "{{ UnsubscribeURL }}",
                 "view_online": "{{ MessageURL }}"},
    "mautic": {"first_name": "{contactfield=firstname|friend}", "unsubscribe": "{unsubscribe_url}",
               "view_online": "{webview_url}"},
}


def get_path(obj, path):
    for part in path.split("."):
        if isinstance(obj, list):
            obj = obj[int(part)]
        else:
            obj = obj[part]
    return obj


def md_inline(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" style="color:{link};">\1</a>', s)
    return s


def md_to_email_html(body, P):
    out, lst = [], []

    def flush():
        if lst:
            out.append('<ul style="margin:0 0 16px 20px;padding:0;">' + "".join(
                f'<li style="margin:0 0 6px 0;">{md_inline(i)}</li>' for i in lst) + "</ul>")
            lst.clear()
    for block in re.split(r"\n\s*\n", body.strip()):
        lines = block.strip().splitlines()
        if all(l.startswith("- ") for l in lines):
            lst.extend(l[2:] for l in lines)
            continue
        flush()
        b = block.strip()
        mb = re.match(r"^\[\[button:\s*(.+?)\s*\|\s*(.+?)\s*\]\]$", b)
        if mb:
            out.append(f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;"><tr>'
                       f'<td style="background:{P["accent"]};border-radius:6px;">'
                       f'<a href="{esc(mb.group(2))}" style="display:inline-block;padding:14px 26px;color:{P["paper"]};'
                       f'font-weight:700;text-decoration:none;font-family:Arial,sans-serif;font-size:17px;">'
                       f'{esc(mb.group(1))}</a></td></tr></table>')
        elif b.startswith("> "):
            out.append(f'<p style="margin:0 0 18px 0;padding:14px 18px;background:{P["tint"]};border-left:5px solid '
                       f'{P["secondary"]};font-size:18px;line-height:1.45;">{md_inline(b[2:])}</p>')
        elif b.startswith("## "):
            out.append(f'<h2 style="margin:8px 0 6px 0;font-size:20px;color:{P["primary"]};'
                       f'font-family:Arial,sans-serif;">{md_inline(lines[0][3:])}</h2>')
            if len(lines) > 1:
                out.append(f'<p style="margin:0 0 16px 0;">{md_inline(" ".join(lines[1:]))}</p>')
        else:
            out.append(f'<p style="margin:0 0 16px 0;">{md_inline(" ".join(lines))}</p>')
    flush()
    return "\n".join(out).replace("{link}", P["primary"])


def email_shell(ctx, inner, preheader, platform, lang="en"):
    P, t = ctx.P, ctx.tr(lang)
    tok = TOKENS[platform]
    addr = esc(ctx.cfg["web"]["mailing_address"])
    unsub = "Unsubscribe" if lang == "en" else "Cancelar suscripción"
    return f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{esc(ctx.cand['full_name'])}</title></head>
<body style="margin:0;padding:0;background:{P['tint']};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{P['tint']};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:{P['paper']};border-radius:8px;overflow:hidden;">
<tr><td style="background:{P['primary']};padding:22px 28px;font-family:Arial,sans-serif;">
<div style="color:{P['paper']};font-size:13px;letter-spacing:2px;font-weight:700;">{esc(ctx.cand['first_name'].upper())}</div>
<div style="color:{P['paper']};font-size:32px;font-weight:900;line-height:1.05;">{esc(ctx.cand['last_name'].upper())}</div>
<div style="color:{P['secondary']};font-size:12px;letter-spacing:1px;font-weight:700;margin-top:4px;">{esc(t['office_line'].upper())}</div>
</td></tr>
<tr><td style="padding:28px;font-family:Georgia,'Source Serif 4',serif;font-size:17px;line-height:1.55;color:{P['ink']};">
{inner}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid {P['tint']};font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:{P['ink']};">
<div style="border:1px solid {P['ink']};padding:6px 8px;display:inline-block;">{esc(t['disclaimer'])}</div><br>
{addr}<br>
<a href="{tok['unsubscribe']}" style="color:{P['primary']};">{unsub}</a> · <a href="{tok['view_online']}" style="color:{P['primary']};">View online</a>
</td></tr></table></td></tr></table></body></html>
"""


def parse_message(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, m.group(2)


def fill_tokens(text, ctx, platform, lang):
    t = ctx.tr(lang)
    data = {"cfg": ctx.cfg, "t": t,
            "date": {k: fmt_date(v, lang, long=True) for k, v in ctx.dates.items()}}

    def rep(mo):
        key = mo.group(1).strip()
        if key in TOKENS[platform]:
            return TOKENS[platform][key]
        try:
            return str(get_path(data, key))
        except (KeyError, IndexError, ValueError, TypeError):
            warn(f"Email token '{key}' not found in campaign.json")
            return "{{" + key + "}}"
    return re.sub(r"\{\{\s*([^}]+?)\s*\}\}", rep, text)


def build_email(ctx, outdir, msg_dir):
    rows = []
    for path in sorted(glob.glob(os.path.join(msg_dir, "*.md"))):
        meta, body = parse_message(path)
        lang = meta.get("lang", "en")
        if lang != "en" and ctx.cfg.get("language", {}).get("secondary") != lang:
            continue
        name = os.path.splitext(os.path.basename(path))[0]
        for platform in ("listmonk", "mautic"):
            subject = fill_tokens(meta["subject"], ctx, platform, lang)
            pre = fill_tokens(meta.get("preheader", ""), ctx, platform, lang)
            inner = md_to_email_html(fill_tokens(body, ctx, platform, lang), ctx.P)
            os.makedirs(os.path.join(outdir, platform), exist_ok=True)
            if platform == "listmonk":
                html_out = inner  # campaign body; wrapper lives in the listmonk template
            else:
                html_out = email_shell(ctx, inner, pre, platform, lang)
            with open(os.path.join(outdir, platform, name + ".html"), "w", encoding="utf-8") as f:
                f.write(html_out)
        anchor, off = meta.get("anchor", "signup"), int(meta.get("offset_days", "0"))
        when = ""
        if anchor in ctx.dates:
            when = (ctx.dates[anchor] + dt.timedelta(days=off)).isoformat()
        rows.append({"file": name, "sequence": meta.get("sequence"), "step": meta.get("step"), "lang": lang,
                     "trigger": meta.get("trigger", ""), "anchor": anchor, "offset_days": off, "send_date": when,
                     "segment": meta.get("segment", ""), "quadrants": meta.get("quadrants", ""),
                     "subject": fill_tokens(meta["subject"], ctx, "listmonk", lang)})
    # listmonk wrapper template
    shell = email_shell(ctx, '{{ template "content" . }}', "", "listmonk")
    with open(os.path.join(outdir, "listmonk", "_listmonk-template.html"), "w", encoding="utf-8") as f:
        f.write(shell)
    with open(os.path.join(outdir, "sequences.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)
    return rows


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
def save(doc, path_noext, proof=True, pdf=True, png=False, png_width=None):
    os.makedirs(os.path.dirname(path_noext), exist_ok=True)
    with open(path_noext + ".svg", "w", encoding="utf-8") as f:
        f.write(doc.svg(proof=False))
    if proof and doc.unit == "in":
        with open(path_noext + ".proof.svg", "w", encoding="utf-8") as f:
            f.write(doc.svg(proof=True))
    rsvg = shutil.which("rsvg-convert")
    if rsvg and pdf:
        subprocess.run([rsvg, "-f", "pdf", "-o", path_noext + ".pdf", path_noext + ".svg"], check=False)
    if rsvg and png:
        args = [rsvg, "-f", "png", "-o", path_noext + ".png"]
        if png_width:
            args += ["-w", str(png_width)]
        subprocess.run(args + [path_noext + ".svg"], check=False)


def merge_pdfs(paths, out):
    rsvg = shutil.which("rsvg-convert")
    if rsvg and paths:
        subprocess.run([rsvg, "-f", "pdf", "-o", out] + paths, check=False)


def write_csv(path, rows):
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)


def validate(cfg):
    errs = []
    valid_q = {"Q1", "Q2", "Q3", "Q4"}
    valid_t = {"Persuade", "Turn Out", "Base - Light Touch", "Skip", "All"}
    for s in cfg.get("slogans", []):
        if not s.get("quadrants") or not set(s["quadrants"]) <= valid_q:
            errs.append(f"Slogan '{s.get('text')}' needs quadrants from Q1–Q4.")
        if "Q4" in s.get("quadrants", []):
            errs.append(f"Slogan '{s['text']}' is labeled Q4 (what THEY say about themselves) — "
                        "your materials should live in Q1/Q2, with Q3 answers.")
    if not 5 <= len(cfg.get("slogans", [])) <= 10:
        errs.append("Write 5–10 slogans (the brief asks for this range).")
    for p in cfg["pieces"]:
        if not p.get("quadrants"):
            errs.append(f"Piece '{p['id']}' has no message-box quadrant.")
        if not p.get("targets") or not set(p["targets"]) <= valid_t:
            errs.append(f"Piece '{p['id']}' targets must be Step 1 categories: {sorted(valid_t)}")
        if "Skip" in p.get("targets", []):
            errs.append(f"Piece '{p['id']}' targets Skip precincts — Step 1 says don't spend there.")
        if "Q2" in p.get("quadrants", []) and not all(q.get("source") for q in cfg["message_box"].get("q2", [])):
            errs.append(f"Piece '{p['id']}' uses contrast (Q2): every Q2 point needs a source.")
    words = len([w for w in cfg["message_box"]["core_message"].split() if re.search(r"\w", w)])
    if words >= 25:
        warn(f"Core message is {words} words — Step 1 asks for under 25. Tighten it before it goes on print.")
    return errs


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config")
    ap.add_argument("--out", help="output folder (default: creative/build/<slug>)")
    ap.add_argument("--palette")
    ap.add_argument("--pairing")
    ap.add_argument("--fonts-dir", help="folder of .ttf/.otf files to measure and use")
    ap.add_argument("--no-email", action="store_true")
    a = ap.parse_args()

    with open(a.config, encoding="utf-8") as f:
        cfg = json.load(f)
    brand_path = os.path.join(KIT, "creative", "brand", "brand.json")
    with open(brand_path, encoding="utf-8") as f:
        brand = json.load(f)
    Font.fonts_dir = a.fonts_dir
    palette = a.palette or cfg["brand"]["palette"]
    pairing = a.pairing or cfg["brand"]["type_pairing"]
    out = a.out or os.path.join(KIT, "creative", "build", cfg.get("slug", "campaign"))
    os.makedirs(out, exist_ok=True)
    print(f"Building creative for {cfg['candidate']['full_name']} → {out}")

    errs = validate(cfg)
    for e in errs:
        print("  ✗ " + e)
    if errs:
        print("Fix the problems above in your campaign.json, then run again.")
        return 1

    ok, rows = check_palette(palette, brand["palettes"][palette], brand["contrast_pairs"])
    if not ok:
        print(f"  ✗ Palette '{palette}' fails contrast. Run tools/contrast_check.py --palette {palette}")
        return 1
    ctx = Ctx(cfg, brand, palette, pairing)

    # --- brand
    print("Brand…")
    for name, d in lockups(ctx).items():
        save(d, os.path.join(out, "brand", name), pdf=False, png=True)
    save(brand_sheet(ctx, brand, palette, pairing), os.path.join(out, "brand", "brand-sheet"), pdf=True, png=True,
         png_width=1200)
    with open(os.path.join(out, "brand", "contrast.md"), "w", encoding="utf-8") as f:
        f.write(f"# Contrast check — palette `{palette}`\n\nWCAG 2.x contrast ratios. Kit minimums are stricter "
                "than the web minimum for signs and body text.\n\n| Text | On | Ratio | WCAG | Kit min | Pass | Use |\n"
                "|---|---|---|---|---|---|---|\n")
        for r in rows:
            f.write(f"| {r['fg']} `{r['fg_hex']}` | {r['bg']} `{r['bg_hex']}` | {r['ratio']}:1 | {r['wcag']} | "
                    f"{r['kit_min']} | {'✅' if r['pass'] else '❌'} | {r['use']} |\n")

    # --- print
    print("Print…")
    trace, utm_rows, cal_rows = [], [], []
    for piece in cfg["pieces"]:
        pages = PRINT_RENDERERS[piece["type"]](ctx, piece)
        base = os.path.join(out, "print", piece["id"])
        pdfs = []
        for side, d in pages.items():
            save(d, f"{base}-{side}", png=True, png_width=900 if piece["type"] != "yard_sign" else 1400)
            pdfs.append(f"{base}-{side}.svg")
        merge_pdfs(pdfs, f"{base}-print.pdf")
        anchor_date = ctx.dates[piece["anchor"]]
        in_hand = anchor_date + dt.timedelta(days=piece.get("in_hand_offset", 0))
        start_by = in_hand - dt.timedelta(days=piece.get("lead_days", 0))
        url = utm_url(ctx.base, piece.get("qr_path"), piece["utm"]) if piece.get("utm") else ""
        trace.append({"piece": piece["id"], "format": piece["type"], "lang": piece["lang"],
                      "quadrants": " ".join(piece["quadrants"]), "targets": "; ".join(piece["targets"]),
                      "message_used": piece["content"].get("headline") or piece["content"].get("front_headline")
                      or piece["content"].get("slogan", ""),
                      "calendar_anchor": piece["anchor"], "in_hand_or_in_home": in_hand.isoformat(),
                      "start_production_by": start_by.isoformat(), "budget_line": piece["budget"],
                      "utm_campaign": piece.get("utm", {}).get("campaign", ""), "spec": PRINT_SPECS[piece["type"]]})
        if url:
            utm_rows.append({"piece": piece["id"], "qr_url": url, "utm_source": piece["utm"]["source"],
                             "utm_medium": piece["utm"]["medium"], "utm_campaign": piece["utm"]["campaign"],
                             "chars": len(url)})
        cal_rows.append({"date": start_by.isoformat(), "what": f"START production: {piece['id']}",
                         "budget_line": piece["budget"]})
        cal_rows.append({"date": in_hand.isoformat(), "what": f"IN HAND / IN HOMES: {piece['id']}",
                         "budget_line": piece["budget"]})

    # --- social + ads
    print("Social and ads…")
    for card in cfg["social"]["cards"]:
        for fmt, (w, h, plat, note, safe) in SOCIAL_FORMATS.items():
            d = social_card(ctx, card, fmt, w, h, safe)
            save(d, os.path.join(out, "social", f"{card['id']}-{fmt}"), pdf=False, png=True)
        trace.append({"piece": f"social-{card['id']}", "format": "social (5 sizes)", "lang": "en",
                      "quadrants": " ".join(card["quadrants"]),
                      "targets": "Geo-target Persuade + Turn Out precincts (ads)", "message_used": card_text(ctx, card),
                      "calendar_anchor": "ballots_out" if card.get("gotv") else "persuasion_starts",
                      "in_hand_or_in_home": (ctx.dates["ballots_out"] if card.get("gotv")
                                             else ctx.dates["persuasion_starts"]).isoformat(),
                      "start_production_by": "", "budget_line": "Digital",
                      "utm_campaign": cfg["social"]["utm_campaign"], "spec": "See social/README.md"})
    for fmt, (w, h, plat) in AD_FORMATS.items():
        save(banner(ctx, fmt, w, h), os.path.join(out, "ads", fmt), pdf=False, png=True)
    trace.append({"piece": "display-ads", "format": "Google display + Facebook cover", "lang": "en",
                  "quadrants": " ".join(cfg["slogans"][0]["quadrants"]), "targets": "Geo-target Persuade + Turn Out",
                  "message_used": cfg["slogans"][0]["text"], "calendar_anchor": "ballots_out",
                  "in_hand_or_in_home": (ctx.dates["ballots_out"] - dt.timedelta(days=7)).isoformat(),
                  "start_production_by": (ctx.dates["ballots_out"] - dt.timedelta(days=28)).isoformat(),
                  "budget_line": "Digital", "utm_campaign": "ads", "spec": "See social/README.md — verification first"})
    cal_rows.append({"date": (ctx.dates["ballots_out"] - dt.timedelta(days=28)).isoformat(),
                     "what": "START political-ad verification (Meta, Google) — can take days or weeks",
                     "budget_line": "Digital"})
    for s in cfg["social"]["cards"]:
        utm_rows.append({"piece": f"social-{s['id']}",
                         "qr_url": utm_url(ctx.base, "/", {"source": "social", "medium": "organic",
                                                           "campaign": cfg['social']['utm_campaign']}),
                         "utm_source": "social", "utm_medium": "organic", "utm_campaign": cfg["social"]["utm_campaign"],
                         "chars": ""})
    for src in ("facebook", "google"):
        utm_rows.append({"piece": f"ads-{src}", "qr_url": utm_url(ctx.base, "/", {"source": src, "medium": "paid",
                                                                                   "campaign": "ads"}),
                         "utm_source": src, "utm_medium": "paid", "utm_campaign": "ads", "chars": ""})

    # --- email
    if not a.no_email:
        print("Email…")
        erows = build_email(ctx, os.path.join(out, "email"), os.path.join(KIT, "creative", "email", "messages"))
        for r in erows:
            trace.append({"piece": f"email-{r['file']}", "format": f"email ({r['sequence']})", "lang": r["lang"],
                          "quadrants": r["quadrants"], "targets": r["segment"], "message_used": r["subject"],
                          "calendar_anchor": r["anchor"], "in_hand_or_in_home": r["send_date"],
                          "start_production_by": "", "budget_line": "Digital", "utm_campaign": f"email-{r['sequence']}",
                          "spec": "creative/email/README.md"})
            if r["send_date"]:
                cal_rows.append({"date": r["send_date"], "what": f"SEND email: {r['file']} — {r['subject']}",
                                 "budget_line": "Digital"})

    # --- election milestones into the calendar
    for k, v in ctx.dates.items():
        cal_rows.append({"date": v.isoformat(), "what": f"MILESTONE: {k.replace('_', ' ')}", "budget_line": ""})
    cal_rows.sort(key=lambda r: r["date"])

    write_csv(os.path.join(out, "traceability.csv"), trace)
    write_csv(os.path.join(out, "utm-plan.csv"), utm_rows)
    write_csv(os.path.join(out, "creative-calendar.csv"), cal_rows)
    with open(os.path.join(out, "legibility.md"), "w", encoding="utf-8") as f:
        f.write("# Yard sign legibility at 35 mph\n\nRule of thumb used: about **30 feet of readable distance per inch "
                "of capital-letter height** for bold sans type in high contrast (common sign-industry guidance; real "
                "results depend on light, angle and eyesight). At 35 mph a car covers about 51 feet per second.\n\n"
                "| Piece | Element | Text | Cap height | Readable to | Seconds at 35 mph |\n|---|---|---|---|---|---|\n")
        for pid, el, txt, cin, dist, secs in LEGIBILITY:
            if cin is None:
                f.write(f"| {pid} | {el} | {txt} | | | |\n")
            else:
                f.write(f"| {pid} | {el} | {txt} | {cin:.1f} in | ~{dist:.0f} ft | ~{secs:.1f} s |\n")
        f.write("\nTargets: name ≥ 3.5 in caps, 7 or fewer words in the primary read, contrast ≥ 7:1, no thin or "
                "script fonts, no photos on yard signs.\n")
    with open(os.path.join(out, "BUILD-NOTES.md"), "w", encoding="utf-8") as f:
        f.write(f"# Build notes — {cfg['candidate']['full_name']}\n\nPalette `{palette}`, type pairing `{pairing}`. "
                f"Built {dt.date.today().isoformat()}.\n\n")
        f.write("## Warnings\n\n" + ("\n".join(f"- {w}" for w in dict.fromkeys(WARNINGS)) or "- None") + "\n")
    n_warn = len(dict.fromkeys(WARNINGS))
    print(f"Done. {n_warn} warning(s). See BUILD-NOTES.md, traceability.csv and creative-calendar.csv in {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
