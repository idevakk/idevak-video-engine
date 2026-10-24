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

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Max 120 characters. Used in `<title>` and as a fallback. |
| `slug` | string | no | Lowercased and hyphenated by the aligner. Used for the `hyperframes.json` name. |
| `compositionId` | string | no | Letters, numbers, underscores, or hyphens. Used as `data-composition-id` and the GSAP registry key. Defaults to the slug. |
| `audio` | string | no | Path relative to the repo root. Defaults to `content/voiceover.wav`. This exact file is transcribed and embedded in the composition. |
| `channel` | string | no | Channel line used by the outro. |
| `ghost` | string | no | Fallback ghost word for the cold open and outro. |
| `cta` | string | no | Outro CTA label. Defaults to `Subscribe`. |
| `ctaSub` | string | no | Outro CTA detail. Defaults to `More investigations`. |
| `defaultAccent` | string | no | `#rrggbb` fallback when neither the scene nor its act has an accent. |
| `aspect` | string | no | `"16:9"` (default, 1920x1080) or `"9:16"` (1080x1920 portrait for YouTube Shorts, Reels, TikTok). When set to `"9:16"`, the engine automatically configures 1080x1920 resolution, mobile safe zones, single-column stacked grids, and vertical mascot positioning. |
| `aspectRatio` | string | no | Alias for `aspect` (e.g. `"9:16"`). |
| `composition` | object | no | `{ "width": 1920, "height": 1080, "fps": 30 }` (or `{ "width": 1080, "height": 1920, "fps": 30 }` for 9:16). Automatically defaulted by `aspect`. |
| `acts` | array | no | Act objects. Used for eyebrow fallback and accent fallback. |
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
| `mark` | string | Max 8 characters. Defaults to the first word of the headline. |
| `rule` | boolean | Adds a vertical rule beside the mark. |

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
| `dec` | integer | 0-3 decimal places. |
| `sep` | boolean | Use thousands separators. Defaults to true when `value` contains a comma. |
| `from` | number | Count-up start. Defaults to 0. |
| `nocount` | boolean | Disable the count-up. |
| `prefix` | string | Text before the number. |
| `suffix` | string | Text after the number, for example `%`. |
| `stat` | object | Advanced form: `{ "to": 73, "dec": 0, "sep": false, "from": 0, "nocount": false }`. |

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
| `lines` | object[] | 1-10 items. Each item needs `t`; optional `k` and `key`. |
| `file` | string | Window title. Defaults to `source`. |
| `tag` | string | Small accent label in the window bar. |
| `announce` | string | Large callout. Falls back to the headline. |

Line `k` values: `code`, `hot`, `dim`, `str`, `com`, `fn`, `kw`, `key`, `err`,
`out`. `key: true` or `k: "hot"` highlights the line.

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
| `file` | string | Header file name. Defaults to `source`. |
| `ver` | string | Version label on the right. |
| `announce` | string | Large callout. Falls back to the headline. |

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
| `nodes` | object[] | 2-4 items. Each item needs `t`; optional `k`, `s`, `hot`. |
| `hot` | boolean | Marks the payoff node. |

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
| `head` | string | Table heading. Defaults to `LEDGER`. |
| `live` | string or false | Live label. Defaults to `LIVE`; `false` hides it. |
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
    "cells": 12,
    "n": 4,
    "name": "cache_map",
    "unit": "live",
    "ptr": "dangling key",
    "legendOk": "active",
    "legendBad": "unused"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `cells` | integer | 4-16. Defaults to 8. |
| `n` | integer | 1 to `cells`. Defaults to 2. |
| `name` | string | Grid label. Defaults to `memory`. |
| `unit` | string | Count unit. Defaults to `live`. |
| `ptr` | string or false | Pointer label. Defaults to `pointer`; `false` hides it. |
| `legendOk` | string | Defaults to `active`. |
| `legendBad` | string | Defaults to `unused`. |

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
| `k` | string | `cmd`, `out`, or `err`. Defaults to `out`. |
| `host` | string | Window title. Defaults to `terminal`. |

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
| `vs` | string | Center marker. Defaults to `VS`. |

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
| `layers` | object[] | 2-6 items. Each item needs `t`; optional `s` and `hot`. |

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
| `cells` | integer | 40-400. Defaults to 160. |
| `legendOk` | string | Defaults to `ok`. |
| `legendBad` | string | Defaults to `flagged`. |
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

A browser and documentation reference window with an address bar, SSL lock, document breadcrumbs, callout highlights, and simulated cursor.

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
    "title": "Configuring provisioned concurrency for Lambda",
    "snippet": [
      "Allocating execution environments ahead of time prevents initialization latency during traffic spikes.",
      "Failure to specify an upper bound can exhaust VPC subnet elastic network interfaces within seconds."
    ],
    "highlight": "exhaust VPC subnet elastic network interfaces",
    "callout": "Subnet IP exhaustion causes all downstream Lambda invocations to fail immediately with Status 500.",
    "calloutType": "WARNING"
  }
}
```

| Meta field | Type | Notes |
|---|---|---|
| `url` | string | Required. Web address displayed in the browser bar. |
| `badge` | string | Optional category badge (e.g. `OFFICIAL DOCS`, `RFC-9110`, `CVE ADVISORY`). |
| `title` | string | Optional document title. Defaults to scene headline. |
| `snippet` | string \| string[] | Excerpt paragraphs from the documentation. |
| `highlight` | string | Key substring to highlight with high-contrast accent border. |
| `callout` | string | Highlighted alert box text. |
| `calloutType` | string | `NOTE`, `IMPORTANT`, or `WARNING`. Defaults to `IMPORTANT`. |
| `image` | string | Optional path to real screenshot image. If set, replaces the rendered HTML doc. |

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
| `expression` | string | Mascot expression: `neutral`, `talking`, `thinking`, `shocked`, `cool`, `happy`, `angry`, `sad`, `facepalm`, `pointing`, `panic`, `skeptical`. Defaults to `shocked`. |
| `image` | string | Optional custom meme image path. Defaults to iDevak mascot with chosen expression. |
| `punch` | boolean | Enables instant Fireship-style camera recoil punch zoom. |

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
| `flow` | string | Subtitle describing the data pipeline or architecture. |

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
    "expression": "solved",
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
| `position` | string | `bottom-right` (default) or `bottom-left`. |

