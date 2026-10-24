# iDevak Video Engine — LLM Prompting & Scene Planning Guide

This guide contains the system prompts, editorial guidelines, and scene-planning rules used by LLMs (Claude, GPT, Gemini) to author high-retention, Fireship-style technical explainer scripts for **iDevak**.

---

## 1. Channel Identity & Signature Taste

### About iDevak
- **Core Pillars:** Cloud Engineering, AI & Automation, DevOps & Infrastructure, Modern Software Development.
- **Motto:** *BUILD. SOLVE. DEPLOY.*
- **Channel Link:** `youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA`
- **Visual Aesthetic:** Futuristic Cyber-Tech — Neon Cyber-Cyan (`#00f0ff` / `#38bdf8`), Deep Space Dark (`#04060b`), Neon Violet/Amber accents, glowing telemetry grids, and holographic HUD overlays.
- **Mascot:** **Devak** — an expressive 2D cyber-engineer character in a dark techwear hoodie with a glowing cyber visor and holographic HUD.

### The "Fireship + iDevak" Blend
Fireship popularized ultra-fast pacing and dry wit, but **iDevak** elevates it with:
1. **Engineering Grounding:** Real RFC numbers, AWS architecture specs, GitHub diffs, and kernel/memory semantics. No shallow buzzwords.
2. **Visual Evidence:** Every beat backed by real terminal outputs, live cloud topology diagrams, documentation browser viewports, and code diffs.
3. **The Devak Mascot:** Reactive emotional reactions that mirror the viewer's surprise, realization, and relief during technical breakdowns.

---

## 2. Narrative Rhythm & Pacing Formula

A successful 1080p video script follows strict time and word-count boundaries:

| Metric | Target Rule |
|---|---|
| **Words per Scene** | **12 to 28 words** (Spoken at ~2.5 to 2.8 words/sec = 4 to 10 seconds per visual). |
| **Pacing** | Cut to a new scene every 4 to 8 seconds. Never hold a static slide longer than 9 seconds. |
| **First 5 Seconds** | **The Cold Open Hook**: State the paradox, catastrophe, or dollar figure immediately. No intro logos, no "Welcome back guys". |
| **The Comic Beat (Meme)** | Drop a meme/punch beat every 40 to 60 seconds to release technical tension. |
| **The Punchline (Mascot)** | Conclude acts or pivotal revelations with a mascot reaction or summary badge. |

---

## 3. Scene Selection Decision Tree

Use this exact decision framework to choose the scene type for each narration beat:

```
What is this beat about?
│
├── 1. Opening hook or major act transition?
│   ├── Video Opening Card ────────────────────────► "cold"
│   └── Act Break / Big Bold Claim ────────────────► "hero" or "statement"
│
├── 2. Primary evidence & documentation?
│   ├── Web page, RFC spec, or AWS/Cloud docs ─────► "webref"
│   ├── Code snippet with highlighted bug ────────► "code"
│   ├── Git commit or patch fix (add/del) ─────────► "diff"
│   └── Shell execution, CLI logs, or crash trace ──► "terminal"
│
├── 3. Architecture & Systems?
│   ├── Cloud pipeline, microservices, AWS/K8s ────► "cloud"
│   ├── Sequential causality chain (A -> B -> C) ──► "flow"
│   ├── Stacked system layers (OS / App / Edge) ───► "stack"
│   └── Chronological incident timeline ──────────► "timeline"
│
├── 4. Data, stats & comparisons?
│   ├── Single shocking number or dollar cost ─────► "stat"
│   ├── Two competing tools (e.g. K8s vs ECS) ─────► "compare"
│   ├── Table of audit findings or CVE severity ───► "ledger"
│   └── Event date or security disclosure date ────► "dateline"
│
├── 5. Reaction, humor & key takeaways?
│   ├── Comic realization, dev blunder, meme punch ─► "meme"
│   ├── Direct takeaway delivered by Devak mascot ──► "mascot"
│   └── Memorable quote from creator or creator rule ► "quote"
│
└── 6. Video conclusion?
    └── Call to Action & channel subscribe ────────► "outro"
```

---

## 4. Scene Type Reference & Meta Specs

### `webref` (Browser & Documentation Spotlight)
*Use when citing official docs, RFCs, GitHub PRs, or CVE advisories.*
```json
{
  "type": "webref",
  "narration": "Section 4.1 of the OAuth specification explicitly forbids storing client secrets inside public client bundles.",
  "eyebrow": "OFFICIAL SPEC",
  "headline": "The RFC Explicitly Warned Us",
  "subline": "RFC 6749 Section 4.1: Authorization Code Grant",
  "meta": {
    "url": "datatracker.ietf.org/doc/html/rfc6749#section-4.1",
    "badge": "IETF RFC SPEC",
    "title": "RFC 6749: The OAuth 2.0 Authorization Framework",
    "snippet": [
      "The client MUST NOT expose its client secret to the user-agent or any public environment.",
      "Any token request originating from an untrusted origin will allow token interception."
    ],
    "highlight": "client MUST NOT expose its client secret",
    "callout": "Leaving secrets in frontend client code compromises the entire authentication tree.",
    "calloutType": "IMPORTANT"
  }
}
```

### `meme` (High-Impact Dev Reaction)
*Use for sarcastic developer reality checks, production blunders, or unexpected turns.*
```json
{
  "type": "meme",
  "narration": "So they pushed the hotfix directly to main on a Friday at 4:55 PM without running CI.",
  "eyebrow": "DEV REALITY",
  "headline": "Testing in Production",
  "subline": "Everyone has a testing environment. Some are lucky enough to have a separate production.",
  "meta": {
    "text": "PUSHED TO MAIN ON FRIDAY",
    "subtext": "CI/CD was just a suggestion anyway",
    "reaction": "SKILL ISSUE",
    "expression": "shocked",
    "punch": true
  }
}
```

### `cloud` (Cloud Architecture & Systems Topology)
*Use for AWS, GCP, Kubernetes, Docker, and distributed microservices pipelines.*
```json
{
  "type": "cloud",
  "narration": "Cloudflare routes traffic through an API Gateway to an ARM64 Lambda, caching session data in Redis before touching Postgres.",
  "eyebrow": "ARCHITECTURE",
  "headline": "The Serverless Request Lifecycle",
  "subline": "Sub-millisecond latency when cached; catastrophic cold starts when cold.",
  "meta": {
    "flow": "EDGE -> ROUTER -> LAMBDA -> CACHE -> DB",
    "nodes": [
      { "k": "EDGE", "t": "Cloudflare", "icon": "⚡", "status": "200 OK" },
      { "k": "GATEWAY", "t": "HTTP API", "icon": "🚪", "status": "HEALTHY" },
      { "k": "COMPUTE", "t": "AWS Lambda", "icon": "λ", "status": "ACTIVE", "hot": true },
      { "k": "CACHE", "t": "Redis", "icon": "⚡", "status": "HIT 98%" },
      { "k": "PRIMARY", "t": "Aurora Postgres", "icon": "🗄️", "status": "3ms" }
    ]
  }
}
```

### `mascot` (Mascot Spotlight Scene)
*Use when Devak delivers an architectural rule, security recommendation, or executive takeaway.*
```json
{
  "type": "mascot",
  "narration": "The takeaway is simple: never grant wildcard permissions to IAM roles, and always enable multi-factor authentication.",
  "eyebrow": "DEVAK'S TAKEAWAY",
  "headline": "The Golden Rule of Cloud IAM",
  "subline": "Least privilege isn't paranoid — it's insurance against a $40,000 AWS bill.",
  "meta": {
    "expression": "solved",
    "bubble": "Wildcard permissions are a zero-day waiting to happen.",
    "badge": "iDevak // BEST PRACTICES",
    "stats": [
      { "label": "SEVERITY", "val": "HIGH", "hot": true },
      { "label": "EFFORT", "val": "2 MIN" },
      { "label": "RESULT", "val": "ZERO TRUST" }
    ]
  }
}
```

### Universal Mascot Overlay on Any Scene
*Add an expressive Devak reaction in the corner of ANY standard scene:*
```json
{
  "type": "code",
  "headline": "The Unchecked Buffer",
  "narration": "Look at line 84: memcpy is called with the user-supplied length parameter directly.",
  "mascot": {
    "expression": "shocked",
    "bubble": "Wait, did they really call memcpy without checking bounds?!",
    "position": "bottom-right"
  },
  "meta": {
    "lines": [
      { "t": "int len = req->content_length;", "k": "code" },
      { "t": "memcpy(dest_buf, req->body, len); // NO BOUNDS CHECK", "k": "hot", "key": true }
    ],
    "file": "handler.c"
  }
}
```

---

## 5. Master LLM Generation Prompt

Copy and paste this prompt when instructing an LLM to generate a complete script:

```markdown
You are the Lead Technical Director and Scriptwriter for the YouTube channel iDevak (Cloud Engineering, AI Automation, DevOps, and Software Architecture). Your task is to write a fast-paced, Fireship-style technical explainer video in the iDevak video engine JSON format (`content/video.json`).

### Tone & Style:
- Fast, punchy, cynical yet deeply technical ("Fireship meets Senior Cloud Architect").
- High information density: cut to a new scene every 4 to 8 seconds (12-28 narration words per scene).
- Use dry humor, relatable dev pain, and accurate system internals.
- No filler words ("In this video", "Hello guys", "Let's dive in"). Start instantly on the cold open.

### Required Scene Composition:
1. Scene 1: Must be "cold" with 1-3 chips and a punchy 1-word ghost text.
2. Narrative core: Use a diverse mix of "code", "terminal", "webref" (for official specs/docs), "cloud" (for infrastructure/pipelines), "diff", and "stat".
3. Mid-video tension relief: Include 1-2 "meme" scenes with `expression: "shocked"` or `reaction: "SKILL ISSUE"` and `punch: true`.
4. Mascot reactions: Attach `"mascot": { "expression": "...", "bubble": "..." }` to 2-3 key technical moments.
5. Takeaway: Use a dedicated "mascot" scene near the end for the key engineering lesson.
6. Final scene: Must be "outro" with channel: "youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA", cta: "Subscribe", ctaSub: "More Cloud & DevOps Autopsies".

Output valid JSON matching the schema documented in `engine/SCHEMA.md`.
```
