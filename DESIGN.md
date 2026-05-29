# Design System — Lope

> Read this before any visual or UI decision. Fonts, colors, spacing, motion, and
> aesthetic direction are defined here. Don't deviate without explicit approval.

## Product Context
- **What this is:** A browser extension that saves X / WeChat / Xiaohongshu / Zhihu / generic articles into a Notion knowledge base that AI agents read later.
- **Who it's for:** Solo builders and bilingual (EN/CN) power users who run AI agents and treat agents as a first-class audience. The human UX exists to cheaply feed the pipeline; agent consumption is the real product.
- **Space:** Capture / read-it-later / knowledge tools — Pocket, Readwise, MyMind, Notion Web Clipper — but agent-first, not human-archive-first.
- **Project type:** Chrome extension (popup + reflex toast + welcome + options).

## Aesthetic Direction
- **Direction:** "Ink on paper, built for speed." Refined-instrument minimalism (Linear / iA Writer / Vercel lineage) — but **warm**, not the cold blue-gray dev-tool cliché.
- **Named motif — Soft Bloom:** the brand's organizing idea is *a captured point of attention landing softly* — rendered as a soft amber bloom. The bloom is the logo, the save signal, and the motion language all in one.
- **Decoration level:** Minimal. Typography, generous space, and one accent (the bloom) do the work.
- **Mood:** Precise, calm, unhurried — "save without breaking stride." Warm paper keeps it human; the rare amber makes a save feel like it *landed*.
- **Hard kill:** The legacy Twitter-blue (`#1D9BF0`) and the X letterform. Lope is no longer X-only.

## Logo / Mark — LOCKED (Soft Bloom)
The mark is a **soft amber bloom** — a radial glow of `--amber` fading to transparent, faint grain. Meaning: a captured point of attention landing softly. Decided 2026-05-28 via image-gen.

- **Primary mark:** the amber soft bloom.
- **Wordmark:** `lope`, lowercase, General Sans 700, tracking ≈ -0.04em. Bloom sits to the left of the wordmark in the horizontal lockup.
- **Monochrome variant:** gray bloom (`--mute` family) + ink wordmark — for single-color contexts.
- **App-icon tiles:** *light* = bloom on a `--paper` rounded-square tile; *dark* = bloom on a `--ink` rounded-square tile (squircle, radius ≈ 23%).
- **Size-specific icons (REQUIRED — a soft blur goes muddy small):**
  - **128 / 48:** full soft bloom (wide radial gradient + subtle grain).
  - **32 / 16:** crisp **amber seed dot + tight halo** — more opaque core, minimal blur, so it reads on a busy toolbar. This is the "tiny-size fallback," not optional.
- **Toolbar `action.default_icon`:** ship the seed+halo at 16/32 so it survives both light and dark Chrome toolbars (a faint bloom on transparent washes out on light chrome).
- **Asset format:** render the bloom as an **SVG** (`radialGradient` + optional `feTurbulence` grain) for scalable surfaces; export the four PNG sizes for the manifest. Keep an `.svg` master in `public/icons/`.

## Typography
Self-host all three as `woff2` in the extension — **do not** load from a CDN (MV3 CSP + popups must render instantly).
- **Display / Wordmark:** **General Sans** (Fontshare) — geometric-humanist, characterful without shouting. Weights 500/600/700.
- **UI / Body:** **Geist** (OFL) — engineered for small sizes, tool-native. Weights 400/500/600.
- **Agent payload / code / metadata:** **Geist Mono** (OFL) — used *only* where it's meaningful: the markdown envelope, URLs, code. Not decorative "techy" flavor.
- **Scale (px) — dual:**
  - *Brand / welcome surfaces:* display 64 / 56 / 48, h1 32, h2 24.
  - *App UI (popup/options — 360px, cramped):* h2 22 / title 15 / body 14 / ui 13 / small 12 / micro 11 (mono labels).
  - Don't use 48px+ inside the popup; don't use 11–13px on the welcome hero.
- **Tracking:** tighten display/headings (-0.02 to -0.045em); body normal.

## Color
Warm ink + warm paper + a single accent. Tint neutrals warm — never pure black/white.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1A1916` | Primary text, ink tile, filled "Save" button, toast bg |
| `--ink-2` | `#3A3833` | Secondary text |
| `--mute` | `#8C867A` | Tertiary / metadata text |
| `--line` | `#E4DFD5` | Hairlines, dividers |
| `--line-2` | `#D6D0C4` | Stronger borders, outline buttons |
| `--paper` | `#FAF8F3` | App background |
| `--paper-2` | `#F1EEE7` | Recessed surfaces (cards, wells) |
| `--amber` | `#D98A2B` | **Accent — the save/live moment ONLY.** Toast dot, saving state, the mark's accent. Never decorative. |
| `--amber-soft` | `#F3E4CC` | Amber tint (active pill bg) |
| `--danger` | `#C0492F` | Errors (warm clay red) |
| `--success` | `#4F9D69` | Rare — most "positive" states use amber instead |

- **Discipline:** amber is *rare*. If everything is amber, nothing is. A save landing earns it.
- **Dark surfaces:** the ink tile / toast are the only dark surfaces; the app is light (paper). No full dark mode for v1.

## Spacing
- **Base unit:** 4px. **Density:** comfortable.
- **Scale:** 2xs(2) xs(4) sm(8) md(12) lg(16) xl(24) 2xl(32) 3xl(48).

## Layout
- **Popup width:** 360px. **Content padding:** 16px.
- **Radius:** sm 6 / md 8 / lg 10 / xl 12 / icon-tile ≈ 23% of size (rounded-square "squircle" feel).
- **Buttons:** 38–40px tall. Two-verb action row = outline "Copy" (`--line-2`) + ink-filled "Save to Notion".

## Motion
- **Approach:** minimal-functional. Motion confirms state; it doesn't perform.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` standard. No bounce/elastic.
- **Duration:** micro 100ms / fast 150ms / normal 250ms / slow 300ms.
- **Save signature — seed → bloom → settle:** the save confirmation grows from a small amber seed, blooms outward, then settles. This is the one signature moment — it ties the logo to the interaction. Use it on the toast dot (and optionally the popup on save). Keep it ~250–300ms; `transform`/`opacity` only.
- **Other signatures:** toast enters 180ms (slide+fade from top-right); "Copied" confirmation holds ~1.6s then reverts.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-28 | Kill Twitter-blue → warm ink + paper + amber | Rebrand X2Notion → Lope; no longer X-only; warmth differentiates from cold dev-tool look |
| 2026-05-28 | Amber `#D98A2B` = save/live accent, used sparingly | One meaningful accent; the "a save just landed" signal (toast dot, saving state) |
| 2026-05-28 | Type: General Sans + Geist + Geist Mono (self-hosted) | Characterful-but-clean; mono only for agent-facing payload |
| 2026-05-28 | Pictorial mark deferred to image-gen | 4 hand-coded SVG rounds didn't converge; wrong medium. Wordmark ships meanwhile |
| 2026-05-28 | **Logo locked: Soft Bloom** (amber radial glow) + lowercase `lope` wordmark | Image-gen landed it; embodies "captured attention landing softly"; 16/32 use seed+halo fallback for legibility |
| 2026-05-28 | Save motion = seed → bloom → settle | Ties the bloom logo to the save interaction — one signature moment |
| 2026-05-28 | Type scale split into Brand vs App-UI | Board's 48–64px display can't live in a 360px popup; popup keeps 12–15px |
| 2026-05-29 | Warm system migrated into shipped CSS; `--brand` bifurcated → ink (actions) + amber (save) | Killed the three-brands chimera (Twitter-blue + cold-gray + warm). `design-tokens.css` is now canonical warm |
| 2026-05-29 | Fonts bundled self-hosted (`public/fonts/`, `public/fonts.css`) | General Sans 500/600/700 (Fontshare static) + Geist + Geist Mono (variable). 136K total. Linked in popup/welcome/options HTML. Toast keeps system fallback (3rd-party page, would need web_accessible_resources) |

---

## Appendix — Asset Production

The mark (Soft Bloom) was chosen via image-gen (the earlier text-prompt brief is superseded). To ship it:

**Bloom recipe (SVG master → `public/icons/lope-bloom.svg`):**
- `radialGradient`: center `--amber #D98A2B` at ~85% opacity → `amber-soft` midstop → transparent edge.
- Optional grain: `feTurbulence` (baseFrequency ~0.9) + `feColorMatrix`, very low opacity, to avoid a flat CSS-gradient look.
- Tile variants: same bloom centered on a `--paper` (light) or `--ink` (dark) squircle, radius ≈ 23% of size.

**Manifest PNGs (`public/icons/icon{16,32,48,128}.png`):**
| Size | Treatment |
|------|-----------|
| 128, 48 | full soft bloom (wide gradient + grain), on transparent or paper tile |
| 32, 16 | **crisp amber seed dot + tight halo** — opaque core, minimal blur, reads on toolbar |

**Wordmark:** typeset live in real **General Sans 700** (don't ship the image-gen raster of "lope" — it's an approximation). Lockup = bloom + wordmark, baseline-aligned, gap ≈ 0.4× cap-height.

**Note:** the board's component copy ("Save Clip", "Saved to Knowledge") is illustrative — the shipped UI uses the deliberate two-verb model: **Copy** (clipboard only) + **Save to Notion** (persist), reflex toast **"Saved · Copied"**. Don't regress to single-button copy.
