# Agent guide

This repo is a reusable HyperFrames template for narration-driven forensic
videos. You bring a topic and a voiceover. The engine transcribes the audio,
aligns every scene's narration to the spoken words, and builds a deterministic
composition.

Read `engine/SCHEMA.md` before editing `content/video.json`. Read
`engine/build.mjs` before adding a new visual type.

## Non-negotiables

1. The voiceover is the timing master. `narration` must be the words actually
   spoken in the audio. Do not invent narration or stretch a scene to fit a
   visual idea.
2. Display text can be rewritten. `headline`, `subline`, `eyebrow`, and `meta`
   do not have to match the narration.
3. Do not add TTS, generate a synthetic voice, or replace the user's audio.
   The user supplies the voiceover.
4. Keep the existing design system and the 17 scene types. The look is the
   product. Add a new type only when the story cannot be told with an existing
   one, and then add the renderer, CSS, animation, and schema together.
5. One active video per clone. `content/video.json` is the source of truth.
   `build/`, `index.html`, `hyperframes.json`, and `renders/` are generated.
6. Do not commit generated files, audio, or renders. The ignore rules handle
   this; do not force-add them.
7. Use plain hyphens in repo docs and commit messages. Do not use em dashes.

## Workflow

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

Plan the beats first, then choose a scene type for each beat. A good short video
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

### 6. Build

```bash
node engine/build.mjs
# or
npm run build
```

This writes `index.html` and `hyperframes.json`. The composition is a single
paused GSAP timeline. The builder inlines `engine/fonts.css`, `engine/style.css`,
and `engine/anim.js`, and replaces the `"__COMPOSITION_ID__"` placeholder in the
animation registry with the project's composition id.

### 7. Check and preview

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

Preview at several timestamps, including the first frame, every scene
transition, and the last frame. Look for clipped text, overlapping elements,
and text that is too small to read. Fix the CSS or the content, then rebuild and
re-check.

### 8. Render

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

## Definition of done

- `python engine/validate.py` reports 0 errors.
- `python engine/align.py` reports a high match percentage and no no-match or
  weak-match warnings.
- `node engine/build.mjs` writes the composition.
- `npx hyperframes@latest lint` and `check` report 0 errors.
- The preview looks correct at the start, at every transition, and at the end.
- The render exists at the requested output path.
