# iDevak Video Engine (`idevak-video-engine`)

A clean, project-agnostic, high-retention video generation engine for **iDevak** — Cloud Engineering, AI Automation, DevOps, and Software Architecture.

The repo couples an authoritative 21-scene visual system, word-level audio alignment, a responsive 2D Cloud Mascot with 12 expressive poses, and deterministic GSAP composition rendering to 1080p 60fps MP4.

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
hyperframes check / preview / render
```

---

## What is Included

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
- **Archived Reference Projects:** See `projects/` for full production examples (including the 90-scene `emudhra-key-was-four` investigation).

---

## Requirements

- **Node.js** 20 or newer.
- **Python** 3.10 or newer.
- **FFmpeg** on `PATH`.
- `faster-whisper` for word-level transcription:
  ```bash
  pip install faster-whisper
  ```

---

## Quick Start (Clean Template)

```bash
# 1. Clone the repository
git clone https://github.com/idevakk/php2shell-video.git idevak-video-engine
cd idevak-video-engine

# 2. Install dependencies
npm install

# 3. Test and preview the clean starter template immediately (no audio needed)
npm run draft
npm run preview

# 4. Edit your script in content/video.json (Read engine/SCHEMA.md & PROMPTS.md)
npm run validate

# 5. When voiceover is recorded, place it in content/voiceover.wav and run the full pipeline:
npm run pipeline

# 6. Render final 1080p 60fps MP4
npm run render
```

---

## Project Organization

* **`content/video.json`**: The active project source of truth.
* **`content/video.example.json`**: Fresh starter template to reset back to anytime.
* **`projects/`**: Archived video episodes (e.g. `projects/emudhra-key-was-four/`).
* **`assets/mascot/`**: The complete 12-pose mascot asset library (transparent PNGs and chroma green).
