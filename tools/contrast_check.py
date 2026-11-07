#!/usr/bin/env python3
"""
Campaign-in-a-Box — WCAG contrast check for brand palettes.

Checks every color pair listed in creative/brand/brand.json ("contrast_pairs")
for every palette, using the WCAG 2.x contrast-ratio formula.
Standard library only.

  WCAG AA:  4.5:1 normal text, 3:1 large text (18pt+ or 14pt+ bold)
  WCAG AAA: 7:1 normal text
The kit asks for 7:1 on signs and body text because they're read fast, outdoors,
or by older eyes — stricter than the web minimum.

Usage:
  python3 tools/contrast_check.py                       # all palettes
  python3 tools/contrast_check.py --palette river
  python3 tools/contrast_check.py --fg "#FFFFFF" --bg "#0B4F5C"
Exit code 1 if any pair fails its minimum.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(HERE, "..", "creative", "brand", "brand.json")


def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"Not a hex color: #{h}")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def luminance(h):
    def chan(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (chan(c) for c in hex_to_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def grade(r):
    if r >= 7:
        return "AAA"
    if r >= 4.5:
        return "AA"
    if r >= 3:
        return "AA large only"
    return "FAIL"


def check_palette(key, pal, pairs):
    rows, ok = [], True
    for p in pairs:
        fg, bg = pal[p["fg"]], pal[p["bg"]]
        r = ratio(fg, bg)
        passed = r >= p["min"]
        ok &= passed
        rows.append({"palette": key, "fg": p["fg"], "bg": p["bg"], "fg_hex": fg, "bg_hex": bg,
                     "ratio": round(r, 2), "wcag": grade(r), "kit_min": p["min"],
                     "pass": passed, "use": p["use"]})
    return ok, rows


def load_brand(path=BRAND):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--brand", default=BRAND)
    ap.add_argument("--palette")
    ap.add_argument("--fg")
    ap.add_argument("--bg")
    a = ap.parse_args()

    if a.fg and a.bg:
        r = ratio(a.fg, a.bg)
        print(f"{a.fg} on {a.bg}: {r:.2f}:1  ({grade(r)})")
        return 0 if r >= 4.5 else 1

    brand = load_brand(a.brand)
    all_ok = True
    for key, pal in brand["palettes"].items():
        if a.palette and key != a.palette:
            continue
        ok, rows = check_palette(key, pal, brand["contrast_pairs"])
        all_ok &= ok
        print(f"\n{pal['name']}  [{key}]  {'PASS' if ok else 'FAIL'}")
        for r in rows:
            mark = "ok " if r["pass"] else "XX "
            print(f"  {mark}{r['fg']:>9} on {r['bg']:<9} {r['ratio']:>5.2f}:1  {r['wcag']:<13} "
                  f"(kit min {r['kit_min']})  {r['use']}")
    print("\nAll palettes pass." if all_ok else "\nSome pairs fail. Darken or lighten one color and re-run.")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
