# Motion Explainer Thumbnail Samples - Senior Designer Forensic Notes

**Perspective:** 17+ years YouTube Packaging & Visual Systems Design
**Dataset:** 81 reference thumbnails (`Thumbnail.jpg` and `Thumbnail (1).jpg` - `Thumbnail (80).jpg`), native `1280x720` (16:9)

---

## 1. The Core Visual DNA (Why This System Wins Clicks)

Across all 81 samples, this channel does not treat thumbnails as illustrations. It treats every thumbnail as a **high-contrast 3D editorial infographic** engineered to be understood in **< 0.4 seconds** at mobile feed scale (~168px wide).

1. **Zero-Noise Void Sky (`#000000`):** The top 38-45% of the canvas is pure pitch black. No gradients, no gridlines, no ambient fog behind the headline. Text achieves maximum luminance contrast (> 18:1 for white, > 8:1 for neon accents).
2. **Perspective Dot-Matrix Floor with Color Spill:** The bottom 25-35% introduces a receding 3D perspective grid of crisp circular dots (`4-6px` foreground tapering to `1-2px` at the horizon). Crucially, **the dots are tinted by the radial light pool of the hero object above them** (e.g., green glow under the left hero cube, red glow under the right compromised/loser cube, or pure cyan/violet under a central hero).
3. **2-Word-to-5-Word Condensed Impact Typography:**
   - **Font Feel:** Ultra-bold, tightly tracked condensed sans-serif (`Impact` / `Anton` / `Oswald Heavy` / condensed `Inter 900`), ALL CAPS (only rare editorial exceptions like `It's Over`, `Half the Price`, `ego lite` for intentional contrast).
   - **Scale:** Primary headline occupies `14-20%` of frame height (`~100-145px` at 720p); optional secondary sub-headline sits at `50-65%` of primary size (`~52-72px`).
   - **Two-Tone Semantic Color Split:** Never make an entire headline one flat color. Split into **Pure White (`#FFFFFF`)** + **1 Hero Accent Color** (neon blue `#1E90FF`/`#38BDF8`, lime/emerald `#22C55E`/`#A3E635`, crimson `#FF3B30`, orange `#F97316`, purple `#A855F7`, or gold `#FACC15`).
   - **Painterly Red Brush Strikethrough:** Defeated/obsolete terms (`OPUS`, `128GB`, `5060 TI`, `AGENCY`, `OLLAMA`, `501B`, `TRAINING`, `125B`, `GPU`, `SUBSCRIPTIONS`, `BILLS`, `LLMs`, `15s`, `HAND-TUNING`, `CIVILIZATION`) are rendered in **muted slate-grey (`#787D85`)** or white and crossed out with an **organic textured crimson paint slash (`#FF2222`)** angled `-6deg` to `-10deg` with tapered bristles.
   - **Thick Rounded Underline Bar:** 65% of the thumbnails anchor the headline block with an `8-12px` rounded-cap horizontal rule (`#22C55E`, `#FF3B30`, `#38BDF8`, `#F97316`, `#A855F7`) or a smooth **left-to-right dual-color gradient bar** matching the left and right subjects below (`Thumbnail (11)`, `(20)`, `(28)`, `(74)`).
4. **The Signature 3D Chamfered Cube + White Squircle Logo Badge:**
   - **Geometry:** Slightly rotated isometric/3-quarter rounded cube (`18-24px` chamfered corner radius), showing top face (brightest ambient specular), front face (hero focal plane), and side face (deepest shadow + rim edge).
   - **Edge Specular & Rim Light:** Every lit cube has a razor-sharp `2-3px` bright neon rim highlight along its bevels plus a soft outer bloom (`35-70px` Gaussian glow).
   - **White Squircle Logo Container:** Brand logos NEVER float raw on colored cubes where contrast could muddy. Instead, the front face carries a crisp **pure white (`#FFFFFF`) rounded square (`border-radius: ~18%`)** housing the authentic official brand mark at full contrast. (Exceptions: dark obsidian cubes with glowing neon wire-rims where high-contrast white/colored logos sit directly on `#111418`, e.g., `Thumbnail (20)`, `(49)`, `(53)`, `(79)`).
5. **2-Tier Stepped Neon Pedestal:**
   - Cubes and hardware sit on a 2-tier chamfered matte-black plinth (`#12151B` / `#1A1E26`).
   - **Active/Winner Pedestal:** Both tiers (or upper lip) trace a crisp neon glowing rim line matching the cube's semantic hue, often with a **pill badge** (`$1`, `$$$`, `125 TOK/S`, `FREE`, `27¢ A SHOOT`, `448 GB/s`, `2.8T PARAMS`) or bold condensed text on the lower riser.
   - **Defeated/Loser Pedestal:** Single lower tier, smaller scale (`~65-75%` of winner), matte dark grey, **zero neon rim**, muted grey label.
6. **Status & Motion Modifiers (Instant Narrative Read):**
   - **Victory / Superiority:** Gold 3D crown tilted slightly on top corner, upward glowing dashed arrow (`up-arrow`), radial starburst rays behind the hero cube, horizontal speed-lines (`>>>` or motion streaks).
   - **Defeat / Decline:** Matte charcoal cube (`#242830`), dimmed/desaturated logo, painterly red brush `X` (or red circle-X badge), downward grey dashed arrow.
   - **Security / Breach / Damage:** Cracked obsidian cube with glowing crimson magma fissures, flying cube corner shards, glossy 3D red padlock (open = leaked/hacked, chained = locked/banned), escaping golden keys (`Thumbnail (72)`).
   - **Flow / Transformation:** 3 glowing chevrons (`>>>`), curved dashed/dotted particle streams (`Thumbnail (15)`, `(18)`, `(24)`), or a glowing central `+` / `>` / `≈` / `VS` operator.

---

## 2. Semantic Color & Contrast Rules

| Hue | Primary Hex Range | Semantic Meaning in Samples | Typical Pairings |
|---|---|---|---|
| **Electric Blue / Cyan** | `#007BFF` -> `#38BDF8` | Google/DeepMind, DeepSeek, Kimi K3.1, PS5, Local AI, Architecture/Order | Paired vs Red (conflict) or Green (winner) or Orange (Claude) |
| **Neon Green / Lime** | `#16A34A` -> `#A3E635` | Speed/Throughput Winner, Budget King, Savings (`$1`, `FREE`), Nvidia RTX, Kling 4.0, Open Source Win | Paired vs Crimson Red or Muted Charcoal Grey |
| **Crimson Red** | `#EF4444` -> `#FF2424` | Failure, Breach, Hack, Bans, High Cost (`$$$`), Nerf, Strikethroughs, `X` Marks | Dominant on security/failure scenes or right-hand loser side |
| **Anthropic Orange** | `#EA580C` -> `#FF6B00` | Claude / Sonnet / Opus / Fable, Rust (Ferris crab), Website/Design Tools | Paired vs Crimson (cost/nerf) or Blue (Kimi/Google) |
| **Electric Violet / Purple** | `#7C3AED` -> `#A855F7` | Qwen, Tokens/Memory Compression, Reasoning/Brain, NCM, Ripple 65B | Paired vs Charcoal Grey or Crimson |
| **Amber / Gold** | `#EAB308` -> `#FACC15` | Linux Tux (`#FACC15`), Gold Crown, Keys, Evals Highlight, Flames | Paired with Dark Charcoal + Red |
| **Matte Charcoal** | `#1B1F26` -> `#2A2F3A` | Loser / Replaced / Baseline / Unoptimized Hardware | Always paired against a brightly lit hero hue |

**Contrast Law:** Never put two identical saturation levels side-by-side in a comparison thumbnail. The winner MUST have higher elevation (larger pedestal + larger cube), brighter specular rim, saturated color + radial bloom, and clean lighting; the loser MUST be smaller, lower, desaturated/matte, and unlit.

---

## 3. The 8 Core Composition Archetypes

1. **Archetype A - Asymmetric Winner vs. Loser (`A > B`):**
   - Left 55% (or Right 55%): Large glowing hero cube/hardware on 2-tier neon pedestal, crown/speed-lines/up-arrow, bright pill badge.
   - Center: Bold `>` or `→` or curved downward arrow.
   - Right 35%: Smaller unlit dark cube/hardware on flat pedestal, red brush `X`, down-arrow.
2. **Archetype B - Symmetric Head-to-Head (`A VS B` / `A ≈ B` / `A + B`):**
   - Equal-height lit pedestals left and right with distinct contrasting colors (e.g., Green vs Red, Blue vs Purple, Orange vs Blue), bold `VS` / `≈` / `+` center operator, dual-gradient underline bar above.
3. **Archetype C - Left-to-Right Pipeline / Funnel (`Input -> Engine -> Output`):**
   - 3 horizontal stages linked by `>>>` chevrons or dotted particle arcs: Source stack/file -> Brand Processor Cube -> Target grid/card/result.
4. **Archetype D - Central Hero + Orbiting / Multi-Target Ecosystem:**
   - Center hero cube on double pedestal with 4-8 pill nodes on concentric orbital rings (`Thumbnail (32)`), OR central cube feeding 4 corner cards (`Thumbnail (16)`), OR central hero flanked by smaller dim competitors (`Thumbnail (37)`).
5. **Archetype E - Hardware / Device Showcase:**
   - Photorealistic/3D-illustrated hardware (Dual-fan GPU, Mac Mini/Studio, Nvidia DGX Spark, DDR5 RAM stick, Glowing-bezel Laptop, Smartphone, PS5, Gaming PC tower) mounted on pedestals or flanked by glowing price/VRAM tags.
6. **Archetype F - Multi-Cube Lineup / Mass Failure Row:**
   - 3 to 5 uniform cubes arranged horizontally across the lower half-either cracked/chained (`Thumbnail (57)`), all red-X'd (`Thumbnail (30)`, `(61)`), or stacked 2x4 (`Thumbnail (77)`).
7. **Archetype G - Evidence / UI / Chart / Split-Screen Frame:**
   - Large rounded glowing container holding a 480p-vs-4K split (`Thumbnail (13)`), benchmark leaderboard card (`Thumbnail (27)`), X/Twitter post card (`Thumbnail (64)`), or laptop forecast chart (`Thumbnail (66)`).
8. **Archetype H - Editorial Portrait / Metaphor Scene:**
   - Founder/exec portraits with opposing rim-lights (`Thumbnail (24)`, `(47)`), 3D/cartoon metaphor (caged cube `(12)`, sliced strawberry `(60)`, purple brain `(31)`, voxel robots `(46)`).

---

## 4. Per-Sample Breakdown (All 81 Reference Thumbnails)

| File | Headline & Subline | Colors | Archetype | Key Visual Elements & Designer Takeaway |
|---|---|---|---|---|
| `Thumbnail.jpg` | **NEW BUDGET KING!** | White + Lime Green | A (Winner > Loser) | Giant lime `MAGI-2` cube with gold 3D crown > small dim blue `SEEDANCE 2.5` cube, white `>`, grey down-arrow. Classic crown + scale hierarchy. |
| `Thumbnail (1).jpg` | **107 CHATS -> 16 TOKENS** / WHAT GETS LOST? | White + Violet + Red | C (Pipeline) | Stacked chat slabs -> purple rim-lit `Stanford` cube -> 4x4 glowing purple token grid + red `?`. `MEMORILLA` bottom label. |
| `Thumbnail (2).jpg` | **MAKE MONEY WITH HIGGSFIELD** | White + Emerald | C (Pipeline) | Lime `Higgsfield` cube (`27¢ A SHOOT`) `>>>` glowing emerald `$` cube + large green up-arrow. Clear monetization arrow. |
| `Thumbnail (3).jpg` | **STOP RECORDING!** / 430+ VIDEOS, NO MIC | Red + White + Emerald | C (Pipeline) | Dark mic cube with red circle-X `>>>` glowing green waveform logo cube. Clean before/after workflow swap. |
| `Thumbnail (4).jpg` | **JEV > ~~OPUS~~?** / 30,000 CHECKS FOR $1 | Pink + Red + White + Green | A (Winner > Loser) | Large dark `Claude` cube (`$$$`) -> pink arrow -> glowing pink `JEV` cube (`$1`) + green up-arrow. Inverted left-to-right upgrade arrow works great when text puts winner first. |
| `Thumbnail (5).jpg` | **AI IMPROVES ITSELF** | White + Electric Blue | D (Hero Orbit) | Glowing blue `Google` cube circled by bright cyan self-loop arrow; 3 dim floating dark cubes (`NEON`, `ARGON`, `CARBON`). |
| `Thumbnail (6).jpg` | **WHO PATCHES THIS?** | White + Red | C (Funnel) | Red-rimmed `Claude` cube (`MYTHOS`) `>>>` grey funnel packed with red bug icons -> single green droplet checkmark (`629 PATCHED` vs `5,087 BUGS FOUND`). |
| `Thumbnail (7).jpg` | **ORDER MATTERS** | White + Cyan | C (3-Stage Sequence) | 3 equal blue-rimmed cubes on one shared long pedestal: `Git` -> `GitHub (CI)` -> `Docker`. Clean unified platform base. |
| `Thumbnail (8).jpg` | **I WISH I KNEW THIS..** / LINUX, EXPLAINED PROPERLY.. | White + Amber Gold | C (Chaos -> Order) | Tangled grey cable pile of distro/tool pills (`WAYLAND`, `GLIBC`, `GRUB`, `SYSTEMD`, `FLATPAK`, `DOCKER`) + `?` -> glowing gold `Tux` cube -> clean yellow bracketed stack (`KERNEL`..`APPS`). |
| `Thumbnail (9).jpg` | **32GB > ~~128GB~~** | Lime + White + Red slash | E + A (Hardware > Hardware) | RTX 5090 on green neon pedestal (`78 TOK/S`) + green up-arrow vs smaller DGX Spark (`15 TOK/S`) + grey down-arrow. |
| `Thumbnail (10).jpg` | **RTX 2080 TI > ~~5060 TI~~** | Lime + White + Red slash | E + A (Hardware > Hardware) | Silver/green-rimmed RTX 2080 Ti with gold crown & speed streaks (`2018`, `$270 USED`) vs matte black 5060 Ti (`2025`, `$800 NEW`). |
| `Thumbnail (11).jpg` | **$1,898 VS $13,100** / SAME 64GB VRAM | Emerald + White + Red | B (VS) | Dual-color green/red underline bar. Green-rimmed `Intel Arc` cube (`2X ARC B70`) `VS` red-rimmed `Nvidia` cube (`2X RTX 5090`). |
| `Thumbnail (12).jpg` | **AI TRAPPED BY JUNK** | White + Red | A (Trapped vs Free) | Red-lit 3D iron cage locking a dark `REA` cube with padlock vs bright green `</>` cube (`YOUR APP`) with green checkmark. |
| `Thumbnail (13).jpg` | **AI VIDEO HIT 4K** | White + Emerald | G (Split Frame) | Giant emerald-bordered rounded window split down center: pixelated `480P` landscape vs razor-sharp `4K` landscape with matching pill tags. |
| `Thumbnail (14).jpg` | **RUN 400B+ LOCALLY** / ON 4GB VRAM • FULL MODEL | White + Green | E + A (Model + GPU) | Large green `Kimi K3` cube (`2.8T PARAMS`) beside compact dual-fan GPU (`4GB ALL IT NEEDS`). Scale contrast implies giant model fitting tiny GPU. |
| `Thumbnail (15).jpg` | **NO SLOP WEBSITE** | White + Orange | E (Cube -> Laptop) | Glowing orange `Claude` cube (`FABLE 5.2`) feeding dotted orange light streams into a glowing-bezel MacBook showing a clean hero website. |
| `Thumbnail (16).jpg` | **LOCAL ≠ PRIVATE** | White + Red | D (Center + 4 Nodes) | Red-rimmed dark `Apple` cube (`MACOS`) on glowing red pedestal wired by red dashed lines to 4 corner white user-tile diamonds. |
| `Thumbnail (17).jpg` | **321B ON 1 GPU** | Lime + White | B (`A + B` Synergy) | Anodized Nvidia GPU-styled cube (`24GB GPU`) `+` white/blue-rimmed `Z` cube (`GLM-5.3-FLASH`) sharing one wide green-rimmed pedestal. |
| `Thumbnail (18).jpg` | **NO ~~AGENCY~~ NEEDED** | White + Red slash + Orange | C (Photo -> Cube -> Ads) | Shoe photo -> orange `Claude` cube (`FABLE 5.2`) -> 3 angled glowing-orange ad poster mockups (`NOVA`, `RUN`, `SPEED`). |
| `Thumbnail (19).jpg` | **RUN DEEPSEEK LOCALLY** / ON A 16GB GPU • 2X FASTER | White + Electric Blue | E (Cube + GPU) | Glowing blue `DeepSeek` cube (`266GB MODEL`, `V4.1 FLASH`) beside dual-fan GPU (`16GB`, `RTX 5070 TI`). |
| `Thumbnail (20).jpg` | **DEEPMIND DID THE IMPOSSIBLE** | White + Blue->Green | B (Bridge) | Blue `Google DeepMind` cube (`AI AGENTS`) -> `6.5M LINES OF PROOF` pill + blue `>>>` -> green `Signal` cube (`SIGNAL`) with green checkmark badge. |
| `Thumbnail (21).jpg` | **APPLE > ~~OLLAMA~~?** | White + Red slash | E + A (Hardware > Cube) | Silver Mac Studio on white-glowing pedestal (`HARBOR`) + white up-arrow vs dark `Ollama` cube with red brush `X` + down-arrow. |
| `Thumbnail (22).jpg` | **LOCAL AI ON A ~~GPU~~ TPU?** | White + Red slash + Blue | B (VS) | Green-lime `Nvidia` cube (`32GB`) `VS` larger electric-blue `Google` cube (`288GB`). Dual green->blue underline bar. |
| `Thumbnail (23).jpg` | **DON'T DITCH 12GB** / QWEN 3.8 27B | White + Emerald | C (Cube -> GPU) | Violet `Qwen` cube (`27B MODEL`) -> violet arrow -> green-rimmed dual-fan GPU (`12GB` chamfered badge, `YOUR GPU`). |
| `Thumbnail (24).jpg` | **YOUR MOVE, NVIDIA.** | White + Blue->Green | H (Exec Portrait) | Sundar Pichai (blue rim light) + blue `Google` cube (`TPU 8i MAX`) vs dark `Nvidia` cube + skeptical Jensen Huang (green rim light). |
| `Thumbnail (25).jpg` | **SHORTS ON AUTOPILOT** | White + Orange | E (Cube -> 3 Phones) | Orange `Claude` cube (`/shorts-studio`) shooting dotted orange streams into 3 cascaded glowing-orange vertical Shorts phone mockups. |
| `Thumbnail (26).jpg` | **~~24~~ -> 48 TOK/S** / ONE FLAG. SAME GPU. | Grey/Red slash + Orange + White | E (Cube + GPU) | Tilted orange `llama.cpp` cube with speed streaks (`--MOE-CACHE-CPU-SHARE`) beside dual-fan `8GB GPU`. |
| `Thumbnail (27).jpg` | **CLAUDE BEAT THE EXPERTS.** | White + Orange | G (Leaderboard Card) | Tilted dark UI panel (`QWEN 27B • 8 GB QUANT`) with glowing orange winner row (`Sonnet 5.5 | 68.7%`) over dim `Expert File | 65.3%`. |
| `Thumbnail (28).jpg` | **AI VIDEO IS INSANE** | Orange + White | H (Creator + 4 Frames) | Faceless black-hoodie creator doing "shhh" gesture centered in front of 4 orange-rimmed cinematic robot scenes. |
| `Thumbnail (29).jpg` | **~~284B~~ LOCALLY / NO ~~GPU~~ NEEDED** | White + Blue + Red slash | E (Laptop + RAM) | Glowing blue MacBook (`DEEPSEEK V4 FLASH`) beside DDR5 RAM stick mounted on blue `64GB RAM` pedestal. |
| `Thumbnail (30).jpg` | **135 AI PAPERS / 0 PASSED** | White + Red | F (5-Cube Failure Row) | 5 matte black cubes in a row (`OpenAI`, `Claude`, `DeepSeek`, `Kimi`, `GLM`), every single one slashed with a bold red brush `X`. |
| `Thumbnail (31).jpg` | **FACTS? GONE.** | White + Red | H (Brain Metaphor) | Cartoon gloved hand lifting a puzzle slice out of a purple 3D segmented brain with `?` thought bubble and `Qwen` badge. |
| `Thumbnail (32).jpg` | **NOBODY EXPLAINS THIS** | Violet + White | D (Center + 8 Orbit Pills) | Central glowing violet `LOCAL AI` cube connected via dotted spokes to 8 glowing oval pills (`TOKENS`, `PARAMETERS`, `QUANTIZATION`, `KV CACHE`, `CONTEXT`, `BANDWIDTH`, `MoE`, `MTP`). |
| `Thumbnail (33).jpg` | **DON'T BUY YET.** | Red + White | E (3-Way Hardware) | Apple Mac Studio (`$899`) vs central green-lit open glass PC tower (`FREE`) vs vertical GPU (`$1,500`). Scale & glow isolate the middle winner. |
| `Thumbnail (34).jpg` | **LESS MEMORY WINS** | Orange + White | A (Winner > Loser) | Glowing orange `Claude` cube (`1 PAGE`) with speed-streaks + up-arrow vs smaller dark `Claude` cube with red `X` (`413 FILES`) + down-arrow. |
| `Thumbnail (35).jpg` | **8% -> 48%** / NO ~~TRAINING~~ NEEDED | Grey + Violet + White + Red slash | A/C (Loop Boost) | Small grey `GPT-6 ASTRA` cube -> dashed arrow -> glowing violet `Qwen 0.8B` cube inside a segmented circular red/grey loop ring. |
| `Thumbnail (36).jpg` | **MOST HATED LINUX DISTRO?** | White + Red | D (Converging Attacks) | Central lime `Omarchy 4.5` cube targeted from all 7 angles by crimson dashed arrows. |
| `Thumbnail (37).jpg` | **65B BEATS ~~501B~~ AT CODING** | Violet + White + Red slash | A (Single Hero) | Single centered violet cube with golden 3D crown (`RIPPLE 65B`), upward violet arrow + streaks. |
| `Thumbnail (38).jpg` | **RUN 27B, NOT ~~125B~~.** / SAME ANSWERS, 6X FASTER | White + Violet + Red slash | E (Cube on Mac Mini) | Glowing violet `Qwen` cube resting directly atop a silver `32GB Mac Mini`, violet up-arrow + speed lines. |
| `Thumbnail (39).jpg` | **1,000 ROOT BUGS IN YOUR LINUX** | Red + White | C (Swarm -> Cracked Cube) | 3D array of white OpenAI swarm cubes firing red beam dots into a dark cracked `Linux Kernel` cube with glowing red fissures and open red padlock. |
| `Thumbnail (40).jpg` | **NOT EVEN CLOSE.** | White + Red | E + A (Hardware vs Cube) | 3 small hardware items on left (Mac Mini, DGX Spark, GPU) each topped with a giant red brush `X` vs giant blue `Kimi K3.1 Pro` (`1.56 TB`) cube. |
| `Thumbnail (41).jpg` | **BUY RAM, NOT ~~GPU~~.** | White + Green + Red slash | E (Hardware Contrast) | Left: GPU tossed into a cardboard shipping box. Right: massive glowing green `DDR5` RAM stick on neon pedestal. |
| `Thumbnail (42).jpg` | **USA BANS AI** / DO NOTHING. WIN. | White + Red | H (Cartoon Leaders) | Left: distressed Trump (blue glow) clutching head; Right: smiling Xi (red glow) sipping tea with thought bubble `DO NOTHING. WIN.` |
| `Thumbnail (43).jpg` | **GOD OF HARNESSES** | White + Red | D (Crowned Center + 4) | Center crowned glowing blue `DeepSeek` cube on tall double pedestal with blue rays + up-arrow, flanked by 4 small dark unlit harness cubes (`Claude`, `OpenAI`, `Hermes`, `Factory`). |
| `Thumbnail (44).jpg` | **DON'T MAX EFFORT.** | Red + White | A (Winner > Loser) | Glowing orange `Claude` cube (`$193`, `MEDIUM`) with up-arrow vs dim grey `Claude` cube with red `X` (`$817`, `MAX EFFORT`) + down-arrow. |
| `Thumbnail (45).jpg` | **GOODBYE ~~OLLAMA~~?** / ONLY FOR RTX 50 | White + Red slash + Lime | A (Winner > Loser) | Giant lime-rimmed `Nvidia` cube (`NVIDIA FLARE`) + huge lime up-arrow + floor reflection vs smaller dark `Ollama` cube with red `X` + down-arrow. |
| `Thumbnail (46).jpg` | **~~CIVILIZATION~~ PAPERWORK** / 50 AI AGENTS | White + Red slash + Orange | H (Voxel/Minecraft) | Queue of 4 voxel robot workers holding papers approaching a `Y Combinator` voxel grass desk where a stamped robot sits beside a giant paper tower. |
| `Thumbnail (47).jpg` | **I JUST NEED ONE.** | White + Lime | H (Portrait + Cartoon) | Photorealistic grinning Sam Altman hoarding a giant pile of GPUs (`THEM`) while a tiny cartoon dev holding an empty wallet begs for one green-rimmed GPU (`ME`). |
| `Thumbnail (48).jpg` | **UNCENSORED ≠ LOYAL** | Red + White | F (3-Cube Lineup) | 3 equal glossy cubes (`GLM`, `QWEN`, `DEEPSEEK`) with red horizon glow behind them and crisp mirror reflections on the dark dot floor. |
| `Thumbnail (49).jpg` | **24GB IS ENOUGH?** | Green + White | E (Hardware Comparison) | Left: Mac Studio + DGX Spark with crossed-out price tag `$3K-$7K`. Right: large angled silver/black RTX GPU on green neon pedestal with `24GB ✓` tag. |
| `Thumbnail (50).jpg` | **1 BRIEF -> 8 ASSETS** | Peach/Teal Gradient + White | C (Flat Clean Diagram) | Clean dark rounded cards: `Claude Code` + doc icon `->` `Flova.ai` `->` 2x4 grid of 4 video + 4 image icon tiles. Flat minimalist variant. |
| `Thumbnail (51).jpg` | **NERFED ON PURPOSE?** | Red + White | A (Upgrade/Nerf Arc) | Large glowing green `Nvidia` cube (`NVIDIA`) firing a thick downward red curved arrow (`-50% AI`) onto a smaller red-rimmed `YOUR GPU` cube. |
| `Thumbnail (52).jpg` | **NEVER DEPLOY ON FRIDAY.** | White + Lime | E + H (Disaster Scene) | Left-to-right smoking server rack (red alert LED), laptop showing collision arrows, red `DEPLOY` panic button, and huge flaming lime `Higgsfield` icon. |
| `Thumbnail (53).jpg` | **HOW MANY R's?** | White + Red | H (Minimalist Icon + Pills) | Giant red strawberry sliced cleanly into 3 vertical segments over 3 dark pill counters (`496`, `675`, `15717`) on pure black. |
| `Thumbnail (54).jpg` | **ego lite > ~~THE REST~~** | Electric Blue + Grey/Red slash | A (1 vs 3) | Tall glowing blue `ego lite` cube (`FREE`) with gold crown + blue up-arrow vs 3 small dark cubes (`Claude in Chrome`, `Codex`, `Browser Harness`) + down-arrow. |
| `Thumbnail (55).jpg` | **BAN "OPEN" AI** | Red + White | F (Chained Lineup) | 4 dark red-rimmed cubes (`KIMI`, `QWEN`, `DEEPSEEK`, `Z AI`) bound together across the front by heavy metallic chains and a glowing red center padlock. |
| `Thumbnail (56).jpg` | **It's Over** / No More CUDA | White + Red Pill | A (Winner > Loser) | Rounded bold type (`It's` + tilted red box `Over`), dashed arrow pointing to right dark `CUDA` cube with red `X`; glowing blue `Google` cube `>` `CUDA`. |
| `Thumbnail (57).jpg` | **GOODBYE ~~15s~~** / 30s • ONE TAKE | White + Red slash + Lime badge | A (Version Upgrade) | Large lime-rimmed dark `KLING 4.0` cube (`30s`) with lime up-arrow + mini `Higgsfield` corner cube vs smaller grey `KLING 3.0` (`15s`) + down-arrow. |
| `Thumbnail (58).jpg` | **AI BREACHED 100+ COMPANIES** | White + Red | C (Attacker -> Cracked Targets) | Left glowing blue `DeepSeek Agent` (`$50 EACH`) firing 3 red dashed laser arrows into 3 cracked dark enterprise cubes (`John Deere`, `SharkNinja`, `Cummins`) with glowing red fractures. |
| `Thumbnail (59).jpg` | **GPT SOL JUST LOST** / TO A 35B MODEL | White + Red + Green | A (Winner > Loser) | Bright green `SAGE` cube (`SAGE 35B`) with starburst rays + green up-arrow, gold crown flying from right small dark `OpenAI` cube (`GPT SOL`) with red `X`. |
| `Thumbnail (60).jpg` | **RUST FOR AGI?** | Orange + White | G + H (Tweet + Mascot) | Left tilted white X post card (`Elon Musk @elonmusk: "Rust"` highlighted yellow) beside 3D glowing orange Ferris crab on pedestal. |
| `Thumbnail (61).jpg` | **OPUS-LEVEL? BUT HOW?** | Orange + Blue | B (Cutaway Reveal) | Orange-rimmed dark `Opus 5.5` cube `≈` blue-rimmed `Kimi K3.1 Pro` cube featuring a **3D internal cutaway** of tiny voxel blocks hit by a blue laser beam. |
| `Thumbnail (62).jpg` | **2X FAST AI TRAINING** | Violet + White | D (Single Cube Loop) | Centered violet-rimmed dark `Qwen` cube framed by two curved purple cycle arrows on a purple dot-matrix floor. |
| `Thumbnail (63).jpg` | **10X FASTER THAN QWEN** | Emerald + White + Violet | A (Speed Winner) | Bright emerald `FLINT` cube (`125 TOK/S`, `FLINT 40B`) blasting green speed-streaks left vs unlit grey `Qwen` cube (`13 TOK/S`, `QWEN 3.8 27B`). |
| `Thumbnail (64).jpg` | **PREDICTS THE FUTURE** / NO ~~GPU~~ NEEDED | White + Orange + Red slash | E (GPU X + Laptop Chart) | Left: GPU with giant red `X` (`NOT NEEDED`). Right: orange-rimmed laptop displaying `Mistral` logo + `NOW | TOMORROW` glowing orange forecast cone chart. |
| `Thumbnail (65).jpg` | **Half the Price** | Red Pill + White | A (Winner > Loser) | Bold rounded type (`Half` in tilted red pill, dashed arrow to cube). Glowing blue `Kimi K3.1 Pro` cube `>` dim dark `Opus 5.5` cube. |
| `Thumbnail (66).jpg` | **CHINA PULLS AHEAD?** | Red + White | A/C (Cracked vs Flagged) | Left: heavily cracked obsidian cube housing 2x2 grid of US AI logos (`OpenAI`, `Claude`, `Gemini`, `Grok`) + red `?` price tag `>>>` glowing emerald `Z` cube (`GLM-OMNI`) topped with Chinese flag. |
| `Thumbnail (67).jpg` | **10 MORE REPOS / KILL ~~SUBSCRIPTIONS~~** | Green + White + Red + Red slash | C (1 Free vs 4 Paid) | Glowing green-rimmed `GitHub` cube (`FREE`) blasting green arrow into 2x2 grid of 4 dark cards (`Postman $19/mo`, `Jira $7.91/mo`, `Sentry $26/mo`, `Loom $18/mo`) each marked with red `X`. |
| `Thumbnail (68).jpg` | **WHO WON?** | White + Lime Pill | B (VS) | High-gloss blue `KLING 4.0` cube `VS` violet `WAN 3.0` cube on neon pedestals with mirror floor reflections and small lime `Higgsfield` cube centered below `VS`. |
| `Thumbnail (69).jpg` | **THE INTERNET'S WORST DAY** / 4 FAILURES IN 72 HOURS | White + Red | F (4 Cracked Cubes) | 4 dark obsidian cubes (`PHP`, `Node.js`, `Python`, `SSL Cert`), each with glowing red magma corner crack AND bold red brush `X`. |
| `Thumbnail (70).jpg` | **RIP API ~~BILLS~~?** | Red + White + Red slash | A (Winner > Loser) | Glowing blue `DeepSeek` cube (`$0.003`) + blue up-arrow vs small dark brushed-metal cube (`$0.15`) backed by floating paper bills + down-arrow. |
| `Thumbnail (71).jpg` | **~~HAND-TUNING~~ IS OVER?** | White + Red slash + Blue | A (4-Pack X vs 1 Hero) | Left: 2x2 stack of 4 dark agent cubes (`Claude Code`, `Codex`, `Hermes`, `Muse`) crossed by one huge red `X` (`HAND-TUNED HARNESS`) `>>>` glowing blue `Google` cube (`+11.5`, `GOOGLE HARNESS^2`) with cycle arrows + blue up-arrow. |
| `Thumbnail (72).jpg` | **YOUR NEXT AI SKILL** | White (Pixel/Arcade) | D (Skill Tree) | Pixel font + dark skill-tree nodes: `</>` root branching to dim `HARNESS` vs glowing gold `EVALS` node clicked by a pixel cursor hand. |
| `Thumbnail (73).jpg` | **OPENCODE GOT HACKED** | White + Red | H/F (Cracked Breach) | Single centered dark `OpenCode` cube with red rim, glowing red side cracks, open red padlock, and 5 glowing golden keys flying out of the broken corner. |
| `Thumbnail (74).jpg` | **LOCAL ≠ SAFE** | White + Red | E (Laptop + Red Lock) | Blue-rimmed laptop screen showing 5 local model icons (`Qwen`, `DeepSeek`, `Kimi`, `Z`, `Hermes`) beside a giant glowing crimson unlocked padlock. |
| `Thumbnail (75).jpg` | **RIP ~~LLMs~~?** | Red + White + Red slash | A (Winner > Loser) | Glowing violet `NCM` cube + purple up-arrow vs dark matte `LLM` cube flanked by faded tilted brand tiles (`OpenAI`, `Claude`, `Gemini`, `DeepSeek`) + down-arrow. |
| `Thumbnail (76).jpg` | **LOCAL AI KING?** | Blue Pill + White | E + A (Ranked Trio) | Gold/cyan-crowned PS5 (`448 GB/s`) with radial cyan rays `>` DGX Spark (`273 GB/s`) `>` Mac Mini (`153 GB/s`) on stepped pedestals. |
| `Thumbnail (77).jpg` | **60X CHEAPER?** / FABLE 5 • THEIR TEST | Blue + White | A (Winner > Loser) | Blue `ULTRAMARINE` cube with gold crown + blue rays `>` dark cracked smoking `CLAUDE FABLE 5` cube with crumbling debris shards. |
| `Thumbnail (78).jpg` | **FASTER THAN LLAMA.CPP?** | White + Electric Blue | A (1 vs 7 Cluster) | Left: silver/black `llama.cpp` cube `<` Right: 2-row stepped blue cluster of 7 inference engines (`MEGAKERNEL`, `PolyStrata`, `STRATA PASCAL`, `LAMINA`, `glyd`, `lithos-metal`, `vLLM V620`) labeled `7 ENGINES`. |
| `Thumbnail (79).jpg` | **AI ON THIS?!** | White (Pixel) | E (Single Device) | Centered dramatic studio-lit iPhone angled slightly, displaying bold pixel text `35B MiniCPM-V 4.7` with a pixel pointer arrow `iPhone` on a teal spotlight backdrop. |
| `Thumbnail (80).jpg` | **YOUR AGENT NEEDS GIT** / GITHARNESS | White + Orange | B (`A + B` Synergy) | Orange-rimmed dark coding-agent pixel mascot cube (`CODING AGENT`) `+` orange-rimmed `Git` cube (`VERSION CONTROL`). |

---

## 5. Key Rules for 99% Sample Fidelity

1. **Always ground text in the real video topic/title.** Never invent benchmark numbers, model versions, prices, or brand claims not present in the user's title, script, or `video.json`.
2. **Never hallucinate logos.** Fetch official SVGs/PNGs via `python scripts/fetch_logo.py <brand> --project <slug>` first and place them inside the crisp `#FFFFFF` squircle badge on the cube face (or dark badge when monochrome white).
3. **Obey the 4-Element Ceiling:** At mobile thumbnail scale, more than 1 headline + 1 underline + 2 primary visual anchors (or 1 structured cluster) causes visual collapse. Keep headlines to 2-6 punchy words.
4. **Enforce Value & Scale Asymmetry:** In comparison thumbnails, the hero must be physically larger (~1.25x-1.4x), brighter (neon rim + bloom + elevated 2-tier pedestal), and higher contrast than the defeated subject.
5. **Respect Aspect Ratio:**
   - **16:9 (`1280x720`)**: Top 38% headline band, bottom 62% stage with horizontal comparison/pipeline flow.
   - **9:16 (`1080x1920`)**: Top 160px mobile safe pad, upper-middle condensed headline + underline bar, vertical stacked hero-over-comparison (or top-to-bottom pipeline) in the center 55%, bottom 240px Shorts/Reels UI safe pad.
