// Build the HyperFrames composition from build/scenes.json.
// Deterministic: all animation state is baked into one paused GSAP timeline.
import fs from "node:fs/promises";
import path from "node:path";

const read = (p) => fs.readFile(path.resolve(p), "utf8");
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const scenes = JSON.parse(await read("build/scenes.json"));
const fontsCss = (await read("build/fonts.local.css")).replace(/url\(fonts\//g, "url(assets/fonts/");
const CSS = await read("scripts/style.css");
const JS = await read("scripts/anim.js");
const total = scenes[scenes.length - 1].end;

const WORDS = (s) => s.split(" ");
const tok = (s) =>
  esc(s)
    .replace(/\n/g, "<br>")
    .replace(/\/\*/g, "&#47;*")
    .replace(/\*\//g, "*&#47;");

// ---------------------------------------------------------------- copy helpers
function splitWords(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="w"><span class="wi">${esc(w)}</span></span>`)
    .join(" ");
}

function lineBlock(text, cls = "") {
  return `<span class="ln ${cls}"><span class="lni">${esc(text)}</span></span>`;
}

const ACTS = [
  { id: "act1", label: "Cold open", accent: "#ff3b5c", start: 0 },
];

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
    return `
    <div class="cold-wrap">
      <div class="cold-ghost" data-layout-allow-overflow>${esc(s.ghost || "PHP")}</div>
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
    return `
    <div class="hero-grid">
      <div class="hero-left">
        ${eyebrow(s)}
        <h2 class="hero-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="hero-sub">${esc(s.subline)}</p>` : ""}
      </div>
      <div class="hero-right">
        <div class="hero-mark">${esc(s.meta?.mark || "")}</div>
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
    const lines = (s.meta?.lines || [{ t: s.headline, c: "" }]).map((l, k) => {
      const kind = l.k || "code";
      return `<div class="cl cl-${kind}" data-k="${k}"><span class="cl-n">${String(k + 1).padStart(2, "0")}</span><span class="cl-c">${tok(l.t)}</span></div>`;
    });
    const announce = s.meta?.announce || "";
    return `
    ${eyebrow(s)}
    <div class="code-shell">
      <div class="code-bar">
        <span class="code-file">${esc(s.meta?.file || "Zend/zend_hash.c")}</span>
        <span class="code-tag">${esc(s.meta?.tag || "PHP 8.5.11")}</span>
      </div>
      <div class="code-body">${lines.join("")}</div>
      <div class="code-scan"></div>
    </div>
    <div class="code-foot">
      <div class="code-callout">${esc(announce)}</div>
      ${s.subline ? `<div class="code-sub">${esc(s.subline)}</div>` : ""}
    </div>`;
  },

  diff(s) {
    const lines = (s.meta?.lines || []).map(
      (l, k) => `<div class="df-line df-${l.k}" data-k="${k}"><span class="df-sig">${l.k === "add" ? "+" : l.k === "del" ? "-" : " "}</span><span class="df-t">${tok(l.t)}</span></div>`,
    );
    return `
    ${eyebrow(s)}
    <div class="diff-shell">
      <div class="diff-head"><span class="df-file">${esc(s.meta?.file || "Zend/zend_hash.c")}</span><span class="df-ver">${esc(s.meta?.ver || "8.5.11 → 8.5.12")}</span></div>
      <div class="diff-body">${lines.join("")}</div>
    </div>
    <div class="code-foot"><div class="code-callout">${esc(s.headline)}</div>
      ${s.subline ? `<div class="code-sub">${esc(s.subline)}</div>` : ""}</div>`;
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
    return `
    <div class="lg-grid">
      <div class="lg-card">
        <div class="lg-head"><span>${esc(s.meta?.head || "REQUEST LEDGER")}</span><span class="lg-live">LIVE</span></div>
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
    const cells = s.meta?.cells || 8;
    const cellsHtml = Array.from({ length: cells }, (_, k) => `<div class="mc" data-k="${k}"><span class="mc-i">${k}</span><span class="mc-b"></span></div>`).join("");
    return `
    ${eyebrow(s)}
    <div class="mem-shell">
      <div class="mem-head">
        <span class="mem-name">${esc(s.meta?.name || "$_POST")}</span>
        <span class="mem-count"><i>nNumUsed</i> <b class="mem-n" data-n="${s.meta?.n ?? 2}">${s.meta?.n ?? 2}</b></span>
      </div>
      <div class="mem-cells">${cellsHtml}</div>
      <div class="mem-ptr"><svg viewBox="0 0 240 60"><path d="M6 8 C 60 8, 90 50, 150 50"/><path class="mpar" d="M138 43 L152 50 L138 57"/></svg><span>${esc(s.meta?.ptr || "arData + 1")}</span></div>
      <div class="mem-legend"><span class="mgl ok">initialized</span><span class="mgl bad">uninitialized</span></div>
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
      <div class="tm-bar"><span>${esc(s.meta?.host || "php-fpm")}</span><span class="tm-led"></span></div>
      <div class="tm-body">${lines.join("")}<span class="tm-cursor"></span></div>
    </div>
    <div class="tm-foot">${s.headline ? `<div class="tm-title">${esc(s.headline)}</div>` : ""}${s.subline ? `<div class="tm-sub">${esc(s.subline)}</div>` : ""}</div>`;
  },

  compare(s) {
    return `
    ${eyebrow(s)}
    <div class="cmp-stage">
      <div class="cmp-col cmp-left" data-k="0">
        <div class="cmp-k">${esc(s.meta?.left?.k || "RUMOR")}</div>
        <div class="cmp-t">${esc(s.meta?.left?.t || "")}</div>
        ${(s.meta?.left?.pts || []).map((p) => `<div class="cmp-p">${esc(p)}</div>`).join("")}
      </div>
      <div class="cmp-mid"><span>${esc(s.meta?.vs || "VS")}</span></div>
      <div class="cmp-col cmp-right" data-k="1">
        <div class="cmp-k">${esc(s.meta?.right?.k || "REALITY")}</div>
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
    const n = s.meta?.cells || 160;
    const cells = Array.from({ length: n }, (_, k) => `<span class="mx-c" data-k="${k}"></span>`).join("");
    return `
    <div class="mx-grid">
      <div class="mx-left">
        ${eyebrow(s)}
        <h2 class="mx-title">${splitWords(s.headline)}</h2>
        ${s.subline ? `<p class="mx-sub">${esc(s.subline)}</p>` : ""}
        <div class="mx-legend">
          <span><i class="mx-sw ok"></i>${esc(s.meta?.legendOk || "patched")}</span>
          <span><i class="mx-sw bad"></i>${esc(s.meta?.legendBad || "exposed")}</span>
        </div>
      </div>
      <div class="mx-right"><div class="mx-cells">${cells}</div><div class="mx-count">${esc(s.meta?.count || "")}</div></div>
    </div>`;
  },

  outro(s) {
    return `
    <div class="out-wrap">
      <div class="out-ghost">PHP</div>
      ${eyebrow(s)}
      <h2 class="out-title">${splitWords(s.headline)}</h2>
      <div class="out-sub">${esc(s.subline || "")}</div>
      <div class="out-cta">
        <span class="out-cta-k">Subscribe</span>
        <span class="out-cta-v">Zero-hype vulnerability autopsies</span>
      </div>
      <div class="out-ch">${esc(s.meta?.channel || "@channel")}</div>
    </div>`;
  },
};

// ---------------------------------------------------------------- document
const body = scenes.map(renderScene).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>PHP2Shell - CVE-2026-109618 / CVE-2026-109619</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${fontsCss.replace(/url\(fonts\//g, "url(assets/fonts/")}
${CSS}
</style>
</head>
<body>
<div id="root" data-composition-id="php2shell" data-start="0" data-width="1920" data-height="1080" data-duration="${total.toFixed(3)}">
  <div id="bg-base"></div>
  <div id="bg-grid"></div>
  <div id="bg-bloom"></div>
  <div id="bg-noise"></div>
  <div id="bg-vignette"></div>
  <div id="cut-rail"></div>
  ${body}
  <audio id="vo" src="voiceover.wav" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="1" data-volume="1"></audio>
</div>
<script>
window.__SCENES__ = ${JSON.stringify(scenes.map((s) => ({ start: s.start, end: s.end, type: s.type, accent: s.accent, cue: s.cue || [] })))};
window.__TOTAL__ = ${total.toFixed(3)};
${JS}
</script>
</body>
</html>`;

await fs.writeFile("index.html", html, "utf8");
console.log(`index.html written: ${scenes.length} scenes, ${total.toFixed(1)}s`);




