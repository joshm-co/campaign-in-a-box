# Social Graphics and Digital Ads

The build makes organic social cards and paid-ad templates from the same message box, colors and type as your print pieces. Online should repeat the mail, not invent a new campaign.

## Organic posts (`build/<slug>/social/`)

Three cards, each in five sizes:

| Card | Message | Quadrant |
|---|---|---|
| `core-*` | Your primary slogan | Q1 (+ Q2) |
| `contrast-*` | Your contrast slogan **with its source printed on the card** | Q2 |
| `gotv-*` | "Return your ballot. Vote by [Election Day]." | Q1 |

| Size | Pixels | Use |
|---|---|---|
| `square` | 1080 × 1080 | Instagram/Facebook feed, Nextdoor, Meta ads |
| `portrait` | 1080 × 1350 (4:5) | Instagram/Facebook feed — the biggest footprint in the feed |
| `story` | 1080 × 1920 (9:16) | Stories, Reels covers, story ads. Text stays out of the top 250 px and bottom 340 px, where app buttons sit |
| `landscape` | 1200 × 630 | Link previews (Facebook, LinkedIn, X), website share image |
| `wide` | 1600 × 900 | X in-stream images, email headers |

Add cards in `campaign.json → social.cards` (point `slogan_index` at any slogan; add `source_from_q2` for contrast cards).

Platforms change their recommended sizes often. If a platform crops your image, check its current help page and add a size to `SOCIAL_FORMATS` in `tools/build_creative.py`.

## Paid ad templates (`build/<slug>/ads/`)

| File | Size | Use |
|---|---|---|
| `display-1200x628`, `display-1200x1200` | Responsive display images | Google responsive display ads |
| `display-300x250`, `728x90`, `160x600`, `320x50` | Standard banners | Google display network, local news sites |
| `facebook-cover` | 1640 × 624 | Facebook page cover (keep text in the center 1200 px; mobile crops the sides) |
| social `square` / `story` | 1080 × 1080, 1080 × 1920 | Meta (Facebook/Instagram) feed and story ads |

**Target ads to your Step 1 precincts.** Most platforms target by ZIP code or a radius, not precinct. Pick the ZIPs or radius that best cover your Persuade and Turn Out precincts, and don't pay to reach Skip areas. If you can legally upload a voter-file audience ⚖️, that's more precise.

Every ad link uses `utm_medium=paid` (see `utm-plan.csv`).

## Political-ad verification: start early

Platforms require extra steps before you can run political ads, and approval can take days or weeks. **Start verification when you start production — your calendar shows the date.** Policies change often; read the current policy page before you begin.

**Meta (Facebook, Instagram).** Political, electoral and social-issue ads require authorization (identity and location confirmation for the person running ads, often with a mailing step) and a "Paid for by" disclaimer that Meta shows on the ad. Ads are kept in Meta's public Ad Library. For the 2026 US midterms, Meta blocked new political ads during the final week of the campaign, though ads that had already run could continue — plan your final-week ads to launch earlier. Meta also requires disclosure when AI is used to create or alter certain political ads. ([Meta, 2026](https://about.fb.com/news/2026/02/meta-prepares-for-2026-us-midterms/); [Meta ad standards](https://transparency.meta.com/policies/ad-standards/siep-advertising/siep))

**Google (Search, YouTube, display).** Advertisers must complete Google's election-advertiser verification to run US election ads. Google's US definition covers ads featuring federal and state-level officeholders and candidates, parties, and qualified state ballot measures. **Rules for local races vary by state:** in some states Google doesn't allow ads about local candidates at all. Check Google's state-specific page for yours before budgeting for Google. ([Google political content policy](https://support.google.com/adspolicy/answer/15081741))

**Other platforms.** TikTok has long prohibited paid political ads. X, Snapchat, Nextdoor, streaming and local news sites each have their own rules — check before you budget.

## ⚖️ What state law may add

- A disclaimer **inside the ad image itself**, not just the platform's label. Some states exempt small digital ads if the disclaimer is one click away. The templates include a disclaimer on every card; don't remove it until you've checked.
- Disclosure of AI-generated or "synthetic" images, audio or video in political ads.
- Reporting digital ad spending, or requiring platforms to keep records.

## Rules of thumb

- One message per graphic. Text short enough to read in two seconds.
- Use real photos of the candidate in your community; they outperform graphics. These templates are for text cards and ads.
- Add alt text when you post. For a card, the alt text is the words on the card.
- Caption videos. Many people watch with the sound off.
