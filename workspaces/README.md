# Isolated Project Workspaces

This directory holds isolated per-project workspaces for new videos, experiments, and ad-hoc tests.

Everything inside `workspaces/<project-slug>/` is ignored by git (via `.gitignore`), so:
- The template (`content/video.json`, `content/video.example*.json`, `assets/mascot/`, `assets/fonts/`) stays clean.
- Engine improvements (`engine/`, `scripts/`, `tests/`) never overwrite or dirty your project scripts, notes, assets, or renders.
- Project work never pollutes the template repository or git status.

## Workspace Layout

```text
workspaces/<slug>/
├── video.json          # Project script & scene spec (source of truth for this project)
├── voiceover.wav       # Project voiceover audio (or custom path relative to this workspace)
├── notes/              # Research notes, fact sheets, TTS phonetic scripts, scratchpads
├── assets/             # Project-only logos, webref screenshots, clips, and SOURCES.md
├── build/              # Generated vo.json, scenes.json, project.json, report.md, sfx_track.*, qa/
├── renders/            # Output MP4 renders
├── index.html          # Generated HyperFrames composition
└── hyperframes.json    # Generated HyperFrames metadata
```

## Quick Commands

```bash
# 1. Create a new isolated project workspace (add --aspect 9:16 for portrait, --use to set active)
npm run project:new -- my-video --use

# 2. Validate, draft, transcribe, align, build, lint, check inside that workspace
npm run draft
npm run validate
npm run pipeline
npm run lint
npm run check

# Or target any workspace explicitly without changing the active workspace:
npm run validate -- --project my-video
npm run draft -- --project my-video
npm run pipeline -- --project my-video
npm run lint -- --project my-video
npm run check -- --project my-video

# 3. Switch, inspect, or clear the active workspace
npm run project:list
npm run project:status
npm run project:use -- my-video
npm run project:clear
```
