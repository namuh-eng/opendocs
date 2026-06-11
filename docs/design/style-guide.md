# OpenDocs Style Guide — "Warm Craft"

The visual language for OpenDocs, established by the landing page redesign
(`src/components/landing/landing-view.tsx`) and intended to roll out across the
dashboard, editor, and docs surfaces.

**Feel:** warm paper, editorial serif, calm periwinkle. Crafted and literary —
closer to a well-set book than a dev tool. Decoration comes from typography,
soft shadows, and a restrained craft palette, never from noise.

---

## 1. Color

### Core palette

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#f7f4ed` | Page background (warm cream) |
| `--bg-deep` | `#efe9db` | Alternate section background |
| `--panel` | `#ffffff` | Cards, windows, raised surfaces |
| `--panel-warm` | `#faf6ec` | Soft warm surface (sidebars, quote cards) |
| `--panel-muted` | `#f1ecdf` | Muted fills (toolbars, table heads) |
| `--border` | `#e5dfd0` | Hairline borders everywhere |
| `--ink` | `#1f1d2c` | Primary text |
| `--muted` | `#6b6878` | Secondary text |
| `--subtle` | `#948f9e` | Tertiary text, overlines, metadata |

### Accent — periwinkle

| Token | Hex | Use |
| --- | --- | --- |
| `--accent` | `#6b7fd7` | Italic display words, links, active states |
| `--accent-strong` | `#5466c2` | Primary buttons, active nav text |
| `--accent-deep` | `#3d4ea4` | Button hover |
| `--accent-soft` | `#eaecf8` | Active nav background, callouts, AI bubbles |

Periwinkle is the single interactive accent. If something is clickable or
active, it's periwinkle. Don't introduce a second interactive color.

### Craft palette (decorative only)

Used for feature categorization, icon tiles, chips, and avatars — never for
interactive elements.

| Name | Solid | Soft | Pairing |
| --- | --- | --- | --- |
| Terracotta | `#c97455` | `#f5e6dd` | Authoring / content |
| Sage | `#8b9d7c` | `#e8ede0` | Success, "Live", deployments |
| Gold | `#c9a649` | `#f4ecd2` | In-progress, "New", highlights |
| Plum | `#7e5a85` | `#efe5f1` | Analytics / insight |

Pattern: soft tone as background, solid tone as foreground
(e.g. `background: var(--sage-soft); color: var(--sage)`).

### Dark ink (contrast sections)

| Token | Hex | Use |
| --- | --- | --- |
| `--dark-bg` | `#1a1827` | Dark sections (developer/API, final CTA) |
| `--dark-text` | `#f4f1e6` | Text on ink (warm off-white, not pure white) |

On ink, secondary text is `rgba(244,241,230,0.60)`, borders are
`rgba(255,255,255,0.08–0.10)`, and the italic display accent switches to
**gold** (periwinkle reads muddy on ink at small sizes; reserve it for large
glows).

### Semantic

Success = sage, warning/in-progress = gold, danger = `#c8543c` (rare). Status
chips always use the soft/solid pairing, with a 6px dot or spinner.

---

## 2. Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display | **Instrument Serif** (400, normal + italic) | Headlines, stat numerals, wordmark, editor H1s |
| Body / UI | **Inter** | Everything else; `font-feature-settings: "cv02","cv03","cv04","cv11"` |
| Code | `'SF Mono', 'Fira Code', Consolas, monospace` | Snippets, branches, shas, domains |

Loaded via `next/font/google` in `src/app/page.tsx`, exposed as CSS variables
`--font-display` and `--font-body`.

### Scale & rules

- Hero display: `clamp(48px, 7vw, 82px)`, line-height `1.06`,
  letter-spacing `-0.02em`
- Section headlines: `clamp(32px, 4vw, 52px)`
- Body: 14–17px; UI metadata 11–13px
- Overlines: 12px, weight 700, uppercase, `letter-spacing: 0.1em`, subtle
  color, preceded by a 24px rule (`.section-label`)
- **The italic accent:** every display headline italicizes one meaningful word
  in the accent color — *thinks*, *craft*, *better*. One word, not a phrase.
  This is the signature move of the system; never skip it, never use two.
- Headlines use `text-wrap: balance`. Serif display is always weight 400 —
  size provides the hierarchy, not weight.

---

## 3. Shape, depth, spacing

### Radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 10px | Inputs, callouts, small tiles |
| `--radius-md` | 16px | Cards, panels |
| `--radius-lg` | 24px | Feature cards, code windows |
| `--radius-xl` | 28px | Hero product window, CTA band |
| pill (`999px`) | — | Every button and chip |

### Shadows

Layered, ink-tinted, never gray:

```css
--shadow-sm: 0 2px 8px rgba(31,29,44,0.06);
--shadow-md: 0 8px 24px rgba(31,29,44,0.08);
--shadow-lg: 0 16px 40px rgba(31,29,44,0.10);
--shadow-xl: 0 24px 64px rgba(31,29,44,0.12);
```

Primary buttons carry a periwinkle glow: `0 2px 8px rgba(84,102,194,0.28)`.
Borders are always 1px `--border`; shadow and border work together (shadow
alone is not enough on cream).

### Spacing

Section padding ~80–100px vertical / 40px horizontal (24px mobile). Content
max-widths: 1100px (grids), 960px (two-column), 860px (stats/quotes). Cards
pad 24–28px.

### Ambience

Large surfaces get a soft radial wash, never flat gradients:
hero `radial-gradient(ellipse 920px 460px at 50% -8%, rgba(107,127,215,0.10), transparent 72%)`;
CTA band pairs a periwinkle top glow with a faint gold bottom-right glow.

---

## 4. Components

- **Buttons** — always pill-shaped. Primary: `--accent-strong` fill, white
  text, glow shadow, hover darkens + lifts `-1px/-2px`, active returns to `0`.
  Secondary: white fill, 1.5px border. Ghost (on ink): transparent with
  `rgba(244,241,230,0.18)` border.
- **Chips / badges** — pill, 11–12px semibold, soft/solid craft pairing with a
  ~20% alpha border of the same hue.
- **Cards** — white panel, 1px border, `--radius-lg`, `--shadow-sm`; hover:
  `--shadow-md`, lift `-2px`, border tints periwinkle
  `rgba(107,127,215,0.35)`.
- **Icon tiles** — 44px rounded square in a craft soft tone, glyph in the
  solid tone. Each feature/quick-action gets a *different* craft color;
  rotate through the palette.
- **Status** — pill chip + 6px dot; pulsing dot for live, spinner
  (border-top transparent, `lp-wc-spin`) for building, animated gold bar for
  progress.
- **Overline labels** — small caps + rule line, used to open every section.
- **Quotes** — `--panel-warm` cards, italic serif body, oversized italic `“`
  in periwinkle at 45% opacity, initials avatar in a solid craft color.
- **Window mocks** — `--radius-xl` white window, muted toolbar with traffic
  lights + pill tabs + URL chip; inner chrome mirrors the real app shell
  (sidebar nav = Home/Editor/Analytics/Settings + AI Products).

---

## 5. Motion

Animation is felt, not seen. Namespace: `lp-wc-*` keyframes in
`landing-view.tsx`.

| Pattern | Spec |
| --- | --- |
| Entrance rise | `translateY(18px)` → 0 + fade, `0.7s cubic-bezier(0.22,1,0.36,1)`, staggered 80ms per element |
| Window settle | `translateY(36px) scale(0.985)` → rest, `0.9s`, delay `0.28s` |
| Float (pills) | ±9px translateY, 5.5–6.5s ease-in-out infinite |
| Pulse (live dots) | opacity/scale breathe, 2s |
| Spinner | 0.9s linear rotate |
| Progress fill | width 18% → 92%, 2.6s ease-in-out |
| Typing dots | 3 dots, 1.2s, 180ms stagger |
| Scroll reveal | `animation-timeline: view()` inside `@supports` — progressive enhancement only |
| Hover | 0.15–0.25s ease; lift ≤2px |

**Rules:** transforms and opacity only (no layout properties). Springy ease
`cubic-bezier(0.22,1,0.36,1)` for entrances. Everything must be wrapped by the
global `prefers-reduced-motion: reduce` kill switch — keep that rule intact.

---

## 6. Voice

Confident, warm, specific. Headlines make a claim ("Documentation that
*thinks* with you"); subheads list concrete capabilities. Sentence case
everywhere except overlines. No exclamation marks. CTAs are verbs: "Start
onboarding", "Open dashboard".

---

## 7. Applying the theme to the product

The dashboard mock in the landing hero is the reference for retheming the
real app. When migrating, map the app-shell tokens in `src/app/globals.css`:

| App token (`--od-*`) | Warm Craft value |
| --- | --- |
| `--od-bg` | `#f7f4ed` |
| `--od-sidebar` | `#faf6ec` (panel-warm) |
| `--od-panel` | `#ffffff` |
| `--od-panel-muted` | `#f1ecdf` |
| `--od-border` | `#e5dfd0` |
| `--od-text` | `#1f1d2c` |
| `--od-text-muted` | `#6b6878` |
| `--od-text-subtle` | `#948f9e` |
| `--od-accent` | `#6b7fd7` (keep `--od-accent-strong: #5466c2`) |
| `--od-success` | `#4d8c5e` / sage family |
| `--od-warning` | `#c89028` / gold family |
| `--od-card-radius` | 16px (md surfaces), 24px for hero panels |
| `--od-font` | Inter + expose `--font-display` for serif headings |

Checklist when retheming a surface:

1. Swap grays for the warm neutrals above — nothing pure gray/white-on-gray.
2. Add the serif display (`--font-display`) to the page-level H1 only.
3. Replace status colors with the sage/gold/danger trio (soft + solid).
4. Pill the buttons; add the periwinkle glow to the primary.
5. Keep dark mode as "ink" (`#1a1827` family, warm off-white text), not
   neutral black.
