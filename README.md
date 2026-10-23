# Forensic Video Template

A reusable HyperFrames project for narration-driven forensic deep dives. The
repo ships the engine, the visual system, and a starter script. You bring the
topic and the voiceover.

The audio is the timing master. The engine transcribes it, aligns every scene's
narration to the spoken words, and builds a single deterministic GSAP timeline.
Display text can be rewritten. The narration cannot drift from the audio.

This template does not use TTS. Your voiceover is the only voice in the video.

## What is included

- A 17-type scene system: cold open, hero, statement, stat, dateline, code,
  diff, flow, ledger, memory, timeline, terminal, compare, stack, quote, matrix,
  and outro.
- A forensic design system with Inter, JetBrains Mono, local fonts, accent
  colors, grain, scanlines, bloom, and a cut rail.
- A Python pipeline for word-level transcription, schema validation, monotonic
  word alignment, and a timing report.
- A Node builder that inlines the CSS and animation into one portable
  `index.html` plus `hyperframes.json`.
- A 9-scene starter project, `content/video.json`, that doubles as a schema
  example.

## Requirements

- Node.js 20 or newer.
- Python 3.10 or newer.
- `ffmpeg` on `PATH`.
- `faster-whisper` for transcription:

  ```bash
  pip install faster-whisper
  ```

- Network access for `npx hyperframes@latest` and for the GSAP CDN script in
  the generated composition.

## Quick start

```bash
git clone <this-repo>
cd <this-repo>

# 1. Put your voiceover at content/voiceover.wav
#    or set "audio" in content/video.json to another path.

# 2. Write your project.
#    Replace the starter scenes in content/video.json.
#    Read engine/SCHEMA.md for every scene type and meta field.

# 3. Run the pipeline.
npm run validate
npm run transcribe
npm run align
npm run build

# 4. Inspect and render.
npm run check
npm run preview
npm run render
```

The fast path is:

```bash
npm run pipeline
npm run check
npm run preview
npm run render
```

`npm run pipeline` runs validate, transcribe, align, and build in order. It
stops on the first failure.

The starter project will not align until you add a voiceover. It is a schema
example, not a finished video.

## Pipeline

```text
content/video.json + content/voiceover.wav
        |
        v
engine/transcribe.py -> build/vo.json
        |
        v
engine/align.py -> build/scenes.json + build/project.json + build/report.md
        |
        v
engine/build.mjs -> index.html + hyperframes.json
        |
        v
hyperframes lint / check / preview / render
```

### 1. Transcribe

```bash
python engine/transcribe.py
```

The transcriber reads the `audio` field from `content/video.json` and writes
word-level timings to `build/vo.json`. The default model is `large-v3-turbo`.
For a quick draft on CPU:

```bash
python engine/transcribe.py --model small.en
```

Always transcribe the exact final audio file. If the audio is not English, pass
`--language`. Run `python engine/transcribe.py --help` for the other options.

### 2. Validate

```bash
python engine/validate.py
```

This checks the project structure, scene types, required meta fields, text
lengths, accents, acts, and the first/last scene. Fix every error. Warnings are
editorial. `--strict` turns warnings into errors.

### 3. Align

```bash
python engine/align.py
```

The aligner maps the script words to the transcript with a monotonic dynamic
program, then gives every scene a contiguous visual window. It writes:

- `build/scenes.json`: scenes with `start`, `end`, `duration`, resolved accent,
  variant, and normalized meta.
- `build/project.json`: title, audio path, composition settings, and duration.
- `build/report.md`: a timing table plus alignment warnings.

Read `build/report.md`. A high match percentage and no no-match warnings mean
the narration is faithful to the audio. If a scene has no matched words, fix
the narration rather than editing timings by hand.

### 4. Build

```bash
node engine/build.mjs
```

The builder reads `build/scenes.json` and `build/project.json`, then writes
`index.html` and `hyperframes.json`. The CSS and animation are inlined into the
composition. The animation registry uses the project's composition id, so the
timeline is discovered by the HyperFrames runtime.

### 5. Check

```bash
npx hyperframes@latest lint
npx hyperframes@latest check
```

Both commands should report 0 errors. For a long one-file composition, the
checker reports warnings for one section per scene, composition size, timeline
density, negative z-index background layers, and small mono labels. These are
expected for this engine. Do not split the composition into sub-compositions
just to silence them.

The checker's layout and motion passes sample the composition. The contrast
pass checks text against WCAG AA. The current engine passes the contrast checks.

### 6. Preview and render

```bash
npx hyperframes@latest preview
npx hyperframes@latest render --quality looks --output renders/video.mp4
```

Use `--quality draft` for a fast review and `--quality delivery` for the final
master. The render reads the audio path in the composition; the file must exist
at render time.

## Project structure

```text
content/video.json        authored project, source of truth
content/voiceover.wav     your audio, ignored by git
engine/transcribe.py      faster-whisper word-level transcription
engine/validate.py        schema and editorial checks
engine/align.py           monotonic word alignment and scene timing
engine/build.mjs          composition builder and 17 scene renderers
engine/anim.js            GSAP choreography
engine/style.css          design tokens, layout, and motion styles
engine/fonts.css          local font faces
engine/SCHEMA.md          full schema and per-type meta reference
assets/fonts/             Inter and JetBrains Mono
build/                    generated timing data and reports, ignored
index.html                generated composition, ignored
hyperframes.json          generated metadata, ignored
renders/                  rendered output, ignored
```

## Scene types

| Type | Use it for |
|---|---|
| `cold` | Title card and opening statement |
| `hero` | A large editorial title with a side mark |
| `statement` | A single sentence that needs space |
| `stat` | One number with a label and ruler |
| `dateline` | A dated document or event |
| `code` | A short source excerpt with a callout |
| `diff` | A before/after patch |
| `flow` | A 2-4 step causal chain |
| `ledger` | A small table of findings |
| `memory` | A cell grid with a pointer and legend |
| `timeline` | 2-6 dated or ordered events |
| `terminal` | A command and its output |
| `compare` | Two columns with a versus marker |
| `stack` | 2-6 stacked layers |
| `quote` | A pull quote and attribution |
| `matrix` | A dense grid of cells |
| `outro` | Closing CTA and channel |

Every type has a small meta object. The full field list and examples are in
`engine/SCHEMA.md`. The starter `content/video.json` uses `cold`, `statement`,
`flow`, `timeline`, `compare`, `stat`, `quote`, and `outro`.

## Authoring rules

- The first scene should be `cold` and the last should be `outro`.
- Keep each scene between 8 and 35 narration words. The validator warns below 3
  and above 45. Split a long beat instead of holding one visual.
- Use 2-4 acts. Each act has an accent color. A scene can override it.
- Keep headlines short. The validator allows 96 characters, but 64 reads better
  at 1920x1080. `quote` and `code` allow 180.
- Put data in `meta`, not in HTML. The builder escapes all visible text.
- Use `variant` on `statement` scenes for visual variation. The aligner cycles
  0, 1, 2 when it is omitted.
- The display text does not have to match the narration. The narration does.

## Customizing the look

The design tokens live at the top of `engine/style.css`: `--ink`, `--dim`,
`--faint`, `--line`, `--line-soft`, `--bg`, `--mono`, and the scene accent
variable `--ac`. The accent comes from the scene, then the act, then
`defaultAccent`.

The scene choreography lives in `engine/anim.js`. Each scene type has a
timeline that runs on the single paused GSAP timeline. If you add a new visual
type, add the renderer in `engine/build.mjs`, the CSS in `engine/style.css`, the
choreography in `engine/anim.js`, and the validation in `engine/validate.py`.
Then update `engine/SCHEMA.md`.

## Output

The composition is 1920x1080 at 30 fps by default. The duration is the last
scene's end, which is the audio duration. `hyperframes.json` carries the
composition id, entry file, size, fps, duration, and channel.

`index.html`, `hyperframes.json`, `build/`, and `renders/` are generated and
ignored. The audio and renders are ignored too. The repo stays small.

## Troubleshooting

**`voiceover not found`**
Put the file at `content/voiceover.wav` or set `audio` in `content/video.json`.
The path is relative to the repo root.

**`missing file: build/vo.json`**
Run the transcriber first.

**Low match percentage**
The narration and audio disagree. Transcribe the exact final audio file. Read
the transcript in `build/vo.json` and rewrite `narration` to match what is
actually spoken. Do not edit `build/scenes.json` by hand.

**The check reports layout issues**
Long headlines, long sublines, and too many meta items can overflow. Shorten
the text, reduce the number of items, or adjust the specific CSS. Rebuild and
re-check.

**The render is slow**
The composition is one large HTML file. Use `--quality draft` for review. For a
long video, give the renderer enough memory and workers for the machine.

## The original PHP2Shell project

The refactor preserves the original PHP2Shell video in the local tag
`php2shell-original`. Check it out to see the 180-scene, 24-minute reference
build:

```bash
git checkout php2shell-original
```

The tag contains the original scripts, audio, cues, and composition. The
`main` branch is the reusable template.
