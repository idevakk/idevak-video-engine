# Chalkboard Explainer Style Preset (`chalkboard-explainer`)

Dedicated, self-contained preset located in `engine/presets/chalkboard-explainer/`, extracted frame-by-frame via `rea-video` from the reference dark-chalkboard explainer style.

**Activation rule:** Do NOT use this preset by default. Activate it ONLY when the user explicitly requests `chalkboard-explainer` (or `chalkboad-explainer`) or sets `"style": "chalkboard-explainer"` in `video.json`. When active, `engine/build.mjs` delegates rendering completely to `engine/presets/chalkboard-explainer/renderer.mjs` with its own CSS, GSAP animations, and soft SFX synthesizer so there are zero mixed Cyber-Tech visuals or font mismatches.

---

## 1. Visual & Audio Signature

- **Canvas:** Matte near-black charcoal vignette (`#13161b` -> `#060709`) with faint static grain. Zero grids, bloom orbs, lens flares, laser rails, or giant background ghost letters.
- **Pure Two-Font System:**
  1. `Inter` (400, uppercase, `letter-spacing: 0.28em`, muted off-white): Top-centered eyebrows, micro-labels, and pill tags.
  2. `Excalifont`: All titles, hero metrics, card headings, bullet notes, wiring nodes, and diagram callouts.
- **Hand-Drawn Sketch Geometry:** Deterministic bowed double-pass SVG outlines, curved wiring ribbons, chalk line-art icons, and animated coral-red **X** strikethroughs drawn progressively with `stroke-dashoffset`.
- **Muted Pastel Chalk Palette:** `green`, `cyan`, `ochre`, `coral`, `violet`, `amber`, `slate` (or custom `#rrggbb`).
- **Audio:** Clean voiceover + soft chalkboard SFX pack (`pop`, `ding`, `whoosh`, `swipe`, `click`, `tick`, `thud`) in `engine/presets/chalkboard-explainer/sfx.js`. No BGM, no mascot, and no bottom karaoke subtitles by default.

---

## 2. Dedicated Chalkboard Scene Types (`cb_*`)

Use these 11 dedicated scene types when authoring a `chalkboard-explainer` video:

| Scene Type | Visual Pattern | Key `meta` Fields |
|---|---|---|
| `cb_title` | Centered logo + `Excalifont` title, wide sketchy context/capacity bar, payoff pill + giant metric + trend arrow | `logo`, `title`, `barLabel`, `barValue`, `barPct`, `barColor`, `pill`, `pillIcon`, `stat`, `statUnit`, `statLabel`, `statColor`, `trend` |
| `cb_cards` | 2-4 staggered chalk cards with chalk icons, sequential illumination, optional red X rejection, bottom pill | `cards: [{ icon, title, sub, color, xOut, active }]`, `bottomPill`, `bottomColor` |
| `cb_formula` | Boxed equation whose factors light up sequentially, followed by `[=]` payoff metric below | `factors: [{ val, label, op, color }]`, `result`, `resultLabel`, `resultColor` |
| `cb_stat_bar` | `conversion` (source box -> arrow -> big stat + bottom bar), `metric_bar` (big stat + optional red X + GPU pinned bar), or `bars` (multi-row benchmark bars with threshold line) | `mode`, `value`, `unit`, `label`, `color`, `xOut`, `sourceCard`, `sourceIcon`, `barLabel`, `barValue`, `barPct`, `bars: [{ logo, label, value, pct, color, status, thresholdPct, thresholdLabel }]`, `bottomPill` |
| `cb_vram_stack` | Vertical memory tank with ceiling threshold line (`32 GB card`) and bottom-to-top animated layers with left labels | `ceiling`, `ceilingColor`, `layers: [{ size, title, pct, color }]` |
| `cb_layer_grid` | N x M cell grid where active columns light up + dotted/thin leader-line spec breakdown rows | `cols`, `rows`, `activeCols`, `color`, `specs: [{ icon, label, value, color }]` |
| `cb_wiring` | Board topology with thick curved `x16` ribbon, `chipset` elbow, and pulsing `x4` bottleneck wire + warning pills | `nodes: [{ title, sub, color }]`, `edges: [{ from, to, thick, elbow, pulse, color }]`, `pills` |
| `cb_gpu_spec` | `blueprint` (hand-drawn GPU shroud with fans, logo, price pill, optional `xOut`) or `compare` (2 side-by-side clean chalk spec cards) | `mode`, `model`, `sub`, `logo`, `price`, `priceSub`, `badge`, `xOut`, OR `cards: [{ brand, logo, tagline, title, bullets, price, color }]` |
| `cb_timeline_split` | `prefill_decode` (long coral prefill bar -> yellow `first token` divider -> short green decode bar) or `attention_triangle` (N x N triangle matrix + prompt bar) | `mode`, `topLabel`, `topValue`, `prefillPct`, `prefillLabel`, `decodeLabel`, `markerLabel`, `gridSize`, `promptLabel`, `promptVal`, `sideNote`, `bottomPill` |
| `cb_checklist` | Software stack / requirements checklist with status pills and `[check]` / `[cross]` rows | `headerTitle`, `headerIcon`, `pills: [{ text, color, icon }]`, `items: [{ text, ok, color }]`, `bottomPill` |
| `cb_outro` | Calm closing takeaway with `Excalifont` headline, muted subline, and sketchy CTA/channel pills | `channel`, `cta`, `ctaSub` |

---

## 3. Available Chalk Icons (`icon`)

`layers`, `ladder`, `kv`, `gpu`, `dual-gpu`, `chip`, `wrench`, `clock`, `doc`, `chat`, `warning`, `check`, `cross`, `plug`, `retailer`, `cube`, `terminal`, `equal`, `trend-up`, `thermometer`.
