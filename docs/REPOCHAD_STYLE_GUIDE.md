# RepoChad Visual Style & Production Guide

This guide specifies the complete **"repochad"** visual identity cloned from RepoChad's high-retention AI & developer hardware explainer videos (such as *"Can We Simply Loop a 4B Model to Beat 27B Models?"*).

---

## 1. Aesthetic DNA: Developer Dark Mode

Unlike generic tech explainer videos with flashing gameplay filler or cartoon stickers, RepoChad uses an **information-dense, developer-first aesthetic** inspired by modern developer platforms like **Linear**, **Raycast**, **Vercel**, and macOS Terminal environments.

### Key Aesthetic Principles
- **Obsidian / Onyx Canvas**: Deep dark background (`#08090c` to `#0d1117`) preventing eye fatigue while making terminal outputs and bright charts pop.
- **Window Chrome & Floating Cards**: Technical demonstrations and terminal outputs are housed inside rounded macOS-style floating window containers with window buttons (traffic lights: red, amber, green) and breadcrumb headers (`llama.cpp // dory-4b-q4_k_m`).
- **High-Contrast Data & Benchmarks**: High-density comparative tables, horizontal benchmark bars, tokens/sec counters, and memory footprints (VRAM) that convey immediate technical credibility.
- **Paper & Document Highlights**: ArXiv research papers and documentation are framed as crisp light or inverted cards featuring live yellow/cyan marker highlight sweeps and red/black forensic redaction tape.
- **Fast, Snappy Motion**: Spring-like ease-out animations (`power3.out` / `expo.out`) that feel immediate and responsive, avoiding slow floats or cinematic camera drifts.

---

## 2. Color Palette & Surface Tokens

| Token | Hex / Value | Purpose |
|---|---|---|
| **Canvas Background** | `#08090c` | Deep obsidian backdrop |
| **Surface Card** | `#121620` | Elevated floating window background |
| **Card Border** | `rgba(255, 255, 255, 0.08)` | Crisp 1px border stroke |
| **Card Shadow** | `0 24px 60px rgba(0, 0, 0, 0.7)` | Deep floating elevation shadow |
| **Primary Accent** | `#00f2fe` / `#38bdf8` | High-voltage neon cyan (primary brand highlight) |
| **Secondary Accent** | `#10b981` / `#22c55e` | Terminal matrix green (speed, efficiency, win) |
| **Warning / Dial Accent** | `#f59e0b` / `#fbbf24` | Electric amber / gold (loops, hardware dials) |
| **Alert / Redaction** | `#f43f5e` | Punchy coral/rose red (failures, memory limits) |
| **Primary Ink** | `#f8fafc` | Crisp off-white text for maximum readability |
| **Dimmed Text** | `rgba(248, 250, 252, 0.65)` | Sublines, captions, descriptions |
| **Faint / Code Gutter** | `rgba(248, 250, 252, 0.35)` | Line numbers, punctuation, inactive tags |

---

## 3. Typography Hierarchy

RepoChad pairs high-legibility geometric sans-serifs with developer-grade monospace fonts:

* **Headlines & Big Numbers**: `Inter`, `Geist`, or `SF Pro Display`
  * Weight: 700 (Bold) / 800 (Extra Bold)
  * Tracking: `-0.03em` (tight letter spacing)
* **Code, Terminals, Metrics & Tables**: `JetBrains Mono` or `Geist Mono`
  * Figures: `font-variant-numeric: tabular-nums` (numbers never jitter during count-ups)
  * Weight: 500 (Medium) / 600 (Semi-Bold)
  * Line Height: `1.4` to `1.5`

---

## 4. Scene Types in RepoChad Style

All 21 native engine scene types work out-of-the-box in `repochad` style, with specialized visual treatments:

1. **`terminal` / `code`**:
   - macOS title bar with three traffic light dots (`#ff5f56`, `#ffbd2e`, `#27c93f`).
   - Breadcrumb badge: `$ llama.cpp --model dory-4b --loops 4`.
   - Streaming token outputs and latency indicators (`tok/s`, `ttft`, `vram`).

2. **`compare` / `matrix`**:
   - Side-by-side model spec comparison (e.g. *Dory 4B (4 Loops)* vs *Gemma 3 27B*).
   - Speed vs VRAM bar graphs with glowing delta pills (`+23% faster`, `saves 18GB VRAM`).

3. **`stat`**:
   - Huge tabular number (e.g., `4B`, `27B`, `16GB`) with animated count-up.
   - Accompanying hardware or benchmark metric label (`SWE-Bench Verified Score`).

4. **`hero` / `statement`**:
   - Direct, bold thesis statement with glowing accent pill and mono eyebrow.
   - Focused card layout with tight technical subline.

5. **`flow` / `cloud`**:
   - Looped transformer architecture and recurrent memory pipeline.
   - Step-by-step token routing with glowing directional arrows.

---

## 5. Scriptwriting & Prompting Direction for RepoChad

When prompting LLMs to author scripts for `repochad` videos:

- **Tone**: Analytical, direct, practical, and grounded in engineering realities. Speak like an experienced developer testing models on real hardware.
- **Structure**:
  1. **The Hook / Reality Check**: Start with a concrete experiment or surprising benchmark result (*"Can a 4-billion parameter model running in 8GB of VRAM actually beat a 27-billion parameter beast?"*).
  2. **The Mechanism**: Explain the engineering breakthrough (*"Weight reuse via latent recurrence: looping tokens through shared layers at inference time"*).
  3. **The Evidence & Benchmarks**: Show real benchmark numbers (SWE-Bench, GPQA, MMLU), generation speed (tok/s), and memory usage.
  4. **The Trade-Offs**: Disclose the downsides honestly (latency penalties, factual retrieval ceilings).
  5. **The Verdict**: Clear recommendation for developers and self-hosters.
