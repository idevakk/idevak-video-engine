# Claude notes

Read `AGENTS.md` and `PROMPTS.md` first. Read `engine/SCHEMA.md` before editing `content/video.json`.

## Short version

- The voiceover is the timing master. `narration` must match the spoken audio.
- For rapid visual preview before recording audio, use `npm run draft` (`python engine/align.py --draft && node engine/build.mjs`).
- Use the 21 scene types (including `webref`, `meme`, `cloud`, `mascot`).
- Support the iDevak mascot (**Devak**) with expressions (`neutral`, `shocked`, `thinking`, `solved`) and audio-synced overlays.
- `content/video.json` is the source of truth. `build/`, `index.html`, `hyperframes.json`, and `renders/` are generated and ignored.
- Run `validate -> transcribe -> align -> build -> check`.
- `lint` and `check` must report 0 errors.
- Do not commit generated files, audio, or renders.
- Use plain hyphens, not em dashes.

## Commands

```bash
npm run validate
npm run draft         # Quick draft preview without audio
npm run transcribe    # Whisper word-level timing
npm run align         # Exact monotonic audio alignment
npm run build         # Generate index.html and hyperframes.json
npm run lint          # HyperFrames syntax lint (must report 0 errors)
npm run check         # HyperFrames runtime, layout, and motion check (must report 0 errors)
npm run preview       # Interactive local browser preview
npm run render        # Full 1080p 60fps render
```

`npm run pipeline` runs validate, transcribe, align, and build in order.

## Before you finish

- `python engine/validate.py` reports 0 errors.
- `build/report.md` has no no-match or weak-match warnings.
- `npx hyperframes@latest check` reports 0 errors.
- The preview is correct at the first frame, at every transition, and at the last frame.
