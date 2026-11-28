# iDevak Video Engine — LLM Prompting & Scene Planning Guide

This guide contains the system prompts, editorial guidelines, and scene-planning rules used by LLMs (Claude, GPT, Gemini) to author high-retention, Fireship-style technical explainer scripts for **iDevak**.

---

## 0. Default Production Brief for Every Video

These are the repository's standing authoring instructions. Apply them whenever
the user supplies a new idea, script, URL, or voiceover, without asking the user
to repeat them. Explicit instructions for the current video take precedence.
This section is the canonical production policy for both landscape and portrait
prompts below. Examples elsewhere in this guide are illustrative, not verified
source quotations or evidence.

### Opt-in style workflows (`chalkboard-explainer` / `motion-explainer`)

- Keep the default Cyber-Tech / Devak engine workflow for all standard requests.
- ONLY when the user explicitly asks to use the `chalkboard-explainer` (or
  `chalkboad-explainer`) style, or sets `"style": "chalkboard-explainer"` in
  `video.json`, read and follow `docs/styles/chalkboard-explainer.md` (matte
  charcoal canvas, `Excalifont` + tracked uppercase eyebrows, muted pastel chalk
  palette, hold-heavy calm motion, mascot and karaoke subtitles off by default,
  no BGM by default, and the soft chalkboard SFX pack).
- ONLY when the user explicitly asks to use the `motion-explainer` style, or
  sets `"style": "motion-explainer"` in `video.json`, read and follow
  `docs/styles/motion-explainer.md` (matte carbon-black canvas with micro-dot
  texture, `Inter` + `JetBrains Mono`, isometric 3D core cubes + segmented
  orbital rings, grouped/delta bar charts, IDE/schema cards, mascot and karaoke
  subtitles off by default, no BGM by default, and the digital UI SFX pack).

### Isolated project workspaces

- Every new video and ad-hoc test must live in its own gitignored workspace
  under `workspaces/<slug>/` (`npm run project:new -- <slug>`).
- Keep `video.json`, voiceover audio, `notes/`, `assets/` (`logos/`, `webref/`,
  `SOURCES.md`), `build/`, `index.html`, `hyperframes.json`, and `renders/`
  inside `workspaces/<slug>/`. Pass `--project <slug>` to pipeline/QA/helper
  commands (or set active via `npm run project:use -- <slug>`).
- Never overwrite template `content/video.json` or put project-specific media
  or notes into root `assets/` or repo root. When improving the engine itself,
  never modify user `workspaces/` folders or notes.

### Optional Daytona transcription and rendering

Use the local workflow by default. Only when the user explicitly enables
Daytona for the current video, follow `docs/DAYTONA.md` and the Daytona skill.
Use `scripts/daytona_video.py transcribe` on the exact supplied audio, then
`prepare` for sandbox alignment, builds/SFX, tests, lint, checks, and headless
QA frames. Inspect downloaded reports and native/phone/seam images, fix source
and repeat preparation as needed, then automatically `render` the checked
artifacts in a fresh sandbox. The host needs Python/SDK/credentials/network and
storage; Node, FFmpeg, Playwright, and Chromium are installed in the sandboxes.
Do not run local builds/pipeline/checks for an opted-in video.
This per-video opt-in grants standing permission for those sandbox renders,
satisfying render-permission requirements elsewhere in this guide. Preview
servers and local video encoding still need separate permission. Download and
show the MP4 here, delete each owned sandbox after retrieving its results even
on failure, and retain configurable 15-minute inactivity deletion as a fallback.
Install missing skills with `npx skills add https://github.com/daytona/skills --skill daytona -g`
and the missing SDK with `python -m pip install daytona`. See the guide for
secure credentials, commands, exported playback review, and cleanup details.

### Agent-owned setup/build/QA; permission for preview and video render

- Complete everything needed to prepare a working composition yourself: inspect
  and install required project dependencies, research/acquire local media,
  author the project and SFX/mascot direction, transcribe, validate, align,
  build, and run relevant tests, lint, and headless checks. Do not stop at source
  preparation or ask the user to do dependency setup or prerequisite builds.
- Use the repo's lockfile and documented setup commands (`npm ci` when a
  lockfile is present, otherwise `npm install`), and install missing Playwright
  Chromium, Python packages, and other required dependencies as appropriate.
  Inspect install/test lifecycle scripts so setup does not launch preview or
  render as a side effect. Report genuine external blockers accurately.
- `npm run build`, `npm run pipeline`, and `npm run sfx` are allowed. With no
  recording, `npm run draft` and `npm run align:draft` are also allowed for
  estimated composition timing. A composition build creates HTML, metadata,
  and baked audio; it does not encode a video. An estimated draft build is not
  a draft video render and must not be claimed as final audio alignment.
- Inspect generated `index.html`, `hyperframes.json`, timing reports, local
  media/audio references, `build/sfx_track.wav`, and its cue schedule. Verify
  expected dimensions/duration and run lint/checks and relevant tests. Fix
  failures, rebuild, and recheck yourself. Headless SFX synthesis, browser-based
  checks, and still-frame QA are allowed without starting a preview server or
  encoding a video. Never hand-edit generated files.
- Require explicit user permission before starting an interactive preview
  server (`npm run preview` or equivalents) or encoding any draft, review, or
  final video (`npm run render`, `npm run render:hq`, HyperFrames render at any
  quality, or equivalent local/cloud tools). Do not bypass this via another
  tool, subagent, test, wrapper, or lifecycle hook. General video-generation
  requests are not permission to launch preview or render. An explicit request
  to start preview or render grants permission for that action; do not ask again.
  To run an automated **Ralph Style Loop** from a reference video or YouTube URL
  (create a new style preset or enhance an existing style to >=97% clone
  fidelity via `yt-dlp`, `rea-video stems/decompose/compare`, and headless draft
  renders inside `workspaces/_ralph-<slug>/`), read and follow
  `prompts/ralph-style-loop.md` and `scripts/ralph_style.py`. Invoking that loop
  grants standing permission for headless `--quality draft` renders inside the
  isolated loop workspace only. Always validate the mode and style against
  `python scripts/ralph_style.py styles` first without hallucinating missing
  style names.
- Finish setup, builds, and permitted QA before asking to start preview or
  render. If permission is missing, report completed checks, ask for the specific
  action, and optionally provide exact commands for the user to run. Keep only
  unperformed playback/export checks pending; do not claim a new MP4 exists.

### Input and timing

- Use the supplied voiceover unchanged as the timing master. Transcribe that
  exact file; narration must be the words actually spoken. Rewrite display text
  freely, but never manufacture narration to fit a visual.
- With an idea but no voiceover, research, author a proposed script, and prepare
  a draft storyboard. Request the user's recording before final audio alignment
  and delivery. Do not generate TTS or silently reuse a previous video's audio.
- Default to 16:9 landscape at 1920x1080 and 30 fps unless the user specifies
  another format. Preserve the existing design system and scene types.
- Plan coherent narration beats. Do not split by arbitrary transcription
  segments or move cuts ahead of the relevant speech. Ask the user to check
  actual playback, not just the alignment percentage. Use `meta.revealOn` for a
  number that is introduced partway through a statistic scene.

### Skills and browser readiness

- Discover installed skills and callable tools first. Read the available
  HyperFrames, media-use, Firecrawl, and browser-use skills relevant to the task.
  Read hyperframes-audio when mixing or automating audio tracks.
  Browser skill names differ by host; identify the supported equivalent rather
  than assuming a literal `browser-use` package exists.
- Use Firecrawl for source discovery, reading primary reports, and extracting
  relevant media URLs. Check `firecrawl --status` when using its CLI. Reuse saved
  research instead of fetching the same pages repeatedly.
- Use browser automation for rendered website screenshots, interactions,
  scrolling, and source-page recordings. Prefer the host's collaborative
  browser when provided and follow its access and fallback rules. Use a
  browser-use skill, Firecrawl browser/interact, or another supported browser
  capability where appropriate.
- If a required Firecrawl or browser-use skill is missing, tell the user which
  capability is missing and prompt them to install the skill using the host's
  installer or the provider's official instructions. Distinguish a missing
  skill from a missing CLI, authentication, or exhausted credits. Do not invent
  package names, install links, or credentials, and do not request secrets in
  ordinary chat.
- Continue independent planning while setup is pending. If an available tool
  supplies the same capability, explain the fallback and use it within the
  user's instructions. Never silently omit authentic media or claim a capture
  was performed when it was not.

### Authentic media, chosen for the narration

- Build a scene-by-scene media plan from the actual subject. Search for official
  product logos, original incident screenshots, relevant original incident
  footage, and real captures of the referenced websites. Use these where they
  help tell that beat; diagrams and typography remain appropriate for concepts.
- Prefer primary publishers, official brand resources, original reports,
  advisories, repositories, and first-party footage. Verify that incident media
  depicts the correct event, product, and time period before using it.
- **NEVER let an LLM build, invent, or draw a logo on its own**: Do not write
  inline SVGs from imagination, draw approximate geometry with CSS or canvas,
  substitute emojis, or use generic placeholder graphics. Always source the real,
  official logo online.
- **Automated Logo Sourcing Waterfall (`scripts/fetch_logo.py`)**:
  When a brand, cloud provider, vendor, or tool logo is needed for `hero.meta.logos`:
  1. **SVGL API** (`https://api.svgl.app?search=<brand>`): First-tier search
     for authentic, high-quality vector SVGs.
  2. **FaviconDL API** (`https://favicondl.com/api/extract?url=<domain>`):
     Second-tier fallback for official site icons and vector favicons.
  3. **Firecrawl / Web Search**: If both SVGL and FaviconDL do not yield the
     correct real logo, search online (via Firecrawl or web search) to locate
     the genuine official SVG/high-res logo or relevant picture from the brand's
     official press kit, repository, or website.
  Run `python scripts/fetch_logo.py <brand>` to automatically query the APIs,
  cache responses, and download the asset to `assets/logos/<slug>.<ext>`.
- Use official SVG/vector logos when available, with a background that preserves
  their contrast. Do not replace an available official logo with plain text,
  an emoji, an unrelated icon, or an AI-generated imitation.
- Search for genuine footage where relevant. If none is available, a recording
  of the real public report or product can be used and labeled as a source-page
  walkthrough. Do not portray that recording, generic B-roll, a diagram, or a
  reconstruction as footage of the incident itself.
- Capture the real website in a browser after fonts and images load. For
  `webref` scenes, default to capturing a real website screenshot (and exact
  `highlightRects` coordinates when highlighting specific text) via
  `node scripts/capture_webref.mjs --url <url> --out assets/webref/<id>.png --highlight "<exact quote>"`
  instead of copy-pasting reference text into `snippet` to fake a browser. Frame
  the relevant headline, finding, or interface instead of shrinking an entire
  long page into an unreadable panel. Do not fabricate screenshots or research
  logs. Only use the text-emulated `webref` mode (`snippet`/`highlight`/`callout`
  without `image`) when explicitly instructed not to capture real screenshots or
  when a live capture is blocked (and disclose the limitation).
- Download final media locally so renders do not depend on remote availability.
  Record each asset's source URL, publisher, description, native dimensions,
  capture method or footage range, and any usage/credit requirements in
  `assets/SOURCES.md`. Preserve publisher redactions and relevant attribution.
- Use `hero.meta.image`, `video`, `poster`, `mediaStart`, `logos`, `label`,
  `caption`, and `source`, or `webref.meta.image`, as documented in the schema.
  Write scene-specific labels appropriate to each new topic. Do not carry
  labels or assets over from the previous episode by accident.

### Zero-fallback schema architecture & explicit element authoring

- The engine contains **no default or fallback values** for any meta field,
  badge, header, filename, terminal host, comparison marker, audit table header,
  beacon, tag, formula badge, or status chip.
- For every scene, the authoring LLM must consciously design and implement every
  visual element. Omitting a field does not trigger a generic fallback string;
  it suppresses that visual element entirely.
- Never rely on builder defaults (such as expecting an omitted `file` to become
  `"source"`, an omitted `host` to become `"terminal"`, an omitted `head` to become
  `"LEDGER"`, an omitted `vs` to become `"VS"`, or an omitted `label` to become
  `"INCIDENT EVIDENCE"`). Explicitly author all titles, filenames, badges, chips,
  and beacons tailored to the topic.

### Highest available quality and readable delivery

- Retrieve original or highest-resolution published assets, not search-result
  thumbnails, compressed previews, or screenshots of screenshots. Check actual
  pixel dimensions and visual sharpness; a large file can still contain blur.
- Match source resolution to its largest on-screen footprint, including crops
  and zooms. Prefer 4K footage when available and useful; a full-screen 1080p
  shot should have a native 1080p-or-better source. Never upscale a small source
  merely to label it high resolution or use AI enhancement as recovered detail.
- Capture website screenshots at sufficient device pixel ratio, preferably
  twice their displayed output dimensions. Verify the saved image's dimensions;
  requesting a larger viewport does not prove the browser actually used it.
- If the original evidence is small, find a better original first. If none
  exists, keep it at native size, isolate the relevant crop, and explain the
  finding with large authored text. Disclose material source limitations.
- Keep text-heavy evidence stable after entrance. Avoid camera pushes, blur,
  chromatic effects, or transitions that make source text harder to read. Use
  clean cuts and a continuous backdrop; do not add laser sweeps or flare flashes.
- Inspect available representative frames at native output size and in a
  compressed, reduced-resolution review, such as 480p. Essential headlines,
  findings, and brand identification must remain legible on a small screen.
  Reframe or simplify the layout when they do not; do not rely on tiny source-page text.
- Validate, align, build, and check the composition yourself. Inspect the opening,
  transitions, and ending with permitted headless QA. Request permission before
  launching preview or encoding a delivery video. Once playback/export is
  available, inspect streams/duration and audio sync near the start, middle, and
  end. Disclose any checks that remain pending without the necessary output.

### QA for text and motion stability

- In every QA round, explicitly check for text jitter, flicker, baseline or
  position jumps, font swapping, unexpected line wrapping, shifting counter
  widths, and unstable overlays or transitions. Review available playback
  at normal speed and slow motion, comparing adjacent frames around entrances,
  number updates, holds, and cuts. A single sharp still does not prove stability.
- If any instability is found, fix it immediately in the authored content or
  engine source rather than deferring it or masking it with blur. Identify the
  cause and use the appropriate fix, such as stable layout bounds, tabular
  counter digits, ready local fonts, or deterministic animation transforms.
  Preserve intentional motion and speech timing. Note affected timestamps,
  explain the correction, rebuild, and repeat permitted headless checks yourself.
  Check adjacent timeline frames as well as still holds. If verification needs
  a preview server or video render, obtain permission first or review output the
  user supplies. Keep only that unavailable playback/export verification pending.

### Contextual sound design and exported SFX

- Plan sound alongside the narration and visual beats for every new video.
  Use restrained impacts for important reveals, ticks for meaningful counters,
  clicks for terminal actions, and a light entrance cue for a relevant mascot
  reaction. Choose cues for their narrative purpose; leave quiet passages where
  the voiceover or evidence needs attention. Avoid repetitive noise and a
  whoosh on every cut. Preserve the seamless transitions without laser effects.
- Use the engine's procedural SFX and deterministic cue schedule in
  `engine/anim.js`. Align each cue with the actual visual event and spoken beat,
  including `meta.revealOn` for delayed statistics. If additional sound design
  is needed, extend the existing cue/synthesis path and inspect the resulting mix.
  Do not invent unsupported SFX fields in `content/video.json` or rely on live
  browser audio callbacks that disappear from the exported video.
- Run `npm run build` yourself after animation or cue changes. It generates
  `build/sfx_track.wav` and `build/sfx_track.json`; inspect the schedule and
  confirm that the track is embedded in the composition. Keep the user's
  voiceover unchanged. Balance effects underneath clear speech, prevent
  clipping and abrupt tails, and reduce competing effects where necessary.
- Ask the user to listen to the actual rendered MP4 on headphones and ordinary
  speakers.
  Check both quiet and busy passages and cues near the beginning, middle, and
  end. Verify audible effects, intelligible narration, and synchronization;
  successful browser playback or the existence of a WAV alone is insufficient.

### Mascot direction throughout the story

- Plan Devak's appearances across the narrative wherever the context benefits:
  investigating a clue, reacting to a twist, explaining a mechanism, or landing
  the engineering lesson. Scale appearances to the video's length and actual
  beats rather than limiting a long video to two or three reactions. Use both
  the universal `mascot` overlay and dedicated `mascot` scenes where appropriate.
- Select an expression that fits the current narration from the supported set:
  `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`,
  `facepalm`, `pointing`, `panic`, or `skeptical`. Use the existing transparent
  mascot assets and keep them sharp at their displayed size. Do not invent pose
  names or carry a previous episode's reaction text into a new story.
- Prefer silent facial reactions when they communicate the point. Use a short
  bubble only for useful contextual commentary, not redundant emotion labels
  or a duplicate headline. Do not add a synthetic character voice. Match each
  entrance and reaction to its relevant spoken beat instead of revealing the
  twist before the narration reaches it.
- Place overlays in the schema-supported `bottom-left` or `bottom-right`
  position according to free space. Protect evidence, logos, source credits,
  captions, and mobile safe areas. Keep source-heavy scenes clear when a mascot
  would obscure the finding, and inspect mascot scenes in the reduced-resolution
  review as well as at native size.

These instructions guide the authoring agent. `npm run pipeline` processes an
already-authored project; it does not itself call an LLM, search the web, or
install skills. An external LLM integration must load this guide into its prompt.

---

## 1. Channel Identity & Signature Taste

### About iDevak
- **Core Pillars:** Cloud Engineering, AI & Automation, DevOps & Infrastructure, Modern Software Development.
- **Motto:** *BUILD. SOLVE. DEPLOY.*
- **Channel Link:** `youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA`
- **Visual Aesthetic:** Futuristic Cyber-Tech — Neon Cyber-Cyan (`#00f0ff` / `#38bdf8`), Deep Space Dark (`#04060b`), Neon Violet/Amber accents, glowing telemetry grids, and holographic HUD overlays.
- **Mascot:** **Devak** — an expressive 2D cyber-engineer character in a dark techwear hoodie with a glowing cyber visor and holographic HUD.

### The "Fireship + iDevak" Blend
Fireship popularized ultra-fast pacing and dry wit, but **iDevak** elevates it with:
1. **Engineering Grounding:** Real RFC numbers, AWS architecture specs, GitHub diffs, and kernel/memory semantics. No shallow buzzwords.
2. **Visual Evidence:** Every beat backed by real terminal outputs, live cloud topology diagrams, documentation browser viewports, and code diffs.
3. **The Devak Mascot:** Reactive emotional reactions that mirror the viewer's surprise, realization, and relief during technical breakdowns.

---

## 2. Narrative Rhythm & Pacing Formula

A successful 1080p video script follows strict time and word-count boundaries:

| Metric | Target Rule |
|---|---|
| **Words per Scene** | **12 to 28 words** (Spoken at ~2.5 to 2.8 words/sec = 4 to 10 seconds per visual). |
| **Pacing** | Aim for 4 to 8 seconds when writing a new script. For supplied audio, coherent spoken beats and readable evidence take priority over a fixed cut interval. |
| **First 5 Seconds** | **The Cold Open Hook**: State the paradox, catastrophe, or dollar figure immediately. No intro logos, no "Welcome back guys". |
| **The Comic Beat (Meme)** | Drop a meme/punch beat every 40 to 60 seconds to release technical tension. |
| **The Punchline (Mascot)** | Conclude acts or pivotal revelations with a mascot reaction or summary badge. |

---

## 3. Scene Selection Decision Tree

Use this exact decision framework to choose the scene type for each narration beat:

```
What is this beat about?
│
├── 1. Opening hook or major act transition?
│   ├── Video Opening Card ────────────────────────► "cold"
│   └── Act Break / Big Bold Claim ────────────────► "hero" or "statement"
│
├── 2. Primary evidence & documentation?
│   ├── Web page, RFC spec, or AWS/Cloud docs ─────► "webref"
│   ├── Code snippet with highlighted bug ────────► "code"
│   ├── Git commit or patch fix (add/del) ─────────► "diff"
│   └── Shell execution, CLI logs, or crash trace ──► "terminal"
│
├── 3. Architecture & Systems?
│   ├── Cloud pipeline, microservices, AWS/K8s ────► "cloud"
│   ├── Sequential causality chain (A -> B -> C) ──► "flow"
│   ├── Stacked system layers (OS / App / Edge) ───► "stack"
│   └── Chronological incident timeline ──────────► "timeline"
│
├── 4. Data, stats & comparisons?
│   ├── Single shocking number or dollar cost ─────► "stat"
│   ├── Two competing tools (e.g. K8s vs ECS) ─────► "compare"
│   ├── Table of audit findings or CVE severity ───► "ledger"
│   └── Event date or security disclosure date ────► "dateline"
│
├── 5. Reaction, humor & key takeaways?
│   ├── Comic realization, dev blunder, meme punch ─► "meme"
│   ├── Direct takeaway delivered by Devak mascot ──► "mascot"
│   └── Memorable quote from creator or creator rule ► "quote"
│
└── 6. Video conclusion?
    └── Call to Action & channel subscribe ────────► "outro"
```

---

## 4. Complete 22-Archetype Reference & Zero-Fallback Blueprints

Every scene in `content/video.json` must be one of the 22 supported archetypes. Under the **Zero-Fallback Architecture**, the engine renderer contains no default or fallback strings: every header, badge, beacon, status, tag, filename, and terminal host must be explicitly authored.

---

### `cold` (Opening Title Card Hook)
*Use for Scene 1 only. Establishes the video topic, paradox, or dollar figure immediately.*
```json
{
  "type": "cold",
  "narration": "A critical zero-day just bypassed every IAM credential in AWS.",
  "eyebrow": "SECURITY AUTOPSY",
  "headline": "The Silent Privilege Escalation",
  "subline": "How a single wildcard policy compromised 400 production accounts.",
  "meta": {
    "chips": ["CVE-2026-3841", "AWS IAM", "CRITICAL"],
    "ghost": "EXPLOIT"
  }
}
```

---

### `hero` (Primary Visual Evidence Panel)
*Use when displaying real screenshots, captured diagrams, or vector vendor logos.*
```json
{
  "type": "hero",
  "narration": "The vulnerability lived in the core session validator, hidden behind two layers of mTLS.",
  "eyebrow": "PRIMARY EVIDENCE",
  "headline": "The Unauthenticated Root Proxy",
  "subline": "Every internal microservice accepted requests forwarded by the edge envoy.",
  "meta": {
    "mark": "ZERO DAY",
    "rule": true,
    "label": "FORENSIC LOGS",
    "caption": "Captured from production edge envoy traffic at 03:14 UTC",
    "image": "assets/evidence/proxy-trace.png",
    "source": "US-CERT Alert TA26-041A"
  }
}
```

---

### `statement` (High-Impact Editorial Claim)
*Use for pivotal realizations, act breaks, or hard engineering truths.*
```json
{
  "type": "statement",
  "narration": "Security through obscurity is not an architecture; it is an unhedged debt.",
  "eyebrow": "CORE REALIZATION",
  "headline": "Obscurity is Not Architecture",
  "subline": "When internal networks assume implicit trust, one perimeter breach wins the game.",
  "variant": 1,
  "meta": {
    "ghost": "DEBT"
  }
}
```

---

### `stat` (Animated Numerical Counter)
*Use for shocking metrics, latency figures, or financial dollar impacts.*
```json
{
  "type": "stat",
  "narration": "Within ninety seconds, the attacker executed over four hundred thousand unauthorized API calls.",
  "eyebrow": "BLAST RADIUS",
  "headline": "Burst Velocity",
  "subline": "Peak request volume recorded before the rate limiter kicked in.",
  "meta": {
    "value": 412000,
    "prefix": "",
    "suffix": " REQS",
    "sep": true,
    "revealOn": "four hundred thousand"
  }
}
```

---

### `dateline` (Document / Disclosure Date)
*Use for CVE release dates, security embargo dates, or historical milestones.*
```json
{
  "type": "dateline",
  "narration": "On October 14, 2026, the security team received the first external disclosure report.",
  "eyebrow": "INCIDENT TIMELINE",
  "headline": "The Coordinated Disclosure",
  "subline": "Zero public patches were available when the advisory went live.",
  "meta": {
    "day": "14",
    "mon": "OCTOBER",
    "yr": "2026",
    "badge": "DISCLOSURE",
    "tag": "DAY ZERO"
  }
}
```

---

### `code` (Source Code Window with Highlighting)
*Use to dissect a specific bug, vulnerable method, or insecure configuration.*
```json
{
  "type": "code",
  "narration": "Look closely at line forty-two: memcpy blindly trusts the user-supplied packet length without validation.",
  "eyebrow": "SOURCE EVIDENCE",
  "headline": "The Unbounded Buffer Copy",
  "subline": "handler.c - Zero bounds verification on untrusted socket input.",
  "meta": {
    "file": "src/net/handler.c",
    "tag": "C99 // BUFFER",
    "announce": "Zero bounds check on user length",
    "lines": [
      { "t": "uint16_t len = ntohs(hdr->payload_len);", "k": "code" },
      { "t": "if (len == 0) return ERR_EMPTY;", "k": "code" },
      { "t": "memcpy(stack_buf, payload, len); // CRITICAL OVERFLOW", "k": "hot", "key": true, "bad": true },
      { "t": "process_packet(stack_buf);", "k": "code" }
    ]
  }
}
```

---

### `diff` (Git Commit / Patch View)
*Use to showcase the exact fix, security patch, or architectural refactor.*
```json
{
  "type": "diff",
  "narration": "The hotfix was only three lines: enforce a maximum packet size check before copying into memory.",
  "eyebrow": "THE PATCH",
  "headline": "The Guard Clause",
  "subline": "Commit 4f82a1 - Restricting payload size to MAX_BUFFER_SIZE.",
  "meta": {
    "file": "src/net/handler.c",
    "ver": "v2.1.3 -> v2.1.4",
    "tag": "SECURITY FIX",
    "announce": "Bound check enforced before memory write",
    "lines": [
      { "k": "ctx", "t": "uint16_t len = ntohs(hdr->payload_len);" },
      { "k": "del", "t": "- memcpy(stack_buf, payload, len);" },
      { "k": "add", "t": "+ if (len > MAX_BUFFER_SIZE) return ERR_OVERFLOW;" },
      { "k": "add", "t": "+ memcpy(stack_buf, payload, len);" }
    ]
  }
}
```

---

### `flow` (Sequential Causal Chain)
*Use for left-to-right causal diagrams, packet lifecycle, or request paths.*
```json
{
  "type": "flow",
  "narration": "The packet flows from the edge ingress into the authorization filter, where malformed headers bypass auth before reaching backend compute.",
  "eyebrow": "DATA TRANSMISSION",
  "headline": "The Exploit Pipeline",
  "subline": "How forged headers navigated the proxy mesh unchecked.",
  "meta": {
    "beacon": "EXPLOIT VECTOR",
    "nodes": [
      { "k": "INGRESS", "t": "Envoy Edge", "s": "PORT 443" },
      { "k": "FILTER", "t": "Header Auth", "s": "BYPASSED", "bad": true, "hot": true },
      { "k": "INTERNAL", "t": "API Gateway", "s": "TRUSTED" },
      { "k": "CORE", "t": "App Worker", "s": "COMPROMISED", "bad": true }
    ]
  }
}
```

---

### `ledger` (Forensic Audit Table)
*Use to evaluate multiple findings, CVE severity rankings, or defense breakdowns.*
```json
{
  "type": "ledger",
  "narration": "The postmortem revealed a cascade of security oversights across four independent layers.",
  "eyebrow": "FORENSIC AUDIT",
  "headline": "Root Cause Audit",
  "subline": "Multiple defensive barriers failed simultaneously during the incident.",
  "meta": {
    "head": "DEFENSE MATRIX",
    "live": "VERIFIED",
    "stamp": "AUDIT COMPLETE",
    "rows": [
      { "k": "BOUNDARY", "v": "Public Subnet", "bad": true },
      { "k": "AUTH", "v": "Wildcard IAM", "bad": true },
      { "k": "LOGGING", "v": "CloudTrail Dropped", "bad": true },
      { "k": "CIRCUIT BREAKER", "v": "Triggered at 90s" }
    ],
    "points": [
      "Zero network segmentation",
      "IAM permissions unhedged",
      "Ingress firewall misconfigured"
    ]
  }
}
```

---

### `memory` (Heap & Slot Allocation Grid)
*Use for low-level memory bugs, buffer overflows, use-after-free, or heap corruptions.*
```json
{
  "type": "memory",
  "narration": "The dangling pointer remained valid long after the original buffer was freed, allowing arbitrary memory writes.",
  "eyebrow": "KERNEL MEMORY",
  "headline": "Use After Free",
  "subline": "Heap slot allocation collision under concurrent connection load.",
  "meta": {
    "segment": "HEAP ARENA 0x04",
    "pointer": "DANGLING ADDR",
    "allocated": 6,
    "delta": "+38.2%",
    "deltaDir": "up",
    "ghost": "CORRUPT",
    "cells": [
      { "addr": "0x0041a0", "live": true },
      { "addr": "0x0041b8", "live": true },
      { "addr": "0x0041d0", "bad": true },
      { "addr": "0x0041e8", "bad": true },
      { "addr": "0x004200", "live": true },
      { "addr": "0x004218", "live": true }
    ]
  }
}
```

---

### `timeline` (Chronological Incident Sequence)
*Use to trace war room minutes, outage progressions, or escalation sequences.*
```json
{
  "type": "timeline",
  "narration": "From the first anomaly detection to full production isolation, the entire incident unfolded in under twenty minutes.",
  "eyebrow": "TIME TO RESOLUTION",
  "headline": "The Incident Clock",
  "subline": "Key escalation timestamps recorded by the SRE war room.",
  "meta": {
    "events": [
      { "t": "16:42 UTC", "s": "Latency Alert Triggered" },
      { "t": "16:47 UTC", "s": "OOM Killer Terminating Pods", "hot": true },
      { "t": "16:53 UTC", "s": "Traffic Diverted to Fallback" },
      { "t": "17:01 UTC", "s": "Core Database Recovered" }
    ]
  }
}
```

---

### `terminal` (CLI Shell Execution & Logs)
*Use for real shell commands, reproduction scripts, curl traces, or crash logs.*
```json
{
  "type": "terminal",
  "narration": "Running curl against the internal metadata endpoint returns root AWS credentials in plain text.",
  "eyebrow": "TERMINAL EVIDENCE",
  "headline": "Querying Instance Metadata",
  "subline": "IMDSv1 allows unauthenticated SSRF to harvest temporary role tokens.",
  "meta": {
    "host": "bastion-prod",
    "prompt": "$",
    "tag": "SSRF REPRO",
    "announce": "IMDSv1 returns full session credentials",
    "lines": [
      { "k": "cmd", "t": "curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/" },
      { "k": "out", "t": "ProductionAppRole" },
      { "k": "cmd", "t": "curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ProductionAppRole | jq .AccessKeyId" },
      { "k": "out", "t": "\"ASIAIOSFODNN7EXAMPLE\"" },
      { "k": "err", "t": "[!] EXPOSED: Credential harvest successful" }
    ]
  }
}
```

---

### `compare` (Side-by-Side Architectural Contrast)
*Use to compare legacy vs modern patterns, competing tools, or before/after paradigms.*
```json
{
  "type": "compare",
  "narration": "IMDS version one allows simple GET requests, while version two requires a session token with strict TTL and hop limit.",
  "eyebrow": "ARCHITECTURE DRIFT",
  "headline": "IMDSv1 vs IMDSv2",
  "subline": "The security difference between plain text SSRF and defense in depth.",
  "meta": {
    "vs": "VS",
    "left": {
      "k": "IMDSv1 (LEGACY)",
      "t": "Zero Token Header Required",
      "pts": [
        "Vulnerable to plain SSRF",
        "No hop count protection",
        "Trivially harvested by web apps"
      ]
    },
    "right": {
      "k": "IMDSv2 (MODERN)",
      "t": "Session Token Mandated",
      "pts": [
        "PUT token handshake first",
        "X-Forwarded-For blocked",
        "IP hop limit restricted to 1"
      ]
    }
  }
}
```

---

### `stack` (Vertical System Architecture Layers)
*Use for OS/Kernel/Runtime/App layers, OSI network model, or container runtimes.*
```json
{
  "type": "stack",
  "narration": "Every layer trusted the one below it, so when the kernel memory allocator failed, the whole container engine collapsed.",
  "eyebrow": "SYSTEM TOPOLOGY",
  "headline": "The Dependency Cascade",
  "subline": "How a bottom-layer panic broke the entire application stack.",
  "meta": {
    "layers": [
      { "t": "EDGE INGRESS", "s": "Cloudflare / CDN" },
      { "t": "API GATEWAY", "s": "Nginx Reverse Proxy" },
      { "t": "APPLICATION", "s": "Node.js Microservices" },
      { "t": "RUNTIME", "s": "Docker / containerd", "hot": true },
      { "t": "KERNEL OS", "s": "Linux 6.8 eBPF Panic", "bad": true }
    ]
  }
}
```

---

### `quote` (Pull Quote & Creator Attribution)
*Use for famous engineering axioms, postmortem verdicts, or creator rules.*
```json
{
  "type": "quote",
  "narration": "As Werner Vogels famously said: Everything fails, all the time.",
  "eyebrow": "CORE PRINCIPLE",
  "headline": "\"Everything fails, all the time.\"",
  "subline": "Werner Vogels, Amazon CTO",
  "meta": {
    "initials": "WV"
  }
}
```

---

### `matrix` (Population / Request Telemetry Scan Grid)
*Use for fleet scans, cluster health, distributed node corruption, or request samples.*
```json
{
  "type": "matrix",
  "narration": "Out of two hundred and forty active production nodes, exactly six were corrupted by the malicious payload.",
  "eyebrow": "CLUSTER SCAN",
  "headline": "Targeted Node Infection",
  "subline": "Telemetry scan of the Kubernetes worker fleet during the exploit burst.",
  "meta": {
    "cells": 240,
    "legendOk": "HEALTHY",
    "legendBad": "INFECTED",
    "matrixLabel": "FLEET TELEMETRY",
    "count": "240 NODES SCANNED // 6 CORRUPTED"
  }
}
```

---

### `webref` (Browser & Documentation Spotlight)
*Use when citing official docs, RFCs, GitHub PRs/issues, papers, or CVE advisories. Default to capturing a real website screenshot (`meta.image`) plus accurate `meta.highlightRects` via `node scripts/capture_webref.mjs` instead of copy-pasting reference text to emulate a browser.*
```json
{
  "type": "webref",
  "narration": "Section 4.1 of the OAuth specification explicitly forbids storing client secrets inside public client bundles.",
  "eyebrow": "OFFICIAL SPEC",
  "headline": "The RFC Explicitly Warned Us",
  "subline": "RFC 6749 Section 4.1: Authorization Code Grant",
  "meta": {
    "url": "datatracker.ietf.org/doc/html/rfc6749#section-4.1",
    "badge": "IETF RFC SPEC",
    "image": "assets/webref/rfc6749-s4.png",
    "alt": "IETF RFC 6749 Section 4.1 specification page",
    "highlightRects": [
      { "x": 18.4, "y": 38.2, "w": 61.5, "h": 3.8, "label": "MUST NOT EXPOSE" }
    ],
    "source": "Source: IETF RFC 6749"
  }
}
```
*Only when explicitly instructed not to use real screenshots (or when capture is blocked), fall back to the concise text-emulated `snippet` + `highlight` + `callout` format (no `meta.image`).*

---

### `meme` (High-Impact Dev Reaction)
*Use for sarcastic developer reality checks, production blunders, or unexpected turns.*
```json
{
  "type": "meme",
  "narration": "So they pushed the hotfix directly to main on a Friday at 4:55 PM without running CI.",
  "eyebrow": "DEV REALITY",
  "headline": "Testing in Production",
  "subline": "Everyone has a testing environment. Some are lucky enough to have a separate production.",
  "meta": {
    "text": "PUSHED TO MAIN ON FRIDAY",
    "subtext": "CI/CD was just a suggestion anyway",
    "reaction": "SKILL ISSUE",
    "formulaBadge": "FULL JITTER",
    "formulaLabel": "DECORRELATION FORMULA",
    "expression": "shocked",
    "punch": true
  }
}
```

---

### `cloud` (Cloud Architecture & Systems Topology)
*Use for AWS, GCP, Kubernetes, Docker, and distributed microservices pipelines.*
```json
{
  "type": "cloud",
  "narration": "Cloudflare routes traffic through an API Gateway to an ARM64 Lambda, caching session data in Redis before touching Postgres.",
  "eyebrow": "ARCHITECTURE",
  "headline": "The Serverless Request Lifecycle",
  "subline": "Sub-millisecond latency when cached; catastrophic cold starts when cold.",
  "meta": {
    "flow": "EDGE -> ROUTER -> LAMBDA -> CACHE -> DB",
    "shed": "RATE SHED ACTIVE",
    "beacon": "DISTRIBUTED MESH",
    "nodes": [
      { "k": "EDGE", "t": "Cloudflare", "icon": "⚡", "status": "200 OK" },
      { "k": "GATEWAY", "t": "HTTP API", "icon": "🚪", "status": "HEALTHY" },
      { "k": "COMPUTE", "t": "AWS Lambda", "icon": "λ", "status": "ACTIVE", "hot": true },
      { "k": "CACHE", "t": "Redis", "icon": "⚡", "status": "HIT 98%" },
      { "k": "PRIMARY", "t": "Aurora Postgres", "icon": "🗄️", "status": "3ms" }
    ]
  }
}
```

---

### `mascot` (Mascot Spotlight Scene)
*Use when Devak delivers an architectural rule, security recommendation, or executive takeaway.*
```json
{
  "type": "mascot",
  "narration": "The takeaway is simple: never grant wildcard permissions to IAM roles, and always enable multi-factor authentication.",
  "eyebrow": "DEVAK'S TAKEAWAY",
  "headline": "The Golden Rule of Cloud IAM",
  "subline": "Least privilege isn't paranoid — it's insurance against a $40,000 AWS bill.",
  "meta": {
    "expression": "pointing",
    "bubble": "Wildcard permissions are a zero-day waiting to happen.",
    "badge": "iDevak // BEST PRACTICES",
    "stats": [
      { "label": "SEVERITY", "val": "HIGH", "hot": true },
      { "label": "EFFORT", "val": "2 MIN" },
      { "label": "RESULT", "val": "ZERO TRUST" }
    ]
  }
}
```

---

### `split` (Dual-Pane Forensic Shell + Impact)
*Use to correlate CLI exploit execution directly against target server crash or memory leak.*
```json
{
  "type": "split",
  "narration": "As the attacker injected the payload in the terminal, the downstream payment worker crashed instantly with a segmentation fault.",
  "eyebrow": "CORRELATION VIEW",
  "headline": "Payload Injection & Server Impact",
  "subline": "Simultaneous forensic capture of exploit execution and target node panic.",
  "meta": {
    "tag": "FORENSIC DUAL-PANE",
    "connector": "CORRELATED IMPACT",
    "left": {
      "title": "EXPLOIT TERMINAL",
      "badge": "ATTACK VECTOR",
      "lines": [
        { "t": "python3 exploit.py --target 10.0.4.12", "k": "cmd" },
        { "t": "[*] Crafting malformed ASN.1 certificate...", "k": "out" },
        { "t": "[+] Packet delivered to port 8443", "k": "out" }
      ]
    },
    "right": {
      "title": "PAYMENT SERVICE",
      "status": "CRASHED // SIGSEGV",
      "pts": [
        "Null pointer dereference in openssl.so",
        "Worker thread terminated abruptly",
        "Connection pool drained 1,024 sockets"
      ]
    }
  }
}
```

---

### `outro` (Closing CTA & Channel Subscription)
*Use for the final video scene only.*
```json
{
  "type": "outro",
  "narration": "Subscribe to iDevak for deep-dive cloud engineering autopsies, system internals, and production postmortems.",
  "eyebrow": "DEEP DIVES",
  "headline": "Build. Solve. Deploy.",
  "subline": "Technical breakdowns with real RFCs, diffs, and zero superficial fluff.",
  "meta": {
    "channel": "youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA",
    "cta": "SUBSCRIBE",
    "ctaSub": "More Cloud & DevOps Autopsies",
    "ghost": "IDEVAK",
    "twitter": "x.com/iDevakk"
  }
}
```

---

### Universal Mascot Overlay & Timeline on Any Scene
*Add an expressive Devak reaction overlay to ANY scene with mid-scene emotion transitions:*
```json
{
  "type": "code",
  "headline": "The Hardcoded Root Password",
  "narration": "Looking closely at line 42, the developers literally left the password as admin123.",
  "mascot": {
    "expression": "thinking",
    "bubble": "Wait, let's inspect the credentials...",
    "position": "bottom-right",
    "timeline": [
      { "at": 1.8, "expression": "shocked", "bubble": "They really left admin123 in production?!" }
    ]
  },
  "meta": {
    "file": "config.js",
    "tag": "AUTH",
    "lines": [
      { "t": "const DB_USER = 'root';", "k": "code" },
      { "t": "const DB_PASS = 'admin123'; // DO NOT COMMIT", "k": "hot", "key": true, "bad": true }
    ]
  }
}
```

---

## 5. Master LLM Generation Prompt

> [!NOTE]
> For multi-agent orchestration architectures, see the modular system prompts in `prompts/`:
> - Master Orchestrator: `prompts/master-orchestrator.md`
> - Specialized Subagents: `prompts/subagents/` (`researcher-tts-writer`, `video-director`, `video-writer`, `scene-designer`, `animator-choreographer`, `audio-master`, `qa-tester`).

Copy and paste this monolithic prompt when instructing a single LLM to generate a complete script:

```markdown
You are the Lead Technical Director and Scriptwriter for the YouTube channel iDevak (Cloud Engineering, AI Automation, DevOps, and Software Architecture). Your task is to write a fast-paced, Fireship-style technical explainer video in the iDevak video engine JSON format (`content/video.json`).

### Standing Production Requirements:
- First read AGENTS.md, PROMPTS.md section 0, and engine/SCHEMA.md from this repository. Apply section 0 even when the user gives only an idea or voiceover.
- Own dependency installation, media/source preparation, transcription, alignment, composition/SFX builds, artifact inspection, tests, lint, and headless checks. Run build/pipeline/sfx yourself; draft/align:draft may create an estimated composition without audio. Building HTML/metadata/audio is allowed. Require explicit user permission only before starting a preview server or encoding a draft/final video, including indirect tool/test/hook equivalents. Finish preparation before asking; reuse explicit permission already granted for that action.
- Use the supplied audio unchanged and match its actual spoken words. If no recording exists, prepare a proposed script/draft and request the recording before final delivery. Never add TTS or reuse old narration.
- Research and use relevant authentic logos, incident images/footage, and real website captures. NEVER build or draw logos with an LLM. Use `python scripts/fetch_logo.py <brand>` to fetch official SVGs via the SVGL API -> FaviconDL API -> Firecrawl/web search waterfall. Prefer official vector logos, original high-resolution media, and verified high-DPI browser captures. Download assets locally, document sources, and choose readable crops and scene-specific labels.
- Zero-Fallback Architecture: Explicitly author every element and meta field for each scene. The engine contains NO default or fallback values for headers, filenames, terminal hosts, markers, beacons, chips, or labels. You must consciously think through and author all visual metadata specifically for the topic.
- Use Firecrawl and supported browser automation for their respective research/capture tasks. Check required skills first; if missing, identify them and prompt installation using official instructions. Explain any equivalent-tool fallback.
- Keep cuts and statistics synchronized with speech. Preserve sharp evidence and clean transitions, and give the user native/reduced-resolution review and delivery-render instructions.
- In every QA round, check available playback and adjacent timeline frames for text jitter, flicker, font/layout jumps, unstable counters, and overlay/transition movement. Fix any issue immediately in source, rebuild, and repeat headless checks yourself. Starting a preview server or encoding video for QA still needs permission; disclose only unperformed playback/export checks as pending.
- Plan contextual SFX using the engine's existing procedural cues. Sync sounds to actual reveals and actions, keep narration clear, rebuild and inspect the baked SFX track yourself, and review the final MP4 when available. Follow section 0's sound-design and export checks; do not invent JSON audio fields.
- Direct Devak throughout the story where the narration benefits from an investigation, reaction, explanation, or takeaway. Choose supported expressions and contextual overlays or mascot scenes, use optional concise bubbles, and keep evidence and mobile safe areas unobstructed. Match appearances to speech; do not impose a fixed reaction quota.

### Tone & Style:
- Fast, punchy, cynical yet deeply technical ("Fireship meets Senior Cloud Architect").
- High information density: aim for 4 to 8 seconds (12-28 words) when writing a new script. With supplied audio, follow coherent spoken beats and allow enough time to read evidence.
- Use dry humor, relatable dev pain, and accurate system internals.
- No filler words ("In this video", "Hello guys", "Let's dive in"). Start instantly on the cold open.

### Required Scene Composition:
1. Scene 1: Must be "cold" with 1-3 chips and a punchy 1-word ghost text.
2. Narrative core: Use a diverse mix of "code", "terminal", "webref" (for official specs/docs), "cloud" (for infrastructure/pipelines), "diff", and "stat".
3. Mid-video tension relief: Include 1-2 "meme" scenes with `expression: "shocked"` or `reaction: "SKILL ISSUE"` and `punch: true`.
4. Mascot reactions: Distribute contextual `"mascot": { "expression": "..." }` overlays across relevant technical and emotional beats, scaled to the video's length. Add a bubble only when it contributes useful commentary.
5. Takeaway: Use a dedicated "mascot" scene near the end when it helps deliver the key engineering lesson; follow section 0's expression, timing, and placement rules.
6. Final scene: Must be "outro" with channel: "youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA", cta: "Subscribe", ctaSub: "More Cloud & DevOps Autopsies".

Write valid JSON matching `engine/SCHEMA.md`. For a script-only request, return
the JSON. For video production, install dependencies, author the project, obtain
media, transcribe/align, build, inspect artifacts, and complete relevant tests,
lint, and headless checks yourself. Then request permission to start preview or
render if not already explicitly granted, or give the user exact commands.
Include check results and pending playback/export QA. Do not launch a preview
server or encode a draft/final video without permission.
```

---

## 6. Authoring for 9:16 Portrait (YouTube Shorts, Instagram Reels, TikTok)

When prompting an LLM to generate a **Short or Reel**, specify 9:16 aspect:

### Key Differences for 9:16 Short-Form:
- **Total Duration**: 30 to 60 seconds (75 to 150 words total, 6 to 10 scenes).
- **Scene Pacing**: Cut rapidly every 3 to 6 seconds (10 to 18 words per scene).
- **Punchy Headlines**: Keep headlines very short (1 to 3 words) to prevent multi-line clutter on vertical phone screens.
- **Aspect Flag**: Set `"aspect": "9:16"` at the top level of `content/video.json`. The engine automatically handles vertical 1080x1920 layout and mobile safe zones.
- **Mascot Emotions**: Use the Series 2 mascot expressions (`shocked`, `panic`, `cool`, `pointing`, `facepalm`, etc.) to dramatize technical twists. Never use redundant speech bubbles like `"Thinking"` or `"Shocked"`—the facial expression already shows the state.

### Master LLM Generation Prompt for 9:16 Shorts / Reels:

```markdown
You are the Lead Technical Director for iDevak. Write a 45-60 second YouTube Short / Instagram Reel script in the iDevak video engine JSON format (`content/video.json`).

Target Aspect Ratio: 9:16 Portrait (1080x1920) for mobile.

### Standing Production Requirements:
Read AGENTS.md, PROMPTS.md section 0, and engine/SCHEMA.md. Apply the same
authentic-media, skill-installation, source-quality, credit, and delivery rules
as a landscape video. Never let an LLM build logos on its own; source official
vector logos using `python scripts/fetch_logo.py` (SVGL API -> FaviconDL API ->
Firecrawl/web search), relevant original incident images/footage, and real high-DPI
website captures using Firecrawl and supported browser automation. If a required skill is missing, identify it and prompt its
installation using official instructions; explain any equivalent-tool fallback.
Install required dependencies and complete media/source preparation,
transcription, alignment, composition/SFX builds, artifact inspection, tests,
lint, and headless checks yourself. Build/pipeline/sfx and estimated draft builds
are allowed; building HTML/metadata/audio is different from encoding a video.
Require explicit user permission before starting a preview server or encoding
any draft/final video, including indirect tool/test/lifecycle-hook calls. Finish
preparation before asking, and reuse explicit permission granted for that action.
Every QA round must check available playback and timeline frames for text jitter,
flicker, font/layout jumps, unstable counters, and overlay/transition movement at
normal speed and across adjacent frames. Fix any issue immediately in source, rebuild,
and repeat permitted headless checks yourself. Preview-server launch and video
rendering for QA still require permission; disclose pending playback/export checks.
Preserve supplied audio, follow its coherent spoken beats, and cue statistics
to speech. Frame evidence for a phone, keep text sharp, use clean transitions,
and ask the user to inspect native and compressed reduced-resolution output.
Zero-Fallback Architecture: Explicitly author every element, badge, label, beacon, header, and chip in `content/video.json`. The engine provides no fallback strings; missing fields are omitted.
Without a voiceover, prepare a script/draft and request the recording before
final delivery; do not add TTS or reuse previous audio.

Plan restrained contextual SFX using the engine's deterministic procedural cues,
sync them to the actual visual and spoken events, and keep speech intelligible.
Rebuild and verify the baked SFX track yourself, then review the rendered MP4
when available as required in section 0. Use Devak at relevant investigation,
twist, and takeaway beats with supported expressions, optional concise bubbles,
and overlays or dedicated mascot scenes that preserve evidence and mobile safe
areas. Scale appearances to the story; avoid forcing a reaction into every short scene.

### Instructions:
1. Top-Level: Set `"aspect": "9:16"`, `"title": "..."`, and `"channel": "youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA"`.
2. New script target: 80-120 spoken words across 6-8 scenes (approx 45 seconds). Supplied audio determines the actual length.
3. Pacing: Super snappy! Aim for 10-18 words per scene, without cutting a supplied recording's thoughts or relevant speech short.
4. Headlines: Ultra-short punchy text (1-3 words) formatted for vertical screens.
5. Visual Mix:
   - Scene 1: "cold" open hook with 1-2 chips.
   - Core beats: mix of "terminal", "code", "cloud", "stat", or "webref".
   - Dramatic twist: "meme" scene with `punch: true` and an expressive mascot reaction.
   - Climax / Takeaway: "mascot" scene with `expression: "pointing"` or `"cool"`.
   - Final scene: "outro" with subscribe CTA.
6. Mascot rules: Use the expressive Series 2 cloud mascot (`shocked`, `panic`, `facepalm`, `cool`, `pointing`). Let the character's facial expression speak for itself—never use redundant bubble text like "Thinking" or "Shocked".

Write valid JSON matching engine/SCHEMA.md. Return JSON for script-only requests;
for video production, install dependencies, prepare sources/media, transcribe,
validate, align, build, inspect artifacts, and run relevant tests/lint/headless
checks yourself. Then request permission to start preview or render if not
already explicitly granted, or supply exact commands for the user. Do not start
a preview server or encode a draft/final video without permission.
```
