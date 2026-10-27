# Output quality audit - 2026-10-27

## Scope and limits

Reviewed the transcription, alignment, validation, HTML builder, 21 renderers,
animation, styles, audio mixer, package scripts and existing tests. Rendered a
six-second, four-scene regression project before and after the SFX change. Its
220 Hz test tone is a fixture, not a replacement for user narration. This clone
contains the five-scene starter and no user voiceover or production transcript.
A narration-aligned review of an actual episode remains necessary.

## Fixed

- **SFX missing from MP4.** `anim.js` played Web Audio from timeline callbacks,
  while the generated HTML declared only the voiceover as exportable audio.
  `npm run pipeline`, `build` and `render` never invoked `sfx_mixer.py`.
  The old mixer also used `amix:duration=first` on delayed individual effects,
  ending the mix at the first effect's endpoint, and discarded events after 64.
  It implemented only four of nine sounds, checked the wrong punch field,
  omitted stat impacts and most detailed cue times, normalized away levels,
  hid FFmpeg failures, and rewrote generated project metadata to a mixed master.
  Repeated standalone mixing could therefore mix into its own prior output.
  Builds now collect cues from the actual animation, synthesize the same nine
  Web Audio sounds offline and sum them at sample-accurate offsets into one WAV.
  A separate framework-owned audio element exports it alongside the recording.
  There is no duplicated scene-to-audio timing logic, callback playback, event
  cap, source replacement or generated-project mutation. SFX peaks are capped
  at 0.8 through one gain reduction when needed. This is SFX headroom, not final
  programme loudness mastering.
- **Stale exports.** npm render scripts now rebuild the HTML and SFX first.
- **Missing chapter transitions.** Alignment collected `act` but dropped it
  from `build/scenes.json`. The builder and animation could not identify chapter
  changes. Alignment now preserves it.
- **Wrong export frame rate.** The builder recorded fps in metadata but omitted
  root `data-fps`. The CLI defaults to 30 without that attribute. It is now set.
- **Overlapping short scenes.** The builder expanded every scene shorter than
  1.2 seconds, overlapping the next scene despite alignment's shorter allowed
  windows. It now preserves aligned durations exactly.
- **Silent estimated timing.** Normal alignment silently entered draft mode
  when its transcript was missing and reported 100% matching. Estimated timing
  now requires explicit `--draft`; normal alignment fails on a missing file.
- **Render reproducibility.** GSAP is now inlined from its locked local package
  rather than downloaded from a CDN. The Node requirement now matches the
  CLI's Node 22 minimum. Verification used HyperFrames 0.8.207.
- **Misleading HQ setting.** `render:hq` previously forced CRF 17, while the
  installed CLI's `looks` default is CRF 16. It now selects `delivery` explicitly.
- **Windows test failures.** Both browser suites failed before reaching tests
  because directory symlinks required elevated permissions. Fixtures now use
  junctions and resolve the build's installed dependencies.

## Next improvements, ordered by impact

### 1. Make alignment confidence reflect actual word agreement

`align_words()` backtracks substitution pairs even when words disagree, and
`apply_timing()` counts every mapped pair as a match. Unrelated equal-length
scripts can therefore report 100% matched. `norm()` also strips non-ASCII text,
despite transcription accepting other languages. Keep mapping coverage separate
from word similarity; count exact/accepted fuzzy matches, retain rejected-pair
diagnostics, and fail final builds on weak per-scene agreement. Add fixtures for
wrong recordings, repeated words, insertions, omissions, numbers and supported
languages. Acceptance: an unrelated transcript cannot pass, and real matching
speech remains correctly timed. This algorithm change needs recorded fixtures
before changing thresholds.

### 2. Finish portrait layouts and phone-scale typography

The portrait media rule also mixes a media query with `.is-portrait`, which
is a CSS selector, not a valid media query. Its valid viewport-aspect branch
can apply, but the class branch cannot select portrait compositions.
The portrait flow CSS targets `.fl-nodes`, `.fl-node` and `.fl-edge`, while the
renderer emits `.flow-row`, `.flow-node` and `.flow-link`. Those vertical-flow
overrides do not apply. Landscape-oriented packet and
playhead travel uses fixed X distances (1660/1664 px) in `anim.js`, including for
portrait output. Audit each emitted class against its portrait rule, constrain
travel to actual rails, and create portrait fixtures for all 21 types.

Important labels use 12-18 px text on a 1080-wide portrait canvas, which becomes
roughly 4-6 px at a 360-wide phone display. Promote essential information, reduce
content density, and retain small labels only as decorative texture. Review at
actual playback scale, including platform overlays and mascot speech bubbles.
Acceptance: readable captions and technical excerpts with no clipping or overlap
at every scene transition in both aspect ratios.

### 3. Add final audio mastering and adjustable SFX levels

Fixed procedural volumes cannot accommodate both quiet and loud recordings.
There is no authored SFX master gain, per-scene mute, dialogue ducking or measured
final loudness policy. Add a small audio configuration with explicit gains and
opt-in ducking, then measure the encoded final mix for integrated loudness and
true peaks. Choose delivery targets deliberately, for example an initial review
target of -16 LUFS and -1 dBTP, and listen on headphones and a phone. Use a
two-pass loudness process when precision matters. FFmpeg's
[loudnorm documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
describes integrated loudness and true-peak controls. Keep source narration
unchanged and master only the output.

### 4. Verify transcript provenance and final output, not just file existence

Transcription records an audio path but no content fingerprint. Alignment does
not reject a transcript from another recording. A recording replaced at the
same path is especially easy to miss. Store its digest and effective trim range
with the transcript, check them before final alignment, and require explicit
draft mode for estimated builds. `--start`/`--end` transcription also currently
produces trim-relative timings while the composition plays the full recording.
Either carry the source offset through alignment and media timing or reject
trimmed transcripts for full-recording builds.

Add a small repeatable MP4 smoke test that verifies duration, fps, audio presence
and energy near both early and late cue timestamps. Extend current visual tests
to boundary frames and both aspect ratios. Current tests cover only a subset of
the 21 renderers and no production narration alignment.

### 5. Stabilize delivery settings and reduce encoding pressure

The npm scripts still use `hyperframes@latest`, so renderer upgrades can change
output without a repo change. Pin a tested CLI as a locked dependency after a
full render smoke test, then upgrade deliberately.

Full-frame moving grain, glow, blur, large embedded mascot images and global
3D styles increase capture and compression work. The reproduction renderer
disabled fast capture because it detected a CSS 3D context and used hardware-GPU
screenshot capture. Scope 3D styles to scenes that need them and compare before
and after frames before removing any established treatment. Measure fine text
and dark gradients on a delivery encode; do not judge quality from file size.
Supersampling can improve edges but cannot fix small text or over-dense scenes.
See the official [rendering guide](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/rendering.mdx)
for quality, fps and resolution controls.

## Verification

- `npm test`: 13 passing tests, including nine deterministic sound types,
  late cues beyond event 64, track length, overlap headroom, actual animation cue
  timings, chapter preservation and explicit draft behaviour.
- Starter validation: zero errors; expected missing-voiceover warning.
- Explicit starter draft alignment and build succeeded. Draft's reported 100%
  is an estimate and does not establish real narration alignment.
- Baseline MP4 compiler found one audio track. Corrected compiler found two.
- Both renders: six seconds, H.264 1920x1080 at 30 fps. Corrected soundtrack:
  stereo AAC at 48 kHz, 13 baked effects, including the final cue at 4.5 seconds.
- Decoded audio after two 1500 Hz high-pass filters: baseline RMS 0.0000535,
  corrected RMS 0.000974. This corroborates added high-frequency effects above
  the fixture's 220 Hz tone; it is not a loudness or perceptual-quality score.
- Corrected fixture HyperFrames check: zero errors across lint, runtime, layout,
  contrast and audio; 11 lint warnings and six craft warnings. Existing template
  warnings include composition size, dense timeline, negative-z decoration and
  small labels. Detailed artifacts remain under ignored `renders/sfx-repro/`.
- Test render: screenshot capture with hardware GPU. A final production master
  was not rendered because the user's recording is not present in this clone.

## Operational notes

Install dependencies and Playwright Chromium before building:
`npm install` then `npx playwright install chromium`.
The build launches one headless browser to collect the real DOM-based cues and
synthesize short reusable sound buffers. Node mixes those buffers into one
48 kHz mono SFX track. The mix buffer costs about 11.5 MB per minute plus the WAV
output buffer, so extremely long compositions may eventually benefit from
chunked mixing. No such change is required for the current short-video template.
Normal npm render commands rebuild; direct CLI rendering still requires a build.
