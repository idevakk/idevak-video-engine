# Claude notes

Read `AGENTS.md` and `PROMPTS.md` first. Read `engine/SCHEMA.md` before editing `content/video.json`.

Daytona is optional per video. If the user explicitly enables it, follow
`docs/DAYTONA.md` for sandbox transcription, `prepare` (alignment/build/SFX,
tests/lint/checks and QA frames), and automatic sandbox rendering
after preparation/QA pass. That opt-in supplies render permission for the
current video's Daytona workflow. Retrieve/show the MP4 and delete every owned
sandbox, with 15-minute inactivity cleanup as a fallback. Preview servers and
local encoding still need separate permission. Install the missing Daytona
skill/SDK using the commands in that guide; do not change global instructions.
Keep Node, FFmpeg, Playwright, and Chromium in the sandboxes for this workflow.
The host only needs Python/SDK/credentials/network/storage. Inspect downloaded
preparation reports and frames; fix source and repeat preparation before render.

## Short version

- Aspect ratios: `"aspect": "16:9"` (default 1920x1080) or `"aspect": "9:16"` (1080x1920 portrait for YouTube Shorts, Reels, TikTok). Setting `"aspect": "9:16"` automatically configures dimensions, mobile safe zones (160px top, 240px bottom), and responsive stacked layouts.
- The voiceover is the timing master. `narration` must match the spoken audio.
- Install missing project dependencies, including Playwright Chromium and required Python packages, then build and verify the generated composition yourself. Follow `AGENTS.md` and `PROMPTS.md` section 0 for setup and QA.
- Before recording audio, `npm run draft` (`python engine/align.py --draft && node engine/build.mjs`) is allowed to build an estimated composition. It generates HTML/metadata/SFX, not a draft video render.
- Starting a preview server or encoding any draft/final video requires explicit user permission. This includes direct commands and indirect tools, tests, subagents, and lifecycle hooks. Finish setup, builds, and permitted checks before asking; reuse explicit permission already granted for that action.
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
npm run draft         # Estimated composition build without audio; no video export
npm run transcribe    # Whisper word-level timing
npm run align         # Exact monotonic audio alignment
npm run build         # Generate index.html and hyperframes.json
npm run lint          # HyperFrames syntax lint (must report 0 errors)
npm run check         # HyperFrames runtime, layout, and motion check (must report 0 errors)
npm run preview       # Preview server; explicit permission required
npm run render        # Video export at configured size/fps; explicit permission required
```

`npm run pipeline` runs validate, transcribe, align, and build in order.

## Before you finish

- `python engine/validate.py` reports 0 errors.
- `build/report.md` has no no-match or weak-match warnings.
- The agent has built HTML/metadata/SFX, inspected asset/audio references and dimensions/duration, and completed relevant tests and lint.
- `npx hyperframes@latest check` reports 0 errors.
- Every QA round checks available frames/playback for text jitter, flicker, layout jumps, and unstable counters. Fix issues immediately in source, rebuild, and repeat headless checks.
- Preview-server launch and draft/final video encoding await explicit permission unless already authorized. Disclose pending playback/export checks; do not leave dependency setup or builds to the user.
