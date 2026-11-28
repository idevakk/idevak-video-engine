# Agent guide

This repo is a reusable HyperFrames template for narration-driven forensic
videos. You bring a topic and a voiceover. The engine transcribes the audio,
aligns every scene's narration to the spoken words, and builds a deterministic
composition.

Read `PROMPTS.md`, especially section 0, at the start of every new video task.
Its authentic-media, quality, contextual SFX, and mascot defaults apply even when
the user only supplies an idea or voiceover and does not repeat the production
brief. Read `engine/SCHEMA.md` before editing `content/video.json`. Read
`engine/build.mjs` before adding a new visual type.

## Optional Daytona execution

Daytona is disabled by default and must be explicitly enabled for each video.
When enabled, follow `docs/DAYTONA.md` and use `scripts/daytona_video.py` for
voiceover transcription, `prepare` (alignment/build/SFX/tests/lint/checks and
headless QA frames), and final MP4 rendering. For this workflow the host only
needs Python, the Daytona SDK, credentials, network, and file storage; install
Node/FFmpeg/Chromium inside the sandboxes. Review downloaded preparation reports
and frames, fix source and repeat preparation as needed, then render the checked
artifacts. Do not run the local pipeline for an opted-in video. That opt-in
grants standing permission for this video's sandbox renders after preparation and QA
pass, satisfying the render-permission rules below. Preview servers and local
video encoding still require separate permission. Download and show the MP4,
delete each owned sandbox on success/failure, and keep a configurable 15-minute
inactivity deletion fallback enabled. Install the Daytona skill and Python SDK
if missing using the exact commands in `docs/DAYTONA.md`. This policy is repo-local.

## Non-negotiables

1. The voiceover is the timing master. `narration` must be the words actually
   spoken in the audio. Do not invent narration or stretch a scene to fit a
   visual idea.
2. Display text can be rewritten. `headline`, `subline`, `eyebrow`, and `meta`
   do not have to match the narration.
3. Do not add TTS, generate a synthetic voice, or replace the user's audio.
   The user supplies the voiceover.
4. Keep the existing design system and the 21 scene types. The look is the
   product. Add a new type only when the story cannot be told with an existing
   one, and then add the renderer, CSS, animation, and schema together.
5. Isolated project workspaces (`workspaces/<slug>/`, ignored by git):
   - Never overwrite the template `content/video.json`, drop project assets into
     root `assets/`, or write project notes/builds/renders at the repo root when
     creating or testing a video.
   - Always create or target an isolated workspace under `workspaces/<slug>/`
     (`npm run project:new -- <slug>` and `--project <slug>` or
     `npm run project:use -- <slug>`). Every project's `video.json`, voiceover,
     `notes/`, `assets/` (`logos/`, `webref/`, `SOURCES.md`), `build/`,
     `index.html`, `hyperframes.json`, and `renders/` live strictly inside that
     workspace folder.
   - When improving the video engine (`engine/`, `scripts/`, `tests/`, `docs/`),
     do not touch or overwrite files inside user `workspaces/<slug>/` folders.
     Use `npm test`, `npm run test:py`, or a disposable `workspaces/_test-*`
     workspace (and clean up any temporary test workspace afterward).
6. Do not commit generated files, audio, workspaces, or renders. The ignore
   rules handle this; do not force-add them.
7. Use plain hyphens in repo docs and commit messages. Do not use em dashes.
8. Source authentic logos, relevant incident images and footage, and real website
   captures by default. Never let an LLM attempt to build, synthesize, or invent
   a logo on its own (no inline SVGs, approximate canvas shapes, CSS drawings,
   emoji hacks, or text substitutions). Always find and download the real official
   logo online using the automated waterfall via `python scripts/fetch_logo.py <brand>`:
   (1) SVGL API (`https://api.svgl.app?search=<brand>`), (2) FaviconDL API
   (`https://favicondl.com/api/extract?url=<domain>`), or (3) Firecrawl / web
   search if neither service provides the real logo. For `webref` scenes,
   default to capturing real website screenshots (and exact `highlightRects`
   text coordinates) via `node scripts/capture_webref.mjs --url <url> --out assets/webref/<id>.png --highlight "<exact quote>"`
   instead of copy-pasting reference text to emulate a browser; use the
   text-emulated `snippet`/`callout` mode only when explicitly told not to
   capture screenshots (or if a capture is blocked and disclosed). Follow the
   skill checks, sourcing, native-resolution, provenance, and playback review
   requirements in `PROMPTS.md` section 0.
9. Plan contextual SFX and mascot direction for each new video using
   `PROMPTS.md` section 0. Use supported expressions and the existing baked SFX
   path, synchronize reactions and sounds to speech, preserve evidence
   readability, and give the user exported-mix review instructions.
10. Complete dependency setup, source/media preparation, transcription,
    alignment, composition builds, SFX baking, tests, lint, and checks yourself.
    This includes `npm run build`, `pipeline`, `sfx`, and, for estimated timing,
    `draft` / `align:draft`. A composition build generates HTML, metadata, and
    audio; it is not a video render. Headless build/SFX and QA tools are allowed.
    Require explicit user permission before starting a preview server or any
    draft/final video render, including `npm run preview`, `render`, `render:hq`,
    direct equivalents, and indirect tool/subagent/test/lifecycle-hook calls.
    Finish permitted preparation and checks before asking to preview or render.
    A generic request to generate a video is not that permission; an explicit
    request to start preview or render is. Reuse permission already granted for
    the action instead of asking again, or give commands for the user to run.
    Exception: when the user explicitly invokes the **Ralph Style Loop**
    (`prompts/ralph-style-loop.md` / `scripts/ralph_style.py`) with a reference
    video or YouTube URL, that request grants standing permission for headless
    `--quality draft` renders strictly inside the isolated `workspaces/_ralph-<slug>/`
    loop workspace for dissection and comparison.
    Before starting a Ralph Style Loop, check `python scripts/ralph_style.py styles`:
    if mode (`new` vs `enhance`) is unmentioned, ask the user and list all
    available styles; if a named style does not exist, refuse to hallucinate a
    fallback and ask the user to choose from the live list or create a new style.
11. Every QA round must check available playback and frame sequences for text
    jitter, flicker, font/layout jumps, shifting counters, and unstable overlays
    or transitions.
    Fix any issue immediately in source, rebuild, and repeat permitted headless
    checks at affected timestamps. Preview-server launch and video rendering
    still require permission; keep any unperformed playback/export QA pending.

## Multi-Agent Delegation Architecture

Production can be orchestrated by a multi-agent team coordinated by the **Master Orchestrator** (`prompts/master-orchestrator.md`) delegating across a 5-phase lifecycle to 7 specialized subagents:
- **`researcher-tts-writer`** (`prompts/subagents/researcher-tts-writer.md`): Pre-production research, G2P phonetic TTS script generation, and draft storyboard compilation.
- **`video-director`** (`prompts/subagents/video-director.md`): Pacing, act structure, retention hooks, and mascot emotional arcs.
- **`video-writer`** (`prompts/subagents/video-writer.md`): Spoken voiceover dialogue and decoupled display headlines/sublines.
- **`scene-designer`** (`prompts/subagents/scene-designer.md`): Authoritative `content/video.json` using the 22 scene archetypes.
- **`animator-choreographer`** (`prompts/subagents/animator-choreographer.md`): Deterministic GSAP timelines in `engine/anim.js`, zero-jitter standards.
- **`audio-master`** (`prompts/subagents/audio-master.md`): Procedural SFX synthesis in `engine/sfx_mixer.py`, ducking, and headroom.
- **`qa-tester`** (`prompts/subagents/qa-tester.md`): Frame-by-frame visual audit (`qa:frames`, `qa:sheets`) running strictly in Phase 4 after initial compilation.

## Workflow

Agents own dependency setup and steps 1-6, plus lint, tests, headless checks, and
build-artifact inspection in step 7. Do not stop at source preparation or ask the
user to build. Only preview-server launch and draft/final video rendering need
explicit permission. Website research captures and headless still-frame QA are
allowed; do not start a persistent preview server or encode video as a QA bypass.

### 0. Set up dependencies

Check the repo's Node, Python, FFmpeg, Python transcription, and browser
requirements. Install missing project dependencies using the existing lockfile
and documented commands (`npm ci` when a lockfile is present, otherwise
`npm install`), plus Playwright Chromium (`npx playwright install chromium`) and
required Python packages as needed. Local npm scripts call `python`; the Daytona
sandbox is Linux and its remote commands call `python3`. Keep those as they are.
Resolve setup/build/check failures yourself; report genuine external blockers.
Do not launch preview or render as an install or test side effect. Follow
`PROMPTS.md` for missing research skills/tools.

### 1. Create an isolated workspace and put the voiceover in place

Create a gitignored workspace for the video or test (`npm run project:new -- <slug>`).
Put the user's file at `workspaces/<slug>/voiceover.wav` (or set `audio` in
`workspaces/<slug>/video.json` relative to that workspace). Pass `--project <slug>`
to pipeline commands (or set it active with `npm run project:use -- <slug>`).
The exact file that is transcribed must be the file embedded in the composition.

### 2. Transcribe the audio

```bash
python engine/transcribe.py --project <slug>
# or
npm run transcribe -- --project <slug>
```

This reads `audio` from `workspaces/<slug>/video.json` and writes
`workspaces/<slug>/build/vo.json` with word-level timings. The default model is
`large-v3-turbo`, which is accurate but slow on CPU. For a quick draft, use
`--model small.en`. Always transcribe the exact final audio file. If the
voiceover is not English, pass `--language`.

### 3. Write the project

Edit `workspaces/<slug>/video.json` (leaving root `content/video.json` untouched).
Store research notes and TTS scripts in `workspaces/<slug>/notes/`, and store
project-only logos/screenshots/clips and `SOURCES.md` in `workspaces/<slug>/assets/`.
Keep the top-level shape:

```json
{
  "title": "...",
  "slug": "<slug>",
  "compositionId": "<slug>",
  "audio": "voiceover.wav",
  "channel": "@...",
  "ghost": "...",
  "cta": "Subscribe",
  "ctaSub": "...",
  "composition": { "width": 1920, "height": 1080, "fps": 30 },
  "acts": [{ "id": "act-1", "name": "ACT ONE", "accent": "#ff3b5c" }],
  "scenes": []
}
```

Research the topic and map relevant authentic assets to the narration before
choosing the visuals. Group narration into coherent thoughts, not arbitrary ASR
segment pairs. Keep each cut through the final spoken word; use `meta.revealOn`
for statistics introduced later in a beat. A good short video
has 8-20 scenes. A 20-minute video can use 60-180. Keep each scene between 8 and
35 narration words. If a beat is longer, split it.

The first scene should be `cold` and the last should be `outro`. Use `acts` to
group chapters and to give each chapter an accent color. A scene can override
the accent with `accent`.

### 4. Validate

```bash
python engine/validate.py
# or
npm run validate
```

Fix all errors. Warnings are editorial. Common warnings: the audio is missing,
a headline is too long, a scene is under 3 or over 45 words, the first scene is
not `cold`, or the last scene is not `outro`. `--strict` treats warnings as
errors.

### 5. Align

```bash
python engine/align.py
# or
npm run align
```

This writes `build/scenes.json`, `build/project.json`, and `build/report.md`.
Read the report:

- `Script words matched` should be high, ideally above 95%.
- `No matched words` means the narration does not match the audio. Fix the
  narration, or check that you transcribed the right file.
- `Weak narration match` means a scene's words are only partly present. Rewrite
  the scene to match what is actually spoken.
- `Shorter than 2s` and `Longer than 15s` are pacing warnings. Split or merge
  scenes as needed.

Do not hand-edit `build/scenes.json` or `build/project.json`. They are
generated. Change `content/video.json` and re-run the aligner.

### 6. Build and inspect artifacts

Run the build yourself after source, animation, or cue changes:

```bash
node engine/build.mjs
# or
npm run build
```

This writes `index.html` and `hyperframes.json`. The composition is a single
paused GSAP timeline. The builder inlines `engine/fonts.css`, `engine/style.css`,
and `engine/anim.js`, and replaces the `"__COMPOSITION_ID__"` placeholder in the
animation registry with the project's composition id.

The build also bakes `build/sfx_track.wav` and its cue schedule. Verify the
generated HTML/metadata, composition dimensions/duration, local asset/audio
references, and SFX track/schedule. Resolve missing or stale outputs, then run
lint, checks, and relevant tests. Do not hand-edit generated files. With no
recording, `npm run draft` is allowed for an estimated composition build; it
does not encode a draft video or establish final speech timing.

### 7. Check, then request preview permission

Run these checks yourself after the build:

```bash
npx hyperframes@latest lint
npx hyperframes@latest check
```

`lint` and `check` must report 0 errors. The checker may report many warnings
for a long one-file composition: one section per scene, composition size,
timeline density, negative z-index background layers, and small mono labels.
These are expected for this engine. Do not split the composition into
sub-compositions just to silence them. An asset over the 2 MB inline limit stays
external by design; keep evidence at native resolution instead of downscaling it
to silence that warning.

Inspect available frames at the first frame, every transition, and the last
frame for clipped/overlapping text, readability, jitter, and layout instability.
Fix issues immediately, rebuild, and repeat the relevant checks. Headless
composition checks and still-frame inspection are allowed without permission.
`npm run qa:frames` and `npm run qa:sheets` are optional local checks; they
write frames, a report, and contact sheets under `build/qa/local`.

After preparation and checks, ask permission to start `npm run preview` unless
the user already explicitly authorized it, or give the command for them to run.
Do not launch a preview server without permission, including through another
command or tool. Review playback once available and disclose pending checks.

### 8. Render (explicit permission required)

Ask permission before any draft, review, or final video render, unless already
explicitly authorized for that action. Alternatively give the user these
commands. `npm run render` includes a build hook; the build alone is allowed,
but the command also encodes video and therefore requires permission.

```bash
npx hyperframes@latest render --quality looks --output renders/video.mp4
# or
npm run render
```

The render reads `index.html` and the audio path in the composition. The audio
file must exist at render time. Use `--quality draft` for a fast review and
`--quality delivery` for the final master.

## Fast path

```bash
npm run pipeline
npm run check
```

The agent runs the commands above. The following commands require explicit
permission to execute, or can be handed to the user:

```bash
npm run preview
npm run render
```

`npm run pipeline` runs validate, transcribe, align, and build in order. It stops
on the first failure. Use the individual commands when you need to iterate on
one stage.

## Where things live

| Path | What it is |
|---|---|
| `content/video.json` | The authored project. Replace the starter. |
| `content/voiceover.wav` | The user's audio. Ignored by git. |
| `engine/transcribe.py` | Word-level transcription. |
| `engine/validate.py` | Schema and editorial validation. |
| `engine/align.py` | Word alignment and scene timing. |
| `engine/build.mjs` | Composition builder and 17 scene renderers. |
| `engine/anim.js` | GSAP choreography for every scene type. |
| `engine/style.css` | Design tokens, layout, and motion styles. |
| `engine/fonts.css` | Local font faces. |
| `engine/SCHEMA.md` | Full schema and per-type meta reference. |
| `assets/fonts/` | Inter and JetBrains Mono. |
| `build/` | Generated timing data and reports. Ignored. |
| `index.html` | Generated composition. Ignored. |
| `hyperframes.json` | Generated composition metadata. Ignored. |
| `renders/` | Rendered output. Ignored. |

## Troubleshooting

Agents should run setup, transcription, alignment, build, and check remedies
below themselves. Preview-server and video-render remedies require explicit
permission; they may also be provided as commands for the user to run.

**`missing file: build/vo.json`**
Run `python engine/transcribe.py` first.

**`voiceover not found`**
Put the audio at `content/voiceover.wav` or set `audio` in
`content/video.json`. The path is relative to the repo root.

**`build/vo.json has no word timings`**
The transcription produced no words. Check the audio, the language, and the
model. Run the transcriber again and inspect `build/vo.json`.

**Low match percentage or no matched words**
The narration and the audio disagree. Transcribe the exact final audio file.
Read the transcript in `build/vo.json` and rewrite `narration` to match what is
actually spoken. Do not edit the generated timings by hand.

**`visible_markup_comment`**
The builder escapes `/*` and `*/` in visible text. If you add raw HTML or a new
renderer, escape the text. Do not put HTML in `content/video.json`.

**`gsap_timeline_not_registered`**
Keep the literal `"__COMPOSITION_ID__"` key in `engine/anim.js`. The builder
replaces it with the composition id. Do not replace it with a computed key.

**The check reports layout issues**
The composition is 1920x1080. Long headlines, long sublines, and too many meta
items can overflow. Shorten the text, reduce the number of items, or adjust the
specific CSS. Rebuild and re-check.

**The render is slow or runs out of memory**
The composition is one large HTML file. Use `--quality draft` for review. For a
long video, render with more workers only if the machine has memory to spare.
The old 24-minute test rendered from a 180-scene file.

## Definition of done before preview/render permission

- Required dependencies are installed and available; genuine blockers are disclosed.
- `python engine/validate.py` reports 0 errors; any unavailable input is disclosed.
- When final audio is available, transcription and alignment are complete with
  a high match percentage and no no-match or weak-match warnings.
- Relevant authentic assets are local, credited, and inspected at native size
  against their planned display footprint. All brand logos are genuine external assets
  retrieved online (via `scripts/fetch_logo.py` or official press kits), not LLM-fabricated
  approximations. Source limitations are disclosed.
- Contextual SFX and mascot direction are authored using the supported engine
  paths, expressions, and positions, with clear evidence and narration in mind.
- The agent has built the composition and SFX, inspected generated files and
  local media/audio references, and completed relevant tests, lint, and checks.
  An estimated draft build is clearly distinguished from final audio alignment.
- Report preparation/check results and ask permission to start preview or render
  if not already explicitly authorized. Offer exact commands if the user prefers
  to run them. Do not ask the user to do prerequisite builds or dependency setup.
- Include a review checklist: lint/check errors, opening/every cut/ending,
  sharp evidence at native and reduced resolution, speech timing, mascot
  placement, text/motion stability across adjacent frames, and audible SFX
  beneath clear narration in the exported MP4. Fix any jitter or instability
  immediately in source, rebuild, and repeat permitted QA.
- Distinguish completed build/headless checks from pending playback/export QA.
  Do not claim an unperformed check passed or a new MP4 was generated. Review
  available outputs and resolve issues without bypassing preview/render permission.
