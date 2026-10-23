// Build the HyperFrames composition from build/scenes.json + build/project.json.
// Deterministic: all animation state is baked into one paused GSAP timeline.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFile(path.resolve(ROOT, p), "utf8");
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\/\*/g, "&#47;*")
    .replace(/\*\//g, "*&#47;");

const project = JSON.parse(await read("build/project.json"));
const scenes = JSON.parse(await read("build/scenes.json"));
const total = scenes[scenes.length - 1].end;
const compositionId = project.compositionId || project.slug || "video";
const width = Number(project.width) || 1920;
const height = Number(project.height) || 1080;
const fps = Number(project.fps) || 30;
const audio = project.audio || "content/voiceover.wav";
const title = project.title || "Untitled video";
const fontsCss = await read("engine/fonts.css");
const CSS = await read("engine/style.css");
const JS = (await read("engine/anim.js")).replace('"__COMPOSITION_ID__"', JSON.stringify(compositionId));

const tok = (s) => esc(s).replace(/\n/g, "<br>");

// ---------------------------------------------------------------- copy helpers
function splitWords(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="w"><span class="wi">${esc(w)}</span></span>`)
    .join(" ");
}

// ---------------------------------------------------------------- scene render
function renderScene(s, i) {
  const start = s.start;
  const dur = Math.max(1.2, s.end - s.start);
  const accent = s.accent || "#38bdf8";
  const id = `s${String(i + 1).padStart(3, "0")}`;
  const cls = `clip sc sc-${s.type} v${s.variant || 0}`;
  const inner = RENDER[s.type] ? RENDER[s.type](s, i) : RENDER.statement(s, i);
  return `<section id="${id}" class="${cls}" data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="2" style="--ac:${accent}">
  <div class="sc-in" data-layout-allow-overflow>
    <div class="amb"></div>
    ${inner}
  </div>
</section>`;
}

const eyebrow = (s) => (s.eyebrow ? `<div class="eyebrow"><span class="eyebrow-dot"></span><span>${esc(s.eyebrow)}</span></div>` : "");

const RENDER = {
  cold(s) {
    const ghost = s.ghost || project.ghost || String(project.title || "VIDEO").trim().split(/\s+/)[0].toUpperCase();
    return `
    <div class="cold-wrap">
      <div class="cold-ghost" data-layout-allow-overflow>${esc(ghost)}</div>
      <div class="cold-rule"></div>
      ${s.eyebrow ? `<div class="cold-eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <h1 class="cold-title">${splitWords(s.headline)}</h1>
      <div class="cold-sub">${esc(s.subline || "")}</div>
      <div class="cold-meta">
        ${(s.meta?.chips || []).map((c, k) => `<span class="chip" data-k="${k}">${esc(c)}</span>`).join("")}
      </div>
    </div>`;
  },

  hero(s) {
    const mark = s.meta?.mark || String(s.headline || "").trim().split(/\s+/)[0].toUpperCase();
    return `
    <div class="hero-grid">
      <div class="hero-left">
        ${eyebrow(s)}
        <h2 class="hero-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="hero-sub">${esc(s.subline)}</p>` : ""}
      </div>
      <div class="hero-right">
        <div class="hero-mark">${esc(mark)}</div>
        ${s.meta?.rule ? `<div class="hero-vrule"></div>` : ""}
      </div>
    </div>
    <div class="hero-baseline"></div>`;
  },

  statement(s) {
    const wide = (s.headline || "").length > 30;
    return `
    <div class="stat-wrap">
      ${s.meta?.ghost ? `<div class="st-ghost">${esc(s.meta.ghost)}</div>` : ""}
      ${eyebrow(s)}
      <h2 class="statement ${wide ? "statement-sm" : ""}">${splitWords(s.headline)}</h2>
      ${s.subline ? `<div class="st-sub">${esc(s.subline)}</div>` : ""}
      <div class="st-tickrow"><span></span><span></span><span></span></div>
    </div>`;
  },

  stat(s) {
    const st = s.meta?.stat || {};
    const value = s.meta?.display || String(s.meta?.value ?? s.headline);
    const suffix = s.meta?.suffix || "";
    const prefix = s.meta?.prefix || "";
    return `
    <div class="stat-stage">
      <div class="stat-ghost">${esc(value)}</div>
      ${eyebrow(s)}
      <div class="stat-main">
        ${prefix ? `<span class="stat-prefix">${esc(prefix)}</span>` : ""}
        <span class="stat-number" data-to="${esc(String(st.to ?? 0))}" data-dec="${st.dec || 0}" data-sep="${st.sep ? 1 : 0}" data-nocount="${st.nocount ? 1 : 0}">${esc(value)}</span>
        ${suffix ? `<span class="stat-suffix">${esc(suffix)}</span>` : ""}
      </div>
      <div class="stat-label">${esc(s.headline)}</div>
      ${s.subline ? `<div class="stat-sub">${esc(s.subline)}</div>` : ""}
      <div class="stat-ruler"><div class="stat-ruler-fill"></div><i></i><i></i><i></i><i></i><i></i></div>
    </div>`;
  },

  dateline(s) {
    return `
    <div class="dl-grid">
      <div class="dl-date">
        <div class="dl-day">${esc(s.meta?.day || "")}</div>
        <div class="dl-mon">${esc(s.meta?.mon || "")}</div>
        <div class="dl-yr">${esc(s.meta?.yr || "")}</div>
      </div>
      <div class="dl-body">
        ${eyebrow(s)}
        <h2 class="dl-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="dl-sub">${esc(s.subline)}</p>` : ""}
      </div>
    </div>
    <div class="dl-rail"><span></span></div>`;
  },

  code(s) {
    const source = s.meta?.lines?.length ? s.meta.lines : [{ t: s.headline, k: "code" }];
    const lines = source.map((l, k) => {
      const kind = l.k || "code";
      const isKey = l.key || kind === "hot" ? " is-key" : "";
      return `<div class="cl cl-${kind}${isKey}" data-k="${k}"><span class="cl-n">${String(k + 1).padStart(2, "0")}</span><span class="cl-c">${tok(l.t)}</span></div>`;
    });
    const callout = s.meta?.announce || s.headline || s.subline || "";
    const sub = callout === s.subline ? "" : (s.subline || "");
    const file = s.meta?.file || "source";
    const tag = s.meta?.tag || "";
    const foot = callout || sub
      ? `<div class="code-foot">${callout ? `<div class="code-callout">${esc(callout)}</div>` : ""}${sub ? `<div class="code-sub">${esc(sub)}</div>` : ""}</div>`
      : "";
    return `
    ${eyebrow(s)}
    <div class="code-shell">
      <div class="code-bar">
        <span class="code-file">${esc(file)}</span>
        ${tag ? `<span class="code-tag">${esc(tag)}</span>` : ""}
      </div>
      <div class="code-body">${lines.join("")}</div>
      <div class="code-scan"></div>
    </div>
    ${foot}`;
  },

  diff(s) {
    const lines = (s.meta?.lines || []).map(
      (l, k) => `<div class="df-line df-${l.k}" data-k="${k}"><span class="df-sig">${l.k === "add" ? "+" : l.k === "del" ? "-" : " "}</span><span class="df-t">${tok(l.t)}</span></div>`,
    );
    const file = s.meta?.file || "source";
    const ver = s.meta?.ver || "";
    const callout = s.meta?.announce || s.headline || "";
    const sub = callout === s.subline ? "" : (s.subline || "");
    const foot = callout || sub
      ? `<div class="code-foot">${callout ? `<div class="code-callout">${esc(callout)}</div>` : ""}${sub ? `<div class="code-sub">${esc(sub)}</div>` : ""}</div>`
      : "";
    return `
    ${eyebrow(s)}
    <div class="diff-shell">
      <div class="diff-head"><span class="df-file">${esc(file)}</span>${ver ? `<span class="df-ver">${esc(ver)}</span>` : ""}</div>
      <div class="diff-body">${lines.join("")}</div>
    </div>
    ${foot}`;
  },

  flow(s) {
    const nodes = s.meta?.nodes || [];
    return `
    ${eyebrow(s)}
    <div class="flow-stage">
      <div class="flow-row">
        ${nodes
          .map(
            (n, k) => `${k ? '<div class="flow-link"><svg viewBox="0 0 120 24" preserveAspectRatio="none"><path class="fl-p" d="M0 12 H104"/><path class="fl-a" d="M96 5 L110 12 L96 19"/></svg></div>' : ""}
          <div class="flow-node ${n.hot ? "is-hot" : ""}" data-k="${k}">
            <div class="fn-k">${esc(n.k || "")}</div>
            <div class="fn-t">${esc(n.t)}</div>
            ${n.s ? `<div class="fn-s">${esc(n.s)}</div>` : ""}
          </div>`,
          )
          .join("")}
      </div>
      ${s.headline ? `<div class="flow-cap">${esc(s.headline)}</div>` : ""}
      ${s.subline ? `<div class="flow-sub">${esc(s.subline)}</div>` : ""}
      <div class="flow-rail"><div class="flow-packet"></div></div>
    </div>`;
  },

  ledger(s) {
    const rows = (s.meta?.rows || []).map(
      (r, k) => `<div class="lg-row" data-k="${k}"><span class="lg-k">${esc(r.k)}</span><span class="lg-v ${r.bad ? "is-bad" : ""}">${esc(r.v)}</span></div>`,
    );
    const head = s.meta?.head || "LEDGER";
    const live = s.meta?.live === false ? "" : `<span class="lg-live">${esc(s.meta?.live || "LIVE")}</span>`;
    return `
    <div class="lg-grid">
      <div class="lg-card">
        <div class="lg-head"><span>${esc(head)}</span>${live}</div>
        ${rows.join("")}
        ${s.meta?.stamp ? `<div class="lg-stamp">${esc(s.meta.stamp)}</div>` : ""}
      </div>
      <div class="lg-side">
        ${eyebrow(s)}
        <h2 class="lg-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="lg-sub">${esc(s.subline)}</p>` : ""}
        ${(s.meta?.points || []).map((p, k) => `<div class="lg-pt" data-k="${k}"><span class="lg-dash"></span>${esc(p)}</div>`).join("")}
      </div>
    </div>`;
  },

  memory(s) {
    const cells = Math.max(1, Math.min(24, Number(s.meta?.cells) || 8));
    const cellsHtml = Array.from({ length: cells }, (_, k) => `<div class="mc" data-k="${k}"><span class="mc-i">${k}</span><span class="mc-b"></span></div>`).join("");
    const name = s.meta?.name || "memory";
    const n = Number(s.meta?.n ?? 2);
    const ptr = s.meta?.ptr === false ? "" : (s.meta?.ptr || "pointer");
    const legendOk = s.meta?.legendOk || "active";
    const legendBad = s.meta?.legendBad || "unused";
    return `
    ${eyebrow(s)}
    <div class="mem-shell">
      <div class="mem-head">
        <span class="mem-name">${esc(name)}</span>
        <span class="mem-count"><i>${esc(s.meta?.unit || "live")}</i> <b class="mem-n" data-n="${n}">${n}</b></span>
      </div>
      <div class="mem-cells">${cellsHtml}</div>
      ${ptr ? `<div class="mem-ptr"><svg viewBox="0 0 240 60"><path d="M6 8 C 60 8, 90 50, 150 50"/><path class="mpar" d="M138 43 L152 50 L138 57"/></svg><span>${esc(ptr)}</span></div>` : ""}
      <div class="mem-legend"><span class="mgl ok">${esc(legendOk)}</span><span class="mgl bad">${esc(legendBad)}</span></div>
    </div>
    <div class="mem-side">
      <h2 class="mem-title">${splitWords(s.headline)}</h2>
      ${s.subline ? `<p class="mem-sub">${esc(s.subline)}</p>` : ""}
    </div>`;
  },

  timeline(s) {
    const ev = (s.meta?.events || []).map(
      (e, k) => `<div class="tl-ev ${e.hot ? "is-hot" : ""}" data-k="${k}">
        <div class="tl-dot"></div>
        <div class="tl-card"><div class="tl-t">${esc(e.t)}</div><div class="tl-s">${esc(e.s || "")}</div></div>
      </div>`,
    );
    return `
    ${eyebrow(s)}
    <h2 class="tl-head">${splitWords(s.headline)}</h2>
    <div class="tl-stage">
      <div class="tl-line"><div class="tl-line-fill"></div><div class="tl-play"></div></div>
      <div class="tl-events">${ev.join("")}</div>
    </div>
    ${s.subline ? `<div class="tl-sub">${esc(s.subline)}</div>` : ""}`;
  },

  terminal(s) {
    const lines = (s.meta?.lines || []).map(
      (l, k) => `<div class="tm-line tm-${l.k || "out"}" data-k="${k}"><span class="tm-p">${l.k === "cmd" ? "$" : ""}</span><span class="tm-t">${esc(l.t)}</span></div>`,
    );
    return `
    ${eyebrow(s)}
    <div class="tm-shell">
      <div class="tm-bar"><span>${esc(s.meta?.host || "terminal")}</span><span class="tm-led"></span></div>
      <div class="tm-body">${lines.join("")}<span class="tm-cursor"></span></div>
    </div>
    <div class="tm-foot">${s.headline ? `<div class="tm-title">${esc(s.headline)}</div>` : ""}${s.subline ? `<div class="tm-sub">${esc(s.subline)}</div>` : ""}</div>`;
  },

  compare(s) {
    return `
    ${eyebrow(s)}
    <div class="cmp-stage">
      <div class="cmp-col cmp-left" data-k="0">
        <div class="cmp-k">${esc(s.meta?.left?.k || "A")}</div>
        <div class="cmp-t">${esc(s.meta?.left?.t || "")}</div>
        ${(s.meta?.left?.pts || []).map((p) => `<div class="cmp-p">${esc(p)}</div>`).join("")}
      </div>
      <div class="cmp-mid"><span>${esc(s.meta?.vs || "VS")}</span></div>
      <div class="cmp-col cmp-right" data-k="1">
        <div class="cmp-k">${esc(s.meta?.right?.k || "B")}</div>
        <div class="cmp-t">${esc(s.meta?.right?.t || "")}</div>
        ${(s.meta?.right?.pts || []).map((p) => `<div class="cmp-p">${esc(p)}</div>`).join("")}
      </div>
    </div>
    <div class="cmp-cap">${esc(s.headline)}</div>
    ${s.subline ? `<div class="cmp-sub">${esc(s.subline)}</div>` : ""}`;
  },

  stack(s) {
    const layers = (s.meta?.layers || []).map(
      (l, k) => `<div class="stk-layer ${l.hot ? "is-hot" : ""}" data-k="${k}"><span class="stk-i">${String(k + 1).padStart(2, "0")}</span><span class="stk-t">${esc(l.t)}</span><span class="stk-s">${esc(l.s || "")}</span></div>`,
    );
    return `
    <div class="stk-grid">
      <div class="stk-left">
        ${eyebrow(s)}
        <h2 class="stk-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="stk-sub">${esc(s.subline)}</p>` : ""}
      </div>
      <div class="stk-right"><div class="stk-stack">${layers.join("")}</div></div>
    </div>`;
  },

  quote(s) {
    return `
    <div class="q-stage">
      <div class="q-mark">“</div>
      <blockquote class="q-text">${splitWords(s.headline)}</blockquote>
      <div class="q-by">${esc(s.subline || "")}</div>
      <div class="q-line"></div>
    </div>`;
  },

  matrix(s) {
    const n = Math.max(1, Math.min(600, Number(s.meta?.cells) || 160));
    const cells = Array.from({ length: n }, (_, k) => `<span class="mx-c" data-k="${k}"></span>`).join("");
    return `
    <div class="mx-grid">
      <div class="mx-left">
        ${eyebrow(s)}
        <h2 class="mx-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="mx-sub">${esc(s.subline)}</p>` : ""}
        <div class="mx-legend">
          <span><i class="mx-sw ok"></i>${esc(s.meta?.legendOk || "ok")}</span>
          <span><i class="mx-sw bad"></i>${esc(s.meta?.legendBad || "flagged")}</span>
        </div>
      </div>
      <div class="mx-right"><div class="mx-cells">${cells}</div><div class="mx-count">${esc(s.meta?.count || "")}</div></div>
    </div>`;
  },

  outro(s) {
    const ghost = s.ghost || s.meta?.ghost || project.ghost || String(project.title || "").trim().split(/\s+/)[0].toUpperCase();
    const ctaK = s.meta?.cta || project.cta || "Subscribe";
    const ctaV = s.meta?.ctaSub || project.ctaSub || "More investigations";
    const channel = s.meta?.channel || project.channel || "";
    return `
    <div class="out-wrap">
      <div class="out-ghost">${esc(ghost)}</div>
      ${eyebrow(s)}
      <h2 class="out-title">${splitWords(s.headline)}</h2>
      <div class="out-sub">${esc(s.subline || "")}</div>
      <div class="out-cta">
        <span class="out-cta-k">${esc(ctaK)}</span>
        <span class="out-cta-v">${esc(ctaV)}</span>
      </div>
      <div class="out-ch">${esc(channel)}</div>
    </div>`;
  },
};

// ---------------------------------------------------------------- document
const body = scenes.map(renderScene).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${width}, height=${height}" />
<title>${esc(title)}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${fontsCss}
${CSS}
</style>
</head>
<body>
<div id="root" data-composition-id="${esc(compositionId)}" data-start="0" data-width="${width}" data-height="${height}" data-duration="${total.toFixed(3)}">
  <div id="bg-base"></div>
  <div id="bg-grid"></div>
  <div id="bg-bloom"></div>
  <div id="bg-noise"></div>
  <div id="bg-vignette"></div>
  <div id="cut-rail"></div>
  ${body}
  <audio id="vo" src="${esc(audio)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="1" data-volume="1"></audio>
</div>
<script>
window.__COMPOSITION_ID__ = ${JSON.stringify(compositionId)};
window.__SCENES__ = ${JSON.stringify(scenes.map((s) => ({ start: s.start, end: s.end, type: s.type, accent: s.accent, variant: s.variant || 0 })))};
window.__TOTAL__ = ${total.toFixed(3)};
${JS}
</script>
</body>
</html>`;

const meta = {
  name: project.slug || compositionId,
  entry: "index.html",
  compositionId,
  width,
  height,
  fps,
  duration: Number(total.toFixed(3)),
  channel: project.channel || "",
};

await fs.writeFile(path.resolve(ROOT, "index.html"), html, "utf8");
await fs.writeFile(path.resolve(ROOT, "hyperframes.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
console.log(`index.html written: ${scenes.length} scenes, ${total.toFixed(1)}s`);
console.log(`hyperframes.json written: ${meta.name}`);




