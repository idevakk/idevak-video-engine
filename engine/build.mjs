// Build the HyperFrames composition from build/scenes.json + build/project.json.
// Deterministic: all animation state is baked into one paused GSAP timeline.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { bakeSFX } from "./audio.mjs";

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
const require = createRequire(import.meta.url);
const gsapJS = await fs.readFile(require.resolve("gsap/dist/gsap.min.js"), "utf8");

const tok = (s) => esc(s).replace(/\n/g, "<br>");

// ---------------------------------------------------------------- syntax highlighting
const CODE_KW = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "import", "export", "from", "async", "await", "new", "try", "catch",
  "throw", "typedef", "struct", "int", "void", "char", "bool", "float", "double",
  "unsigned", "size_t", "nullptr", "NULL", "true", "false", "static", "public", "private", "auto"
]);

function colorizeText(raw) {
  const tokenRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|\b(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[^\s\w]+|\s+)/g;
  let result = "";
  let match;
  while ((match = tokenRegex.exec(raw)) !== null) {
    const m = match[0];
    if (m.startsWith("//") || m.startsWith("/*")) {
      result += `<span class="tok-com">${esc(m)}</span>`;
    } else if ((m.startsWith('"') && m.endsWith('"')) || (m.startsWith("'") && m.endsWith("'")) || (m.startsWith("`") && m.endsWith("`"))) {
      result += `<span class="tok-str">${esc(m)}</span>`;
    } else if (/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)$/.test(m)) {
      result += `<span class="tok-num">${esc(m)}</span>`;
    } else if (CODE_KW.has(m)) {
      result += `<span class="tok-kw">${esc(m)}</span>`;
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(m)) {
      const rest = raw.slice(tokenRegex.lastIndex);
      if (/^\s*\(/.test(rest)) {
        result += `<span class="tok-fn">${esc(m)}</span>`;
      } else {
        result += esc(m);
      }
    } else {
      result += esc(m).replace(/\n/g, "<br>");
    }
  }
  return result;
}

function colorizeCode(raw) {
  if (!raw) return "";
  const str = String(raw);
  if (!str.includes("==") && !str.includes("~~")) {
    return colorizeText(str);
  }
  const parts = str.split(/(==.*?==|~~.*?~~)/g);
  return parts.map(part => {
    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
      const inner = part.slice(2, -2);
      return `<span class="hl-marker is-live-hl" data-hl="${esc(inner)}"><span class="hl-ink"></span><span class="hl-text">${colorizeText(inner)}</span></span>`;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      const inner = part.slice(2, -2);
      return `<span class="forensic-redact is-live-redact" data-redact="${esc(inner)}"><span class="redact-tape"><span class="redact-laser"></span></span><span class="redact-text">${colorizeText(inner)}</span></span>`;
    }
    return colorizeText(part);
  }).join("");
}

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
  const bubble = mascot.bubble ? `<div class="m-ov-bubble"><div class="m-ov-btext">${esc(mascot.bubble)}</div></div>` : (Array.isArray(mascot.timeline) && mascot.timeline.some(t => t.bubble) ? `<div class="m-ov-bubble" style="display:none"><div class="m-ov-btext"></div></div>` : "");

  const timeline = Array.isArray(mascot.timeline) ? mascot.timeline : [];
  const extraImgs = timeline.map((step, idx) => {
    const rawStepExpr = step.expression || "neutral";
    const stepExpr = rawStepExpr === "solved" ? "happy" : rawStepExpr;
    const stepSrc = MASCOT_IMAGES[stepExpr] || MASCOT_IMAGES["neutral"] || "";
    return `<img class="m-ov-avatar m-ov-avatar-step" data-step-idx="${idx}" data-expr="${esc(stepExpr)}" src="${stepSrc}" alt="${esc(stepExpr)}" style="opacity:0;position:absolute;inset:6px;z-index:2;" />`;
  }).join("");

  const hudTag = mascot.hud ? `<div class="m-ov-hud"><span class="m-ov-hud-scan"></span><span class="m-ov-hud-tag">${esc(mascot.hud)}</span></div>` : "";

  return `
  <div class="m-ov ${pos} m-expr-${expr}" data-expr="${esc(expr)}">
    ${hudTag}
    ${bubble}
    <div class="m-ov-avatar-wrap">
      <div class="m-ov-ring"></div>
      <div class="m-ov-glare"></div>
      <img class="m-ov-avatar" src="${imgSrc}" alt="${esc(expr)}" />
      ${extraImgs}
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
  const dur = s.end - s.start;
  const accent = s.accent || "#38bdf8";
  const id = `s${String(i + 1).padStart(3, "0")}`;
  const punchCls = s.meta?.punch || s.type === "meme" ? " has-punch" : "";
  const cls = `clip sc sc-${s.type} v${s.variant || 0}${punchCls}${s.type === "hero" && (s.meta?.image || s.meta?.video || s.meta?.logos) ? " has-evidence" : ""}${s.type === "webref" && s.meta?.image ? " has-screenshot" : ""}`;
  const inner = RENDER[s.type] ? RENDER[s.type](s, i) : RENDER.statement(s, i);
  const mascotOv = renderMascotOverlay(s.mascot);
  return `<section id="${id}" class="${cls}" data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="2" data-hold style="--ac:${accent}">
  <div class="sc-in" data-layout-allow-overflow>
    <div class="amb"></div>
    ${inner}
    ${mascotOv}
    ${s.meta?.source ? `<div class="source-credit">${esc(s.meta.source)}</div>` : ""}
  </div>
</section>`;
}

const eyebrow = (s) => (s.eyebrow ? `<div class="eyebrow"><span class="eyebrow-dot"></span><span>${esc(s.eyebrow)}</span></div>` : "");

const RENDER = {
  cold(s) {
    const ghost = s.ghost || s.meta?.ghost || project.ghost || String(project.title || "VIDEO").trim().split(/\s+/)[0].toUpperCase();
    return `
    <div class="cold-wrap">
      <div class="cold-ghost" data-layout-allow-overflow>${esc(ghost)}</div>
      <div class="cold-rule"></div>
      ${s.eyebrow ? `<div class="cold-eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <h1 class="cold-title">${splitWords(s.headline, s)}</h1>
      <div class="cold-sub">${esc(s.subline || "")}</div>
      <div class="cold-meta">
        ${(s.meta?.chips || []).map((c, k) => {
          const text = typeof c === "object" ? c.t || c.text || "" : String(c);
          const isBad = (typeof c === "object" && (c.bad || c.hot || c.status === "bad")) || /SEV|CRITICAL|FAIL|OUTAGE|0%/.test(text);
          const hasDot = text.startsWith("●") || isBad;
          const cleanText = text.replace(/^●\s*/, "");
          const dotHtml = hasDot ? `<span class="chip-dot ${isBad ? "chip-dot-bad" : "chip-dot-live"}"></span>` : "";
          const chipCls = `chip${isBad ? " chip-bad" : ""}`;
          return `<span class="${chipCls}" data-k="${k}">${dotHtml}<span>${esc(cleanText)}</span></span>`;
        }).join("")}
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
        ${s.meta?.image || s.meta?.video ? `<div class="evidence-frame"><div class="evidence-label">${esc(s.meta?.label || "INCIDENT EVIDENCE")}</div><div class="evidence-viewport"><img class="evidence-image" src="${esc(s.meta.image || s.meta.poster || "")}" alt="${esc(s.meta.alt || s.headline)}" style="object-position:${esc(s.meta.position || "center")}${s.meta.video ? ";visibility:hidden" : ""}" /></div>${s.meta.caption ? `<div class="evidence-caption">${esc(s.meta.caption)}</div>` : ""}</div>` : s.meta?.logos ? `<div class="brand-grid">${s.meta.logos.map(logo => `<div class="brand-item"><img src="${esc(logo.src)}" alt="${esc(logo.name)}" style="background:${/^#[0-9a-f]{6}$/i.test(logo.background || "") ? logo.background : "transparent"}" /><span>${esc(logo.name)}</span></div>`).join("")}</div>` : `<div class="hero-mark" style="--hero-mark-size:${markSize}px">${esc(mark)}</div>`}
        ${s.meta?.rule ? `<div class="hero-vrule"><span class="hero-vrule-dot"></span></div>` : ""}
      </div>
    </div>
    <div class="hero-baseline">
      <div class="hero-baseline-line"></div>
      <div class="hero-baseline-ticks"><span></span><span></span><span></span><span></span><span></span></div>
      ${s.meta?.tag ? `<div class="hero-baseline-tag">// ${esc(s.meta.tag)}</div>` : ""}
    </div>`;
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
    const delta = s.meta?.delta || "-100% COLLAPSE";
    const deltaDir = (s.meta?.deltaDir || "down") === "up" ? "delta-up" : "delta-down";
    const deltaArrow = deltaDir === "delta-up" ? "▲" : "▼";

    return `
    <div class="stat-stage">
      <div class="stat-ghost">${esc(value)}</div>
      ${eyebrow(s)}
      <div class="stat-main">
        ${prefix ? `<span class="stat-prefix">${esc(prefix)}</span>` : ""}
        <span class="stat-number" data-to="${esc(String(st.to ?? 0))}" data-dec="${st.dec || 0}" data-sep="${st.sep ? 1 : 0}" data-nocount="${st.nocount ? 1 : 0}"><span class="stat-reserve" aria-hidden="true">${esc(value)}</span><span class="stat-value">${esc(value)}</span></span>
        ${suffix ? `<span class="stat-suffix">${esc(suffix)}</span>` : ""}
        ${delta ? `<div class="stat-delta ${deltaDir}"><span class="stat-delta-arrow">${deltaArrow}</span><span>${esc(delta)}</span></div>` : ""}
      </div>
      <div class="stat-label">${splitWords(s.headline, s)}</div>
      ${s.subline ? `<div class="stat-sub">${esc(s.subline)}</div>` : ""}
      <div class="stat-ruler">
        <i></i><i></i><i></i><i></i><i></i>
        <div class="stat-ruler-fill"></div>
        <div class="stat-ruler-bead"></div>
      </div>
    </div>`;
  },

  dateline(s) {
    const date = s.meta?.date || {};
    const day = date.day || s.meta?.day || "";
    const month = date.month || s.meta?.mon || "";
    const year = date.year || s.meta?.yr || "";
    const ghost = s.meta?.ghost || year.split(/\s+/)[0] || day || "UTC";

    const timeMatch = year.match(/^(.*?)(\b(\d{1,2}):(\d{2}):(\d{2})\b)(.*)$/);
    let yrContent = esc(year);
    let chronoMeterHtml = "";

    if (timeMatch) {
      const prefix = timeMatch[1];
      const hh = parseInt(timeMatch[3], 10);
      const mm = parseInt(timeMatch[4], 10);
      const targetSec = parseInt(timeMatch[5], 10);
      const suffix = timeMatch[6];

      const timeSteps = [];
      for (let k = 0; k < 6; k++) {
        const offsetSec = targetSec - (5 - k);
        let totalSec = hh * 3600 + mm * 60 + offsetSec;
        if (totalSec < 0) totalSec += 86400;
        const curH = Math.floor(totalSec / 3600) % 24;
        const curM = Math.floor((totalSec % 3600) / 60);
        const curS = totalSec % 60;
        const stepStr = `${String(curH).padStart(2, "0")}:${String(curM).padStart(2, "0")}:${String(curS).padStart(2, "0")}`;
        timeSteps.push(stepStr);
      }

      yrContent = `${esc(prefix)}<span class="dl-clock-box">${timeSteps.map((t, idx) => 
        `<span class="dl-clock-step${idx === 5 ? " is-locked" : ""}" data-tick="${idx}">${esc(t)}</span>`
      ).join("")}</span>${esc(suffix)}`;

      chronoMeterHtml = `
        <div class="dl-chrono-gauge">
          <div class="dl-chrono-pips">
            ${timeSteps.map((_, idx) => `<span class="dl-pip" data-pip="${idx}"></span>`).join("")}
          </div>
          <span class="dl-chrono-status">SYNCING</span>
        </div>`;
    }

    return `
    <div class="dl-ghost">${esc(ghost)}</div>
    <div class="dl-grid">
      <div class="dl-date">
        <div class="dl-laser-line">
          <span class="dl-laser-bar"></span>
          <span class="dl-laser-dot"></span>
        </div>
        <div class="dl-day">${esc(day)}</div>
        <div class="dl-mon">${esc(month)}</div>
        <div class="dl-yr">${yrContent}</div>
        ${chronoMeterHtml}
      </div>
      <div class="dl-right">
        ${eyebrow(s)}
        <h2 class="dl-title">${splitWords(s.headline, s)}</h2>
        ${s.subline ? `<p class="dl-sub">${esc(s.subline)}</p>` : ""}
      </div>
    </div>
    <div class="dl-rail"><span></span><div class="dl-rail-bead"></div></div>`;
  },

  code(s) {
    const ghost = s.ghost || s.meta?.ghost || "";
    const rawLines = s.meta?.lines || [];
    const lines = rawLines.map((rawL, k) => {
      const l = typeof rawL === "string" ? { t: rawL } : (rawL || {});
      const kind = l.cls || l.k || (l.hot ? "hot" : "");
      const isBad = Boolean(l.bad || kind === "bad" || kind === "err");
      const cls = ["cl", l.key ? "is-key" : "", isBad ? "is-bad cl-err" : "", kind ? `cl-${kind}` : ""].filter(Boolean).join(" ");
      let rawText = l.c ?? l.t ?? l.text ?? "";
      if (l.redact && !rawText.includes("~~")) {
        rawText = `~~${rawText}~~`;
      }
      if (l.hl && !rawText.includes("==")) {
        rawText = `==${rawText}==`;
      }
      const content = colorizeCode(rawText);
      const beacon = isBad
        ? `<span class="cl-bad-beacon"><span class="cl-bad-beacon-dot"></span><span>▶ ZERO BACKOFF</span><span class="cl-bad-cursor"></span></span>`
        : "";
      return `<div class="${cls}" data-k="${k}"><span class="cl-n">${l.n ?? k + 1}</span><span class="cl-c">${content}${beacon}</span></div>`;
    });
    const file = s.meta?.file || "source";
    const tag = s.meta?.tag || "";
    const callout = s.meta?.announce || s.subline || "";
    const foot = callout
      ? `<div class="code-foot"><div class="code-callout">${splitWords(callout, s)}</div></div>`
      : "";
    return `
    ${ghost ? `<div class="code-ghost" data-layout-allow-overflow>${esc(ghost)}</div>` : ""}
    ${eyebrow(s)}
    ${s.headline ? `<h2 class="code-head">${splitWords(s.headline, s)}</h2>` : ""}
    <div class="code-shell">
      <div class="code-bar">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="mac-dots"><span></span><span></span><span></span></div>
          <span class="code-file">${esc(file)}</span>
        </div>
        ${tag ? `<span class="code-tag">${esc(tag)}</span>` : ""}
      </div>
      <div class="code-body">${lines.join("")}</div>
      <div class="code-scan"></div>
    </div>
    ${foot}`;
  },

  diff(s) {
    const ghost = s.ghost || s.meta?.ghost || "";
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
      const strike = kind === "del" ? `<span class="df-strike"></span>` : "";
      const tag = kind === "del"
        ? `<span class="df-tag df-tag-del">REMOVED</span>`
        : kind === "add"
          ? `<span class="df-tag df-tag-add">FIX APPLIED</span>`
          : "";
      return `<div class="df-line df-${kind}" data-k="${k}"><span class="df-sig">${sig}</span><span class="df-t">${colorizeCode(text)}${strike}${tag}</span></div>`;
    });
    const file = s.meta?.file || "source";
    const ver = s.meta?.ver || "";
    const verBadge = ver
      ? `<div class="df-ver-wrap">
          <span class="df-ver">${esc(ver)}</span>
          <div class="df-ver-sparkles">
            <span class="df-spk df-spk-1">✦</span>
            <span class="df-spk df-spk-2">✦</span>
            <span class="df-spk df-spk-3">✦</span>
            <span class="df-spk df-spk-4">✦</span>
          </div>
        </div>`
      : "";
    const callout = s.meta?.announce || s.subline || "";
    const foot = callout
      ? `<div class="diff-foot"><div class="diff-callout">${splitWords(callout, s)}</div></div>`
      : "";
    return `
    ${ghost ? `<div class="diff-ghost" data-layout-allow-overflow>${esc(ghost)}</div>` : ""}
    ${eyebrow(s)}
    ${s.headline ? `<h2 class="diff-head-title">${splitWords(s.headline, s)}</h2>` : ""}
    <div class="diff-shell">
      <div class="diff-head">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="mac-dots"><span></span><span></span><span></span></div>
          <span class="df-file">${esc(file)}</span>
        </div>
        ${verBadge}
      </div>
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
            (n, k) => `${k ? '<div class="flow-link"><svg viewBox="0 0 120 24" preserveAspectRatio="none"><path class="fl-p" d="M0 12 H104"/><path class="fl-a" d="M96 5 L110 12 L96 19"/><circle class="fl-packet" cx="0" cy="12" r="3.5" fill="var(--ac)"/></svg></div>' : ""}
          <div class="flow-node ${n.hot ? "is-hot" : ""} ${n.bad ? "is-bad" : ""}" data-k="${k}">
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
    const label = s.meta?.head || s.meta?.label || "AUDIT RECORD";
    const status = s.meta?.live || s.meta?.status || "VERIFIED";
    return `
    <div class="lg-grid">
      <div class="lg-left">
        <div class="lg-card">
          <div class="lg-head">
            <span>${esc(label)}</span>
            <span class="lg-live">${esc(status)}</span>
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
    const ghost = s.meta?.ghost || "CASCADE";
    const N = events.length;

    function parseTimeSec(tStr) {
      const m = String(tStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const sec = m[3] != null ? parseInt(m[3], 10) : 0;
      return h * 3600 + min * 60 + sec;
    }

    const deltas = [];
    for (let k = 0; k < N - 1; k++) {
      const t0 = parseTimeSec(events[k].t);
      const t1 = parseTimeSec(events[k + 1].t);
      let diffStr = "";
      if (t0 != null && t1 != null && t1 >= t0) {
        const diff = t1 - t0;
        diffStr = `+${diff}s`;
      }
      deltas.push(diffStr);
    }

    const deltasHtml = deltas.map((d, k) => {
      if (!d) return "";
      const pct = ((k + 0.5) / Math.max(1, N - 1)) * 100;
      return `<div class="tl-delta" data-seg="${k}" style="left:${pct.toFixed(2)}%"><span class="tl-delta-pill">${esc(d)}</span></div>`;
    }).join("");

    const eventsHtml = events.map((e, k) => {
      const pct = (k / Math.max(1, N - 1)) * 100;
      const isFirst = k === 0;
      const isLast = k === N - 1;
      const alignCls = isFirst ? " is-first" : (isLast ? " is-last" : " is-mid");
      return `
      <div class="tl-ev ${e.hot ? "is-hot" : ""}${alignCls}" data-k="${k}" style="left:${pct.toFixed(2)}%">
        <div class="tl-stem"></div>
        <div class="tl-dot-wrap">
          ${e.hot ? '<div class="tl-hot-ripple"></div><div class="tl-hot-ripple-2"></div>' : ""}
          <div class="tl-dot"></div>
        </div>
        <div class="tl-card">
          <div class="tl-t"><span class="tl-t-text">${esc(e.t)}</span>${e.hot ? `<span class="tl-hot-badge">CRITICAL</span>` : ""}</div>
          <div class="tl-s">${esc(e.s || "")}</div>
        </div>
      </div>`;
    }).join("");

    return `
    <div class="tl-ghost">${esc(ghost)}</div>
    ${eyebrow(s)}
    <h2 class="tl-head">${splitWords(s.headline, s)}</h2>
    ${s.subline ? `<div class="tl-sub">${esc(s.subline)}</div>` : ""}
    <div class="tl-stage">
      <div class="tl-line"><div class="tl-line-fill"></div></div>
      <div class="tl-deltas">${deltasHtml}</div>
      <div class="tl-play"></div>
      <div class="tl-events">${eventsHtml}</div>
    </div>`;
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
        <div style="display:flex;align-items:center;gap:14px">
          <div class="mac-dots"><span></span><span></span><span></span></div>
          <span>${esc(s.meta?.host || "terminal@idevak")}</span>
        </div>
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
    const mid = s.meta?.mid || s.meta?.vs || "VS";
    const points = (side) => (Array.isArray(side.pts) ? side.pts : [side.p || ""])
      .filter(Boolean).map(p => `<div class="cmp-p">${esc(p)}</div>`).join("");
    const longMid = mid.length > 3;
    return `
    ${eyebrow(s)}
    <div class="cmp-stage">
      <div class="cmp-col cmp-left">
        <div class="cmp-k">${esc(left.k || "BEFORE")}</div>
        <div class="cmp-t">${esc(left.t || "")}</div>
        ${points(left)}
      </div>
      <div class="cmp-mid"><div class="cmp-diamond"><span class="cmp-vs ${longMid ? "is-long" : ""}">${esc(mid)}</span></div></div>
      <div class="cmp-col cmp-right">
        <div class="cmp-k">${esc(right.k || "AFTER")}</div>
        <div class="cmp-t">${esc(right.t || "")}</div>
        ${points(right)}
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
              (l, k) => `<div class="stk-layer ${l.hot ? "is-hot" : ""} ${l.bad ? "is-bad" : ""}" data-k="${k}">
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
    const avatar = s.meta?.avatar;
    const authorInitials = s.meta?.initials || (s.subline ? s.subline.split(/[/,-]/)[0].trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() : "");
    const badgeHtml = avatar 
      ? `<div class="q-avatar"><img src="${esc(avatar)}" alt="author" /><span class="q-avatar-ring"></span></div>` 
      : authorInitials 
        ? `<div class="q-avatar q-avatar-mono"><span>${esc(authorInitials)}</span><span class="q-avatar-ring"></span></div>` 
        : "";

    return `
    <div class="q-stage">
      <div class="q-mark">&ldquo;</div>
      ${eyebrow(s)}
      <blockquote class="q-text">${splitWords(s.headline, s)}</blockquote>
      <div class="q-author-row">
        ${badgeHtml}
        <div class="q-author-info">
          <div class="q-by">${esc(s.subline || "")}</div>
          <div class="q-line"><span class="q-line-bar"></span><span class="q-line-dot"></span></div>
        </div>
      </div>
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
        ${customImg ? `<div class="web-screenshot-wrap"><img class="web-screenshot" src="${esc(customImg)}" alt="${esc(s.meta?.alt || docTitle)}" style="object-position:${esc(s.meta?.position || "top center")}" /></div>` : `
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
    const caption = s.meta?.caption || s.meta?.text || s.headline || "";
    const badge = s.meta?.badge || s.meta?.reaction || "SYSTEM PANIC";
    const sub = s.meta?.subtext || s.meta?.sub || s.subline || "";
    const image = s.meta?.image || MASCOT_IMAGES[s.meta?.expression] || "assets/mascot/shocked.png";

    return `
    <div class="meme-stage">
      <div class="meme-ghost">${esc(ghost)}</div>
      <div class="meme-badge"><span>INCIDENT_REPORT</span><b>${esc(badge)}</b></div>
      <div class="meme-card">
        <div class="meme-media-wrap">
          <img class="meme-img" src="${esc(image)}" alt="reaction" />
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
        ${s.meta?.flow ? `<div class="cloud-flow">${esc(s.meta.flow)}</div>` : ""}
        <div class="cloud-nodes">
          ${nodes.map((n, k) => `
            ${k > 0 ? `<div class="cloud-edge"><svg viewBox="0 0 100 24"><path d="M0 12 H90" class="cld-path"/><polygon points="90 8, 98 12, 90 16" class="cld-arrow"/><circle class="cld-packet" cx="0" cy="12" r="3.5" fill="var(--ac)"/></svg></div>` : ""}
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
    const ctaK = s.meta?.cta || project.cta || "SUBSCRIBE";
    const ytHandle = s.meta?.ctaSub || "youtube.com/@iDevak";
    const xHandle = s.meta?.twitter || "x.com/iDevakk";

    return `
    <div class="out-wrap">
      <div class="out-ghost">${esc(ghost)}<span class="out-ghost-laser"></span></div>
      ${eyebrow(s)}
      <h2 class="out-title">${splitWords(s.headline, s)}</h2>
      <div class="out-sub">${esc(s.subline || "")}</div>
      <div class="out-action-row">
        <div class="out-btn-pill">
          <span class="out-btn-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
          <span class="out-btn-label">${esc(ctaK)}</span>
          <span class="out-btn-glow"></span>
        </div>
        <div class="out-socials">
          <div class="out-social-badge yt">
            <svg class="out-soc-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span class="out-soc-text">${esc(ytHandle)}</span>
          </div>
          <div class="out-social-badge tw">
            <svg class="out-soc-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span class="out-soc-text">${esc(xHandle)}</span>
          </div>
        </div>
      </div>
    </div>`;
  },

  split(s) {
    const left = s.meta?.left || {};
    const right = s.meta?.right || {};
    const tag = s.meta?.tag || "INCIDENT INVESTIGATION";
    const leftTitle = left.title || "ATTACK VECTOR";
    const leftBadge = left.badge || "SHELL";
    const leftLines = (left.lines || []).map((rawL, k) => {
      const l = typeof rawL === "string" ? { t: rawL } : (rawL || {});
      const kind = l.k || (l.cmd ? "cmd" : l.err ? "err" : "out");
      const pfx = kind === "cmd" ? "$" : ">";
      return `<div class="sp-line sp-${kind}" data-k="${k}"><span class="sp-pfx">${pfx}</span><span class="sp-t">${colorizeCode(l.t || l.cmd || "")}</span></div>`;
    });

    const rightTitle = right.title || "TARGET IMPACT";
    const rightStatus = right.status || "COMPROMISED";
    const isBad = !right.ok && (right.bad || /compromised|breached|corrupted|vulnerable|fail/i.test(rightStatus));
    const rightPts = (right.pts || []).map((p, k) => `
      <div class="sp-pt" data-k="${k}">
        <span class="sp-pt-dot ${isBad ? "is-bad" : "is-ok"}"></span>
        <span>${esc(p)}</span>
      </div>
    `).join("");

    return `
    <div class="split-stage">
      ${eyebrow(s)}
      <div class="split-header">
        <span class="split-tag">${esc(tag)}</span>
        <span class="split-label">DUAL-PANE FORENSIC INVESTIGATION</span>
      </div>
      <div class="split-grid">
        <div class="split-pane split-left">
          <div class="split-pane-bar">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="mac-dots"><span></span><span></span><span></span></div>
              <span class="split-pane-title">${esc(leftTitle)}</span>
            </div>
            <span class="split-pane-badge">${esc(leftBadge)}</span>
          </div>
          <div class="split-pane-body split-term-body">
            ${leftLines.join("")}
          </div>
        </div>
        <div class="split-connector">
          <svg viewBox="0 0 48 48" class="split-conn-svg">
            <path class="sp-conn-p" d="M 6 24 L 40 24"/>
            <path class="sp-conn-a" d="M 30 16 L 40 24 L 30 32"/>
            <circle class="sp-conn-pkt" cx="6" cy="24" r="4.5" fill="var(--ac)"/>
          </svg>
        </div>
        <div class="split-pane split-right ${isBad ? "is-bad" : "is-ok"}">
          <div class="split-pane-bar">
            <span class="split-pane-title">${esc(rightTitle)}</span>
            <span class="split-status-badge ${isBad ? "is-bad" : "is-ok"}">${esc(rightStatus)}</span>
          </div>
          <div class="split-pane-body split-diag-body">
            ${rightPts}
          </div>
        </div>
      </div>
      <div class="split-foot">
        ${s.headline ? `<h2 class="split-title">${splitWords(s.headline, s)}</h2>` : ""}
        ${s.subline ? `<p class="split-sub">${esc(s.subline)}</p>` : ""}
      </div>
    </div>`;
  },
};

// ---------------------------------------------------------------- document
const body = scenes.map(renderScene).join("\n");
// Timed media lives beside scenes, never inside a plain timed section. This
// keeps source seeking and visibility on the same global clock in HyperFrames.
const evidenceVideos = scenes.map((s, i) => s.type === "hero" && s.meta?.video
  ? `<video id="evidence-video-${i + 1}" class="clip evidence-video" src="${esc(s.meta.video)}" poster="${esc(s.meta.image || s.meta.poster || "")}" data-start="${s.start.toFixed(3)}" data-duration="${(s.end - s.start).toFixed(3)}" data-media-start="${Number(s.meta.mediaStart || 0)}" data-track-index="4" muted playsinline preload="metadata"></video>`
  : "").join("\n");

const hasSubtitles = Boolean(project.subtitles || project.karaoke);
const bgm = project.bgm || project.music || null;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${width}, height=${height}" />
<title>${esc(title)}</title>
<script>${gsapJS}</script>
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
<div id="root" class="${isPortrait ? "is-portrait" : "is-landscape"}" data-aspect="${isPortrait ? "9:16" : "16:9"}" data-composition-id="${esc(compositionId)}" data-start="0" data-width="${width}" data-height="${height}" data-fps="${fps}" data-duration="${total.toFixed(3)}">
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
  ${evidenceVideos}
  ${hasSubtitles ? `<div id="retention-subtitles" class="retention-subtitles"><div class="retention-sub-track"></div></div>` : ""}
  ${bgm ? `<audio id="bgm" src="${esc(bgm)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="5" data-volume="0.18"></audio>` : ""}
  <audio id="vo" src="${esc(audio)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="1" data-volume="1"></audio>
  <audio id="sfx" src="build/sfx_track.wav" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="3" data-volume="1"></audio>
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
  hasEvidence: Boolean(s.meta?.image || s.meta?.video || s.meta?.logos),
  revealTime: s.revealTime ?? null,
  mascotExpr: s.mascot?.expression || (s.type === "mascot" ? (s.meta?.expression || "neutral") : null),
  mascotTimeline: s.mascot?.timeline || null,
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

await bakeSFX(html, Number(total.toFixed(3)), path.resolve(ROOT, "build/sfx_track.wav"));
await fs.writeFile(path.resolve(ROOT, "index.html"), html, "utf8");
await fs.writeFile(path.resolve(ROOT, "hyperframes.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
console.log(`index.html written: ${scenes.length} scenes, ${total.toFixed(1)}s`);
console.log(`hyperframes.json written: ${meta.name}`);
