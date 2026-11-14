# Optional Daytona video workflow

Daytona is opt-in for each video in this repository. Keep the local workflow
unless the user explicitly says to use Daytona for the current video. Do not
carry that choice to the next video or edit global agent instructions.

When the user enables this workflow, that grants standing permission to
transcribe their supplied audio and automatically render this video's MP4 in
Daytona after preparation and QA pass. Do not ask again for that sandbox render.
This does not authorize a preview server or local video encoding. All other
production, media, narration, SFX, mascot, and QA requirements still apply.

## Agent setup

The Windows or Linux host only needs Python 3.10+, the Daytona Python SDK,
credentials, network access, and writable storage for source/media and returned
outputs. Node/npm, FFmpeg, Playwright, Chromium, and Whisper run in Daytona;
do not install them on the host for this workflow. Use `python3` instead of
`python` on hosts where that is the Python launcher. The skill installation
command below uses npx once; npm is not needed for routine video processing
when the skill is already available or installed through the host's installer.

Read the Daytona skill before using the SDK. If the skill is missing, install it:

```bash
npx skills add https://github.com/daytona/skills --skill daytona -g
```

If the Python SDK is missing, install it in the agent's Python environment:

```bash
python -m pip install daytona
```

`python -m unittest tests.test_daytona_video` runs the helper's lifecycle and
transfer tests locally against a fake sandbox and needs the Daytona SDK
installed.

Use the host's private secret input for a missing `DAYTONA_API_KEY`, and for a
missing `DEEPGRAM_API_KEY` when running transcription; never ask for them in
ordinary chat or put them in source, logs, or uploaded files. Obtain a Daytona
key from https://app.daytona.io/dashboard/keys and a Deepgram key from
https://console.deepgram.com. The helper reads the environment; it does not load
`.env` files. Confirm authenticated API access, then use the toolchain check
when setting up a new environment:

```bash
python scripts/daytona_video.py check
```

This creates a sandbox, installs Python/FFmpeg/Chromium, launches a headless
browser, downloads its log, and deletes the sandbox. It does not encode video
or start a preview server. Report authentication, quota, or networking blockers
accurately; do not silently switch to local transcription/rendering.

## Per-video commands

Use the actual final recording configured in `content/video.json`. The helper
uploads its exact bytes and the existing transcriber. It does not generate TTS,
trim, resample, or replace the source recording. FFmpeg decoding for Whisper is
performed by the existing transcriber inside the sandbox.

```bash
python scripts/daytona_video.py transcribe
# Optional language/model overrides:
python scripts/daytona_video.py transcribe --language hi --model large-v3-turbo
```

The word-timed transcript downloads to `build/vo.json`. Author/update the scene
JSON and download authentic media locally, then prepare the project in a fresh
sandbox. A local composition build is not required:

```bash
python scripts/daytona_video.py prepare
```

Preparation installs the locked npm dependencies and Chromium inside Daytona,
validates and aligns the project, builds HTML/metadata/SFX, and runs the repo's
tests, lint, and HyperFrames checks. It then uses HyperFrames `snapshot --review`
to capture scene/beat frames, strips around cuts, and phone-size review sheets,
plus exact opening and final frames. Individual stills return as high-quality
JPEGs at native output resolution to keep transfers manageable. Use
`prepare --qa-format png` for lossless native PNGs; phone and cut review sheets
remain available in either mode. These are headless still captures, not a
preview server or encoded video. Every failed command stops the job.

Generated `index.html`, `hyperframes.json`, and the `build/` files download
before the sandbox is deleted. Review `build/report.md`, `build/test.log`,
`build/lint.log`, `build/check.log`, `build/qa-report.json`, `build/qa/`, and the
returned check reports under `build/qa/checks/`. Failed preparation also attempts
to return available diagnostics, but cannot authorize rendering.

Resolve every error and inspect the alignment report, generated artifacts,
asset/audio references, and returned QA frames. Check opening, every cut, and
ending at native and reduced resolution, including adjacent frames for text
jitter, flicker, font/layout jumps, shifting counters, and unstable overlays.
Inspect evidence sharpness, mascot placement, and SFX cues. A passing command
does not replace visual review. Keep the authentic-media provenance and review
requirements from `PROMPTS.md` section 0.

Fix source files locally and rerun `prepare` when needed. If voiceover bytes
change, rerun `transcribe` first. Do not run local `npm run pipeline`, builds,
tests, or checks for an opted-in project. Additional FFmpeg media operations,
such as cropping/transcoding footage or extracting export review frames, can
use the Daytona SDK directly in a disposable sandbox: upload the input, run
FFmpeg/ffprobe there, download the result, and delete the sandbox in `finally`
with the same positive idle-stop/immediate-delete settings and activity updates
while monitoring long jobs. No general-purpose
remote shell wrapper is needed. Source-page research can still use available
connected research/browser tools without installing a local browser.

Once preparation and checks pass, render automatically in a fresh sandbox:

```bash
python scripts/daytona_video.py render
```

The default is `delivery` quality with one render worker, 4 vCPUs, 8 GiB RAM,
and 10 GiB disk. Sandbox disk is capped at 10 GiB per sandbox, and multi-worker
capture stages every frame on disk (about 10.8 GB for a seven-minute video), so
keep the single-worker default unless the composition is short enough to fit.
The helper requires a successful sandbox preparation and checks
source/artifact hashes against `build/daytona/prepared.json` before allocating a
render sandbox. Source, transcript, media, test/engine changes, or modified
build files require preparation and visual review again. Additional media
includes from preparation are reused automatically. The render sandbox
installs dependencies, reruns lint/check, and encodes the prepared HTML/SFX
without realigning or rebuilding different artifacts. The final MP4 downloads
to `renders/video.mp4`, with stream metadata in `renders/daytona-probe.json`.
Stream presence, dimensions, and duration are checked before accepting the
export.

Only the required engine/build inputs, `assets/`, tests/helper source, the
configured voiceover, and explicit additional media are uploaded. Local
dependencies, Git metadata,
`.env*`, `.pem`, `.key`, symlinks, and files outside the repo are excluded or
rejected. Keep normal scene media under `assets/`; add other repo-local media
with repeatable `--include PATH` options. Never include private files.

```bash
python scripts/daytona_video.py prepare --include content/evidence
python scripts/daytona_video.py render
```

Return the downloaded MP4 as an attachment, embedded video, or clickable local
file link in the host UI. Do not return a sandbox URL that will expire on
deletion. Review the exported playback, speech timing near the start/middle/end,
evidence sharpness, mascot placement, frame stability, and audible SFX beneath
clear narration. Ask the user to listen on headphones and speakers. Disclose
any playback/audio review that could not be performed. Do not claim a build or
passing lint proves the MP4 looks or sounds correct.

## Cleanup and limits

Each invocation owns one uniquely named sandbox. Results and diagnostic logs
are retrieved before deletion in `finally`, including on failure, timeout, or
Ctrl+C. Deletion waits for confirmation. A creation timeout also triggers a
lookup by the unique name so an allocated sandbox can be cleaned up. Job logs
are stored under ignored `build/daytona/`; no credentials are forwarded.

The server-side fallback is **15 minutes of inactivity**, using
`auto_stop_interval=15` and `auto_delete_interval=0`. Daytona's auto-delete
interval measures time spent stopped, so setting it to 15 alone would not
delete an idle running sandbox. Zero deletes it immediately after auto-stop.
Actual cleanup is asynchronous and depends on the Daytona service.

The helper refreshes activity during commands, archiving, and transfers, so long
active jobs can exceed 15 minutes. If the agent/helper disappears, those
updates stop and the idle cleanup applies. Never disable this fallback. Adjust
the positive idle interval for project needs, such as slow large transfers,
and explain any change. The remote command deadline defaults to 120 minutes;
file transfers and final cleanup have separate SDK timeouts:

```bash
python scripts/daytona_video.py render --idle-minutes 10 --timeout-minutes 180
python scripts/daytona_video.py transcribe --idle-minutes 15 --timeout-minutes 240
```

CPU, RAM, disk, worker count, and quality can also be adjusted with `--cpu`,
`--memory`, `--disk`, `--workers`, and `--quality`. These must fit the account's
quota and available disk space. The standard environment uses CPU Whisper;
large recordings/models may need a longer timeout. Sandboxes need access to
package registries, browser downloads, and Hugging Face model files.

If output retrieval fails, partial local downloads are removed and the sandbox
is still deleted. Preserve the error and rerun after resolving the problem.
If deletion cannot be confirmed, report the sandbox ID/name prominently and
delete that specific sandbox through Daytona as soon as access recovers. Do
not claim disposal succeeded or delete unrelated sandboxes. An uncatchable
process termination or API outage relies on the server-side idle fallback.

Lifecycle reference: https://www.daytona.io/docs/en/sandboxes/

## Copyable optional LLM instruction

> Use the optional Daytona workflow for this video. Read `AGENTS.md`,
> `PROMPTS.md` section 0, `docs/DAYTONA.md`, and the Daytona skill. If missing,
> install the skill with `npx skills add https://github.com/daytona/skills --skill daytona -g`
> and the SDK with `python -m pip install daytona`. Confirm authenticated access
> without exposing credentials. Use `python scripts/daytona_video.py transcribe`
> on my exact supplied voiceover. Author the source/media locally, then run
> `python scripts/daytona_video.py prepare` for sandbox alignment, composition/SFX
> builds, tests, lint, checks, and headless review frames. Inspect the downloaded
> reports and native/phone/seam images; fix source and repeat preparation as
> needed. Keep Node, FFmpeg, Playwright, and Chromium off the host for this
> workflow; run any additional media processing in disposable sandboxes too.
> Then use `python scripts/daytona_video.py render` automatically; enabling
> this workflow grants permission for this video's sandbox renders. Download
> and show the final MP4 here, review the export, and disclose pending QA.
> Delete every sandbox you create after retrieving outputs, including failed
> jobs. Keep the 15-minute inactivity deletion fallback enabled, adjusting it
> only when project needs justify a different positive interval. Do not start
> a preview server or render locally without separate permission.
