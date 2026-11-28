# Optional Thumbnail Generation Feature

iDevak Video Engine includes an optional thumbnail generation workflow that stays completely inactive unless the user explicitly asks to **generate a thumbnail** (or generate A/B thumbnail variants).

## Core Behavior

1. **Aspect Ratio Inheritance**:
   - Reads `aspect` / `aspectRatio` / `composition` from `workspaces/<slug>/video.json`.
   - `16:9` (default) -> **`1280x720`** PNG (`workspaces/<slug>/thumbnails/`).
   - `9:16` (portrait Shorts/Reels/TikTok) -> **`1080x1920`** PNG (`workspaces/<slug>/thumbnails/`).
   - Overridden only when the user explicitly requests another aspect ratio or resolution.
2. **Style Default**:
   - Always follows the **motion-explainer 3D-cube/pedestal dark-carbon aesthetic** analyzed in [`docs/thumbnail-samples-notes.md`](thumbnail-samples-notes.md), unless the user explicitly requests another style.
3. **Dual Execution Path**:
   - **Path 1 (Agent has native image generation capability)**: Follow [`prompts/skills/thumbnail-generator/SKILL.md`](../prompts/skills/thumbnail-generator/SKILL.md). Fetch authentic logos via `scripts/fetch_logo.py`, supply them as visual references, craft a grounded prompt matching the selected composition archetype, and verify the output against `video.json` / the requested title.
   - **Path 2 (Fallback when agent lacks image generation)**: Run `scripts/generate_thumbnail.mjs` (or `npm run thumbnail -- --project <slug> ...`), which builds a high-depth 3D-layered HTML/CSS/SVG scene and captures a pixel-exact PNG via Playwright Chromium.
4. **Strict A/B Variant Isolation**:
   - When asked to generate thumbnails for **Title A** and **Title B**, each variant is generated **sequentially one by one** with its own spec, filename (`thumb-a.png`, `thumb-b.png`), and entry in `workspaces/<slug>/thumbnails/manifest.json`.
   - Never blend claims, logos, metrics, or headline angles between Title A and Title B.

## CLI Usage (HTML/CSS + Playwright Fallback)

```bash
# Quick A/B generation from CLI flags
npm run thumbnail -- --project my-video --variant a --title "LOCAL ≠ SAFE" --archetype showcase --left-brand deepseek --right-prop padlock --accent red

# Generate from a rich JSON spec inside the workspace
npm run thumbnail -- --project my-video --spec notes/thumb-a.json --variant a

# Override aspect ratio explicitly
npm run thumbnail -- --project my-video --spec notes/thumb-short.json --aspect 9:16 --out thumbnails/short-cover.png
```

## Thumbnail Spec JSON Reference (`--spec`)

```json
{
  "variant": "a",
  "title": "32GB > 128GB",
  "archetype": "versus",
  "aspect": "16:9",
  "accent": "lime",
  "headline": [
    { "text": "32GB", "color": "accent" },
    { "text": ">", "color": "white" },
    { "text": "128GB", "color": "muted", "strike": true }
  ],
  "subline": [],
  "underline": "accent",
  "operator": ">",
  "left": {
    "kind": "gpu",
    "label": "RTX 5090",
    "badge": "78 TOK/S",
    "color": "lime",
    "state": "hero",
    "arrow": "up"
  },
  "right": {
    "kind": "dgx-spark",
    "label": "DGX SPARK",
    "badge": "15 TOK/S",
    "color": "slate",
    "state": "loser",
    "arrow": "down",
    "xMark": false
  }
}
```

Supported `archetype` values:
- `versus` - Asymmetric winner vs. loser OR equal `VS` / `≈` / `+` head-to-head
- `pipeline` - 2-stage or 3-stage left-to-right flow (`>>>` chevrons or dashed arrow)
- `hero-orbit` - Central glowing hero cube surrounded by spoke pills or satellite cubes
- `lineup` - 3 to 5 cubes in a row (cracked, chained, crossed, or ranked)
- `showcase` - Hero cube paired with a hardware prop, laptop, phone, or padlock
- `split-compare` - Framed comparison card or before/after window

Supported `kind` values for `left` / `right` / `items[]`:
- `cube` (3D rounded isometric cube with `logo` path from `assets/logos/` or `text` badge, `state`: `"hero" | "lit" | "loser" | "cracked"`, `crown`: true/false, `speedLines`: true/false, `starburst`: true/false, `xMark`: true/false, `checkBadge`: true/false)
- `gpu`, `mac-mini`, `dgx-spark`, `ram`, `laptop`, `phone`, `server`, `padlock`, `card`

## Output Files

All outputs stay strictly inside `workspaces/<slug>/thumbnails/`:
- `workspaces/<slug>/thumbnails/thumb-a.png` (or `thumbnail.png`)
- `workspaces/<slug>/thumbnails/manifest.json` (records variant ID, title, aspect, width, height, method, spec, logo sources, and timestamp)
