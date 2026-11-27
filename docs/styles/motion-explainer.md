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
- **Authentic Logos & Real Screenshots (Mandatory):**
  - **Real Logos:** Fetch genuine official logos with `python scripts/fetch_logo.py <brand>` into `workspaces/<slug>/assets/logos/` and pass them via `logo`, `logos`, `coreLogo`, `targetLogo`, `nodes[].logo`, `badges[].logo`, or `bars[].logo` (set `logoBackground: "#f8fafc"` when a dark logo needs contrast). Never replace brands/models with generic cubes.
  - **Real Screenshots:** Capture actual arXiv papers, GitHub repos, benchmark tables, or doc pages via `node scripts/capture_webref.mjs --url <url> --out workspaces/<slug>/assets/webref/<id>.png` and display them via `image` (+ optional `browserUrl` / `browserTab`) in `me_evidence_card`, `me_core_orbit` (`targetImage`), `me_schema_card`, or `me_decision_gate`.
  - **Isometric Cubes (`showCore` / `showCube` / `rollouts`):** Reserve isometric cubes strictly for scenes literally illustrating locked/opaque weights (`showCore: true` / `showCube: true`). Do NOT turn on `showCore` on `me_title` or `me_decision_gate` for branding/routing scenes, and only pass `rollouts: { total, active }` on `me_decision_gate` when illustrating multi-rollout iterations.
- **Kinetic Word-Synced Pacing:** The GSAP timeline initializes synchronously and schedules cards, orbital nodes, bar fills, delta caps, schema rows, editor lines, and timeline milestones directly against spoken words in `wordTimings` across each scene. Authors can also specify optional `meta.revealOn` or per-item `revealOn` / `cue` (spoken phrase or relative seconds).

---

## 2. Dedicated Motion Explainer Scene Types (`me_*`)

Use these 13 dedicated scene types when authoring a `motion-explainer` video:

| Scene Type | Visual Pattern | Key `meta` Fields |
|---|---|---|
| `me_title` | Kinetic hero title with real brand/org logos (`logo`/`logos`), optional screenshot preview (`image`), faint watermark, highlighted phrase pill, and bottom tag pills | `badge`, `logo`, `logos: [{ src, name, background }]`, `logoBackground`, `image`, `watermark`, `highlight`, `showCore` (opt-in only), `color`, `pills` |
| `me_core_orbit` | Brand logo hub, screenshot, semantic module hub (`coreLabel`), or opt-in weights cube (`showCube`) inside dual concentric orbital rings with medallions, Bezier flow dot, and side target hub/bar/modal/screenshot | `topPill`, `bottomPill`, `coreLabel`, `coreLogo`, `coreBackground`, `coreIcon`, `showCube`, `image`, `watermark`, `color`, `orbitNodes`, `arrowLabel`, `arrowColor`, `targetLabel`, `targetSub`, `targetLogo`, `targetImage`, `targetIcon`, `showTargetCube`, `targetBar`, `modal`, `memoryDeck` |
| `me_bar_compare` | Vertical gradient bars, grouped model panels, horizontal caliper latency race bars (`orientation: "horizontal"` + `paperTable`), or benchmark score matrix (`scoreRows` + `contextMeter`) | `header`, `logo`, `badge`, `orientation`, `heroDelta`, `heroUnit`, `paperTable`, `bracketLabel`, `thresholdPct`, `thresholdLabel`, `bottomPill`, `bars`, `groups`, `scoreRows`, `contextMeter` |
| `me_line_chart` | Multi-series SVG slope/line chart (`SIM` vs `no SIM`) with horizontal gridlines, Y-axis ticks, animated stroke draw, endpoint dots, and inline series labels | `header`, `yLabel`, `yMin`, `yMax`, `badge`, `bottomPill`, `series: [{ label, color, active, points: [{ y, label }] }]` |
| `me_stat_split` | Hero metric + `100` vertical fill bar + delta pill + side comparison panel, OR stopwatch radial dial gauge (`mode: "dial"`) paired with overflowing queue chips | `mode`, `model`, `logo`, `benchmark`, `value`, `baseline`, `delta`, `pct`, `miniTerminal`, `dialSeconds`, `dialMax`, `dialSplitText`, `queueTitle`, `queueBadge`, `queueCount`, `badges`, `sideTitle`, `sideBadge`, `sideBars` |
| `me_evidence_card` | Evidence card with dark Chrome browser window (`browserUrl`), split Claim widget + browser screenshot (`claim`), speaker portrait pull-quote + dot delta (`speaker`), or highlighted quote card | `source`, `handle`, `date`, `title`, `body`, `highlight`, `callout`, `badge`, `logo`, `image`, `browserUrl`, `browserTab`, `claim`, `speaker`, `color`, `points` |
| `me_pipeline_flow` | Top horizontal pill stepper (`RUN -> PROPOSE -> SELECT -> RECORD`) paired with dot-matrix + C3/SIM panels OR horizontal node chain with per-node logos/screenshots | `logo`, `logoBackground`, `steps: [{ label, active, color }]`, `roundLabel`, `centerTitle`, `centerBadge`, `rightTitle`, `rightRows`, `nodes: [{ title, sub, icon, logo, logoBackground, image, color, active }]`, `bottomPill` |
| `me_schema_card` | Root-cause / structured JSON inspector card (supporting skeleton placeholder lines, brand logo, icons, status pills & nested attempt card) optionally wired to a stacked memory deck or browser screenshot | `logo`, `logoBackground`, `image`, `statusPill`, `eyebrow`, `title`, `color`, `fields: [{ key, val, icon, status, skeleton, highlight, color }]`, `attempt: { index, label, value, color }`, `deckTag`, `deckLabel` |
| `me_editor_window` | Dark IDE window with traffic-light dots, underlined file tab + optional logo, line numbers, diff/syntax lines, blinking caret, optional tilted stamp (`BEFORE EVAL`), nested summary card, and scrubbing timeline | `filename`, `logo`, `branch`, `statusRight`, `footerLabel`, `stamp`, `stampColor`, `summaryCard: { tag, badge, color }`, `timeline: { startLabel, endLabel }`, `color`, `lines: [{ text, kind, cursor }]` |
| `me_decision_gate` | Confirmation modal, choices, and gate cards - centered solo by default, or paired on left with a browser screenshot (`image`), real brand logo (`logo`), opt-in `rollouts` squares, or opt-in cube (`showCore`), OR stacked `tiers` joined by SVG curly brace | `statusPill`, `counterBadge`, `logo`, `logos`, `image`, `browserUrl`, `showCore`, `rollouts: { total, active }`, `rolloutLabel`, `question`, `resultPill`, `color`, `choices: [{ text, active }]`, `gates: [{ label, ok, badge }]`, `tiers: [{ label, visual, active, dashed, detail, color }]` |
| `me_token_grid` | Icon/chat compression swarm into glowing 4x4 amber tokens (`compress`), 16-tile waveform embedding bus with bracket & decode popup (`bus`), or locked layer attention arcs (`layers`) | `mode`, `sourceLabel`, `sourceCount`, `targetLabel`, `targetCount`, `logo`, `avatar`, `stats`, `boxTitle`, `locked`, `frozenBadge`, `tokenCount`, `bracketLabel`, `callout: { title, input, output }`, `layers: [{ label, ok }]`, `bottomPill` |
| `me_timeline` | Horizontal progression axis with alternating milestone cards above and below | `events: [{ label, value, sub, color, active }]`, `bottomPill`, `color` |
| `me_outro` | Clean closing takeaway headline, subline, channel pill, and emerald CTA pill | `channel`, `cta`, `ctaSub`, `color` |

---

## 3. Available Vector Icons (`icon`)

`lock`, `chat`, `gear`, `check`, `cross`, `code`, `terminal`, `memory`, `doc`, `play`, `spark`, `layers`, `server`, `shield`, `trend-up`, `eye`.
