# PHP2Shell (CVE-2026-109618 & CVE-2026-109619)

Branded for: `https://www.youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA/`

A forensic deep dive cut to the real voiceover: 24:29.8, 1920x1080, 30 fps, 180 scenes.

## Pipeline

```bash
python scripts/transcribe.py      # voiceover.wav -> build/vo.json (word-level timings)
python scripts/prepare_scenes.py  # storyboard + vo.json -> build/scenes.json
node scripts/build.mjs            # build/scenes.json -> index.html

npx hyperframes@latest lint
npx hyperframes@latest check
npx hyperframes@latest preview
npx hyperframes@latest render --quality looks --output php2shell.mp4
```

`index.html` and `voiceover.wav` are the only runtime inputs. `build/` is generated and ignored.

## Requirements

- Node.js (HyperFrames runs through `npx`)
- Python 3
- ffmpeg on `PATH`
- `faster-whisper` for the optional transcription step
