# iDevak Video Engine (`idevak-video-engine`)

A high-retention, Fireship-style video generation engine for **iDevak** — Cloud Engineering, AI Automation, DevOps, and Software Architecture. 

The repo couples an authoritative 21-scene visual system, word-level audio alignment, a responsive 2D mascot (**Devak**) with emotional audio sync, and deterministic GSAP composition rendering to 1080p 60fps MP4.

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

- **21-Scene Visual System:**
  - **Narrative & Core:** `cold`, `hero`, `statement`, `outro`
  - **Technical & Code:** `code`, `diff`, `terminal`, `webref` (browser & doc reference with cursor highlight)
  - **Cloud & Architecture:** `cloud` (topology with animated data packets), `flow`, `stack`, `timeline`
  - **Evidence & Numbers:** `stat`, `compare`, `ledger`, `memory`, `matrix`
  - **Humor & Takeaways:** `meme` (Fireship-style kinetic comic recoil & punch zoom), `mascot` (Devak spotlight), `quote`
- **Universal Mascot Overlay System:** Attach the **Devak** mascot (`neutral`, `shocked`, `thinking`, `solved`) to **ANY** scene with speech bubble dialogues and reactive visor/ring pulses.
- **Fast-Track Prototyping (`--draft`):** Author scripts and preview the animated composition in your browser immediately using word-count timing estimation before recording voiceover.
- **Automated Audio-Master Alignment:** Transcribes your exact voiceover with Whisper and monotonically aligns every scene down to the millisecond.
- **Deterministic 1080p Render Pipeline:** Uses HyperFrames and GSAP with 100% reproducible frame capture.
- **Production Prompting Guide:** See `PROMPTS.md` for the exact LLM prompt instructions to script high-retention tech explainer videos.

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

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/idevakk/idevak-video-engine.git
cd idevak-video-engine

# 2. Write your script in content/video.json (Read engine/SCHEMA.md & PROMPTS.md)

# 3. Fast Draft Preview (instant visual preview before recording audio)
npm run draft
npm run preview

# 4. Final Production Render (when you have your voiceover at content/voiceover.wav)
npm run pipeline
npm run check
npm run render
```

---

## Renaming Remote Repository

To update your GitHub remote to match this new engine name:

```bash
gh repo rename idevak-video-engine --repo idevakk/php2shell-video
git remote set-url origin https://github.com/idevakk/idevak-video-engine.git
```

---

## Scene Types & Catalog

| Type | Best Used For |
|---|---|
| `webref` | **Official specs, RFCs, AWS/Cloud docs, GitHub PRs, and CVE advisories with cursor spotlight** |
| `meme` | **Fireship-style punchlines, dev blunders, Friday deploys, and reality checks with camera recoil** |
| `cloud` | **Cloud architecture topologies, microservices, and animated data packet transmission** |
| `mascot` | **Devak mascot delivering technical autopsies, takeaways, and security recommendations** |
| `cold` | Full-screen cinematic title card and hook |
| `hero` | Giant editorial claim with side mark |
| `statement` | Core premise or impactful thesis |
| `code` | Syntax-highlighted code excerpt with scanline and hot lines |
| `diff` | Unified git patch with additions and deletions |
| `terminal` | Shell terminal session with commands and output |
| `stat` | Large counter number with ticker animation |
| `flow` | Sequential 2-4 step pipeline |
| `timeline` | Chronological incident or release history |
| `compare` | Direct A vs B comparison |
| `stack` | Stacked architectural layers |
| `ledger` | Table of findings, hashes, or audit rows |
| `memory` | Memory buffer corruption or pointer grid |
| `matrix` | Large grid scan showing scale or compromised nodes |
| `quote` | Pull quote with attribution |
| `outro` | Call-to-action, channel link, and subscribe card |

---

## Mascot System: Devak

The engine comes pre-packaged with 4 high-resolution expressions for the **iDevak** mascot (**Devak**) located in `assets/mascot/`:
1. `neutral`: Confident, analytical, explaining technical architecture.
2. `shocked`: Wide-eyed alert with red HUD warning (for zero-days, CVEs, catastrophic blunders).
3. `thinking`: Contemplative with holographic logic gates and calculation HUD.
4. `solved`: Smug victory smirk with green "DEPLOY SUCCESS 200 OK" status badge.

### Adding Devak to Any Scene
In `content/video.json`:
```json
{
  "type": "terminal",
  "headline": "AWS Bill Arrived",
  "narration": "They left an unbounded Lambda loop running over the weekend.",
  "mascot": {
    "expression": "shocked",
    "bubble": "Wait... that's a $52,000 AWS bill!",
    "position": "bottom-right"
  },
  "meta": { ... }
}
```

---

## Validation & Verification

Before rendering:
```bash
# 1. Verify schema and scene integrity
npm run validate

# 2. Verify HyperFrames standards, performance, and deterministic motion
npm run check
```

---

## License

MIT © [iDevak](https://youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA)
