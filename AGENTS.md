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
5. One active video per clone. `content/video.json` is the source of truth.
   `build/`, `index.html`, `hyperframes.json`, and `renders/` are generated.
6. Do not commit generated files, audio, or renders. The ignore rules handle
   this; do not force-add them.
7. Use plain hyphens in repo docs and commit messages. Do not use em dashes.
8. Source authentic logos, relevant incident images and footage, and real website
   captures by default. Follow the skill checks, sourcing, native-resolution,
   provenance, and playback review requirements in `PROMPTS.md` section 0.
9. Plan contextual SFX and mascot direction for each new video using
   `PROMPTS.md` section 0. Use supported expressions and the existing baked SFX
   path, synchronize reactions and sounds to speech, preserve evidence
   readability, and give the user exported-mix review instructions.
10. Never execute a draft build, full composition build, preview launch, or video
    render. These actions belong to the end user. Prepare the source and always
    ask the user to run preview or render themselves, with build prerequisites
    and exact commands. Do not bypass this through another tool, subagent,
    wrapper, test, or lifecycle hook. This includes `npm run draft`, `build`,
    `pipeline`, `sfx`, `preview`, `render`, and `render:hq`, direct builder/SFX
    mixer/HyperFrames equivalents, and any command that invokes them indirectly.
    Leave draft timing (`align:draft` / `align.py --draft`) to the user too.
    A generic request to generate a video does not authorize these actions.

## Workflow

Steps 1-5 are source preparation. Agents may research, acquire source media,
edit authored files, transcribe, validate, and align the supplied narration.
Run only checks that do not trigger a composition build, preview, or render.
Steps 6-8 and the fast path below are commands to give the user, never commands
for the agent to execute. Website research screenshots remain allowed.

### 1. Put the voiceover in place

Place the user's file at `content/voiceover.wav`. If it has another name or
format, set `audio` in `content/video.json` to the path relative to the repo
root. The exact file that is transcribed must be the file embedded in the
composition.

### 2. Transcribe the audio

```bash
python engine/transcribe.py
# or
npm run transcribe
```

This reads `audio` from `content/video.json` and writes `build/vo.json` with
word-level timings. The default model is `large-v3-turbo`, which is accurate but
slow on CPU. For a quick draft, use `--model small.en`. Always transcribe the
exact final audio file. If the voiceover is not English, pass `--language`.

### 3. Write the project

Replace the starter scenes in `content/video.json` with the new topic. Keep the
top-level shape:

```json
{
  "title": "...",
  "slug": "...",
  "compositionId": "...",
  "audio": "content/voiceover.wav",
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

### 6. Build (end user only)

Ask the user to run this prerequisite before previewing changed source:

```bash
node engine/build.mjs
# or
npm run build
```

This writes `index.html` and `hyperframes.json`. The composition is a single
paused GSAP timeline. The builder inlines `engine/fonts.css`, `engine/style.css`,
and `engine/anim.js`, and replaces the `"__COMPOSITION_ID__"` placeholder in the
animation registry with the project's composition id.

### 7. Check and preview (end user only)

Ask the user to run these commands after their build:

```bash
npx hyperframes@latest lint
npx hyperframes@latest check
npx hyperframes@latest preview
```

`lint` and `check` must report 0 errors. The checker may report many warnings
for a long one-file composition: one section per scene, composition size,
timeline density, negative z-index background layers, and small mono labels.
These are expected for this engine. Do not split the composition into
sub-compositions just to silence them.

Ask the user to preview at several timestamps, including the first frame,
every scene transition, and the last frame. Look for clipped text, overlapping
elements, and text that is too small to read. Fix reported CSS or content issues,
then hand back rebuild and review commands. Do not launch the preview yourself.

### 8. Render (end user only)

Always ask the user to run the render themselves. `npm run render` includes a
build hook; agents must not execute it even to test the export.

```bash
npx hyperframes@latest render --quality looks --output renders/video.mp4
# or
npm run render
```

The render reads `index.html` and the audio path in the composition. The audio
file must exist at render time. Use `--quality draft` for a fast review and
`--quality delivery` for the final master.

## Fast path (end user only)

```bash
npm run pipeline
npm run check
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

Build, preview, and render remedies below are instructions for the user to run.
Agents may fix source files and inspect user-provided results, but must not
execute those remedies themselves.

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

## Definition of done for agent handoff

- `python engine/validate.py` reports 0 errors; any unavailable input is disclosed.
- When final audio is available, transcription and alignment are complete with
  a high match percentage and no no-match or weak-match warnings.
- Relevant authentic assets are local, credited, and inspected at native size
  against their planned display footprint. Source limitations are disclosed.
- Contextual SFX and mascot direction are authored using the supported engine
  paths, expressions, and positions, with clear evidence and narration in mind.
- Give the user exact commands and prerequisites, and explicitly ask them to
  run preview or render. Explain that changed source needs a user-run build
  before preview, and `npm run render` / `render:hq` include their own build.
- Include a review checklist: lint/check errors, opening/every cut/ending,
  sharp evidence at native and reduced resolution, speech timing, mascot
  placement, and audible SFX beneath clear narration in the exported MP4.
- State that build, playback review, and export remain for the user to run.
  Do not claim an unperformed check passed or a new MP4 was generated. Inspect
  user-produced artifacts when supplied and fix source issues they reveal.
