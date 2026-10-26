# Render comparison and motion fixes

Reviewed the two MP4s supplied on 2026-10-26. Both run 241.93 seconds at
1920x1080 and 30 fps. Their authored scenes and display copy differ, so matching
timestamps are not always matching scenes. This is not a controlled engine-only
A/B comparison.

- Before SHA-256: `cd0c67d3b0c46839f03cb1c2abd92ffc8dff3d9daa9f523b456cf4f91829682d`
- After SHA-256: `47537b8c12c1c7d284b2e57ccbec1abcbdda579b24d4f3ed913a03aa21011909`
- Before: H.264 High, about 4.07 Mbps video.
- After: H.264 Constrained Baseline, about 3.05 Mbps video.

The decoded audio hashes are identical in both files (SHA-256
`f11c90be7f0762ee5aaa33afdf0df5533b04464e1044d7b5e697793d9e55c621`).
The display edits were made over the same soundtrack.

The different encoding settings confound judgments about fine text, grain and
edge sharpness. Lower bitrate alone does not prove a worse encode. Use the same
render quality and encoder settings for the next comparison.

## What improved in the supplied new video

- Around 77-80 seconds, the code panel emphasizes specific values instead of
  tinting whole lines. This makes the relevant configuration easier to identify.
- The revised sequence uses more terminal, flow and comparison layouts instead
  of relying as heavily on statement cards. The changed editorial sequence is
  a content improvement, not something to undo in the engine.
- Around 233 seconds, the mascot has a dedicated scene with much greater
  presence than the old small corner overlay.
- Depth, accent colors and restrained technical framing remain useful parts of
  the design. They do not require moving the entire reading surface.

## Findings and implemented fixes

1. Competing camera tweens. In an isolated 12-second hero/punch reproduction on
   2255501, camera X went from 18 px at 0.30 seconds to 0.864 px at 0.367 seconds.
   The long drift resumed after the shake. The engine now has one camera
   transform tween per scene. Punches settle monotonically; headline scenes have
   only a 1.2% slow push. Code and data surfaces do not drift.
2. Repeating background resets. The same reproduction moved its ghost from
   18 px at 5.0 seconds to 0.002 px at 5.033 seconds. Ambient drift now starts
   after entry and runs once through the remaining scene duration. Dates, flow
   nodes and ledger cards no longer receive an extra ambient transform.
3. Elastic entrances. Back-eased card, bubble, badge and mascot entrances,
   parent text recoil, the double stat snap and the meme camera shake stacked
   several movements. Entrances now use monotonic easing, with no parent text
   recoil or duplicate counter transform. Speech bubbles stay still during
   holds; the mascot artwork retains a small tilt.
4. Random text. Repeated seeks to the same frame previously generated different
   character strings. Automatic character scrambling was removed so the actual
   words remain readable and stable. Word reveals also now return their X
   offset to zero. Procedural audio noise uses index-based deterministic samples.
5. Crowded opening typography. At frame zero of both videos, enlarged individual
   words nearly touch. The new title reads visually like "TheQuietest" and
   "ReleaseoftheYear". Initial per-word scale was removed and explicit spacing
   added between word wrappers. The short reveal still preserves normal wrapping.
6. Split decorative words. Around 53 seconds in the new video, the large
   asymmetric label breaks inside a word. Hero marks now size to their text and
   stay on one line instead of breaking into arbitrary fragments.
7. Counter layout. The final numeric value now reserves space, preventing its
   suffix from sliding as the digit count changes. Counts remain monotonic and
   do not bounce past the actual number.
8. Lighting ownership and placement. The bloom was translated by another
   960/540 px despite already being positioned with CSS percentages. It is now
   centered by CSS, with one slow opacity treatment. Flare positions are scheduled
   on the timeline, sized to the composition and deterministic. Flare intensity
   is capped, and stat entrances no longer receive a second overlapping cut flare.
9. Rendering hazards. Removed the browser-clock CSS filter transition and the
   inline-style substring selector. Redaction scanning uses percentage transforms
   instead of layout coordinates or runtime width measurements. Chapter cuts now
   compare the incoming act against the previous act, with act IDs passed through
   the builder.

## Remaining quality scope

- Secondary labels are too small at normal phone playback sizes. The checker
  also flags this. Keep technical texture subtle, but promote information that
  viewers must read to larger text and stronger contrast. This needs a pass on
  the actual video project, rather than globally enlarging every label and
  overflowing dense scenes.
- Limit simultaneous emphasis: a highlighted word, large counter and bright
  lens flare can compete. Flare intensity is reduced here; choose highlights
  selectively in the project and inspect their timing against the voiceover.
- Compare final encodes at equal quality. The new file's smaller size is not a
  substitute for checking fine code text, gradients and moving grain.
- Inspect every transition on the original aligned project. The supplied MP4s
  can demonstrate problems, but do not contain the editable scene metadata.
- Browser Web Audio cues in the existing engine are not a verified exported
  soundtrack. These changes do not claim to add or mix those cues into MP4 audio.

## Verification and limits

Run `npm ci`, `npx playwright install chromium`, then `npm test`.
The real-browser tests exercise the builder output and GSAP 3.14.2, including
frame continuity, cold/reverse/sequential seeking, static data surfaces, exact
counter results, fixed unit positions, redactions, title spacing and hero marks.
All seven regression tests pass.
Use `MOTION_REVIEW_DIR=/absolute/path npm test` to retain the silent test fixture
for HyperFrames lint/check or manual inspection. It is synthetic test data,
not a replacement for the authored video or its narration.

The starter project validates with zero errors and the expected missing-audio
warning. Draft alignment/build work, but draft timings do not establish a real
voiceover match. An isolated eight-scene silent fixture passed HyperFrames lint
and check with zero errors, zero runtime/layout/motion issues, and 31/31 contrast
checks. Expected warnings include small technical labels, a silent fixture and
one-file composition structure. Start, entrance, hold and end frames were
inspected for each of its eight scenes. A follow-up check of the final redaction
changes also passed with zero errors and 12/12 contrast checks.

The final original-video alignment and render still require the authored
`content/video.json`, the user's exact voiceover and its transcript/timings.
The checked-out content is the starter project. No narration was invented or
replaced, and the downloaded audio was not attached to unrelated starter scenes.
