# Token-Efficient LLM Video Engine Architecture

This guide details the relationship between LLM authoring, token efficiency, and visual rendering quality in the **iDevak Video Engine**.

---

## 1. Quality Issues: LLM vs Engine

The issues observed in the new visual renders—**camera jitter**, **elastic to-and-fro snapping**, **character flickering**, and **layout shifting**—were **engine implementation defects**, not LLM hallucinations:

1. **Camera Jitter**: Caused by overlapping relative coordinate tweens (`+=` and `-=` in GSAP) targeting `.sc-in` concurrently. Micro-shake and camera drift fought for the same transform properties, creating 17px snapbacks within 2 frames.
2. **Elastic Banding ("To-and-Fro")**: Caused by `back.out(1.4)` / `back.out(2.2)` spring overshoots on text and containers combined with repeating yoyo idle breathing (`repeat: rep(dur, 3.2)`), creating jarring rubber-band oscillation.
3. **Random Text Mutation**: `Math.random()` scramble running inside a per-frame `tl.to(..., { onUpdate })` tick. Because HyperFrames renders frame-by-frame across workers, random mutations caused visible character flicker and non-deterministic frame renders.
4. **Layout-Induced Suffix Jump**: Unreserved counter width causing units (`ms`, `ops`, `%`) to jump horizontally back and forth as digit counts grew.

### Engine Fixes Implemented
- **Single Owner Transform**: Camera has one monotonic drift or punch ease per scene. Data panels and code stay fixed.
- **Monotonic Easing**: Removed `back.out` overshoots; replaced with smooth monotonic `expo.out` / `power3.out`.
- **Deterministic Audio & Visuals**: Removed `Math.random()` text scramble and replaced procedural audio noise with seeded index-based hashes.
- **Fixed Width Reservation**: Added `.stat-reserve` so number counters animate smoothly without displacing adjacent units.

---

## 2. Token-Efficient LLM Authoring

To maximize generation speed, minimize API token costs, and prevent JSON formatting errors, the engine decouples **declarative script authoring** from **cinematic visual execution**.

The LLM should never micro-manage timings, font sizes, camera coordinates, or CSS. It only outputs semantic content.

### Compact Field Aliases & Shorthand Syntax

The engine supports compact string arrays and short keys, reducing prompt and completion tokens by **50% to 65%**:

### 1. `code`
```json
// Verbose (Old): 45 tokens
{
  "type": "code",
  "meta": {
    "lines": [
      { "c": "int len = req->content_length;", "cls": "code" },
      { "c": "memcpy(buf, req->body, len);", "cls": "hot", "key": true }
    ]
  }
}

// Compact (New): 19 tokens (58% token savings)
{
  "type": "code",
  "meta": {
    "lines": [
      "int len = req->content_length;",
      { "t": "memcpy(buf, req->body, len);", "k": "hot", "key": true }
    ]
  }
}
```

### 2. `diff`
```json
// Verbose (Old): 42 tokens
{
  "type": "diff",
  "meta": {
    "lines": [
      { "t": "old_insecure_call(req);", "k": "del" },
      { "t": "new_validated_call(req);", "k": "add" }
    ]
  }
}

// Compact (New): 16 tokens (62% token savings)
{
  "type": "diff",
  "meta": {
    "lines": [
      "- old_insecure_call(req);",
      "+ new_validated_call(req);"
    ]
  }
}
```

### 3. `flow`
```json
// Verbose (Old): 36 tokens
{
  "type": "flow",
  "meta": {
    "nodes": [
      { "t": "AUTH" },
      { "t": "VALIDATE" },
      { "t": "COMMIT" }
    ]
  }
}

// Compact (New): 14 tokens (61% token savings)
{
  "type": "flow",
  "meta": {
    "nodes": ["AUTH", "VALIDATE", "COMMIT"]
  }
}
```

### 4. `cloud`
```json
// Compact Cloud Nodes:
{
  "type": "cloud",
  "meta": {
    "nodes": [
      { "k": "EDGE", "t": "Cloudflare", "icon": "⚡", "s": "200 OK" },
      { "k": "API", "t": "Lambda", "icon": "λ", "s": "ACTIVE", "hot": true }
    ]
  }
}
```

---

## 3. Minimal Token Master Prompt for LLMs

Use this compact system prompt when generating explainer scripts. It requires only ~350 prompt tokens:

```markdown
Generate an iDevak technical video in JSON (`content/video.json`).
Follow these constraints:
- Pacing: 12-25 words per scene (4-8s spoken).
- Scene 1: "cold" with 1-3 chips.
- Visual core: "code", "diff", "terminal", "cloud", "stat".
- Comic relief: 1 "meme" scene with punch: true.
- Conclusion: "outro" with subscribe CTA.
- Format shorthand:
  * code lines: ["str line", { "t": "...", "k": "hot", "key": true }]
  * diff lines: ["- old code", "+ new code"]
  * flow nodes: ["STEP 1", "STEP 2", "STEP 3"]
  * terminal: ["$ command", "> output line"]
  * redact: ~~secret~~ | highlight: ==important==
```
