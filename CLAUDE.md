# Claude notes

Read `AGENTS.md` first. It is the canonical agent brief. Read
`engine/SCHEMA.md` before editing `content/video.json`.

## Short version

- The voiceover is the timing master. `narration` must match the spoken audio.
- Do not add TTS or generate audio. The user supplies the voiceover.
- Keep the 17 scene types and the forensic design system.
- `content/video.json` is the source of truth. `build/`, `index.html`,
  `hyperframes.json`, and `renders/` are generated and ignored.
- Run `validate -> transcribe -> align -> build -> check`.
- `lint` and `check` must report 0 errors. The one-section-per-scene and
  small-label warnings are expected for this engine.
- Do not commit generated files, audio, or renders.
- Use plain hyphens, not em dashes.

## Commands

```bash
npm run validate
npm run transcribe
npm run align
npm run build
npm run lint
npm run check
npm run preview
npm run render
```

`npm run pipeline` runs validate, transcribe, align, and build in order.

## Before you finish

- `python engine/validate.py` reports 0 errors.
- `build/report.md` has no no-match or weak-match warnings.
- `npx hyperframes@latest check` reports 0 errors.
- The preview is correct at the first frame, at every transition, and at the
  last frame.
