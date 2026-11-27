# content/video.json schema

`content/video.json` is the only authored input. The voiceover is the timing
master. The pipeline transcribes the audio, aligns each scene's `narration` to
the spoken words, and writes `build/scenes.json` plus `build/project.json`. The
builder turns those into `index.html` and `hyperframes.json`.

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
```

## Top-level object

Aligned scenes start with their first spoken words by default. The previous
scene stays visible through its last spoken word and any following pause.
`engine/align.py --lead-in` is an optional anticipation setting restricted to
silence; it cannot cut off the preceding scene's speech. Minimum spacing is a
visual preference and never delays a matched scene past its spoken start.
Generated `speechStart` and `speechEnd` expose the matched narration span in
the alignment report. Match percentage measures text coverage, not acoustic
timestamp accuracy. Write scene narration at complete thought boundaries,
rather than copying arbitrary transcription segment pairs.

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Max 120 characters. Used in `<title>` and as a fallback. |
| `slug` | string | no | Lowercased and hyphenated by the aligner. Used for the `hyperframes.json` name. |
| `compositionId` | string | no | Letters, numbers, underscores, or hyphens. Used as `data-composition-id` and the GSAP registry key. Defaults to the slug. |
| `audio` | string | no | Path relative to the repo root. Defaults to `content/voiceover.wav`. This exact file is transcribed and embedded in the composition. |
| `channel` | string | no | Channel line used by the outro. |
| `ghost` | string | no | Background ghost word for the cold open and outro. |
| `cta` | string | no | Outro CTA button label (e.g. `Subscribe`). Only rendered when explicitly authored. |
| `ctaSub` | string | no | Outro CTA detail / handle. Only rendered when explicitly authored. |
| `defaultAccent` | string | no | `#rrggbb` fallback when neither the scene nor its act has an accent. |
| `style` | string | no | Optional visual/motion/SFX preset: `"default"` (omit), `"chalkboard-explainer"` (alias `"chalkboad-explainer"`), or `"motion-explainer"`. See `docs/styles/chalkboard-explainer.md` and `docs/styles/motion-explainer.md`. |
| `enableMascot` | boolean | no | Opt-in flag for presets like `chalkboard-explainer` or `motion-explainer` where mascot overlays are disabled by default. |
| `aspect` | string | no | `"16:9"` (default, 1920x1080) or `"9:16"` (1080x1920 portrait for YouTube Shorts, Reels, TikTok). When set to `"9:16"`, the engine automatically configures 1080x1920 resolution, mobile safe zones, single-column stacked grids, and vertical mascot positioning. |
| `aspectRatio` | string | no | Alias for `aspect` (e.g. `"9:16"`). |
| `composition` | object | no | `{ "width": 1920, "height": 1080, "fps": 30 }` (or `{ "width": 1080, "height": 1920, "fps": 30 }` for 9:16). Automatically defaulted by `aspect`. |
| `acts` | array | no | Act objects. Used for eyebrow fallback and accent fallback. |
| `subtitles` | boolean | no | `false` by default. When `true` (or `\"karaoke\": true`), renders a bottom speech-synced karaoke caption rail bound to wordTimings for mobile & retention. |
| `scenes` | array | yes | Non-empty. Each item is one visual scene. |

## Aspect Ratios & Formats (16:9 Landscape vs 9:16 Portrait)

The engine provides first-class, zero-config support for both landscape videos and vertical mobile shorts:

| Aspect | Resolution | Platforms | Configuration in `video.json` |
|---|---|---|---|
| **`16:9`** (Default) | 1920x1080 | YouTube Main, Desktop, Landscape Web | `"aspect": "16:9"` (or omit) |
| **`9:16`** (Portrait) | 1080x1920 | YouTube Shorts, Instagram Reels, TikTok | `"aspect": "9:16"` |

When an LLM or author specifies `"aspect": "9:16"`:
1. **Dimensions**: Automatically defaults to 1080x1920 (or read from `composition`).
2. **Mobile Safe Margins**: Top padding (160px) protects against search bars/status icons; bottom padding (240px) protects against channel pills, sound tags, and interaction buttons.
3. **Responsive Stacking**: Multi-column scenes (`compare`, `hero`, `stack`, `dateline`, `cloud`, `mascot`) automatically stack vertically without text collision.
4. **Mascot Placement**: Overlays anchor to `bottom: 240px; right: 48px;` safely above mobile playback controls.

### Acts

```json
"acts": [
  { "id": "claim", "name": "THE CLAIM", "accent": "#ff3b5c" },
  { "id": "path", "name": "THE PATH", "accent": "#f5a524" },
  { "id": "check", "name": "THE CHECK", "accent": "#22d3ee" }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Unique. A scene references it with `"act": "claim"`. |
| `name` | string | no | Used as the scene `eyebrow` when the scene has none. |
| `accent` | string | no | `#rrggbb`. Used when the scene has no `accent`. |

## Scene object

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | Unique bookkeeping id. The builder generates section ids as `s001`, `s002`, and so on. |
| `type` | string | yes | One of the 17 types below. |
| `act` | string | no | Must match an act id. |
| `narration` | string | yes | The words actually spoken in the voiceover. This is the timing source. |
| `eyebrow` | string | no | Max 60 characters. Falls back to the act name. |
| `headline` | string | yes | Max 96 characters, except `quote` and `code` which allow 180. Shorter reads better at 1920x1080. |
| `subline` | string | no | Max 180 characters. Keep it under 120 when possible. |
| `accent` | string | no | `#rrggbb`. Overrides the act accent. |
| `variant` | integer | no | `0`, `1`, or `2`. `statement` scenes cycle 0, 1, 2 when omitted. Other types default to 0. |
| `ghost` | string | no | Short ghost word. Used by `cold` and `outro` when `meta.ghost` is absent. |
| `meta` | object | no | Type-specific data. See below. |

### Narration rules

- `narration` must match the audio. The aligner matches word by word against
  the transcript. Do not write narration that is not spoken.
- Display text (`headline`, `subline`, `eyebrow`, `meta`) can be rewritten
  freely. It does not have to match the narration.
- Keep a scene between 8 and 35 words. The validator warns below 3 words and
  above 45 words. If a beat is longer, split it into two scenes.
- The first scene should be `cold` and the last should be `outro`. The validator
  warns otherwise.

### Zero-Fallback Architecture

The engine adheres to a strict **Zero-Fallback Architecture**. There are no default,
placeholder, or fallback strings in the engine renderer (`engine/build.mjs`).
- If a header, tag, filename, terminal host, comparison marker, audit table header,
  beacon, formula badge, or status chip is omitted in `meta`, the corresponding visual
  element is suppressed or omitted.
- The LLM or human author must consciously think through and explicitly specify every
  visual element and metadata property tailored to the technical topic.

## Scene types

| Type | Use it for | Required meta |
|---|---|---|
| `cold` | Title card / opening statement | `chips` (1-5 strings) |
| `hero` | A large editorial title with a side mark | none |
| `statement` | A single sentence that needs space | none |
| `stat` | One number with a label and ruler | `value`, `display`, or `stat` |
| `dateline` | A dated document or event | `day`, `mon`, `yr` |
| `code` | A short source excerpt with a callout | `lines` (1-10) |
| `diff` | A before/after patch | `lines` (1-12) |
| `flow` | A 2-4 step causal chain | `nodes` (2-4) |
| `ledger` | A small table of findings | `rows` (1-6) |
| `memory` | A cell grid with a pointer and legend | none |
| `timeline` | 2-6 dated or ordered events | `events` (2-6) |
| `terminal` | A command and its output | `lines` (1-8) |
| `compare` | Two columns with a versus marker | `left`, `right` |
| `stack` | 2-6 stacked layers | `layers` (2-6) |
| `quote` | A pull quote and attribution | none |
| `matrix` | A dense grid of cells | none |
| `outro` | Closing CTA and channel | none |

### cold

A full-frame title card with a huge ghost word, a rule, chips, and the title.

```json
{
  "id": "s001",
  "type": "cold",
  "act": "claim",
  "narration": "A claim is not a fact. But give it enough repetition, and it starts to look like one.",
  "eyebrow": "COLD OPEN",
  "headline": "How a Rumor Becomes a Headline",
  "subline": "The short, boring path from a forum post to a front page.",
  "meta": {
    "chips": ["ONE CLAIM", "FOUR REWRITES", "ZERO SOURCES"],
    "ghost": "RUMOR"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `chips` | string[] | 1-5 short labels. |
| `ghost` | string | Max 12 characters. |

The ghost word resolves as the scene `ghost`, then `meta.ghost`, then the project
`ghost`, then the first word of the title.

### hero

A large title on the left, a single word mark on the right.

```json
{
  "type": "hero",
  "narration": "...",
  "eyebrow": "THE INCIDENT",
  "headline": "One request. One process. No exit.",
  "subline": "The shortest path from input to memory corruption.",
  "meta": { "mark": "RCE", "rule": true }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `mark` | string | Max 8 characters. Side badge in the editorial panel. Only rendered when explicitly authored. |
| `rule` | boolean | Adds a vertical rule beside the mark. |
| `image` | string | Local evidence image displayed in the right-hand panel. Use the publisher's existing redactions. |
| `alt` | string | Description of the evidence image. |
| `label` | string | Authored heading for this scene, for example `EXPOSED TASK LOG` or `PRODUCT DEMO`. Choose wording for the video idea and asset. Only rendered when explicitly authored. |
| `caption` | string | Short context below the evidence image. |
| `position` | string | Image object-position (e.g. `center`, `top left`). Defaults to `center`. |
| `video` | string | Local video in the evidence panel, muted. Framework-owned playback uses the scene timing. |
| `poster` | string | Local video poster when `image` is absent. |
| `mediaStart` | number | Source video offset in seconds. Supply enough source footage for the scene. |
| `logos` | object[] | Official brand assets: `{ "src": "assets/logos/vendor.svg", "name": "Vendor", "background": "#f5f4ef" }`. Optional background gives dark marks sufficient contrast. Used when no image or video is set. |
| `source` | string | Source credit along the bottom safe margin. Available on every scene type. |

Evidence uses the existing `hero` scene type. Video elements are emitted beside
the timed scene sections so extraction and preview share the same global clock.
Download source media before building; renders must not depend on remote URLs.

### statement

A single large sentence with an optional ghost word behind it.

```json
{
  "type": "statement",
  "narration": "...",
  "eyebrow": "THE PATH",
  "headline": "A post becomes a thread. A thread becomes a story.",
  "subline": "Each step adds confidence, not evidence.",
  "variant": 1,
  "meta": { "ghost": "PATH" }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `ghost` | string | Max 24 characters. |

### stat

A large number that counts up from `from` to `to`.

```json
{
  "type": "stat",
  "narration": "...",
  "eyebrow": "THE LEDGER",
  "headline": "Primary sources in the original claim",
  "subline": "No interviews, no documents, no data.",
  "meta": {
    "value": 0,
    "dec": 0,
    "sep": false,
    "prefix": "",
    "suffix": ""
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `value` | number or string | Source value. The aligner extracts the number, decimal places, and comma separator. |
| `display` | string | Optional display override. |
| `revealOn` | string | Exact phrase spoken in this scene, max 100 characters. Keeps the number and its decorative duplicate hidden until that phrase starts. Alignment fails if the phrase is absent. Omit for a scene-start reveal. |
| `dec` | integer | 0-3 decimal places. |
| `sep` | boolean | Use thousands separators. Defaults to true when `value` contains a comma. |
| `from` | number | Count-up start. Defaults to 0. |
| `nocount` | boolean | Disable the count-up. |
| `prefix` | string | Text before the number. |
| `suffix` | string | Text after the number, for example `%`. |
| `trend` | string | Explicit trend color: `"up"` (green), `"down"` (red alert), or `"neutral"` (dynamic accent e.g. blue/cyan or amber). Auto-detected if omitted. |
| `delta` | string | Comparative telemetry badge (e.g. `"+42%"`, `"-18ms"`, `"2X ACTIVE COMPUTE"`). |
| `deltaDir` | string | Direction indicator for delta: `"up"` (green ▲), `"down"` (red ▼), or `"neutral"` (dynamic accent ―). Auto-detected from delta prefix (+/-) or trend. |
| `alert` / `bad` | boolean | Forces red alert styling and glitch impact SFX. |
| `good` | boolean | Forces green positive styling and optical flare SFX. |
| `invert` | boolean | Inverts dynamic color direction (e.g. for latency/memory drop where decrease is green/good). |
| `stat` | object | Advanced form: `{ "to": 73, "dec": 0, "sep": false, "from": 0, "nocount": false }`. |

#### Dynamic Color Coding Behavior

The `stat` scene dynamically color-codes the primary counter, suffix, prefix, laser ruler line & traveling bead, and delta telemetry badge:
* **Increasing / Raising (`up`)**: Glows vivid green (`#4ade80`), delta badge shows `▲`, and completes with optical flare ping SFX. Triggered when `to > from`, `delta` has `+`/`▲`, `deltaDir: "up"`, or `trend: "up"`.
* **Decreasing / Falling (`down`)**: Glows alert red (`#ff3b5c`), delta badge shows `▼`, and completes with glitch audio impact. Triggered when `to < from`, `delta` has `-`/`▼`, `deltaDir: "down"`, `bad: true`, `alert: true`, or `trend: "down"`.
* **Normal / Static (`neutral`)**: Glows with the scene or act dynamic accent `var(--ac)` (e.g. cyan/blue `#38bdf8`, amber `#f5a524`, or custom hex), delta badge shows `―`, and completes with a crisp mechanical tick. Triggered when `nocount: true`, `from == to` (or no count change), or `trend: "neutral"`.

The aligner writes a normalized `meta.stat` and `meta.display` into
`build/scenes.json`, so the builder always has both.

### dateline

A document date on the left and the story on the right.

```json
{
  "type": "dateline",
  "narration": "...",
  "eyebrow": "THE DISCLOSURE",
  "headline": "The patch lands after the exploit",
  "subline": "The public timeline is the story.",
  "meta": { "day": "12", "mon": "AUG", "yr": "2026" }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `day` | string | Max 8 characters. Required. |
| `mon` | string | Max 40 characters. Required. |
| `yr` | string | Max 60 characters. Required. |

### code

A source excerpt in a window, with a large callout below.

```json
{
  "type": "code",
  "narration": "...",
  "eyebrow": "THE FOUR LINES",
  "headline": "The four lines that broke the hash table",
  "subline": "The allocation order is the bug.",
  "meta": {
    "file": "src/cache.c",
    "tag": "line 04",
    "announce": "The key is allocated last.",
    "lines": [
      { "t": "cache->key = cache_string_init(str, len, 0);", "k": "key" },
      { "t": "idx = map->used++;", "k": "hot", "key": true }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `lines` | object[] | 1-10 items. Each item needs `t`; optional `k`, `key`, and `bad`. |
| `file` | string | Window title. Only rendered when explicitly authored. |
| `tag` | string | Small accent label in the window bar. Only rendered when explicitly authored. |
| `announce` | string | Large callout at bottom of window. Only rendered when explicitly authored. |

Line `k` values: `code`, `hot`, `dim`, `str`, `com`, `fn`, `kw`, `key`, `err`, `bad`,
`out`. `key: true` or `k: "hot"` highlights the line. `bad: true` or `k: "err"` / `k: "bad"` highlights a critical error/bug with red alerting and impact sound.

### diff

A patch with context, additions, and deletions.

```json
{
  "type": "diff",
  "narration": "...",
  "eyebrow": "THE PATCH",
  "headline": "One guard clause",
  "subline": "The fix is smaller than the bug.",
  "meta": {
    "file": "src/cache.c",
    "ver": "1.4.1 -> 1.4.2",
    "announce": "Check the count before the write.",
    "lines": [
      { "k": "ctx", "t": "if (idx >= map->used) {" },
      { "k": "del", "t": "    map->used++;" },
      { "k": "add", "t": "    cache_insert_next(map, entry);" },
      { "k": "ctx", "t": "}" }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `lines` | object[] | 1-12 items. Each item needs `k` and `t`. |
| `k` | string | `ctx`, `add`, or `del`. |
| `file` | string | Header file name. Only rendered when explicitly authored. |
| `ver` | string | Version label on the right. |
| `tag` | string | Header tag badge. Only rendered when explicitly authored. |
| `announce` | string | Large callout footbar. Only rendered when explicitly authored. |

### flow

A left-to-right causal chain of 2-4 nodes.

```json
{
  "type": "flow",
  "narration": "...",
  "eyebrow": "TRANSMISSION",
  "headline": "Four hops from claim to front page",
  "subline": "No new reporting at any hop.",
  "meta": {
    "nodes": [
      { "k": "01", "t": "FORUM POST", "s": "one user, one claim" },
      { "k": "02", "t": "REPLY THREAD", "s": "repetition starts" },
      { "k": "03", "t": "AGGREGATOR", "s": "context drops" },
      { "k": "04", "t": "HEADLINE", "s": "certainty rises", "hot": true }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `nodes` | object[] | 2-4 items. Each item needs `t`; optional `k`, `s`, `hot`, `bad`. |
| `hot` | boolean | Marks the payoff node with act accent highlight. |
| `bad` | boolean | Marks a failure/compromised node with red alert pulse and impact recoil. |

### ledger

A compact table of findings on the left and the argument on the right.

```json
{
  "type": "ledger",
  "narration": "...",
  "eyebrow": "THE TIMELINE",
  "headline": "The maintainer dilemma",
  "subline": "Every proposed fix broke plugins or hurt speed.",
  "meta": {
    "head": "LEDGER",
    "live": "LIVE",
    "rows": [
      { "k": "FIX A", "v": "broke plugins", "bad": true },
      { "k": "FIX B", "v": "slower than before" },
      { "k": "FIX C", "v": "shipped" }
    ],
    "points": ["one constraint at a time", "no clean rollback"]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `rows` | object[] | 1-6 items. Each item needs `k` and `v`; optional `bad`. |
| `head` | string | Table heading. Only rendered when explicitly authored (`label` also accepted). |
| `live` | string or false | Live label. Only rendered when explicitly authored (`status` also accepted). `false` hides it. |
| `stamp` | string | Optional stamp below the rows. |
| `points` | string[] | 0-4 bullets on the right. |

### memory

A cell grid with a pointer, a count, and a legend.

```json
{
  "type": "memory",
  "narration": "...",
  "eyebrow": "THE HEAP",
  "headline": "The slot is reused before the key exists",
  "subline": "The pointer outlives the allocation.",
  "meta": {
    "segment": "cache_map",
    "allocated": 4,
    "pointer": "dangling key",
    "cells": [
      { "addr": "4f2a1c", "live": true },
      { "addr": "8b01de", "live": true },
      { "addr": "0c77a4", "bad": true },
      { "addr": "d3e900", "bad": true }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `cells` | object[] | Required, 4-16. Each `{ "addr": string, "live"?: boolean, "bad"?: boolean }`. The first cell marked `bad` gets the corruption pulse. |
| `segment` | string | Grid label. Only rendered when explicitly authored. |
| `allocated` | integer | Count shown in the header and animated up from zero. `liveCount` also accepted. |
| `pointer` | string | Pointer label. Only rendered when explicitly authored. |
| `delta` | string | Optional delta tag (e.g. `+12.4%`). |
| `deltaDir` | string | Optional delta direction (`up` or `down`). |
| `ghost` | string | Optional background ghost word. |

### timeline

A horizontal timeline with 2-6 events.

```json
{
  "type": "timeline",
  "narration": "...",
  "eyebrow": "THE SPREAD",
  "headline": "Three hours, three rewrites",
  "subline": "The claim gets shorter and more certain at every step.",
  "meta": {
    "events": [
      { "t": "09:12", "s": "A question is posted" },
      { "t": "10:05", "s": "A reply drops the question mark" },
      { "t": "11:20", "s": "An aggregator adds a headline" },
      { "t": "12:40", "s": "The claim is now a fact", "hot": true }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `events` | object[] | 2-6 items. Each item needs `t`; optional `s` and `hot`. |

### terminal

A shell window with commands, output, and errors.

```json
{
  "type": "terminal",
  "narration": "...",
  "eyebrow": "INDICATORS OF COMPROMISE",
  "headline": "Grep the logs for the crash",
  "subline": "IOC #1: repeated out-of-memory errors",
  "meta": {
    "host": "ioc-hunt",
    "lines": [
      { "t": "grep -Rn \"out of memory\" /var/log/", "k": "cmd" },
      { "t": "/var/log/app/error.log: out of memory near cache.c:41", "k": "out" },
      { "t": "stack trace unavailable", "k": "err" }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `lines` | object[] | 1-8 items. Each item needs `t`; optional `k`. |
| `k` | string | `cmd`, `out`, or `err`. |
| `host` | string | Window title bar. Only rendered when explicitly authored. |
| `tag` | string | Accent badge in the window bar. Only rendered when explicitly authored. |
| `announce` | string | Callout footer bar. Only rendered when explicitly authored. |
| `prompt` | string | Shell prompt prefix (e.g. `$` or `#`). |

### compare

Two columns with a versus marker.

```json
{
  "type": "compare",
  "narration": "...",
  "eyebrow": "THE DRIFT",
  "headline": "What was said vs. what was published",
  "subline": "The gap is where the certainty enters.",
  "meta": {
    "left": {
      "k": "THE POST",
      "t": "A bug might affect some servers",
      "pts": ["conditional language", "one researcher", "no exploit shown"]
    },
    "right": {
      "k": "THE HEADLINE",
      "t": "Every server is exposed",
      "pts": ["no conditional", "no caveat", "no source"]
    },
    "vs": "VS"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `left` | object | Required. `k` and `t` required; `pts` is 0-4 strings. |
| `right` | object | Required. Same shape as `left`. |
| `vs` | string | Center versus marker. Only rendered when explicitly authored. |

### stack

A vertical stack of 2-6 layers.

```json
{
  "type": "stack",
  "narration": "...",
  "eyebrow": "THE STACK",
  "headline": "Every layer trusted the one below it",
  "subline": "The bug lives at the seam.",
  "meta": {
    "layers": [
      { "t": "EDGE", "s": "normalizes the input" },
      { "t": "APP", "s": "allocates the key" },
      { "t": "CACHE", "s": "reuses the slot", "hot": true }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `layers` | object[] | 2-6 items. Each item needs `t`; optional `s`, `hot`, and `bad`. `bad: true` triggers a red security alert pulse and impact recoil. |

### quote

A pull quote with attribution.

```json
{
  "type": "quote",
  "narration": "...",
  "headline": "A claim repeated is still a claim.",
  "subline": "The editorial rule this video is built on."
}
```

`headline` allows up to 180 characters. `subline` is the attribution. The
validator warns if the attribution is missing.

### matrix

A dense grid that reads as a population or a scan.

```json
{
  "type": "matrix",
  "narration": "...",
  "eyebrow": "THE SCAN",
  "headline": "Most requests never touch the bug",
  "subline": "The exploit is a narrow path.",
  "meta": {
    "cells": 240,
    "legendOk": "normal",
    "legendBad": "flagged",
    "count": "240 requests / 6 flagged"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `cells` | integer | 40-400. Grid cell count. |
| `legendOk` | string | Legend label for normal cells. Only rendered when explicitly authored. |
| `legendBad` | string | Legend label for flagged cells. Only rendered when explicitly authored. |
| `matrixLabel` | string | Header badge for the grid. Only rendered when explicitly authored. |
| `count` | string | Caption under the grid. |

### outro

A closing CTA with a ghost word, a channel line, and a subscribe block.

```json
{
  "type": "outro",
  "narration": "...",
  "eyebrow": "OUTRO",
  "headline": "Check the source before you share.",
  "subline": "A claim is not a fact until someone checks it.",
  "meta": {
    "channel": "@yourchannel",
    "cta": "Subscribe",
    "ctaSub": "More forensic breakdowns",
    "ghost": "RUMOR"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `channel` | string | Falls back to the project `channel`. |
| `cta` | string | Falls back to the project `cta`, then `Subscribe`. |
| `ctaSub` | string | Falls back to the project `ctaSub`, then `More investigations`. |
| `ghost` | string | Falls back to the scene `ghost`, then the project `ghost`. |

## Timing and build output

The aligner writes:

- `build/scenes.json`: `index`, `id`, `start`, `end`, `duration`, `type`,
  `accent`, `eyebrow`, `headline`, `subline`, `variant`, `ghost`, `meta`,
  `narration`.
- `build/project.json`: `title`, `slug`, `compositionId`, `audio`, `channel`,
  `cta`, `ctaSub`, `ghost`, `width`, `height`, `fps`, `duration`.
- `build/report.md`: the timing table and alignment warnings.

Timing rules:

- The transcript is the master. The aligner uses a monotonic word alignment.
- Scene windows are contiguous. A scene starts before its first matched word by
  the lead-in (default 0.3s) and ends where the next scene starts.
- Minimum scene duration is 0.35s. Minimum gap between starts is 0.6s.
- The final scene ends at the audio duration.
- Read `build/report.md`. A high match percentage and no no-match warnings mean
  the narration is faithful to the audio. If a scene has no matched words, fix
  the narration rather than editing timings by hand.

## Validation

```bash
python engine/validate.py
python engine/validate.py content/video.json --strict
```

`validate.py` exits non-zero on structural errors. Warnings are editorial:
missing audio, a missing ghost word, a headline that is too long, a scene that
is too short or too long, or a project that does not start with `cold` or end
with `outro`. `--strict` treats warnings as errors.

The HyperFrames checker is separate:

```bash
npx hyperframes@latest lint
npx hyperframes@latest check
```

Both should report 0 errors. Warnings about one section per scene, composition
size, timeline density, negative z-index background layers, and small mono
labels are expected for this single-file timeline design. Do not split the
composition into sub-compositions just to silence those warnings unless you are
deliberately changing the engine.

### webref

A browser and documentation reference window with an address bar, SSL lock, centered ~16:10/16:9 screenshot viewport with animated highlight boxes (`highlightRects`) and cursor focus, or a text-emulated documentation view with breadcrumbs, callout highlights, and simulated cursor when real screenshots are explicitly disabled.

Default to real captured website screenshots (`image`, plus `highlightRects` from `node scripts/capture_webref.mjs`) rather than copy-pasting text into `snippet`. Use the text-emulated mode (`snippet`, `highlight`, `callout` without `image`) only when explicitly instructed not to capture screenshots or when capture is blocked.

```json
{
  "type": "webref",
  "narration": "According to the official AWS documentation, provisioned concurrency must be configured before cold starts can be eliminated.",
  "eyebrow": "OFFICIAL SPEC",
  "headline": "The Docs Explicitly Warned About This",
  "subline": "Section 4.2 of the specification details the exact race condition.",
  "meta": {
    "url": "docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html",
    "badge": "AWS ARCHITECTURE DOCS",
    "image": "assets/webref/lambda-concurrency.png",
    "alt": "AWS Lambda provisioned concurrency documentation page",
    "highlightRects": [
      { "x": 14.2, "y": 42.5, "w": 68.4, "h": 4.2, "label": "KEY CONSTRAINT" }
    ],
    "source": "Source: AWS Lambda Developer Guide"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `url` | string | Required. Web address displayed in the browser bar. |
| `badge` | string | Optional category badge (e.g. `OFFICIAL DOCS`, `RFC-9110`, `CVE ADVISORY`). |
| `image` | string | Default primary evidence mode: local path to real captured screenshot (capture via `node scripts/capture_webref.mjs`). Fits a centered ~16:9/16:10 browser viewport at native aspect ratio. |
| `highlightRects` | array | Optional array (1-12 items) of `{ x, y, w, h, label? }` normalized percentage coordinates (`0..100`) over `image` to animate a highlighter sweep and cursor click on exact page text. Produced automatically by `scripts/capture_webref.mjs --highlight "..."`. |
| `alt` | string | Screenshot description. |
| `position` | string | Optional screenshot crop anchor (e.g. `top center`) for `object-fit: cover` cropping. Omit when using `highlightRects` so coordinates stay 1:1 with the image. |
| `title` | string | Optional document title (text-emulated mode only). Only rendered when explicitly authored. |
| `snippet` | string \| string[] | Text-emulated mode only (use only when screenshots are explicitly omitted). Excerpt paragraphs from the documentation. |
| `highlight` | string | Text-emulated mode only. Key substring to highlight inside `snippet`. |
| `callout` | string | Highlighted alert box text (works in both text-emulated mode and as a floating callout banner in screenshot mode). |
| `calloutType` | string | `NOTE`, `IMPORTANT`, or `WARNING`. Sets alert styling when `callout` is present. |
| `crumb` | string | Text-emulated mode only. Document breadcrumb trail. |
| `formula` | string | Text-emulated mode only. Formula code inside callout chip. |
| `formulaBadge` | string | Text-emulated mode only. Formula badge label. |
| `formulaLabel` | string | Text-emulated mode only. Formula descriptor. |
| `ghost` | string | Optional background ghost word (max 24 chars). |

### meme

A fast-paced, high-impact dev reaction card with comic recoil shake, glitch sweep, and punchline timing.

```json
{
  "type": "meme",
  "narration": "They pushed the hotfix directly to production on a Friday afternoon without testing.",
  "eyebrow": "DEV REALITY",
  "headline": "Works on My Machine",
  "subline": "Famous last words before 48,000 requests timed out.",
  "meta": {
    "text": "PUSHED TO PROD ON FRIDAY",
    "subtext": "What could possibly go wrong?",
    "reaction": "SKILL ISSUE",
    "expression": "shocked",
    "punch": true
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `text` | string | Bold meme reaction caption. |
| `subtext` | string | Subtitle or sarcastic commentary. |
| `reaction` | string | Tag line (e.g. `SKILL ISSUE`, `PAIN`, `WAIT WHAT`, `404 LOGIC`). |
| `formulaBadge` | string | Formula badge label (e.g. `FULL JITTER`). Only rendered when explicitly authored. |
| `formulaLabel` | string | Formula descriptor (e.g. `DECORRELATION FORMULA`). Only rendered when explicitly authored. |
| `expression` | string | Mascot expression: `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`, `facepalm`, `pointing`, `panic`, `skeptical`. |
| `image` | string | Optional custom meme image path. Defaults to iDevak mascot with chosen expression. |
| `punch` | boolean | Enables instant Fireship-style camera recoil punch zoom. |

`caption`, `badge`, and `sub` are accepted as aliases for `text`, `reaction`, and
`subtext`. `expression` selects the mascot image when `image` is absent.

### cloud

A cloud infrastructure and systems topology diagram with node cards, status badges, and animated data packet transmission.

```json
{
  "type": "cloud",
  "narration": "The API gateway forwards requests to an ARM64 Lambda, which queries Redis before hitting the Postgres cluster.",
  "eyebrow": "INFRASTRUCTURE",
  "headline": "The Microservice Pipeline",
  "subline": "Latency spiked because the cache invalidation queue backed up.",
  "meta": {
    "flow": "INGRESS -> LAMBDA -> CACHE -> DB",
    "nodes": [
      { "k": "EDGE", "t": "Cloudflare CDN", "icon": "⚡", "status": "200 OK" },
      { "k": "ROUTER", "t": "API Gateway", "icon": "🚪", "status": "HEALTHY" },
      { "k": "COMPUTE", "t": "AWS Lambda", "icon": "λ", "status": "ACTIVE", "hot": true },
      { "k": "CACHE", "t": "Redis Cluster", "icon": "⚡", "status": "HIT RATE 94%" },
      { "k": "PRIMARY", "t": "Aurora Postgres", "icon": "🗄️", "status": "2.4ms" }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `nodes` | object[] | 2-6 node items. Required fields: `t` (title). Optional: `k` (badge), `s` (sub), `icon`, `status`, `hot`, `bad`. |
| `flow` | string | Subtitle describing the data pipeline or architecture. Rendered as a dim mono line under the canvas header. |

### mascot

A dedicated spotlight scene featuring Devak (the iDevak mascot) delivering a technical autopsy or summary.

```json
{
  "type": "mascot",
  "narration": "Always rotate your IAM keys, enforce least privilege, and never store secrets in environment variables.",
  "eyebrow": "TAKEAWAY",
  "headline": "The Golden Rule of Cloud Security",
  "subline": "Three simple steps that would have prevented this entire incident.",
  "meta": {
    "expression": "pointing",
    "bubble": "Rotate your credentials before someone else does.",
    "badge": "iDevak // CLOUD SECURITY",
    "stats": [
      { "label": "SEVERITY", "val": "CRITICAL", "hot": true },
      { "label": "CVSS SCORE", "val": "9.8" },
      { "label": "FIX TIME", "val": "< 5 MIN" }
    ]
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `expression` | string | Mascot expression: `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`, `facepalm`, `pointing`, `panic`, `skeptical`. Defaults to `neutral`. |
| `bubble` | string | Speech balloon dialogue text. |
| `badge` | string | HUD badge tag (e.g. `iDevak // ANALYSIS`). |
| `stats` | object[] | Up to 4 telemetry chips with `label` and `val`, plus optional `hot: true`. |

### split

Dual-pane forensic investigation layout: live terminal/shell on the left and target component/impact on the right.

```json
{
  "type": "split",
  "narration": "Sending the crafted payload immediately triggers an unhandled null pointer dereference in the authentication worker.",
  "eyebrow": "EXPLOIT AUTOPSY",
  "headline": "Zero-Day Trigger in the Auth Worker",
  "subline": "Payload injection causes immediate crash of the session daemon.",
  "meta": {
    "tag": "FORENSIC RECONSTRUCTION",
    "left": {
      "title": "EXPLOIT PAYLOAD",
      "badge": "CURL / BASH",
      "lines": [
        { "t": "curl -X POST https://api.internal/v1/auth \\", "k": "cmd" },
        { "t": "  -H 'X-Token: 0xDEADBEEF_OVERFLOW' \\", "k": "cmd" },
        { "t": "  -d '{\"user\":\"admin\",\"len\":-1}'", "k": "cmd" },
        { "t": "HTTP/1.1 502 Bad Gateway (Connection Reset)", "k": "err" }
      ]
    },
    "right": {
      "title": "DAEMON STATUS",
      "status": "CRASHED // SIGSEGV",
      "pts": [
        "Memory address 0x00000000 dereferenced",
        "Worker process 1842 terminated abnormally",
        "Downstream request queue dropped 1,024 packets"
      ]
    }
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `left` | object | Required. `{ "title": "...", "badge": "...", "lines": [ { "t": "...", "k": "cmd" } ] }` |
| `right` | object | Required. `{ "title": "...", "status": "COMPROMISED", "pts": ["..."] }` |
| `tag` | string | Header tag badge. Only rendered when explicitly authored. |
| `connector` | string | Center chip label between panes. Only rendered when explicitly authored. |

## Universal Mascot Overlay

> [!TIP]
> Devak's visual expressions are self-explanatory! Avoid redundant speech bubbles like `"Thinking"` or `"Shocked"` just to state the emotion. Let the facial expression tell the emotional story, and reserve speech `bubble` for actual developer commentary or omit `bubble` entirely for silent emotive reactions.


You can add the iDevak mascot as an expressive reaction overlay to **ANY** scene in your video:

```json
{
  "type": "code",
  "headline": "The Hardcoded Root Password",
  "narration": "Looking closely at line 42, the developers literally left the password as admin123.",
  "mascot": {
    "expression": "shocked",
    "bubble": "Wait, they really hardcoded this in production?!",
    "position": "bottom-right"
  },
  "meta": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `expression` | string | `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`, `facepalm`, `pointing`, `panic`, `skeptical`. |
| `bubble` | string | Optional speech bubble text that pops up with the mascot. |
| `hud` | string | Optional holographic telemetry badge projecting from Devak's cyber visor (e.g. `CVE-2026-3841`, `SEV-1 ALERT`, `MEMORY CORRUPTION`). |
| `position` | string | `bottom-right` (default) or `bottom-left`. |
| `timeline` | object[] | Optional mid-scene expression and bubble changes: `[{ "at": 1.4, "expression": "shocked", "bubble": "Wait, what?!" }]`. Enables dynamic emotional arcs during narration. |

### Dynamic Mid-Scene Emotion Flips (Mascot Timeline)

You can animate Devak changing expressions and updating his commentary as the scene progresses:

```json
{
  "type": "code",
  "headline": "The Hardcoded Root Password",
  "narration": "Looking closely at line 42, the developers literally left the password as admin123.",
  "mascot": {
    "expression": "thinking",
    "position": "bottom-right",
    "timeline": [
      { "at": 1.4, "expression": "shocked", "bubble": "Wait, did they really hardcode this?!" },
      { "at": 3.0, "expression": "facepalm" }
    ]
  }
}
```

