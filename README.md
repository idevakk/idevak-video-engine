# iDevak Video Engine (`idevak-video-engine`)

A clean, project-agnostic, high-retention video generation engine for **iDevak** — Cloud Engineering, AI Automation, DevOps, and Software Architecture.

The repo couples an authoritative 21-scene visual system, word-level audio alignment, a responsive 2D Cloud Mascot with 12 expressive poses, and deterministic GSAP composition rendering at the resolution and frame rate in `composition` (default: 1920x1080 at 30 fps).

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
engine/build.mjs -> index.html + hyperframes.json + build/sfx_track.wav
        |
        v
hyperframes check / preview / render
```

---

## What is Included

- **Native 16:9 & 9:16 Support:** Produce standard 16:9 landscape videos (1920x1080) or vertical 9:16 shorts/reels (1080x1920) by simply specifying `"aspect": "9:16"` in `content/video.json`.
- **Project-Agnostic Clean Template:** Ready to clone and use for any technical explainer video immediately.
- **21-Scene Visual System:**
  - **Narrative & Core:** `cold`, `hero`, `statement`, `outro`
  - **Technical & Code:** `code`, `diff`, `terminal`, `webref` (browser & doc reference with cursor highlight)
  - **Cloud & Architecture:** `cloud` (topology with animated data packets), `flow`, `stack`, `timeline`
  - **Evidence & Numbers:** `stat`, `compare`, `ledger`, `memory`, `matrix`
  - **Humor & Takeaways:** `meme` (kinetic comic recoil & punch zoom), `mascot` (spotlight breakdown), `quote`
- **12-Pose Series 2 Cloud Mascot:**
  - 12 expressive poses: `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`, `facepalm`, `pointing`, `panic`, `skeptical`
  - Dual format: transparent `.png` cutouts for HTML engine + `#00FF00` chroma green `.jpg` for video editors (Premiere, Resolve, CapCut, OBS).
  - Dynamic audio-sync lip flap between `neutral` and `talking` during speech.
- **Fast-Track Prototyping (`--draft`):** Author scripts and preview the animated composition in your browser immediately using word-count timing estimation before recording voiceover.
- **Automated Audio-Master Alignment:** Transcribes your exact voiceover with Whisper and monotonically aligns every scene down to the millisecond.
- **Deterministic 1080p Render Pipeline:** Uses HyperFrames and GSAP with 100% reproducible frame capture.
- **Production Prompting Guide:** See `PROMPTS.md` for the exact LLM prompt instructions to script high-retention tech explainer videos.
- **Persistent Media Defaults:** `AGENTS.md` directs repository-aware agents to
  `PROMPTS.md` section 0 for every new video: authentic logos and incident media,
  real website captures, highest available source quality, Firecrawl/browser
  skill checks, installation prompts for missing skills, and speech-synced review.
  These defaults also require contextual procedural SFX, a verified exported
  audio mix, and relevant mascot direction throughout the story using supported
  expressions and placements that protect evidence readability.
  Both copyable generation prompts include these requirements. External LLM
  integrations must load the guide; the CLI pipeline does not invoke an LLM.
- **Build and Check Autonomy:** Agents install required dependencies, prepare
  media/source, transcribe, align, build the composition and SFX, inspect the
  generated files, and run tests/lint/headless checks themselves. Estimated draft
  builds are allowed. Starting a preview server or encoding a draft/final video
  requires explicit user permission, including indirect tool/test/hook calls.
  Agents complete preparation before asking and reuse permission already granted
  for that action. They can also give preview/render commands for the user to run.
- **Text Stability QA:** Every QA round checks available playback and frames for text
  jitter, flicker, font/layout jumps, shifting counters, and unstable motion.
  Agents fix any issue immediately in source, rebuild, and repeat permitted
  headless checks. Only unperformed playback/export verification stays pending;
  preview-server launch or video rendering for QA still needs permission.
- **Archived Reference Projects:** See `projects/` for full production examples (including the 90-scene `emudhra-key-was-four` investigation).

---

## Requirements

- **Node.js** 22 or newer.
- **Python** 3.10 or newer.
- **FFmpeg** on `PATH`.
- `faster-whisper` for word-level transcription:
  ```bash
  pip install faster-whisper
  ```

## Optional Daytona execution

To transcribe and render a particular video in disposable cloud sandboxes,
explicitly enable the [Daytona workflow](docs/DAYTONA.md) for that video. The
guide includes a copyable LLM instruction and setup commands for the Daytona
skill and Python SDK. The normal local workflow stays the default.

```bash
python scripts/daytona_video.py check       # Verify remote toolchain, then delete sandbox
python scripts/daytona_video.py transcribe  # Download word timings, then delete sandbox
python scripts/daytona_video.py prepare     # Align/build/SFX/test/lint/check/capture QA remotely
# Review downloaded reports and QA frames; fix source and repeat prepare as needed.
python scripts/daytona_video.py render      # Download final MP4, then delete sandbox
```

Enabling this workflow authorizes automatic sandbox rendering after preparation
and QA pass. Preview servers and local rendering still require permission.
Sandboxes also have a configurable 15-minute inactivity deletion fallback.
Outputs stay in ignored `build/` and `renders/`; no global agent policy changes.
The host needs Python 3.10+, the Daytona SDK, credentials, network access, and
file storage. Node, FFmpeg, Playwright, Chromium, and Whisper run in Daytona.
Rendering reuses the prepared composition and refuses changed source/artifacts
until preparation and QA are repeated.

---

## Quick Start (Clean Template)

Agents should install dependencies, build, and check the composition themselves.
`npm run draft` builds HTML with estimated timing; it does not render a draft
video. Only starting a preview server or encoding any draft/final video needs
explicit permission. Commands below that launch preview/render require that
permission, or can be run directly by the user.

```bash
# 1. Clone the repository
git clone https://github.com/idevakk/php2shell-video.git idevak-video-engine
cd idevak-video-engine

# 2. Install dependencies
npm install
npx playwright install chromium

# 3. Test and preview the clean starter template immediately (no audio needed)
npm run draft
npm run preview       # Agent execution requires explicit permission

# 4. Edit your script in content/video.json (Read engine/SCHEMA.md & PROMPTS.md)
npm run validate

# 5. When voiceover is recorded, place it in content/voiceover.wav and run the full pipeline:
npm run pipeline

# 6. Render MP4 at the configured resolution and frame rate
npm run render        # Agent execution requires explicit permission
```

---

## Project Organization

* **`content/video.json`**: The active project source of truth.
* **`content/video.example.json`**: Fresh starter template to reset back to anytime.
* **`projects/`**: Archived video episodes (e.g. `projects/emudhra-key-was-four/`).
* **`assets/mascot/`**: The complete 12-pose mascot asset library (transparent PNGs and chroma green).

## Exported sound effects

Every build bakes the animation's exact cue schedule into `build/sfx_track.wav`
(48 kHz PCM). This includes transitions, stat ticks and impacts, terminal clicks,
mascot entrances, highlights, and redactions as scheduled by the animation.
`build/sfx_track.json` lists all cue timestamps and gains for review. There is
no event-count cap.

The composition declares separate voiceover and SFX audio elements, so preview
and MP4 export use the same soundtrack. Your source recording and alignment
metadata are not modified. Browser audio callbacks are no longer used.

`npm run render` and `npm run render:hq` rebuild before exporting, so an old
composition cannot silently omit the new SFX track. Direct HyperFrames CLI
renders still require `npm run build` first. `npm run sfx` and the old
`python engine/sfx_mixer.py` entry point rebuild the composition and SFX together.
Agents should run build/SFX generation and inspect their outputs themselves.
The render commands also encode video and therefore require explicit permission;
do not start them just to trigger their build hooks. Check the baked mix and,
once a permitted export is available, review cue synchronization, clear speech,
and balanced effect levels in the MP4.

Builds now require Playwright Chromium (`npx playwright install chromium`). A
synthesis failure stops the build rather than silently exporting voiceover only.
The verified HyperFrames CLI version is 0.8.207. `render:hq` uses the `delivery`
preset; the normal render uses `looks`. Draft timing requires `npm run draft` or
`python engine/align.py --draft`; normal alignment fails if its transcript is missing.

See [the output quality audit](docs/output-quality-audit.md) for findings,
remaining improvements and the render verification performed.

## Narration timing

Scene cuts follow the first matched spoken word by default and retain the
previous scene through its last word. Write narration in coherent beats instead
of pairing arbitrary ASR segments. Compound names use the same tokenization as
the transcript. For a statistic introduced later in a scene, set `meta.revealOn`
to its exact spoken phrase. See `engine/SCHEMA.md` for the timing contract.

## Long Windows exports

The following command encodes video, so agent execution requires explicit user
permission. Installing dependencies, building, and checking artifacts do not.

HyperFrames 0.8.207 can report `capture_disk stalled` at the full frame count
while the disk stage is still finishing. For a long delivery export, increase
the stage's no-progress allowance and retain intermediate frames with `--debug`:

```powershell
$env:HF_DE_STALL_MS='1800000'
npx hyperframes@0.8.207 render --quality delivery --debug --output renders/video.mp4
```

This changes the timeout, not the composition timing or encoding quality.
Debug renders retain large frame directories under the CLI's `.debug` directory.
