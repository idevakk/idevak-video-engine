---
name: thumbnail-generator
description: Optional YouTube and Shorts thumbnail designer and generator for technical/AI explainer videos. Activates ONLY when the user explicitly asks to generate a thumbnail (or A/B thumbnail variants). Matches the video's aspect ratio (16:9 1280x720 or 9:16 1080x1920), fetches authentic logos, applies the signature dark-carbon 3D-cube/pedestal design system from the 81 reference samples, uses native image generation when available, and falls back to the programmatic HTML/CSS + Playwright renderer otherwise.
---

# Thumbnail Generator Skill (Motion-Explainer 3D Packaging System)

Use this skill **only when the user explicitly requests thumbnail generation** (e.g., "generate thumbnail", "make thumbnails for title A and title B"). Never auto-generate thumbnails unasked.

For full forensic analysis of all 81 reference thumbnails, read `docs/thumbnail-samples-notes.md`. For CLI/JSON usage of the programmatic fallback, read `docs/THUMBNAIL.md`.

---

## 1. Mandatory Pre-Flight Protocol

Before writing any prompt or generating any image, complete these 5 checks in order:

1. **Detect Target Workspace & Aspect Ratio**:
   - Locate `workspaces/<slug>/video.json` (or active workspace).
   - Read `aspect` / `aspectRatio` / `composition` from `video.json`:
     - `16:9` (or omitted) -> **`1280x720`** (landscape).
     - `9:16` -> **`1080x1920`** (portrait Shorts/Reels/TikTok).
   - Use an explicit aspect ratio ONLY if the user specifically overrides it in the request.
2. **Determine Visual Style**:
   - **Default:** Always use the **motion-explainer dark-carbon 3D-cube & stepped-pedestal aesthetic** (pure `#000000` top sky, tinted perspective dot-matrix floor, condensed impact headline, 3D rounded isometric cubes with white squircle logo badges on neon pedestals), regardless of whether the video itself uses `default`, `motion-explainer`, or another style - unless the user explicitly asks for a different thumbnail style.
3. **Ground Every Word & Claim in Reality (Zero Hallucination)**:
   - Align the thumbnail 100% with the actual video topic, `video.json` title/script, and the exact Title provided by the user.
   - **Never invent** benchmark metrics, VRAM numbers, dollar prices, parameter counts, model version numbers, or competitor names. If a stat is shown on the thumbnail (`78 TOK/S`, `$1`, `27B`, `4GB`), it MUST come directly from the user's title, prompt, or `video.json` / `notes/`.
4. **Source Authentic Brand Logos First**:
   - Never ask an image-generation model to guess an obscure brand logo from memory, and never draw fake SVG/CSS logos.
   - Run `python scripts/fetch_logo.py <brand> --theme light --project <slug>` for brands going inside white squircle cube badges (use `--theme auto` or omit if targeting a dark obsidian surface). Assets save to `workspaces/<slug>/assets/logos/`.
   - Document sources in `workspaces/<slug>/assets/SOURCES.md`.
5. **Sequential A/B Variant Isolation**:
   - If the user asks for A/B testing (e.g., "generate thumbnail for Title A and then for Title B"), process **Title A completely first** (`workspaces/<slug>/thumbnails/thumb-a.png`), then **Title B completely separately** (`workspaces/<slug>/thumbnails/thumb-b.png`).
   - Do **not** merge visual hooks, numbers, or phrasing from Title A into Title B. Each variant must stand alone as a distinct packaging hypothesis for its exact title.

---

## 2. Capability Routing: Image-Gen vs. HTML/CSS Fallback

Check the current agent/environment capabilities:

- **Path A - Agent has an Image Generation tool or subagent** (e.g., `image-generator` subagent, `generate_image`, Nano Banana / Imagen / GPT-Image):
  - Use **Section 3 & Section 4** below to construct a precision art-directed prompt.
  - Attach/pass the local authentic logo files from `workspaces/<slug>/assets/logos/` (or high-res PNG renders of fetched SVGs) as reference images so the model renders the exact official marks inside white squircle badges.
  - Save output directly to `workspaces/<slug>/thumbnails/<variant>.png` (and verify the image visually with `read_file`!).
  - If the generated image has garbled text, misspelled title words, distorted brand logos, or wrong aspect ratio, regenerate once with tighter prompt constraints OR fall back to Path B for razor-sharp typography/logos.
- **Path B - Agent does NOT have Image Generation capability** (or image-gen fails text/logo fidelity):
  - Author a structured thumbnail spec JSON in `workspaces/<slug>/notes/thumb-<variant>.json` (or pass CLI flags) and run:
    ```bash
    npm run thumbnail -- --project <slug> --spec notes/thumb-<variant>.json --variant <variant>
    ```
  - Inspect the resulting PNG in `workspaces/<slug>/thumbnails/` via `read_file` to verify zero clipping, crisp lighting depth, accurate logos, and strong 168px-scale readability.

---

## 3. Senior Designer Blueprint (17+ Years CTR Packaging Rules)

Every thumbnail must obey these 6 architectural laws observed across the 81 reference samples:

### Law 1: The 4-Element Ceiling & Mobile Legibility
- A viewer scrolling YouTube sees your thumbnail at **~168x94px** on mobile.
- Budget at most: **(1) Headline Block** + **(2) Accent Underline** + **(3) Primary Focal Object(s)** + **(4) Optional Status/Metric Pill**.
- Keep headlines **2 to 5 words** (max 2 lines). Never write full sentences. Use **ALL CAPS** ultra-bold condensed display type (`Impact` / `Anton` / compressed heavyweight grotesque) with tight line-height (`0.94`) and zero clutter behind the letters.

### Law 2: Void-Black Sky + Tinted Perspective Dot Floor
- **Upper 38-45% of canvas:** Pure `#000000` void black behind all text. Zero gridlines, zero gradients, zero mist touching the headline.
- **Lower 25-35% of canvas:** Receding 3D perspective grid of crisp circular dots (`4-6px` foreground tapering toward the horizon) fading seamlessly into black.
- **Floor Color Spill:** Dots directly beneath each object inherit the radial bloom color of that object (e.g., neon green glow under left winner, crimson red glow under right loser).

### Law 3: Two-Tone Headline + Painterly Red Strikethrough
- **Color Split:** Never color an entire headline identically. Pair **Pure White (`#FFFFFF`)** with **1 vivid semantic accent** (`#22C55E`/`#A3E635` lime-green for speed/free/savings, `#1E90FF`/`#38BDF8` electric blue for architecture/Google/DeepSeek, `#FF3B30` crimson for failure/breach/warning, `#F97316` orange for Claude/Rust/web tools, `#A855F7` violet for Qwen/tokens/reasoning).
- **Defeated Word Treatment:** When contrasting against an old/inferior thing (`OPUS`, `128GB`, `OLLAMA`, `GPU`, `SUBSCRIPTIONS`), render that defeated word in **muted slate-grey (`#7A7F88`)** and slash through it diagonally (`-7deg`) with a **bold painterly red brush stroke (`#FF2222`)**.
- **Underline Anchor:** Place a thick (`8-12px`) rounded-cap glowing underline bar directly beneath the headline-either solid accent color or a smooth left-to-right dual-color gradient matching the two subjects below.

### Law 4: The 3D Chamfered Cube & White Squircle Badge
- Primary software/model/company anchors are **3D rounded isometric/3-quarter chamfered cubes** with:
  - Softly beveled corners, glossy specular edge highlights (`2-3px` bright rim), and directional volumetric glow.
  - **Front face:** A crisp **pure white (`#FFFFFF`) rounded square (squircle, ~18% corner radius)** housing the exact authentic brand logo centered with generous padding. (For dark-mode obsidian cubes, keep `#11151B` face with a bright neon rim light and crisp high-contrast logo).
  - **2-Tier Stepped Pedestal:** Matte charcoal chamfered 2-tier plinth below the cube with a glowing neon rim tracing the upper step, plus an optional front pill badge (`$1`, `125 TOK/S`, `FREE`, `2.8T PARAMS`) and clean bold white condensed label underneath.

### Law 5: Asymmetric Hierarchy (Winner vs. Loser)
- Never give winner and loser equal visual weight in a comparison:
  - **Winner:** 1.25x-1.4x physically larger, elevated 2-tier glowing neon pedestal, saturated body or bright rim, radial bloom/starburst rays, optional **3D gold crown**, **upward glowing dashed arrow**, or **speed streaks**.
  - **Loser / Replaced:** 65-75% scale, lower single-tier unlit matte-charcoal pedestal, desaturated/greyed cube and logo, **no rim glow**, bold **painterly red brush `X`** across the face, **downward grey dashed arrow**.
  - **Compromised / Breached / Hacked:** Dark charcoal cube with **glowing crimson magma cracks** splitting the edges, detached corner shards, glossy **3D red padlock** (open = leaked; chained = banned).

### Law 6: Aspect Ratio Layout Rules
- **16:9 (`1280x720`):**
  - Top 38%: Full-width condensed headline + optional subline + underline bar.
  - Bottom 62%: Horizontal stage (left-vs-right, 3-stage pipeline, center+orbit, or cube+hardware).
- **9:16 (`1080x1920`):**
  - Respect YouTube Shorts / Reels safe zones: keep top `160px` clear (search/camera UI) and bottom `240px` clear (channel handle, caption, buttons).
  - Upper-middle (`y: 170px-560px`): Stacked condensed 2-3 line headline + underline bar.
  - Center stage (`y: 600px-1640px`): **Vertical stacked composition** (Hero cube/device on top tier -> vertical `>` / `>>>` / `VS` operator -> secondary/loser cube or hardware on bottom tier), keeping full horizontal breathing room (`72px` side padding).

---

## 4. Composition Archetype Selector (Match Video Idea -> Layout)

Choose ONE archetype that directly visualizes the Title's tension (never pick randomly):

| Video Title / Hook Pattern | Best Archetype | Visual Formula |
|---|---|---|
| *"X beats Y" / "Stop using Y" / "Cheaper/Faster than Y"* | **A: Asymmetric Winner > Loser** | Large glowing Winner cube/device (left, crown/up-arrow/speed streaks) `>` small dim matte Loser cube with red brush `X` (right, down-arrow). |
| *"X vs Y" / "A + B synergy" / "Equivalent to Y"* | **B: Symmetric Head-to-Head** | Two equal glowing neon-rimmed cubes in contrasting colors (`Green vs Red`, `Blue vs Violet`, `Orange + Blue`) linked by `VS`, `+`, or `≈`, with dual-gradient underline bar. |
| *"How X turns A into B" / "Workflow on autopilot"* | **C: 3-Stage Pipeline / Funnel** | Left source stack/input `>>>` Center glowing Brand cube processor `>>>` Right target grid/cards/phones/output. |
| *"Everything inside X" / "Nobody explains X"* | **D: Central Hero + Orbit / Nodes** | Single large glowing center cube on double pedestal ringed by 4-8 glowing pill nodes connected by dotted spokes (or self-loop arrows). |
| *"Run XB model on small GPU/Laptop/Phone"* | **E: Hardware + Model Cube** | Giant glowing model cube (`27B`, `400B+`) beside/above crisp 3D hardware (`dual-fan GPU`, `Mac Mini`, `DDR5 RAM`, `Laptop`, `iPhone`) with VRAM/price pill badges. |
| *"4 tools failed / All models banned / Hacked"* | **F: Multi-Cube Lineup / Breach** | 3-5 dark obsidian cubes in a row-either cracked with glowing red fissures + `X` marks, or wrapped in metallic chains + glowing red padlock. |
| *"Benchmark proof / 480p vs 4K / Forecast"* | **G: Evidence Frame / Chart Card** | Tilted dark glowing leaderboard card, split-screen rounded comparison frame, or glowing-bezel laptop displaying a crisp chart. |

---

## 5. Image-Generation Master Prompt Template (Path A)

When invoking an image-generation tool or `image-generator` subagent, assemble the prompt using this exact 6-block structure (never omit lighting, font style, or reference logo instructions):

```text
Create a ultra-crisp, high-contrast YouTube technical explainer thumbnail in [16:9 (1280x720) | 9:16 (1080x1920)] aspect ratio matching the dark-carbon 3D motion-explainer packaging aesthetic.

1. CANVAS & FLOOR:
Pure pitch-black (#000000) upper background behind all typography with zero clutter or haze. In the lower third, render a receding 3D perspective dot-matrix floor grid of small circular dots tinted with subtle radial light pools matching the glowing objects above it.

2. TYPOGRAPHY (TOP [38% for 16:9 | UPPER-MIDDLE SAFE ZONE for 9:16]):
Render ultra-bold, tightly tracked, heavily condensed ALL-CAPS display text (Impact / Anton style), razor-sharp and perfectly spelled:
- Line 1: "[EXACT WORD(S) IN WHITE]" and "[EXACT EMPHASIS WORD(S) IN NEON ACCENT HEX/COLOR]" [optional: with "[DEFEATED WORD]" in muted slate grey #787D85 crossed out diagonally by a bold painterly crimson red brush slash].
- [Optional Line 2 sub-headline in smaller condensed bold white/accent].
- Directly beneath the headline: a thick rounded-cap glowing [SOLID COLOR or LEFT-TO-RIGHT GRADIENT] horizontal underline bar.

3. ARCHETYPE & 3D OBJECTS:
[Describe exact Archetype A-G layout. Specify every 3D rounded chamfered cube with glossy beveled neon edge-rims, sitting on a 2-tier matte-black stepped pedestal with glowing neon trim. Specify the pure white rounded-square (squircle) badge on the front face containing the EXACT supplied reference logo(s) - preserve logo geometry faithfully without altering or inventing shapes. Include exact pill badge text on pedestal riser and clean bold condensed label underneath.]

4. STATUS & FLOW MODIFIERS:
[Specify exact arrows (glowing chevrons >>>, upward neon dashed arrow, downward grey dashed arrow), speed streaks, 3D gold crown, red painterly brush X, red glowing cracks/padlock, or hardware props (dual-fan GPU, silver Mac Mini, DDR5 RAM, glowing laptop) ONLY as needed by the chosen archetype.]

5. LIGHTING & DEPTH:
Studio product-render lighting: crisp 2-3px specular rim highlights on cube bevels and pedestal edges, subtle dark floor reflection beneath pedestals, volumetric radial color bloom behind hero subjects, deep contact shadows, zero muddy midtones, zero watermark, zero extra unrequested text.

6. NEGATIVE CONSTRAINTS:
Do NOT invent extra numbers, logos, text, watermarks, UI chrome, or unrequested characters. Keep every word spelled identically to the prompt.
```

### Checklist Before Finishing Either Path
- [ ] Aspect ratio matches `video.json` (`1280x720` for `16:9`, `1080x1920` for `9:16`) unless explicitly overridden.
- [ ] Saved inside `workspaces/<slug>/thumbnails/` and recorded in `workspaces/<slug>/thumbnails/manifest.json`.
- [ ] For A/B requests, Title A and Title B were generated one by one with zero cross-contamination.
- [ ] Every brand logo is authentic (fetched via `scripts/fetch_logo.py`) and legible inside its container.
- [ ] Every word/stat on the thumbnail is 100% grounded in the video topic/title (zero hallucinated numbers).
- [ ] Visually inspected via `read_file` at full image view: zero text clipping, zero misspelled words, strong contrast even at thumbnail scale.
