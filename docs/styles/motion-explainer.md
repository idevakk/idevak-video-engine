# Motion Explainer Style Preset (`motion-explainer`)

Dedicated, self-contained preset located in `engine/presets/motion-explainer/`, extracted frame-by-frame via `rea-video` from the reference dark-carbon AI-engineering motion-graphics explainer style (`fKgwmagOXUg`).

**Activation rule:** Do NOT use this preset by default. Activate it ONLY when the user explicitly requests `motion-explainer` or sets `"style": "motion-explainer"` in `video.json`. When active, `engine/build.mjs` delegates rendering completely to `engine/presets/motion-explainer/renderer.mjs` with its own CSS, GSAP animations, and digital UI SFX synthesizer so there are zero mixed Cyber-Tech or chalkboard visuals.

---

## 1. Visual & Audio Signature

- **Canvas:** Matte deep carbon-black (`#060709` -> `#0c1016`) with soft radial studio depth, faint micro-dot canvas (`#me-dots`), and dark vignette. Zero scanlines, lens flares, hand-drawn wobble, or giant background ghost letters.
- **Clean Two-Font System:**
  1. `Inter` (500/600/700): Kinetic headlines, hero metrics, bar chart values, card headings, and pill badges.
  2. `JetBrains Mono`: Tracked uppercase eyebrows, pill tags (`Table 1 TB2.1`), schema keys, editor tabs, line numbers, and status bars.
- **Vector & Isometric Geometry:** Isometric 3D faceted cubes (`isoCubeSvg`) with subtle grid shading, segmented orbital rings (`orbitRingSvg`) with icon nodes, curved Bezier flow arrows, grouped/delta comparison bar charts with dashed cap overlays, dark IDE/editor windows, root-cause schema cards, and dot-matrix / server-stack pipeline stages.
- **Palette:** `emerald`, `orange`, `blue`, `red`, `amber`, `violet`, `slate` (or custom `#rrggbb`).
- **Audio:** Clean voiceover + crisp digital UI/motion-graphics SFX pack (`pop`, `ding`, `chime`, `whoosh`, `swipe`, `click`, `tick`, `thud`, `alert`) in `engine/presets/motion-explainer/sfx.js`. No BGM, no mascot, and no bottom karaoke subtitles by default.
- **Kinetic Word-Synced Pacing:** The GSAP timeline initializes synchronously and schedules cards, orbital nodes, bar fills, delta caps, schema rows, editor lines, and timeline milestones directly against spoken words in `wordTimings` across each scene. Authors can also specify optional `meta.revealOn` or per-item `revealOn` / `cue` (spoken phrase or relative seconds).

---

## 2. Dedicated Motion Explainer Scene Types (`me_*`)

Use these 12 dedicated scene types when authoring a `motion-explainer` video:

| Scene Type | Visual Pattern | Key `meta` Fields |
|---|---|---|
| `me_title` | Kinetic hero title with optional brand logo, isometric core cube, faint watermark (`?`/`P5`), highlighted phrase pill, and bottom tag pills | `badge`, `logo`, `watermark`, `highlight`, `showCore`, `coreIcon`, `color`, `pills: [{ text, color, mono, icon }]` |
| `me_core_orbit` | Isometric 3D core cube inside dual concentric orbital rings with circular icon medallions, curved Bezier arrow + animated flow dot, and side target cube, bar, modal, or memory deck | `topPill`, `bottomPill`, `coreIcon`, `watermark`, `color`, `orbitNodes: [{ label, icon, color }]`, `arrowLabel`, `arrowColor`, `targetLabel`, `targetIcon`, `targetDashed`, `targetBar: { label, value, pct, delta, color }`, `modal: { title, body, color }`, `memoryDeck: [{ tag, label }]` |
| `me_bar_compare` | Borderless vertical gradient comparison bars (with `check` marks, dashed headroom cap, spanning range bracket, threshold line) or grouped multi-model bar panels | `header`, `logo`, `badge`, `bracketLabel`, `thresholdPct`, `thresholdLabel`, `bottomPill`, `bars: [{ label, value, pct, delta, color, dashedCap, check, logo }]`, `groups: [{ title, active, check, color, bars: [{ label, value, pct, color }] }]` |
| `me_line_chart` | Multi-series SVG slope/line chart (`SIM` vs `no SIM`) with horizontal gridlines, Y-axis ticks, animated stroke draw, endpoint dots, and inline series labels | `header`, `yLabel`, `yMin`, `yMax`, `badge`, `bottomPill`, `series: [{ label, color, active, points: [{ y, label }] }]` |
| `me_stat_split` | Left hero metric (`tabular-nums` odometer) + `100` vertical fill bar + delta pill + optional mini terminal card paired with right comparison bar panel | `model`, `logo`, `benchmark`, `value`, `baseline`, `delta`, `pct`, `miniTerminal`, `color`, `sideTitle`, `sideBadge`, `sideBars: [{ label, value, pct, prefix, color }]` |
| `me_evidence_card` | Dark paper / social post / web evidence card with animated highlighted quote span, optional image, and bullet takeaways | `source`, `handle`, `date`, `title`, `body`, `highlight`, `callout`, `badge`, `logo`, `image`, `color`, `points` |
| `me_pipeline_flow` | Top horizontal pill stepper (`RUN -> PROPOSE -> SELECT -> RECORD`) paired with dot-matrix + C3/SIM panels OR horizontal node chain | `steps: [{ label, active, color }]`, `roundLabel`, `centerTitle`, `centerBadge`, `rightTitle`, `rightRows`, `nodes: [{ title, sub, icon, color, active }]`, `bottomPill` |
| `me_schema_card` | Root-cause / structured JSON inspector card (supporting skeleton placeholder lines, icons, status pills & nested attempt card) optionally wired to a stacked memory deck | `statusPill`, `eyebrow`, `title`, `color`, `fields: [{ key, val, icon, status, skeleton, highlight, color }]`, `attempt: { index, label, value, color }`, `deckTag`, `deckLabel` |
| `me_editor_window` | Dark IDE window with traffic-light dots, underlined file tab, line numbers, diff/syntax lines, blinking caret, optional tilted stamp (`BEFORE EVAL`), nested summary card, and scrubbing timeline | `filename`, `branch`, `statusRight`, `footerLabel`, `stamp`, `stampColor`, `summaryCard: { tag, badge, color }`, `timeline: { startLabel, endLabel }`, `color`, `lines: [{ text, kind, cursor }]` |
| `me_decision_gate` | Left dual-ring orbital core + rollout slot squares + `COMPLETE` badge paired with confirmation modal, repeated choice pills, and bottom verification gate cards | `statusPill`, `counterBadge`, `rolloutLabel`, `question`, `resultPill`, `color`, `choices: [{ text, active }]`, `gates: [{ label, ok, badge }]` |
| `me_timeline` | Horizontal progression axis with alternating milestone cards above and below | `events: [{ label, value, sub, color, active }]`, `bottomPill`, `color` |
| `me_outro` | Clean closing takeaway headline, subline, channel pill, and emerald CTA pill | `channel`, `cta`, `ctaSub`, `color` |

---

## 3. Available Vector Icons (`icon`)

`lock`, `chat`, `gear`, `check`, `cross`, `code`, `terminal`, `memory`, `doc`, `play`, `spark`, `layers`, `server`, `shield`, `trend-up`, `eye`.
