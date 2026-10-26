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
const isPortrait = Boolean(project.isPortrait || height > width || project.aspect === "9:16");
const fps = Number(project.fps) || 30;
const audio = project.audio || "content/voiceover.wav";
const title = project.title || "Untitled video";
const fontsCss = await read("engine/fonts.css");
const CSS = await read("engine/style.css");
const JS = (await read("engine/anim.js")).replace('"__COMPOSITION_ID__"', JSON.stringify(compositionId));

const tok = (s) => esc(s).replace(/\n/g, "<br>");

// ---------------------------------------------------------------- mascot assets
const MASCOT_IMAGES = {};
const MASCOT_EXPRS = [
  "neutral", "talking", "thinking", "shocked",
  "cool", "happy", "angry", "sad",
  "facepalm", "pointing", "panic", "skeptical"
];

for (const expr of MASCOT_EXPRS) {
  const pngPath = path.resolve(ROOT, `assets/mascot/${expr}.png`);
  try {
    const buf = await fs.readFile(pngPath);
    MASCOT_IMAGES[expr] = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    MASCOT_IMAGES[expr] = "";
  }
}
// Alias legacy 'solved' to 'happy'
MASCOT_IMAGES["solved"] = MASCOT_IMAGES["happy"];

function renderMascotOverlay(mascot) {
  if (!mascot) return "";
  const rawExpr = mascot.expression || "neutral";
  const expr = rawExpr === "solved" ? "happy" : rawExpr;
  const pos = mascot.position === "bottom-left" ? "pos-bl" : "pos-br";
  const imgSrc = MASCOT_IMAGES[expr] || MASCOT_IMAGES["neutral"] || "";
  const bubble = mascot.bubble ? `<div class="m-ov-bubble"><div class="m-ov-btext">${esc(mascot.bubble)}</div></div>` : "";
  return `
  <div class="m-ov ${pos} m-expr-${expr}" data-expr="${esc(expr)}">
    ${bubble}
    <div class="m-ov-avatar-wrap">
      <div class="m-ov-ring"></div>
      <div class="m-ov-glare"></div>
      <img class="m-ov-avatar" src="${imgSrc}" alt="${esc(expr)}" />
    </div>
  </div>`;
}

// ---------------------------------------------------------------- copy helpers
function splitWordsOnly(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="w"><span class="wi">${esc(w)}</span></span>`)
    .join(" ");
}

function splitWords(text, s = null) {
  if (!text) return "";
  let str = String(text);

  // Auto-apply s.meta.highlight or s.meta.redact if present
  const hl = s?.meta?.highlight;
  const red = s?.meta?.redact;
  if (red) {
    const redArr = Array.isArray(red) ? red : [red];
    for (const r of redArr) {
      if (r && str.includes(r) && !str.includes(`~~${r}~~`)) {
        str = str.replace(r, `~~${r}~~`);
      }
    }
  }
  if (hl) {
    const hlArr = Array.isArray(hl) ? hl : [hl];
    for (const h of hlArr) {
      if (h && str.includes(h) && !str.includes(`==${h}==`)) {
        str = str.replace(h, `==${h}==`);
      }
    }
  }

  if (!str.includes("==") && !str.includes("~~")) {
    return splitWordsOnly(str);
  }

  const parts = str.split(/(==.*?==|~~.*?~~)/g);
  return parts.map(part => {
    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
      const inner = part.slice(2, -2);
      return `<span class="hl-marker is-live-hl" data-hl="${esc(inner)}"><span class="hl-ink"></span><span class="hl-text">${splitWordsOnly(inner)}</span></span>`;
    } else if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      const inner = part.slice(2, -2);
      return `<span class="forensic-redact is-live-redact" data-redact="${esc(inner)}"><span class="redact-tape"><span class="redact-laser"></span></span><span class="redact-text">${splitWordsOnly(inner)}</span></span>`;
    } else {
      return splitWordsOnly(part);
    }
  }).join(" ");
}

// ---------------------------------------------------------------- scene render
function renderScene(s, i) {
  const start = s.start;
  const dur = Math.max(1.2, s.end - s.start);
  const accent = s.accent || "#38bdf8";
  const id = `s${String(i + 1).padStart(3, "0")}`;
  const punchCls = s.meta?.punch || s.type === "meme" ? " has-punch" : "";
  const cls = `clip sc sc-${s.type} v${s.variant || 0}${punchCls}`;
  const inner = RENDER[s.type] ? RENDER[s.type](s, i) : RENDER.statement(s, i);
  const mascotOv = renderMascotOverlay(s.mascot);
  return `<section id="${id}" class="${cls}" data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="2" data-hold style="--ac:${accent}">
  <div class="sc-in" data-layout-allow-overflow>
    <div class="amb"></div>
    ${inner}
    ${mascotOv}
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
      <h1 class="cold-title">${splitWords(s.headline, s)}</h1>
      <div class="cold-sub">${esc(s.subline || "")}</div>
      <div class="cold-meta">
        ${(s.meta?.chips || []).map((c, k) => `<span class="chip" data-k="${k}">${esc(c)}</span>`).join("")}
      </div>
    </div>`;
  },

  hero(s) {
    const mark = s.meta?.mark || String(s.headline || "").trim().split(/\s+/)[0].toUpperCase();
    const markSize = Math.min(128, Math.floor(400 / Math.max(1, [...mark].length * 0.8)));
    return `
    <div class="hero-grid">
      <div class="hero-left">
        ${eyebrow(s)}
        <h2 class="hero-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="hero-sub">${esc(s.subline)}</p>` : ""}
      </div>
      <div class="hero-right">
        <div class="hero-mark" style="--hero-mark-size:${markSize}px">${esc(mark)}</div>
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
      <h2 class="statement ${wide ? "statement-sm" : ""}">${splitWords(s.headline, s)}</h2>
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
        <span class="stat-number" data-to="${esc(String(st.to ?? 0))}" data-dec="${st.dec || 0}" data-sep="${st.sep ? 1 : 0}" data-nocount="${st.nocount ? 1 : 0}"><span class="stat-reserve" aria-hidden="true">${esc(value)}</span><span class="stat-value">${esc(value)}</span></span>
        ${suffix ? `<span class="stat-suffix">${esc(suffix)}</span>` : ""}
      </div>
      <div class="stat-label">${esc(s.headline)}</div>
      ${s.subline ? `<div class="stat-sub">${esc(s.subline)}</div>` : ""}
      <div class="stat-ruler">
        <i></i><i></i><i></i><i></i><i></i>
        <div class="stat-ruler-fill"></div>
      </div>
    </div>`;
  },

  dateline(s) {
    const date = s.meta?.date || {};
    const day = date.day || "";
    const month = date.month || "";
    const year = date.year || "";
    return `
    <div class="dl-grid">
      <div class="dl-date">
        <div class="dl-day">${esc(day)}</div>
        <div class="dl-mon">${esc(month)}</div>
        <div class="dl-yr">${esc(year)}</div>
      </div>
      <div class="dl-right">
        ${eyebrow(s)}
        <h2 class="dl-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="dl-sub">${esc(s.subline)}</p>` : ""}
      </div>
    </div>
    <div class="dl-rail"><span></span></div>`;
  },

  code(s) {
    const rawLines = s.meta?.lines || [];
    const lines = rawLines.map((rawL, k) => {
      const l = typeof rawL === "string" ? { t: rawL } : (rawL || {});
      const kind = l.cls || l.k || (l.hot ? "hot" : "");
      const cls = ["cl", l.key ? "is-key" : "", kind ? `cl-${kind}` : ""].filter(Boolean).join(" ");
      let content = tok(l.c ?? l.t ?? l.text ?? "");
      if (l.redact || content.includes("~~")) {
        if (l.redact && !content.includes("~~")) {
          content = `<span class="forensic-redact is-live-redact" data-redact="${esc(l.c)}"><span class="redact-tape"><span class="redact-laser"></span></span><span class="redact-text">${content}</span></span>`;
        } else {
          content = content.replace(/~~(.*?)~~/g, (_, inner) => `<span class="forensic-redact is-live-redact" data-redact="${esc(inner)}"><span class="redact-tape"><span class="redact-laser"></span></span><span class="redact-text">${inner}</span></span>`);
        }
      }
      if (l.hl || content.includes("==")) {
        content = content.replace(/==(.*?)==/g, (_, inner) => `<span class="hl-marker is-live-hl" data-hl="${esc(inner)}"><span class="hl-ink"></span><span class="hl-text">${inner}</span></span>`);
      }
      return `<div class="${cls}" data-k="${k}"><span class="cl-n">${l.n ?? k + 1}</span><span class="cl-c">${content}</span></div>`;
    });
    const callout = s.meta?.announce || s.headline || s.subline || "";
    const sub = callout === s.subline ? "" : (s.subline || "");
    const file = s.meta?.file || "source";
    const tag = s.meta?.tag || "";
    const foot = callout || sub
      ? `<div class="code-foot">${callout ? `<div class="code-callout">${splitWords(callout, s)}</div>` : ""}${sub ? `<div class="code-sub">${esc(sub)}</div>` : ""}</div>`
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
    const rawLines = s.meta?.lines || [];
    const lines = rawLines.map((rawL, k) => {
      let l = typeof rawL === "string"
        ? (rawL.startsWith("+") ? { t: rawL.slice(1).trimStart(), k: "add" }
          : rawL.startsWith("-") ? { t: rawL.slice(1).trimStart(), k: "del" }
          : { t: rawL, k: "ctx" })
        : (rawL || {});
      const kind = l.k || l.kind || (l.add ? "add" : l.del ? "del" : "ctx");
      const sig = kind === "add" ? "+" : kind === "del" ? "-" : " ";
      let text = l.t ?? l.text ?? l.c ?? "";
      return `<div class="df-line df-${kind}" data-k="${k}"><span class="df-sig">${sig}</span><span class="df-t">${tok(text)}</span></div>`;
    });
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
    const rawNodes = s.meta?.nodes || [];
    const nodes = rawNodes.map(n => typeof n === "string" ? { t: n } : (n || {}));
    return `
    ${eyebrow(s)}
    <div class="flow-stage">
      <div class="flow-row">
        ${nodes
          .map(
            (n, k) => `${k ? '<div class="flow-link"><svg viewBox="0 0 120 24" preserveAspectRatio="none"><path class="fl-p" d="M0 12 H104"/><path class="fl-a" d="M96 5 L110 12 L96 19"/></svg></div>' : ""}
          <div class="flow-node ${n.hot ? "is-hot" : ""}" data-k="${k}">
            <div class="fn-k">${esc(n.k || "")}</div>
            <div class="fn-t">${esc(n.t || n.title || n.name || "")}</div>
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
    const rows = s.meta?.rows || [];
    const points = s.meta?.points || [];
    const stamp = s.meta?.stamp || "";
    return `
    <div class="lg-grid">
      <div class="lg-left">
        <div class="lg-card">
          <div class="lg-head">
            <span>${esc(s.meta?.label || "AUDIT RECORD")}</span>
            <span class="lg-live">${esc(s.meta?.status || "VERIFIED")}</span>
          </div>
          ${rows
            .map(
              (r, k) => `<div class="lg-row" data-k="${k}"><span class="lg-k">${esc(r.k)}</span><span class="lg-v ${r.bad ? "is-bad" : ""}">${esc(r.v)}</span></div>`,
            )
            .join("")}
          ${stamp ? `<div class="lg-stamp">${esc(stamp)}</div>` : ""}
        </div>
      </div>
      <div class="lg-right">
        ${eyebrow(s)}
        <h2 class="lg-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="lg-sub">${esc(s.subline)}</p>` : ""}
        ${points.map((p, k) => `<div class="lg-pt" data-k="${k}"><span class="lg-dash"></span><span>${esc(p)}</span></div>`).join("")}
      </div>
    </div>`;
  },

  memory(s) {
    const cells = (s.meta?.cells || []).map((c, k) => {
      const isBad = c.state === "bad" || c.bad;
      const isLive = c.state === "live" || c.live;
      const cls = ["mc", isBad ? "is-bad" : "", isLive ? "is-live" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}" data-k="${k}"><span class="mc-i">${esc(c.addr || String(k).padStart(2, "0"))}</span><div class="mc-b"></div></div>`;
    });
    const count = s.meta?.liveCount ?? s.meta?.allocated ?? 0;
    return `
    ${eyebrow(s)}
    <div class="mem-shell">
      <div class="mem-head">
        <span class="mem-name">${esc(s.meta?.segment || "HEAP BUFFER")}</span>
        <span class="mem-count">LIVE ALLOCATIONS <b class="mem-n" data-n="${count}">${count}</b></span>
      </div>
      <div class="mem-cells">${cells.join("")}</div>
      <div class="mem-ptr">
        <svg viewBox="0 0 240 60"><path d="M 12 10 L 80 50 L 220 50" class="mpar"/></svg>
        <span>${esc(s.meta?.pointer || "CORRUPT")}</span>
      </div>
      <div class="mem-legend">
        <span class="mgl ok">VALID</span>
        <span class="mgl bad">CORRUPTED</span>
      </div>
    </div>
    <div class="mem-side">
      <h2 class="mem-title">${splitWords(s.headline, s)}</h2>
      ${s.subline ? `<p class="mem-sub">${esc(s.subline)}</p>` : ""}
    </div>`;
  },

  timeline(s) {
    const events = s.meta?.events || [];
    return `
    ${eyebrow(s)}
    <h2 class="tl-head">${splitWords(s.headline, s)}</h2>
    <div class="tl-stage">
      <div class="tl-line"><div class="tl-line-fill"></div></div>
      <div class="tl-play"></div>
      <div class="tl-events">
        ${events
          .map(
            (e, k) => `<div class="tl-ev ${e.hot ? "is-hot" : ""}" data-k="${k}">
            <div class="tl-dot"></div>
            <div class="tl-card">
              <div class="tl-t">${esc(e.t)}</div>
              <div class="tl-s">${esc(e.s || "")}</div>
            </div>
          </div>`,
          )
          .join("")}
      </div>
    </div>
    ${s.subline ? `<div class="tl-sub">${esc(s.subline)}</div>` : ""}`;
  },

  terminal(s) {
    const rawLines = s.meta?.lines || [];
    const lines = rawLines.map((l, k) => {
      const kind = l.kind || (l.cmd ? "cmd" : l.err ? "err" : l.ok ? "ok" : "out");
      let text = l.t ?? l.cmd ?? l.text ?? "";
      const pfx = kind === "cmd" ? "$" : ">";
      let renderedText = tok(text);
      if (l.redact || renderedText.includes("~~")) {
        renderedText = renderedText.replace(/~~(.*?)~~/g, (_, inner) => `<span class="forensic-redact is-live-redact" data-redact="${esc(inner)}"><span class="redact-tape"><span class="redact-laser"></span></span><span class="redact-text">${inner}</span></span>`);
      }
      if (l.hl || renderedText.includes("==")) {
        renderedText = renderedText.replace(/==(.*?)==/g, (_, inner) => `<span class="hl-marker is-live-hl" data-hl="${esc(inner)}"><span class="hl-ink"></span><span class="hl-text">${inner}</span></span>`);
      }
      return `<div class="tm-line tm-${kind}" data-k="${k}"><span class="tm-p">${pfx}</span><span class="tm-t">${renderedText}</span></div>`;
    });
    const title = s.headline || s.meta?.title || "";
    const sub = s.subline || s.meta?.sub || "";
    return `
    ${eyebrow(s)}
    <div class="tm-shell">
      <div class="tm-bar">
        <span>${esc(s.meta?.host || "terminal@idevak")}</span>
        <span class="tm-led"></span>
      </div>
      <div class="tm-body">
        ${lines.join("")}
        <span class="tm-cursor"></span>
      </div>
    </div>
    ${title || sub ? `<div class="tm-foot">${title ? `<div class="tm-title">${splitWords(title, s)}</div>` : ""}${sub ? `<div class="tm-sub">${esc(sub)}</div>` : ""}</div>` : ""}`;
  },

  compare(s) {
    const left = s.meta?.left || {};
    const right = s.meta?.right || {};
    const mid = s.meta?.mid || "VS";
    const longMid = mid.length > 3;
    return `
    ${eyebrow(s)}
    <div class="cmp-stage">
      <div class="cmp-col cmp-left">
        <div class="cmp-k">${esc(left.k || "BEFORE")}</div>
        <div class="cmp-t">${esc(left.t || "")}</div>
        <div class="cmp-p">${esc(left.p || "")}</div>
      </div>
      <div class="cmp-mid"><div class="cmp-diamond"><span class="cmp-vs ${longMid ? "is-long" : ""}">${esc(mid)}</span></div></div>
      <div class="cmp-col cmp-right">
        <div class="cmp-k">${esc(right.k || "AFTER")}</div>
        <div class="cmp-t">${esc(right.t || "")}</div>
        <div class="cmp-p">${esc(right.p || "")}</div>
      </div>
    </div>
    ${s.headline ? `<div class="cmp-cap">${esc(s.headline)}</div>` : ""}
    ${s.subline ? `<div class="cmp-sub">${esc(s.subline)}</div>` : ""}`;
  },

  stack(s) {
    const layers = s.meta?.layers || [];
    return `
    <div class="stk-grid">
      <div class="stk-left">
        ${eyebrow(s)}
        <h2 class="stk-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="stk-sub">${esc(s.subline)}</p>` : ""}
      </div>
      <div class="stk-right">
        <div class="stk-stack">
          ${layers
            .map(
              (l, k) => `<div class="stk-layer ${l.hot ? "is-hot" : ""}" data-k="${k}">
              <span class="stk-i">${String(layers.length - k).padStart(2, "0")}</span>
              <span class="stk-t">${esc(l.t)}</span>
              ${l.s ? `<span class="stk-s">${esc(l.s)}</span>` : ""}
            </div>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;
  },

  quote(s) {
    return `
    <div class="q-stage">
      <div class="q-mark">&ldquo;</div>
      ${eyebrow(s)}
      <blockquote class="q-text">${splitWords(s.headline, s)}</blockquote>
      <div class="q-by">${esc(s.subline || "")}</div>
      <div class="q-line"></div>
    </div>`;
  },

  matrix(s) {
    const n = Math.min(64, Math.max(16, s.meta?.cells || 48));
    const cells = Array.from({ length: n }, (_, k) => `<span class="mx-c" data-k="${k}"></span>`).join("");
    return `
    <div class="mx-grid">
      <div class="mx-left">
        ${eyebrow(s)}
        <h2 class="mx-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="mx-sub">${esc(s.subline)}</p>` : ""}
        <div class="mx-legend">
          <span><i class="mx-sw ok"></i>${esc(s.meta?.legendOk || "ok")}</span>
          <span><i class="mx-sw bad"></i>${esc(s.meta?.legendBad || "flagged")}</span>
        </div>
      </div>
      <div class="mx-right"><div class="mx-cells">${cells}</div><div class="mx-count">${esc(s.meta?.count || "")}</div></div>
    </div>`;
  },

  webref(s) {
    const url = s.meta?.url || "https://docs.aws.amazon.com/";
    const badge = s.meta?.badge || "OFFICIAL DOCUMENTATION";
    const docTitle = s.meta?.title || s.headline;
    const rawSnippet = s.meta?.snippet;
    const snippet = Array.isArray(rawSnippet) ? rawSnippet : [rawSnippet || s.subline || ""];
    const highlight = s.meta?.highlight || "";
    const callout = s.meta?.callout || "";
    const calloutType = s.meta?.calloutType || "IMPORTANT";
    const customImg = s.meta?.image;

    return `
    ${eyebrow(s)}
    <div class="web-shell">
      <div class="web-bar">
        <div class="web-dots"><span></span><span></span><span></span></div>
        <div class="web-url-box">
          <svg class="web-lock" viewBox="0 0 24 24"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          <span class="web-url">${esc(url)}</span>
        </div>
        <div class="web-badge">${esc(badge)}</div>
      </div>
      <div class="web-body">
        ${customImg ? `<div class="web-screenshot-wrap"><img class="web-screenshot" src="${esc(customImg)}" alt="screenshot" /></div>` : `
        <div class="web-doc-header">
          <div class="web-doc-crumb">DOCS / REFERENCE / SPEC</div>
          <div class="web-doc-title">${esc(docTitle)}</div>
        </div>
        <div class="web-doc-content">
          ${snippet.map(sn => `<p class="web-p ${highlight && sn.includes(highlight) ? "has-hl" : ""}">${splitWords(sn, s)}</p>`).join("")}
          ${callout ? `
          <div class="web-callout callout-${calloutType.toLowerCase()}">
            <div class="web-callout-tag">${esc(calloutType)}</div>
            <div class="web-callout-text">${splitWords(callout, s)}</div>
          </div>` : ""}
        </div>`}
        <svg class="web-cursor" viewBox="0 0 24 24"><path fill="var(--ac)" d="M3 3l7 18 3-7 7-3L3 3z"/></svg>
      </div>
    </div>
    ${s.headline && s.headline !== docTitle ? `<div class="web-foot-title">${splitWords(s.headline, s)}</div>` : ""}
    ${s.subline ? `<div class="web-foot-sub">${esc(s.subline)}</div>` : ""}`;
  },

  meme(s) {
    const ghost = s.ghost || s.meta?.ghost || "WAIT WHAT";
    const caption = s.meta?.caption || s.headline || "";
    const badge = s.meta?.badge || "SYSTEM PANIC";
    const sub = s.subline || s.meta?.sub || "";
    const customImg = s.meta?.image || "assets/mascot/shocked.png";

    return `
    <div class="meme-stage">
      <div class="meme-ghost">${esc(ghost)}</div>
      <div class="meme-badge"><span>INCIDENT_REPORT</span><b>${esc(badge)}</b></div>
      <div class="meme-card">
        <div class="meme-media-wrap">
          <img class="meme-img" src="${esc(customImg)}" alt="reaction" />
          <div class="meme-scanlines"></div>
          <div class="meme-glitch-bar"></div>
        </div>
        <div class="meme-right">
          <h2 class="meme-caption">${splitWords(caption, s)}</h2>
          ${sub ? `<p class="meme-sub">${esc(sub)}</p>` : ""}
        </div>
      </div>
    </div>`;
  },

  cloud(s) {
    const rawNodes = s.meta?.nodes || [];
    const nodes = rawNodes.map(n => typeof n === "string" ? { t: n } : (n || {}));
    const tag = s.meta?.tag || "CLOUD ARCHITECTURE";
    return `
    <div class="cloud-stage">
      ${eyebrow(s)}
      <div class="cloud-canvas">
        <div class="cloud-header">
          <span class="cloud-tag">${esc(tag)}</span>
          <span class="cloud-flow-label">TOPOLOGY MATRIX</span>
        </div>
        <div class="cloud-nodes">
          ${nodes.map((n, k) => `
            ${k > 0 ? `<div class="cloud-edge"><svg viewBox="0 0 100 24"><path d="M0 12 H90" class="cld-path"/><polygon points="90 8, 98 12, 90 16" class="cld-arrow"/></svg></div>` : ""}
            <div class="cloud-node ${n.hot ? "is-hot" : ""} ${n.bad ? "is-bad" : ""}">
              <span class="cld-badge">${esc(n.kind || n.k || "NODE")}</span>
              <div class="cld-icon-box"><span class="cld-icon">${esc(n.icon || "☁")}</span></div>
              <div class="cld-title">${esc(n.name || n.title || n.t || "")}</div>
              <div class="cld-status ${n.bad ? "is-bad" : "is-ok"}"><span class="cld-dot"></span>${esc(n.status || n.s || "HEALTHY")}</div>
              ${n.meta || n.sub ? `<div class="cld-sub">${esc(n.meta || n.sub)}</div>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="cloud-bus-rail"><div class="cloud-packet"></div></div>
      </div>
      <div class="cloud-foot">
        ${s.headline ? `<h2 class="cloud-title">${splitWords(s.headline, s)}</h2>` : ""}
        ${s.subline ? `<p class="cloud-sub">${esc(s.subline)}</p>` : ""}
      </div>
    </div>`;
  },

  mascot(s) {
    const expr = s.meta?.expression || "neutral";
    const imgSrc = s.meta?.image || MASCOT_IMAGES[expr] || "";
    const bubble = s.meta?.bubble || s.headline || "";
    const badge = s.meta?.badge || "iDevak // ANALYSIS";
    const stats = (s.meta?.stats || []).map(st => `
      <div class="mst-item">
        <span class="mst-lbl">${esc(st.label || "")}</span>
        <span class="mst-val ${st.hot ? "is-hot" : ""}">${esc(st.val || "")}</span>
      </div>
    `).join("");

    return `
    <div class="mascot-stage">
      <div class="mascot-left">
        <div class="mascot-hud-frame">
          <div class="mascot-hud-corner tl"></div>
          <div class="mascot-hud-corner tr"></div>
          <div class="mascot-hud-corner bl"></div>
          <div class="mascot-hud-corner br"></div>
          <div class="mascot-scanline"></div>
          <div class="mascot-hud-glare"></div>

          <img class="mascot-img" src="${imgSrc}" alt="${esc(expr)}" />
          <div class="mascot-hud-tag">${esc(badge)}</div>
        </div>
      </div>
      <div class="mascot-right">
        ${eyebrow(s)}
        <div class="mascot-bubble-box">
          <div class="mascot-bubble-arrow"></div>
          <h2 class="mascot-bubble-text">${splitWords(bubble, s)}</h2>
          ${s.subline ? `<div class="mascot-sub">${esc(s.subline)}</div>` : ""}
        </div>
        ${stats ? `<div class="mascot-stats-grid">${stats}</div>` : ""}
      </div>
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
      <h2 class="out-title">${splitWords(s.headline, s)}</h2>
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
:root {
  --composition-width: ${width}px;
  --composition-height: ${height}px;
}
${fontsCss}
${CSS}
body {
  width: ${width}px;
  height: ${height}px;
}
#root {
  width: ${width}px;
  height: ${height}px;
}
</style>
</head>
<body>
<div id="root" class="${isPortrait ? "is-portrait" : "is-landscape"}" data-aspect="${isPortrait ? "9:16" : "16:9"}" data-composition-id="${esc(compositionId)}" data-start="0" data-width="${width}" data-height="${height}" data-duration="${total.toFixed(3)}">
  <div id="bg-base"></div>
  <div id="bg-grid"></div>
  <div id="bg-bloom"></div>
  <div id="bg-noise"></div>
  <div id="bg-vignette"></div>
  <div id="bg-grain"></div>
  <div id="bg-flare">
    <div class="flare-core"></div>
    <div class="flare-halo"></div>
    <div class="flare-streak"></div>
    <div class="flare-streak-sub"></div>
  </div>
  <div id="cut-rail"></div>
  ${body}
  <audio id="vo" src="${esc(audio)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="1" data-volume="1"></audio>
</div>
<script>
window.__COMPOSITION_ID__ = ${JSON.stringify(compositionId)};
window.__SCENES__ = ${JSON.stringify(scenes.map((s) => ({
  start: s.start,
  end: s.end,
  type: s.type,
  accent: s.accent,
  variant: s.variant || 0,
  act: s.act,
  punch: Boolean(s.meta?.punch || s.type === "meme"),
  hasMascot: Boolean(s.mascot),
  mascotExpr: s.mascot?.expression || (s.type === "mascot" ? (s.meta?.expression || "neutral") : null),
  wordTimings: s.wordTimings || []
})))};
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
