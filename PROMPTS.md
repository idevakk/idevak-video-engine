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

### User-run build, preview, and render

- Never execute a draft build, full composition build, preview launch, or video
  render yourself. Always ask the end user to run preview or render themselves.
  This applies even to a general request to generate a complete video.
- Prepare the authored project, authentic local media, SFX/mascot direction,
  transcription, alignment, and validation. Source-media website captures are
  allowed. Stop at a concrete handoff with exact commands and prerequisites.
- Do not invoke `npm run draft`, `npm run build`, `npm run pipeline`,
  `npm run sfx`, `npm run preview`, `npm run render`, or `npm run render:hq`.
  Leave draft timing (`npm run align:draft` or `align.py --draft`) to the user too.
  Do not run direct builder, SFX mixer, or HyperFrames preview/render equivalents,
  or bypass this rule through tests, lifecycle hooks, wrappers, tools, or a
  delegated agent. `render` and `render:hq` automatically build before export.
- For preview, ask the user to run `npm run build` followed by `npm run preview`.
  For export, ask them to run `npm run render:hq` for delivery quality. With
  no recording, offer the user-run `npm run draft` then `npm run preview` path.
  Never execute these handoff commands on the user's behalf.
- Provide the visual/audio review checklist and disclose pending checks. Review
  user-produced outputs when supplied, fix the source as needed, and hand back
  the commands again. Do not claim to have built, previewed, or rendered a video
  when only source preparation is complete. The checks below describe the
  intended output quality and the user's review, not permission to run a build.

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
- Use official SVG/vector logos when available, with a background that preserves
  their contrast. Do not replace an available official logo with plain text,
  an emoji, an unrelated icon, or an AI-generated imitation.
- Search for genuine footage where relevant. If none is available, a recording
  of the real public report or product can be used and labeled as a source-page
  walkthrough. Do not portray that recording, generic B-roll, a diagram, or a
  reconstruction as footage of the incident itself.
- Capture the real website in a browser after fonts and images load. Frame the
  relevant headline, finding, or interface instead of shrinking an entire long
  page into an unreadable panel. Do not fabricate screenshots or research logs.
- Download final media locally so renders do not depend on remote availability.
  Record each asset's source URL, publisher, description, native dimensions,
  capture method or footage range, and any usage/credit requirements in
  `assets/SOURCES.md`. Preserve publisher redactions and relevant attribution.
- Use `hero.meta.image`, `video`, `poster`, `mediaStart`, `logos`, `label`,
  `caption`, and `source`, or `webref.meta.image`, as documented in the schema.
  Write scene-specific labels appropriate to each new topic. Do not carry
  labels or assets over from the previous episode by accident.

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
- Ask the user to inspect representative frames at native output size and in a
  compressed, reduced-resolution review, such as 480p. Essential headlines,
  findings, and brand identification must remain legible on a small screen.
  Reframe or simplify the layout when they do not; do not rely on tiny source-page text.
- Validate and align the authored source. Hand the user build, check, preview,
  and delivery-render commands at the requested resolution. Ask them to review
  the opening, every transition, and ending, verify the MP4's streams/duration,
  and check audio sync near the start, middle, and end. Mark these user-run steps
  as pending until results are available; never run them to finish the task.

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
  is needed, extend the existing cue/synthesis path and review the user's mix.
  Do not invent unsupported SFX fields in `content/video.json` or rely on live
  browser audio callbacks that disappear from the exported video.
- Ask the user to run `npm run build` after animation or cue changes. It generates
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

## 4. Scene Type Reference & Meta Specs

### `webref` (Browser & Documentation Spotlight)
*Use when citing official docs, RFCs, GitHub PRs, or CVE advisories.*
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
    "title": "RFC 6749: The OAuth 2.0 Authorization Framework",
    "snippet": [
      "The client MUST NOT expose its client secret to the user-agent or any public environment.",
      "Any token request originating from an untrusted origin will allow token interception."
    ],
    "highlight": "client MUST NOT expose its client secret",
    "callout": "Leaving secrets in frontend client code compromises the entire authentication tree.",
    "calloutType": "IMPORTANT"
  }
}
```

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
    "expression": "shocked",
    "punch": true
  }
}
```

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

### Universal Mascot Overlay on Any Scene
*Add an expressive Devak reaction in the corner of ANY standard scene:*
```json
{
  "type": "code",
  "headline": "The Unchecked Buffer",
  "narration": "Look at line 84: memcpy is called with the user-supplied length parameter directly.",
  "mascot": {
    "expression": "shocked",
    "bubble": "Wait, did they really call memcpy without checking bounds?!",
    "position": "bottom-right"
  },
  "meta": {
    "lines": [
      { "t": "int len = req->content_length;", "k": "code" },
      { "t": "memcpy(dest_buf, req->body, len); // NO BOUNDS CHECK", "k": "hot", "key": true }
    ],
    "file": "handler.c"
  }
}
```

---

## 5. Master LLM Generation Prompt

Copy and paste this prompt when instructing an LLM to generate a complete script:

```markdown
You are the Lead Technical Director and Scriptwriter for the YouTube channel iDevak (Cloud Engineering, AI Automation, DevOps, and Software Architecture). Your task is to write a fast-paced, Fireship-style technical explainer video in the iDevak video engine JSON format (`content/video.json`).

### Standing Production Requirements:
- First read AGENTS.md, PROMPTS.md section 0, and engine/SCHEMA.md from this repository. Apply section 0 even when the user gives only an idea or voiceover.
- Never run draft/full builds, preview launches, or video renders, including indirect pipeline, SFX, test, or lifecycle-hook equivalents. Prepare and validate the source, then always ask the user to run preview or render themselves with exact commands and build prerequisites. Report playback/export checks as pending until user-produced results are available.
- Use the supplied audio unchanged and match its actual spoken words. If no recording exists, prepare a proposed script/draft and request the recording before final delivery. Never add TTS or reuse old narration.
- Research and use relevant authentic logos, incident images/footage, and real website captures. Prefer official vector logos, original high-resolution media, and verified high-DPI browser captures. Download assets locally, document sources, and choose readable crops and scene-specific labels.
- Use Firecrawl and supported browser automation for their respective research/capture tasks. Check required skills first; if missing, identify them and prompt installation using official instructions. Explain any equivalent-tool fallback.
- Keep cuts and statistics synchronized with speech. Preserve sharp evidence and clean transitions, and give the user native/reduced-resolution review and delivery-render instructions.
- Plan contextual SFX using the engine's existing procedural cues. Sync sounds to actual reveals and actions, keep narration clear, and ask the user to rebuild the baked SFX track and listen to the final MP4 across its full duration. Follow section 0's sound-design and export checks; do not invent JSON audio fields.
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
the JSON. For video production, author the project, obtain its media, complete
validation and alignment, and ask the user to run preview or render themselves.
Include build prerequisites, exact commands, and a visual/audio review checklist.
Never execute the draft, build, preview, or render commands yourself.
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
as a landscape video. Source official vector logos, relevant original incident
images/footage, and real high-DPI website captures using Firecrawl and supported
browser automation. If a required skill is missing, identify it and prompt its
installation using official instructions; explain any equivalent-tool fallback.
Never run a draft/full build, preview launch, or video render, directly or
indirectly through pipeline, SFX, tests, or lifecycle hooks. Prepare the source
and always ask the user to run preview or render themselves with exact commands
and prerequisites. Keep playback/export checks pending until results are supplied.
Preserve supplied audio, follow its coherent spoken beats, and cue statistics
to speech. Frame evidence for a phone, keep text sharp, use clean transitions,
and ask the user to inspect native and compressed reduced-resolution output.
Without a voiceover, prepare a script/draft and request the recording before
final delivery; do not add TTS or reuse previous audio.

Plan restrained contextual SFX using the engine's deterministic procedural cues,
sync them to the actual visual and spoken events, and keep speech intelligible.
Ask the user to rebuild and verify the baked SFX track, then listen to the
rendered MP4 as required in section 0. Use Devak at relevant investigation,
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
for video production, complete source preparation, media sourcing, validation,
and alignment, then ask the user to run preview or render. Supply exact commands,
build prerequisites, and review checks; never execute a draft/build/preview/render.
```
