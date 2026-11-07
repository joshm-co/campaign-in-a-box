# Campaign Website (Eleventy)

A fast, accessible static site built from your `campaign.json`. No database, no plugins to update, nothing to hack. Free to host.

**Pages:** home, about, priorities (issues + sourced record + answers to attacks), donate, volunteer (signup form), how to vote, privacy, 404. Spanish versions of home, priorities, vote and volunteer appear automatically when `language.secondary` is `"es"`.

## Build it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd creative/website
npm install
npm start              # preview at http://localhost:8080, reloads as you edit
npm run build          # writes the finished site to _site/
```

The site reads `../campaign.json` (or `../campaign.example.json` if you haven't made one). Run `tools/build_creative.py` first so the site picks up your share image and icon.

## Put it online (free options)

Any static host works. Point it at `creative/website`, build command `npm run build`, output folder `_site`:

- **Netlify** or **Cloudflare Pages** — connect your GitHub repo; it rebuilds on every change.
- **GitHub Pages** — free for public repos.
- Buy your own domain (about $12/year) and connect it. Use the same domain for email (see `email/README.md`).

## What makes it fast and accessible

- **No JavaScript.** Pages are plain HTML and one small stylesheet.
- **Self-hosted fonts** from `@fontsource` (no requests to Google; faster and more private). Preloaded, with `font-display: swap`.
- Colors come from your WCAG-checked palette. Body text is ≥ 7:1.
- Skip link, landmarks, one `h1` per page, visible focus outlines, labeled form fields, 44 px tap targets, `lang` attributes and `hreflang` links between English and Spanish pages.
- Mobile-first layout with no horizontal scrolling.

The Rivertown example passes axe-core WCAG 2.1 AA checks with zero violations on every page, and scores 100 in all four Lighthouse categories (mobile: performance, accessibility, best practices, SEO; ~106 KB home page). Step 3 sets the pass thresholds you should hold your own site to.

## Connecting the pieces

| Thing | Where to set it | Notes |
|---|---|---|
| Volunteer signups | `web.forms` (listmonk URL + list UUIDs) | Each checkbox subscribes to a list, which starts that list's emails |
| Donate button | `web.donate_processor_url` | ActBlue, WinRed, Anedot, or your state's options. The kit doesn't pick one. ⚖️ Your processor must collect what your state requires |
| Analytics | `web.analytics.provider` | `none`, or a privacy-friendly option: Plausible, Umami, GoatCounter. UTM tags from print and email show up there |
| Share image | auto | `build/<slug>/social/core-landscape.png` |
| Voting dates | `election` | ⚖️ **Placeholders until you confirm them with your election office** |

## Editing

- Words: change `campaign.json`. Don't edit the HTML for content.
- Interface text (button labels, headings, Spanish translations): `src/_data/ui.js`.
- Layout: `src/_includes/base.njk`. Styles: `src/css/site.css.njk`.
- Add a page: copy `src/about.njk`, change `permalink`, and add it to the nav in `base.njk`.

## ⚖️ Check before launch

- Disclaimer wording on the site (in the footer of every page)
- What donor information you must collect, and contribution limits
- Whether your state has rules on collecting volunteer data or on privacy notices
- Every date on the vote page
