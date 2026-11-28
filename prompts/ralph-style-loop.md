# Ralph Style Loop - Automated Video Dissection & 97% Clone Enhancement

Use this workflow whenever the user supplies a local video file or YouTube URL to **create a new engine style** or **enhance an existing engine style**.

## 0. Strict Mode & Style Gate (Zero Hallucination)

1. Always inspect the live list of styles first:
   ```bash
   python scripts/ralph_style.py styles
   ```
2. **If the user did NOT explicitly state** whether the video/URL is for creating a **new style** or **enhancing an existing style**:
   - **STOP and ask clearly** before doing anything else, listing every style returned by `scripts/ralph_style.py styles` plus the option to create a new style.
3. **If the user named an existing style to enhance that does NOT exist** in `scripts/ralph_style.py styles`:
   - **NEVER hallucinate or silently fall back to another style.**
   - Tell the user the requested style does not exist, show the live list of available styles, and ask them to pick one or confirm creating it as a new style.
4. For long YouTube videos, offer or use `--clip START-END` or `--max-duration <sec>` so iterations stay fast while defaulting to the full video for short clips.

---

## 1. Automated Ingestion, Vocal Stems & Original Dissection

Run `prepare` (this also runs `preflight` and auto-installs missing `yt-dlp`, `rea-video`, `faster-whisper`, npm packages, or Playwright Chromium if needed):

```bash
# Enhance existing style:
python scripts/ralph_style.py prepare --input "<path_or_youtube_url>" --mode enhance --style <existing-style>

# Create new style:
python scripts/ralph_style.py prepare --input "<path_or_youtube_url>" --mode new --style <new-style-slug>
```

What `prepare` automatically produces inside `workspaces/_ralph-<slug>/`:
- `source/original.mp4`: Downloaded/copied (and optionally clipped) reference video.
- `voiceover.wav`: Clean dry vocals extracted via `rea-video stems` (prevents original BGM/SFX from bleeding into our cloned SFX mix).
- `dissect/original/`: Full `rea-video decompose` breakdown (`breakdown.json`, `VIDEO.md`, `frames/`, `sfx/`).
- `notes/original_blueprint.md` & `original_blueprint.json`: Extracted resolution, fps, duration, shot cuts, ground/drawn colors, text/motion cues, and SFX hits.
- `build/vo.json`: Word-level transcription of `voiceover.wav`.
- `video.json`: Seeded project config inside `workspaces/_ralph-<slug>/`.
- (In `new` mode): Scaffolds `engine/presets/<new-style>/` (`renderer.mjs`, `style.css`, `anim.js`, `sfx.js`, `schema.py`), `docs/styles/<new-style>.md`, and `tests/<new_style>_style.test.mjs`.

---

## 2. Author Baseline Clone & Build Custom Scene Types

1. Read `workspaces/_ralph-<slug>/dissect/original/VIDEO.md` and `notes/original_blueprint.md`, and inspect key frames in `dissect/original/frames/`.
2. In **`new` mode**: Flesh out `engine/presets/<new-style>/` (`renderer.mjs`, `style.css`, `anim.js`, `sfx.js`, `schema.py`) to match the original video's canvas, typography, geometry, transitions, micro-motions, and SFX signature.
3. In **`enhance` mode**: Rewrite `workspaces/_ralph-<slug>/video.json` to map every original shot faithfully using the **existing** version of `<style>` first (fetching real logos via `scripts/fetch_logo.py` and web screenshots via `scripts/capture_webref.mjs` where needed), so Iteration 1 exposes real engine/style gaps rather than placeholder content.

---

## 3. The Ralph Loop (Render -> Dissect -> Compare -> Patch -> Re-Validate)

Invoking the Ralph Style Loop grants standing permission for headless `--quality draft` renders strictly inside `workspaces/_ralph-<slug>/renders/`.

Run Iteration `k` (`1..5`):
```bash
python scripts/ralph_style.py iterate --project _ralph-<slug> --iter 1
```

`iterate` runs end-to-end:
1. `validate.py` -> `align.py` -> `build.mjs`
2. `hyperframes lint` & `check` (0 errors)
3. `scripts/qa_frames.mjs` (0 overflow, 0 jitter)
4. Headless draft render (`renders/draft_iter_<k>.mp4`)
5. `rea-video decompose` on `renders/draft_iter_<k>.mp4`
6. `rea-video compare` against `source/original.mp4`
7. Writes `notes/gap_report_iter_<k>.md` + `gap_report_iter_<k>.json` and checks the **Composite 97% Gate**:
   - `rea-video compare` visual score `>= 97.0%`
   - `0` missing scene types / structural gaps
   - `0` QA overflow and `0` QA jitter
   - `timing_lag <= 0.25s`
   - `sfx_sync_ok == True` (chronological, zero `<70ms` collisions, cut coverage `>= 80%`)

### When `iterate` exits with code `2` (`RALPH_NEEDS_PATCH`):
1. Open `workspaces/_ralph-<slug>/notes/gap_report_iter_<k>.md` and view `dissect/compare_iter_<k>/compare_worst.jpg`.
2. Inspect `dissect/draft_iter_<k>/VIDEO.md` vs `dissect/original/VIDEO.md` for:
   - Missing scene types or unrendered visual structures
   - Element placement, spread, scale, ground/drawn color deltas
   - Animation easing, micro-animation/micro-motion life, smoothness, and cut/transition lag
   - Missing or misaligned SFX cues vs original `sfx/` hits and `speechStart`/`speechEnd`
3. Patch the style preset (`engine/presets/<style>/*`, `docs/styles/<style>.md`, `tests/*` - or `engine/` for `default`) and update `workspaces/_ralph-<slug>/video.json` if new scene types were added.
4. Run unit tests (`python -m unittest discover -s tests -p "test_*.py"` and `node --test tests/*.test.mjs`).
5. **Mandatory re-render & re-validate**: Run the next iteration:
   ```bash
   python scripts/ralph_style.py iterate --project _ralph-<slug> --iter <k+1>
   ```
   Repeat until `RALPH_GATE_PASS` (exit `0`) or `--max-iters 5` (exit `3`).

---

## 4. Handoff Rules

- Leave final preset enhancements uncommitted in the working tree for user review unless the user explicitly asks to commit/PR.
- Keep all loop downloads, stems, dissections, builds, and draft renders inside `workspaces/_ralph-<slug>/` (gitignored).
- Never modify unrelated user workspaces under `workspaces/`.
- Report final measured scores from the last `gap_report_iter_<k>.json`, exact tests run, and any remaining gaps if `max-iters` was reached.
