// Dedicated renderer for the 'motion-explainer' style preset (v2 - Studio Motion Graphics).
// Completely self-contained: does NOT load engine/style.css or engine/anim.js,
// ensuring zero Cyber-Tech or chalkboard font/visual leakage.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRESET_DIR = path.dirname(fileURLToPath(import.meta.url));

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\/\*/g, "&#47;*")
    .replace(/\*\//g, "*&#47;");

export const ME_PALETTE = {
  emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.14)", text: "#34d399", solid: "#22c55e", dark: "#059669" },
  orange:  { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.14)", text: "#fb923c", solid: "#ea580c", dark: "#c2410c" },
  blue:    { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.14)", text: "#7dd3fc", solid: "#0ea5e9", dark: "#0369a1" },
  red:     { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.14)",  text: "#f87171", solid: "#dc2626", dark: "#991b1b" },
  amber:   { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.14)", text: "#fbbf24", solid: "#d97706", dark: "#92400e" },
  violet:  { stroke: "#a78bfa", fill: "rgba(167, 139, 250, 0.14)", text: "#c4b5fd", solid: "#8b5cf6", dark: "#5b21b6" },
  slate:   { stroke: "rgba(226, 232, 240, 0.36)", fill: "rgba(226, 232, 240, 0.06)", text: "#e2e8f0", solid: "#475569", dark: "#334155" },
};

function resolveColor(name, fallback = "emerald") {
  if (!name) return ME_PALETTE[fallback] || ME_PALETTE.emerald;
  if (ME_PALETTE[name]) return ME_PALETTE[name];
  if (/^#[0-9a-fA-F]{6}$/.test(name)) {
    return { stroke: name, fill: `${name}22`, text: name, solid: name, dark: name };
  }
  return ME_PALETTE[fallback] || ME_PALETTE.emerald;
}

function meIcon(name, stroke = "#e2e8f0", size = 22) {
  const paths = {
    lock: `<rect x="7" y="11" width="10" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/><circle cx="12" cy="15.5" r="1" fill="${stroke}"/>`,
    chat: `<path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M7 10h10M7 14h6"/>`,
    gear: `<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>`,
    check: `<polyline points="5 12.5 10 17.5 19 7"/>`,
    cross: `<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>`,
    code: `<polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/><line x1="13.5" y1="5" x2="10.5" y2="19"/>`,
    terminal: `<rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="7 9 11 12 7 15"/><line x1="13" y1="15" x2="17" y2="15"/>`,
    memory: `<rect x="4" y="5" width="16" height="5" rx="1.5"/><rect x="4" y="14" width="16" height="5" rx="1.5"/><circle cx="7.5" cy="7.5" r="0.9" fill="${stroke}"/><circle cx="7.5" cy="16.5" r="0.9" fill="${stroke}"/>`,
    doc: `<path d="M6 3h8l4 4v14H6z"/><polyline points="14 3 14 7 18 7"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>`,
    play: `<polygon points="7,5 19,12 7,19" fill="${stroke}" stroke="none"/>`,
    spark: `<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>`,
    layers: `<polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 13 12 18 21 13"/><polyline points="3 18 12 23 21 18"/>`,
    server: `<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><circle cx="7" cy="7.5" r="1" fill="${stroke}"/><circle cx="7" cy="16.5" r="1" fill="${stroke}"/>`,
    shield: `<path d="M12 3l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3z"/>`,
    "trend-up": `<polyline points="4 17 10 11 14 14 20 7"/><polyline points="15 7 20 7 20 12"/>`,
    eye: `<path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>`,
  };
  const body = paths[name] || paths.spark;
  return `<svg class="me-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function isoCubeSvg(pal, { icon = "lock", size = 230, dashed = false, platform = true } = {}) {
  const dashAttr = dashed ? 'stroke-dasharray="6 5"' : "";
  const faceOp = dashed ? "0.16" : "1";
  return `<svg class="me-iso-cube" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">
    ${platform ? `<ellipse cx="100" cy="162" rx="86" ry="24" fill="rgba(255,255,255,0.035)" stroke="${pal.stroke}" stroke-opacity="0.38" stroke-width="1.3"/>` : ""}
    <g opacity="${faceOp}">
      <polygon points="100,22 168,60 100,98 32,60" fill="#323946" stroke="rgba(255,255,255,0.26)" stroke-width="1.3" ${dashAttr}/>
      <polygon points="32,60 100,98 100,168 32,130" fill="#212631" stroke="rgba(255,255,255,0.20)" stroke-width="1.3" ${dashAttr}/>
      <polygon points="100,98 168,60 168,130 100,168" fill="#151922" stroke="rgba(255,255,255,0.20)" stroke-width="1.3" ${dashAttr}/>
      <polygon points="62,53 78,44 92,52 76,61" fill="rgba(255,255,255,0.09)"/>
      <polygon points="116,72 134,62 148,70 130,80" fill="rgba(255,255,255,0.08)"/>
      <rect x="48" y="92" width="16" height="16" rx="2" transform="skewY(28)" fill="rgba(255,255,255,0.07)"/>
      <rect x="72" y="102" width="12" height="12" rx="2" transform="skewY(28)" fill="rgba(255,255,255,0.055)"/>
      <rect x="118" y="130" width="16" height="16" rx="2" transform="skewY(-28)" fill="rgba(255,255,255,0.055)"/>
    </g>
    ${dashed ? `<polygon points="100,22 168,60 168,130 100,168 32,130 32,60" fill="none" stroke="${pal.stroke}" stroke-width="2" stroke-dasharray="6 5"/>` : ""}
    ${!dashed && icon ? `<g transform="translate(116, 94) scale(1.18)">
      <rect x="0" y="0" width="28" height="28" rx="7" fill="rgba(8,12,16,0.92)" stroke="${pal.stroke}" stroke-width="1.6"/>
      <g transform="translate(2, 2)">${meIcon(icon, pal.text, 24).replace(/<\/?svg[^>]*>/g, "")}</g>
    </g>` : ""}
  </svg>`;
}

function orbitRingSvg(pal, size = 440, innerColor = ME_PALETTE.orange) {
  const c = size / 2;
  const rOuter = size * 0.44;
  const rInner = size * 0.35;
  return `<svg class="me-orbit-svg" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
    <circle class="me-ring-arc" cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="${pal.stroke}" stroke-width="5.2" stroke-linecap="round" stroke-dasharray="${(rOuter * 1.48).toFixed(1)} ${(rOuter * 0.62).toFixed(1)} ${(rOuter * 1.12).toFixed(1)} ${(rOuter * 0.78).toFixed(1)}"/>
    <circle class="me-ring-inner" cx="${c}" cy="${c}" r="${rInner}" fill="none" stroke="${innerColor.stroke}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="${(rInner * 1.8).toFixed(1)} ${(rInner * 2.2).toFixed(1)}"/>
    <circle cx="${c}" cy="${c}" r="${(rInner * 0.88).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" stroke-dasharray="3 9"/>
  </svg>`;
}

function curvedArrowSvg(w = 200, h = 100, pal = ME_PALETTE.orange) {
  const d = `M 12 ${(h * 0.24).toFixed(1)} C ${(w * 0.44).toFixed(1)} ${(h * 0.20).toFixed(1)}, ${(w * 0.56).toFixed(1)} ${(h * 0.80).toFixed(1)}, ${w - 18} ${(h * 0.76).toFixed(1)}`;
  return `<svg class="me-arrow-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path class="me-draw-path" d="${d}" fill="none" stroke="${pal.stroke}" stroke-width="2.8" stroke-linecap="round"/>
    <circle class="me-arrow-dot" cx="12" cy="${(h * 0.24).toFixed(1)}" r="4.5" fill="${pal.text}"/>
    <polygon class="me-arrow-head" points="${w - 22},${h * 0.76 - 7} ${w - 7},${h * 0.76} ${w - 22},${h * 0.76 + 7}" fill="${pal.stroke}"/>
  </svg>`;
}

function curlyBraceSvg(h = 440, color = "#94a3b8") {
  const mid = h / 2;
  const d = `M 92 14 C 52 14, 58 ${mid - 28}, 22 ${mid} C 58 ${mid + 28}, 52 ${h - 14}, 92 ${h - 14}`;
  return `<svg class="me-tier-brace" width="110" height="${h}" viewBox="0 0 110 ${h}" aria-hidden="true">
    <path class="me-draw-path" d="${d}" fill="none" stroke="${color}" stroke-opacity="0.72" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
}

function waveformBarsSvg(color = "rgba(15, 23, 42, 0.75)") {
  const hs = [14, 24, 18, 30, 16, 26, 12];
  return `<svg width="40" height="36" viewBox="0 0 40 36" aria-hidden="true">
    ${hs.map((hv, i) => `<rect x="${2 + i * 5.2}" y="${(36 - hv) / 2}" width="2.8" height="${hv}" rx="1.2" fill="${color}"/>`).join("")}
  </svg>`;
}

function attentionArcSvg(seed = 0) {
  const pts = [20, 56, 92, 128, 164, 200, 236, 272];
  const arcs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = pts[i];
    const x2 = pts[Math.min(pts.length - 1, i + 1 + ((i + seed) % 2))];
    const cy = 28 - (i % 3) * 7 - ((seed + i) % 2) * 5;
    arcs.push(`<path class="me-attn-arc" d="M ${x1} 30 Q ${(x1 + x2) / 2} ${cy} ${x2} 30" fill="none" stroke="rgba(248, 113, 113, 0.45)" stroke-width="1.3"/>`);
  }
  const dots = pts.map((x) => `<circle cx="${x}" cy="30" r="2.2" fill="rgba(226, 232, 240, 0.48)"/>`).join("");
  return `<svg width="290" height="36" viewBox="0 0 290 36" aria-hidden="true">${arcs.join("")}${dots}</svg>`;
}

function renderBrowserFrame(src, urlText, tabTitle) {
  const label = tabTitle || (urlText ? urlText.replace(/^https?:\/\//, "").split("/")[0] : "evidence");
  return `<div class="me-browser-win">
    <div class="me-browser-bar">
      <div class="me-win-dots"><span class="me-win-dot" style="background:#ef4444"></span><span class="me-win-dot" style="background:#f59e0b"></span><span class="me-win-dot" style="background:#10b981"></span></div>
      <div class="me-browser-tab">${esc(label)}</div>
    </div>
    ${urlText ? `<div class="me-browser-urlbar">${meIcon("lock", "#94a3b8", 14)}<span>${esc(urlText)}</span></div>` : ""}
    <img class="me-browser-img" src="${esc(src)}" alt=""/>
  </div>`;
}

function stopwatchDialSvg(seconds, maxSec = 15, pal = ME_PALETTE.orange, splitText = "") {
  const size = 420, c = 210, r = 162;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0.03, Math.min(0.95, Number(seconds || 10.5) / Number(maxSec || 15)));
  const dash = (circ * frac).toFixed(1);
  const ticks = Array.from({ length: 12 }, (_, idx) => {
    const ang = (idx * 30 - 90) * (Math.PI / 180);
    const r1 = r - 12, r2 = r + 4;
    return `<line x1="${(c + Math.cos(ang) * r1).toFixed(1)}" y1="${(c + Math.sin(ang) * r1).toFixed(1)}" x2="${(c + Math.cos(ang) * r2).toFixed(1)}" y2="${(c + Math.sin(ang) * r2).toFixed(1)}" stroke="rgba(255,255,255,0.45)" stroke-width="${idx % 3 === 0 ? 2.8 : 1.4}"/>`;
  }).join("");

  return `<svg class="me-dial-svg" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <rect x="${c - 22}" y="12" width="44" height="14" rx="4" fill="#1e293b" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="rgba(16, 20, 27, 0.9)" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <circle cx="${c}" cy="${c}" r="${r - 44}" fill="rgba(10, 14, 19, 0.96)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
    <circle class="me-dial-arc" cx="${c}" cy="${c}" r="${r - 22}" fill="none" stroke="${pal.stroke}" stroke-width="34" stroke-dasharray="${dash} ${circ.toFixed(1)}" transform="rotate(-90 ${c} ${c})" data-circ="${circ.toFixed(1)}" data-dash="${dash}"/>
    ${splitText ? `<circle cx="${c}" cy="${c}" r="${r - 22}" fill="none" stroke="#10b981" stroke-width="34" stroke-dasharray="28 ${circ.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>
      <text x="${c + 52}" y="30" fill="#34d399" font-family="JetBrains Mono, monospace" font-size="22" font-weight="700">${esc(splitText)}</text>` : ""}
    ${ticks}
    <text x="${c + r + 26}" y="${c + 6}" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">5</text>
    <text x="${c}" y="${c + r + 34}" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">10</text>
    <text x="${c - r - 30}" y="${c + 6}" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">15</text>
    <text class="me-dial-num" x="${c}" y="${c + 16}" text-anchor="middle" fill="${pal.text}" font-family="JetBrains Mono, monospace" font-size="60" font-weight="800">${countSpan(`${seconds}`, "")}<tspan font-size="28" fill="#94a3b8"> s</tspan></text>
  </svg>`;
}

function renderPill(text, colorName = "slate", { mono = false, icon = null, extraClass = "" } = {}) {
  if (!text) return "";
  const pal = resolveColor(colorName, "slate");
  return `<div class="me-pill ${mono ? "is-mono" : ""} ${extraClass}">
    ${icon ? meIcon(icon, pal.text, 19) : `<span class="me-pill-dot" style="background:${pal.stroke}"></span>`}
    <span>${esc(text)}</span>
  </div>`;
}

function renderEyebrow(s) {
  return s.eyebrow ? `<div class="me-eyebrow">${esc(s.eyebrow)}</div>` : "";
}

function parseNumericTarget(val) {
  const m = String(val || "").trim().match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return null;
  const dec = (m[2].split(".")[1] || "").length;
  return { sign: m[1], target: num, dec, suffix: m[3] || "" };
}

function countSpan(val, cls = "") {
  const parsed = parseNumericTarget(val);
  if (!parsed) return `<span class="${cls}">${esc(val)}</span>`;
  return `<span class="me-count ${cls}" data-count-sign="${esc(parsed.sign)}" data-count-target="${parsed.target}" data-count-dec="${parsed.dec}" data-count-suffix="${esc(parsed.suffix)}">${esc(val)}</span>`;
}

function formatHeroHeadline(headline) {
  const raw = esc(headline || "");
  if (raw.endsWith("?")) {
    return `${raw.slice(0, -1)}<span class="me-hero-qmark">?</span>`;
  }
  return raw;
}

function buildRenderers({ stageAsset }) {
  function renderLogoPlate(src, { name = "", bg = "", height = 36 } = {}) {
    const plateStyle = bg ? `background:${bg};color:#0f172a;border-color:rgba(255,255,255,0.45)` : "";
    return `<div class="me-logo-badge" ${plateStyle ? `style="${esc(plateStyle)}"` : ""}>
      <img src="${esc(stageAsset(src))}" alt="" style="height:${height}px;width:auto"/>
      ${name ? `<span class="me-pill is-mono" style="border:none;padding:0;background:transparent;color:${bg ? "#0f172a" : "var(--me-ink)"}">${esc(name)}</span>` : ""}
    </div>`;
  }

  function renderTopLogos(m, badgeText, palColor) {
    if (Array.isArray(m.logos) && m.logos.length) {
      return `<div class="me-logos-strip">${m.logos.map((lg) => {
        const obj = typeof lg === "string" ? { src: lg } : lg;
        return renderLogoPlate(obj.src, { name: obj.name || "", bg: obj.background || m.logoBackground || "", height: 34 });
      }).join("")}${badgeText ? renderPill(badgeText, palColor, { mono: true }) : ""}</div>`;
    }
    if (m.logo) {
      return renderLogoPlate(m.logo, { name: badgeText || "", bg: m.logoBackground || "", height: 38 });
    }
    return badgeText ? renderPill(badgeText, palColor, { mono: true }) : "";
  }

  const R = {
    me_title: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");
      const pills = (m.pills || []).map((p) => {
        const obj = typeof p === "string" ? { text: p, color: "slate" } : p;
        return renderPill(obj.text, obj.color || "slate", { mono: Boolean(obj.mono), icon: obj.icon });
      }).join("");
      const wm = m.watermark ? `<div class="me-watermark">${esc(m.watermark)}</div>` : "";
      const highlight = m.highlight ? `<div class="me-hero-highlight">${esc(m.highlight)}</div>` : "";
      const hasLogo = Boolean(m.logo || (Array.isArray(m.logos) && m.logos.length));
      const coreHtml = m.image
        ? `<div style="width:760px;max-width:100%">${renderBrowserFrame(stageAsset(m.image), m.browserUrl || "", m.browserTab || "")}</div>`
        : (m.showCore && !hasLogo ? `<div class="me-title-core">${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 176 })}</div>` : "");

      return `<div class="me-stage me-stage-title">
        ${renderEyebrow(s)}
        <div class="me-title-wrap">
          ${wm}
          ${renderTopLogos(m, m.badge, m.color || "orange")}
          <h1 class="me-hero-headline">${formatHeroHeadline(s.headline)}</h1>
          ${highlight}
          ${s.subline ? `<p class="me-hero-sub">${esc(s.subline)}</p>` : ""}
          ${coreHtml}
          ${pills ? `<div class="me-title-pills">${pills}</div>` : ""}
        </div>
      </div>`;
    },

    me_core_orbit: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "emerald");
      const arrowPal = resolveColor(m.arrowColor, "orange");
      const nodes = (m.orbitNodes || []).slice(0, 4);
      const posStyles = [
        "top:13%; left:-10%;",
        "top:15%; right:-12%;",
        "bottom:14%; left:-8%;",
        "bottom:14%; right:-10%;",
      ];
      const nodesHtml = nodes.map((n, idx) => {
        const obj = typeof n === "string" ? { label: n } : n;
        const np = resolveColor(obj.color, m.color || "emerald");
        return `<div class="me-orbit-node" data-idx="${idx}" style="${posStyles[idx % posStyles.length]} border-color:${np.stroke}88">
          <span class="me-node-medallion" style="color:${np.stroke}">${meIcon(obj.icon || "spark", np.text, 17)}</span>
          <span>${esc(obj.label || "")}</span>
        </div>`;
      }).join("");

      const centerLogo = m.coreLogo || m.logo;
      const inferredHubTitle = m.coreLabel || (m.topPill && m.topPill.includes("·") ? m.topPill.split("·").slice(1).join("·").trim() : "");
      let centerVisual = "";
      if (centerLogo) {
        const plateBg = m.coreBackground || m.logoBackground || "";
        centerVisual = `<div class="me-orbit-hub is-logo" style="border-color:${pal.stroke};${plateBg ? `background:${esc(plateBg)};` : ""}">
          <img src="${esc(stageAsset(centerLogo))}" alt=""/>
          ${inferredHubTitle ? `<div class="me-orbit-hub-title" style="${plateBg ? "color:#0f172a" : ""}">${esc(inferredHubTitle)}</div>` : ""}
        </div>`;
      } else if (m.image) {
        centerVisual = `<div class="me-orbit-hub is-image" style="border-color:${pal.stroke}">
          <img src="${esc(stageAsset(m.image))}" alt=""/>
        </div>`;
      } else if (m.showCube === true || (!inferredHubTitle && m.coreIcon === "lock")) {
        centerVisual = isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 245 });
      } else {
        centerVisual = `<div class="me-orbit-hub" style="border-color:${pal.stroke}">
          <span class="me-node-medallion" style="width:58px;height:58px;color:${pal.stroke}">${meIcon(m.coreIcon || "layers", pal.text, 28)}</span>
          <div class="me-orbit-hub-title">${esc(inferredHubTitle || s.headline)}</div>
        </div>`;
      }

      let sideHtml = "";
      if (m.targetImage) {
        sideHtml = `<div class="me-orbit-side" style="width:460px">
          ${renderBrowserFrame(stageAsset(m.targetImage), m.targetLabel || "", m.targetLabel || "evidence")}
        </div>`;
      } else if (m.targetBar) {
        const bp = resolveColor(m.targetBar.color, "orange");
        const pct = Math.max(18, Math.min(92, Number(m.targetBar.pct || 72)));
        sideHtml = `<div class="me-orbit-side" style="height:400px;width:210px;justify-content:flex-end">
          <div class="me-bars-row" style="height:360px;width:100%;padding:0;gap:0">
            <div class="me-bar-col" style="max-width:190px">
              ${m.targetBar.delta ? `<div class="me-bar-delta" style="color:${bp.text}">${countSpan(m.targetBar.delta)}</div>` : ""}
              <div class="me-bar-value-top" style="color:${bp.text}">${countSpan(m.targetBar.value)}</div>
              <div class="me-bar-shell" style="height:${pct}%">
                <div class="me-bar-fill" style="height:100%;background:linear-gradient(180deg, ${bp.text} 0%, ${bp.solid} 100%)"></div>
              </div>
              <div class="me-bar-label">${esc(m.targetBar.label)}</div>
            </div>
          </div>
        </div>`;
      } else if (m.modal) {
        const mp = resolveColor(m.modal.color, "orange");
        sideHtml = `<div class="me-modal-card">
          <div class="me-modal-bar">
            <span><span class="me-pill-dot" style="display:inline-block;background:${mp.stroke};margin-right:8px"></span>${esc(m.modal.title || "STATUS")}</span>
            <span>●</span>
          </div>
          <div class="me-modal-body">${esc(m.modal.body || "")}</div>
        </div>`;
      } else if (m.targetLogo) {
        const tBg = m.targetBackground || m.logoBackground || "";
        sideHtml = `<div class="me-orbit-side">
          <div class="me-orbit-hub is-logo" style="border-color:${pal.stroke};${tBg ? `background:${esc(tBg)};` : ""}">
            <img src="${esc(stageAsset(m.targetLogo))}" alt=""/>
          </div>
          ${m.targetLabel ? renderPill(m.targetLabel, m.color || "emerald", { icon: m.targetIcon || "spark" }) : ""}
        </div>`;
      } else if (m.targetLabel) {
        if (m.showTargetCube === true) {
          sideHtml = `<div class="me-orbit-side">
            <div class="me-orbit-stage" style="width:300px;height:260px">
              <div class="me-orbit-glow" style="width:220px;height:220px;background:${pal.stroke}"></div>
              ${orbitRingSvg(pal, 260, arrowPal)}
              ${isoCubeSvg(pal, { icon: m.targetIcon || "code", size: 160, dashed: Boolean(m.targetDashed) })}
            </div>
            ${renderPill(m.targetLabel, m.color || "emerald", { icon: m.targetIcon || "spark" })}
          </div>`;
        } else {
          sideHtml = `<div class="me-orbit-side">
            <div class="me-target-card ${m.targetDashed ? "is-dashed" : ""}" style="border-color:${pal.stroke}">
              <span class="me-node-medallion" style="width:52px;height:52px;color:${pal.stroke}">${meIcon(m.targetIcon || "server", pal.text, 26)}</span>
              <div style="font-size:26px;font-weight:700">${esc(m.targetLabel)}</div>
              ${m.targetSub ? `<div style="font-family:var(--mono);font-size:17px;color:var(--me-dim)">${esc(m.targetSub)}</div>` : ""}
            </div>
          </div>`;
        }
      } else if (m.memoryDeck?.length) {
        const d0 = m.memoryDeck[0];
        sideHtml = `<div class="me-deck-wrap">
          <div class="me-deck-layer" style="transform:translate(14px, -14px);opacity:0.4"></div>
          <div class="me-deck-layer" style="transform:translate(7px, -7px);opacity:0.65"></div>
          <div class="me-deck-front">
            <div class="me-deck-tag">${esc(d0.tag || "P5")}</div>
            <div style="font-size:21px;color:var(--me-dim)">${esc(d0.label || "memory")}</div>
          </div>
        </div>`;
      }

      return `<div class="me-stage me-stage-orbit">
        ${renderEyebrow(s)}
        <div class="me-orbit-layout">
          <div class="me-orbit-stage">
            <div class="me-orbit-glow" style="background:${pal.stroke}"></div>
            ${m.watermark ? `<div class="me-watermark" style="font-size:320px">${esc(m.watermark)}</div>` : ""}
            ${m.topPill ? `<div class="me-orbit-top">${renderPill(m.topPill, "slate", { mono: true })}</div>` : ""}
            ${orbitRingSvg(pal, 460, arrowPal)}
            ${centerVisual}
            ${nodesHtml}
            ${m.bottomPill ? `<div class="me-orbit-bottom">${renderPill(m.bottomPill, m.color || "emerald")}</div>` : ""}
          </div>
          ${sideHtml ? `
            <div class="me-orbit-arrow-wrap">
              ${curvedArrowSvg(210, 105, arrowPal)}
              ${m.arrowLabel ? `<div class="me-orbit-arrow-label">${renderPill(m.arrowLabel, m.arrowColor || "orange", { mono: true })}</div>` : ""}
            </div>
            ${sideHtml}
          ` : ""}
        </div>
      </div>`;
    },

    me_bar_compare: (s) => {
      const m = s.meta || {};
      const headerLeft = `<div style="display:flex;align-items:center;gap:18px">
        ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:40px;width:auto"/>` : ""}
        <h2 class="me-bar-title">${esc(m.header || s.headline || "")}</h2>
      </div>`;
      const headerRight = m.badge ? renderPill(m.badge, m.deltaColor || "slate", { mono: true }) : "";
      const bracketHtml = m.bracketLabel ? `<div class="me-bracket-bar"><div class="me-bracket-text">${esc(m.bracketLabel)}</div><div class="me-bracket-line"></div></div>` : "";

      if (m.groups?.length) {
        const groupsHtml = m.groups.map((g, gi) => {
          const gBars = (g.bars || []).map((gb, bi) => {
            const bp = resolveColor(gb.color, bi === 0 ? "orange" : "emerald");
            const pct = Math.max(10, Math.min(100, Number(gb.pct || 50)));
            return `<div class="me-bar-col" data-idx="${gi}-${bi}">
              <div class="me-bar-value-top" style="color:${bp.text};font-size:24px">${countSpan(gb.value)}</div>
              <div class="me-bar-shell" style="height:${pct}%">
                <div class="me-bar-fill" style="height:100%;background:linear-gradient(180deg, ${bp.text} 0%, ${bp.solid} 100%)"></div>
              </div>
              <div class="me-bar-label" style="font-size:18px">${esc(gb.label)}</div>
            </div>`;
          }).join("");
          return `<div class="me-group-box ${g.active ? "is-active" : ""}" data-idx="${gi}">
            <div style="display:flex;align-items:center;gap:10px">
              ${g.check ? meIcon("check", "#34d399", 24) : ""}
              ${renderPill(g.title, g.active ? (g.color || "orange") : "slate", { mono: false })}
            </div>
            <div class="me-group-bars">${gBars}</div>
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-bars">
          ${renderEyebrow(s)}
          <div class="me-bar-head">${headerLeft}${headerRight}</div>
          ${bracketHtml}
          <div class="me-groups-grid">${groupsHtml}</div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      if (m.scoreRows?.length) {
        const rowsHtml = m.scoreRows.map((sr, ri) => {
          const sp = resolveColor(sr.color, sr.active ? "orange" : "slate");
          const totalSlots = Math.max(2, Math.min(6, Number(sr.totalSlots || 3)));
          const okCount = Number(sr.okCount || 0);
          const slotsHtml = Array.from({ length: totalSlots }, (_, si) => {
            const isOk = si < okCount;
            return `<span class="me-score-slot ${isOk ? "is-ok" : ""}">${isOk ? meIcon("check", "#34d399", 22) : ""}</span>`;
          }).join("");
          return `<div class="me-score-row ${sr.active ? "is-active" : ""}" data-idx="${ri}">
            <span style="font-size:28px;font-weight:700;color:${sr.active ? sp.text : "var(--me-ink)"};min-width:170px">${esc(sr.label)}</span>
            <div class="me-score-slots">${slotsHtml}</div>
            ${sr.score ? renderPill(sr.score, sr.active ? (sr.color || "orange") : "slate", { mono: true }) : ""}
          </div>`;
        }).join("");

        const cm = m.contextMeter;
        const meterHtml = cm ? (() => {
          const tot = Math.max(16, Math.min(96, Number(cm.total || 80)));
          const fil = Math.max(0, Math.min(tot, Number(cm.filled || 56)));
          const tiles = Array.from({ length: tot }, (_, ti) => `<div class="me-ctx-tile ${ti >= fil ? "is-empty" : ""}"></div>`).join("");
          const ticks = (cm.ticks || ["0", "filled", "max"]).map((tk) => `<span>${esc(tk)}</span>`).join("");
          return `<div class="me-ctx-meter">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
              <div style="display:flex;align-items:center;gap:12px">
                ${cm.logo ? `<img src="${esc(stageAsset(cm.logo))}" alt="" style="height:30px;width:auto"/>` : meIcon("layers", "#34d399", 24)}
                <span style="font-size:26px;font-weight:700">${esc(cm.label || "Context Window")}</span>
              </div>
              ${cm.badge ? renderPill(cm.badge, cm.color || "emerald", { mono: true }) : ""}
            </div>
            <div class="me-ctx-grid">${tiles}</div>
            <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;color:var(--me-dim)">${ticks}</div>
          </div>`;
        })() : "";

        return `<div class="me-stage me-stage-bars">
          ${renderEyebrow(s)}
          <div class="me-bar-head">${headerLeft}${headerRight}</div>
          <div class="${meterHtml ? "me-score-layout" : ""}" style="${!meterHtml ? "width:100%;max-width:1080px" : ""}">
            <div class="me-score-rows">${rowsHtml}</div>
            ${meterHtml}
          </div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.deltaColor || "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      if (m.orientation === "horizontal") {
        const pt = m.paperTable;
        const ptHtml = pt ? `<div class="me-paper-table">
          <div class="me-pt-head"><span class="me-pill-dot" style="background:#f97316"></span><span>${esc(pt.title || "PAPER TABLE")}</span></div>
          ${pt.cols?.length ? `<div class="me-pt-cols">${pt.cols.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
          ${(pt.rows || []).map((r) => `<div class="me-pt-row ${r.hot ? "is-hot" : ""}"><span>${esc(r.step)}</span><span>${esc(r.time)}</span></div>`).join("")}
        </div>` : "";
        const ratioHtml = m.heroDelta ? `<div class="me-hero-ratio"><span class="me-hero-ratio-num">${esc(m.heroDelta)}</span>${m.heroUnit ? `<span>${esc(m.heroUnit)}</span>` : ""}</div>` : "";
        const hRows = (m.bars || []).map((b, bi) => {
          const bp = resolveColor(b.color, bi === 0 ? "orange" : "slate");
          const pct = Math.max(4, Math.min(92, Number(b.pct || 60)));
          const segs = (b.segments || []).map((sg, si) => {
            const sp = resolveColor(sg.color, si === 0 ? "slate" : "orange");
            return `<div class="me-hbar-seg" style="width:${Math.max(10, Number(sg.pct || 25))}%;background:${sp.solid}">${sg.value ? countSpan(sg.value) : ""}</div>`;
          }).join("");
          const barBody = segs || `<div class="me-hbar-seg" style="width:100%;background:linear-gradient(90deg, ${bp.solid}, ${bp.text});color:#05070a">${pct >= 20 ? countSpan(b.value) : ""}</div>`;
          return `<div class="me-hbar-row" data-idx="${bi}">
            <div class="me-hbar-name">${esc(b.label)}</div>
            <div class="me-hbar-track">
              <div class="me-hbar-caliper"></div>
              <div class="me-hbar-fill-wrap" style="width:${pct}%">
                ${barBody}
              </div>
              <div class="me-hbar-caliper"></div>
              ${b.dashedTail ? `<div class="me-hbar-dashed"></div>` : ""}
              ${(!segs && pct < 20) || b.delta ? `<span class="me-hbar-val-out" style="color:${bp.text}">${countSpan(b.delta || b.value)}</span>` : ""}
            </div>
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-bars">
          ${renderEyebrow(s)}
          <div class="me-hbar-stage">
            <div class="me-hbar-top">
              <div>${ptHtml || headerLeft}</div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:14px">${headerRight}${ratioHtml}</div>
            </div>
            <div class="me-hbars-list">${hRows}</div>
          </div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.deltaColor || "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      const barsHtml = (m.bars || []).map((b, bi) => {
        const bp = resolveColor(b.color, bi === 0 ? "orange" : "emerald");
        const pct = Math.max(12, Math.min(92, Number(b.pct || 60)));
        return `<div class="me-bar-col" data-idx="${bi}">
          ${b.check ? `<div class="me-bar-check">${meIcon("check", "#34d399", 26)}</div>` : ""}
          ${b.delta ? `<div class="me-bar-delta" style="color:${bp.text}">${countSpan(b.delta)}</div>` : ""}
          <div class="me-bar-shell" style="height:${pct}%">
            ${b.dashedCap ? `<div class="me-bar-cap"></div>` : ""}
            <div class="me-bar-fill" style="height:100%;background:linear-gradient(180deg, ${bp.text} 0%, ${bp.solid} 72%, ${bp.dark} 100%)">${countSpan(b.value)}</div>
          </div>
          <div class="me-bar-label">
            ${b.logo ? `<img src="${esc(stageAsset(b.logo))}" alt="" style="height:24px;width:auto"/>` : ""}
            <span>${esc(b.label)}</span>
          </div>
        </div>`;
      }).join("");

      const thrLine = m.thresholdPct != null
        ? `<div class="me-threshold-line" style="bottom:${Math.max(10, Math.min(95, Number(m.thresholdPct)))}%"></div>
           ${m.thresholdLabel ? `<div class="me-threshold-label" style="bottom:${Math.max(10, Math.min(95, Number(m.thresholdPct)))}%">${esc(m.thresholdLabel)}</div>` : ""}`
        : "";

      return `<div class="me-stage me-stage-bars">
        ${renderEyebrow(s)}
        <div class="me-bar-head">${headerLeft}${headerRight}</div>
        ${bracketHtml}
        <div class="me-chart-panel">
          <div class="me-bars-row">
            ${thrLine}
            ${barsHtml}
          </div>
          <div style="height:48px"></div>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.deltaColor || "emerald", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_line_chart: (s) => {
      const m = s.meta || {};
      const series = m.series || [];
      const allY = series.flatMap((sr) => (sr.points || []).map((pt) => (typeof pt === "number" ? pt : pt.y)));
      const dataMin = allY.length ? Math.min(...allY) : 0;
      const dataMax = allY.length ? Math.max(...allY) : 100;
      const pad = Math.max(0.5, (dataMax - dataMin) * 0.18);
      const yMin = m.yMin != null ? Number(m.yMin) : Math.floor((dataMin - pad) * 10) / 10;
      const yMax = m.yMax != null ? Number(m.yMax) : Math.ceil((dataMax + pad) * 10) / 10;
      const span = Math.max(0.01, yMax - yMin);

      const W = 1120, H = 520, pl = 130, pr = 170, ptTop = 54, pb = 70;
      const plotW = W - pl - pr, plotH = H - ptTop - pb;

      const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = ptTop + plotH * (1 - f);
        const val = (yMin + span * f).toFixed(span < 10 ? 1 : 0);
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
          <text x="${pl - 18}" y="${(y + 6).toFixed(1)}" text-anchor="end" fill="rgba(226,232,240,0.56)" font-family="JetBrains Mono, monospace" font-size="18">${val}</text>`;
      }).join("");

      const seriesSvg = series.map((sr, si) => {
        const sp = resolveColor(sr.color, sr.active ? "emerald" : "slate");
        const pts = sr.points || [];
        const coords = pts.map((pt, pi) => {
          const val = typeof pt === "number" ? pt : pt.y;
          const x = pl + (pts.length === 1 ? plotW / 2 : (pi / (pts.length - 1)) * plotW);
          const y = ptTop + plotH * (1 - (val - yMin) / span);
          return { x, y, val, label: typeof pt === "object" ? pt.label : "" };
        });
        const d = coords.map((c, ci) => `${ci === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
        const last = coords[coords.length - 1];
        const first = coords[0];
        const mid = coords[Math.floor(coords.length / 2)];
        return `<g class="me-line-series" data-idx="${si}">
          <path class="me-line-path" d="${d}" fill="none" stroke="${sp.stroke}" stroke-width="${sr.active !== false ? 5 : 3}" stroke-linecap="round" stroke-linejoin="round"/>
          ${coords.map((c) => `<circle class="me-line-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${sr.active !== false ? 7.5 : 5.5}" fill="${sp.text}"/>`).join("")}
          <text class="me-line-val" x="${(first.x - 16).toFixed(1)}" y="${(first.y + 6).toFixed(1)}" text-anchor="end" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="24" font-weight="700">${first.val}</text>
          <text class="me-line-val" x="${(last.x + 18).toFixed(1)}" y="${(last.y + 8).toFixed(1)}" text-anchor="start" fill="${sp.text}" font-family="JetBrains Mono, monospace" font-size="28" font-weight="700">${last.val}</text>
          <text class="me-line-tag" x="${mid.x.toFixed(1)}" y="${(mid.y - 22).toFixed(1)}" text-anchor="middle" fill="${sp.text}" font-family="Inter, sans-serif" font-size="24" font-weight="700">${esc(sr.label)}</text>
        </g>`;
      }).join("");

      return `<div class="me-stage me-stage-line">
        ${renderEyebrow(s)}
        <div class="me-bar-head">
          <h2 class="me-bar-title">${esc(m.header || s.headline || "")}</h2>
          ${m.badge ? renderPill(m.badge, "emerald", { mono: true }) : ""}
        </div>
        <div class="me-line-wrap">
          <svg class="me-line-svg" viewBox="0 0 ${W} ${H}">
            ${m.yLabel ? `<text x="${pl}" y="28" fill="rgba(226,232,240,0.62)" font-family="JetBrains Mono, monospace" font-size="18">${esc(m.yLabel)}</text>` : ""}
            ${gridTicks}
            ${seriesSvg}
          </svg>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, "emerald", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_stat_split: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");

      if (m.mode === "dial") {
        const badges = (m.badges || []).map((bdg) => {
          const bp = resolveColor(bdg.color, "emerald");
          return `<div class="me-logo-badge" style="padding:10px 20px">${bdg.logo ? `<img src="${esc(stageAsset(bdg.logo))}" alt="" style="height:28px"/>` : meIcon(bdg.icon || "server", bp.text, 22)}<span style="font-size:22px;font-weight:700">${esc(bdg.text)}</span></div>`;
        }).join("");
        const chips = Array.from({ length: Math.max(8, Math.min(48, Number(m.queueCount || 32))) }, () => `<div class="me-queue-chip"></div>`).join("");
        return `<div class="me-stage me-stage-split">
          ${renderEyebrow(s)}
          <div class="me-dial-stage">
            ${badges ? `<div class="me-badge-strip">${badges}</div>` : ""}
            <div class="me-dial-grid">
              <div class="me-queue-box" style="border-color:${pal.stroke}">
                <div class="me-queue-head">
                  <span>${esc(m.queueTitle || s.headline)}</span>
                  <span style="font-family:var(--mono);color:${pal.text}">${esc(m.queueBadge || m.baseline || "")}</span>
                </div>
                <div class="me-queue-docs">${chips}</div>
              </div>
              <div class="me-dial-wrap">
                ${stopwatchDialSvg(m.dialSeconds ?? 10.5, m.dialMax ?? 15, pal, m.dialSplitText || "")}
              </div>
            </div>
          </div>
          ${m.delta ? `<div class="me-bottom-pill">${renderPill(m.delta, m.color || "orange", { mono: true })}</div>` : ""}
        </div>`;
      }

      const pct = Math.max(12, Math.min(100, Number(m.pct ?? 78)));
      const sideBars = (m.sideBars || []).map((sb, idx) => {
        const sp = resolveColor(sb.color, idx === 0 ? "orange" : "emerald");
        const spPct = Math.max(12, Math.min(92, Number(sb.pct || 50)));
        return `<div class="me-bar-col" data-idx="${idx}">
          ${sb.prefix ? `<div style="font-size:16px;color:var(--me-dim);margin-bottom:4px">${esc(sb.prefix)}</div>` : ""}
          <div class="me-bar-delta" style="color:${sp.text}">${countSpan(sb.value)}</div>
          <div class="me-bar-shell" style="height:${spPct}%">
            <div class="me-bar-fill" style="height:100%;background:linear-gradient(180deg, ${sp.text} 0%, ${sp.solid} 100%)"></div>
          </div>
          <div class="me-bar-label">${esc(sb.label)}</div>
        </div>`;
      }).join("");

      const miniTerm = m.miniTerminal !== false ? `<div class="me-mini-term">
        <div style="display:flex;gap:6px"><span class="me-win-dot" style="width:8px;height:8px"></span><span class="me-win-dot" style="width:8px;height:8px"></span><span class="me-win-dot" style="width:8px;height:8px"></span></div>
        <div><span style="color:${pal.text}">&gt;</span> harness-eval --run</div>
      </div>` : "";

      return `<div class="me-stage me-stage-split">
        ${renderEyebrow(s)}
        <div class="me-split-grid">
          <div class="me-split-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
              <div style="display:flex;align-items:center;gap:14px">
                ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:30px;width:auto"/>` : ""}
                ${renderPill(m.model || s.headline, m.color || "orange", { icon: m.logo ? null : "spark" })}
              </div>
              ${m.benchmark ? `<span style="font-family:var(--mono);font-size:18px;color:var(--me-dim)">${esc(m.benchmark)}</span>` : ""}
            </div>
            <div class="me-stat-hero-row">
              <div class="me-stat-vbar-wrap">
                <span style="position:absolute;top:8px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:13px;color:var(--me-faint)">100</span>
                <div class="me-stat-vbar-fill" style="height:${pct}%;background:linear-gradient(180deg, ${pal.text}, ${pal.solid})"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px">
                <div class="me-stat-big" style="color:${pal.text}">${countSpan(m.value)}</div>
                ${m.baseline ? `<div class="me-stat-base">${esc(m.baseline)}</div>` : ""}
                ${m.delta ? `<div><span class="me-delta-chip">${esc(m.delta)}</span></div>` : ""}
                ${miniTerm}
              </div>
            </div>
          </div>
          <div class="me-split-card">
            <div style="display:flex;align-items:center;justify-content:space-between">
              ${renderPill(m.sideTitle || "Generalization", "slate", { icon: "doc" })}
              ${m.sideBadge ? renderPill(m.sideBadge, "emerald", { mono: true }) : ""}
            </div>
            <div class="me-bars-row" style="height:320px;margin-bottom:40px;padding:0 16px">
              ${sideBars}
            </div>
          </div>
        </div>
      </div>`;
    },

    me_evidence_card: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");

      if (m.speaker) {
        const sp = m.speaker;
        const spPal = resolveColor(sp.color, m.color || "orange");
        const dotsA = Array.from({ length: Math.max(1, Math.min(10, Number(sp.dotsFrom || 4))) }, (_, i) => `<span class="me-dot-cyan ${i >= 3 ? "is-dim" : ""}"></span>`).join("");
        const dotsB = Array.from({ length: Math.max(1, Math.min(10, Number(sp.dotsTo || 10))) }, (_, i) => `<span class="me-dot-cyan ${i >= 8 ? "is-dim" : ""}"></span>`).join("");
        const avatarContent = sp.avatar
          ? `<img src="${esc(stageAsset(sp.avatar))}" alt=""/>`
          : meIcon("chat", spPal.text, 64);
        return `<div class="me-stage me-stage-evidence">
          ${renderEyebrow(s)}
          <div class="me-quote-split">
            <div class="me-avatar-col">
              <div class="me-avatar-ring" style="border-color:${spPal.stroke}">${avatarContent}</div>
              <div style="font-size:30px;font-weight:700">${esc(sp.name)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:22px">
              <div class="me-quote-card">
                <div class="me-quote-mark" style="color:${spPal.text}">“</div>
                <div class="me-quote-text">${esc(sp.quote)}</div>
                ${sp.attribution ? `<div style="font-family:var(--mono);font-size:18px;letter-spacing:0.16em;color:${spPal.text}">— ${esc(sp.attribution)}</div>` : ""}
              </div>
              <div class="me-dots-delta">
                <div class="me-dots-box">
                  <div style="font-family:var(--mono);font-size:22px;color:#38bdf8">${Number(sp.dotsFrom || 4)}</div>
                  <div class="me-dots-row">${dotsA}</div>
                </div>
                <span style="font-family:var(--mono);font-size:24px;color:var(--me-dim)">to</span>
                <div class="me-dots-box">
                  <div style="font-family:var(--mono);font-size:22px;color:#38bdf8">${Number(sp.dotsTo || 10)}</div>
                  <div class="me-dots-row">${dotsB}</div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      }

      if (m.claim) {
        const cl = m.claim;
        const cp = resolveColor(cl.color, "emerald");
        const chkCount = Math.max(1, Math.min(7, Number(cl.checks || 5)));
        const checksHtml = Array.from({ length: chkCount }, () => `<div class="me-check-circle">${meIcon("check", "#34d399", 24)}</div>`).join("");
        const miniGrid = Array.from({ length: 16 }, () => `<div style="width:18px;height:18px;border-radius:3px;background:#f59e0b"></div>`).join("");
        const rightWin = m.image
          ? renderBrowserFrame(stageAsset(m.image), m.browserUrl || m.source, m.browserTab)
          : `<div class="me-paper-card" style="height:100%"><h3 class="me-paper-title">${esc(m.title || s.headline)}</h3><div class="me-paper-body">${esc(m.body || "")}</div></div>`;
        return `<div class="me-stage me-stage-evidence">
          ${renderEyebrow(s)}
          <div class="me-claim-split">
            <div class="me-claim-card">
              <div style="font-family:var(--mono);font-size:15px;letter-spacing:0.18em;color:var(--me-dim)">${esc(cl.eyebrow || "CLAIM")}</div>
              ${cl.pill ? renderPill(cl.pill, "slate", { mono: false }) : ""}
              <div style="display:flex;align-items:center;gap:16px">
                <div style="display:grid;grid-template-columns:repeat(4,18px);gap:4px">${miniGrid}</div>
                <div style="width:32px;height:32px;border-radius:50%;border:2px solid #f97316;display:flex;align-items:center;justify-content:center;color:#fb923c;font-weight:700">&gt;</div>
                <div style="display:flex;flex-direction:column;gap:7px;width:96px">${Array.from({ length: 5 }, () => `<div style="height:7px;border-radius:4px;background:rgba(255,255,255,0.18)"></div>`).join("")}</div>
              </div>
              <div style="font-size:30px;font-weight:700">${esc(cl.statement || s.headline)}</div>
              <div class="me-check-row">${checksHtml}</div>
              ${cl.footLabel ? `<div style="font-size:26px;font-weight:700;color:${cp.text}">${esc(cl.footLabel)}</div>` : ""}
            </div>
            ${rightWin}
          </div>
        </div>`;
      }

      const rawBody = esc(m.body || s.subline || "");
      let bodyHtml = rawBody;
      if (m.highlight && rawBody.includes(esc(m.highlight))) {
        const hl = esc(m.highlight);
        bodyHtml = rawBody.replace(hl, `<span class="me-highlight-box">${hl}</span>`);
      }
      const ptsHtml = (m.points || []).map((pt, idx) => {
        const obj = typeof pt === "string" ? { text: pt } : pt;
        const pp = resolveColor(obj.color, m.color || "emerald");
        return `<div class="me-schema-row" data-idx="${idx}">
          <span class="me-pill-dot" style="background:${pp.stroke}"></span>
          <span class="me-schema-val">${esc(obj.text)}</span>
        </div>`;
      }).join("");
      const imgHtml = m.image
        ? ((m.browserUrl || /[./]/.test(m.source || ""))
          ? renderBrowserFrame(stageAsset(m.image), m.browserUrl || m.source, m.browserTab)
          : `<img src="${esc(stageAsset(m.image))}" alt="" style="max-height:440px;width:100%;object-fit:contain;border-radius:10px;border:1px solid var(--me-border)"/>`)
        : "";

      return `<div class="me-stage me-stage-evidence">
        ${renderEyebrow(s)}
        <div class="me-evidence-wrap">
          <div class="me-paper-card">
            <div class="me-paper-meta">
              <div style="display:flex;align-items:center;gap:14px">
                ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:28px;width:auto"/>` : meIcon("doc", pal.text, 24)}
                <span>${esc(m.source || "")}${m.handle ? ` · ${esc(m.handle)}` : ""}</span>
              </div>
              <div style="display:flex;align-items:center;gap:14px">
                ${m.date ? `<span>${esc(m.date)}</span>` : ""}
                ${m.badge ? renderPill(m.badge, m.color || "orange", { mono: true }) : ""}
              </div>
            </div>
            ${m.title ? `<h3 class="me-paper-title">${esc(m.title)}</h3>` : ""}
            ${bodyHtml ? `<div class="me-paper-body">${bodyHtml}</div>` : ""}
            ${imgHtml}
            ${ptsHtml ? `<div style="display:flex;flex-direction:column;gap:10px">${ptsHtml}</div>` : ""}
          </div>
          ${m.callout ? renderPill(m.callout, m.color || "orange", { icon: "spark" }) : ""}
        </div>
      </div>`;
    },

    me_pipeline_flow: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");
      const stepsHtml = (m.steps || []).map((st, idx) => {
        const obj = typeof st === "string" ? { label: st } : st;
        return `${idx > 0 ? `<div class="me-step-line"></div>` : ""}<div class="me-step-pill ${obj.active ? "is-active" : ""}" data-idx="${idx}">${esc(obj.label)}</div>`;
      }).join("");

      if (m.nodes?.length) {
        const nodesHtml = m.nodes.map((nd, idx) => {
          const np = resolveColor(nd.color, nd.active ? "emerald" : "slate");
          return `${idx > 0 ? `<div style="width:68px;flex:0 0 auto">${curvedArrowSvg(68, 38, np)}</div>` : ""}
          <div class="me-pipe-node ${nd.active ? "is-active" : ""}" data-idx="${idx}">
            <div style="display:flex;align-items:center;gap:12px">
              ${nd.logo ? `<img src="${esc(stageAsset(nd.logo))}" alt="" style="height:30px;width:auto;border-radius:6px;${nd.logoBackground ? `background:${esc(nd.logoBackground)};padding:3px 6px` : ""}"/>` : meIcon(nd.icon || "layers", np.text, 24)}
              <span style="font-size:26px;font-weight:700">${esc(nd.title)}</span>
            </div>
            ${nd.sub ? `<div style="font-family:var(--mono);font-size:17px;color:var(--me-dim)">${esc(nd.sub)}</div>` : ""}
            ${nd.image ? `<img src="${esc(stageAsset(nd.image))}" alt="" style="width:100%;max-height:110px;object-fit:cover;border-radius:8px;margin-top:6px;border:1px solid var(--me-border)"/>` : ""}
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-pipeline">
          ${renderEyebrow(s)}
          ${m.logo ? renderLogoPlate(m.logo, { bg: m.logoBackground || "", height: 32 }) : ""}
          ${stepsHtml ? `<div class="me-stepper">${stepsHtml}</div>` : ""}
          <div class="me-nodes-row">${nodesHtml}</div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      const dots = Array.from({ length: 24 }, (_, d) => {
        const ok = (d * 7 + 3) % 5 !== 0;
        return `<div class="me-matrix-dot" style="background:${ok ? "#10b981" : "#ef4444"}"></div>`;
      }).join("");

      const rightRows = (m.rightRows || [{ label: "worker-1", color: "emerald" }, { label: "worker-2", color: "emerald" }, { label: "worker-3", color: "emerald" }, { label: "worker-4", color: "emerald" }])
        .map((rw, idx) => {
          const rp = resolveColor(rw.color, "emerald");
          return `<div class="me-sim-row" data-idx="${idx}">
            <span class="me-pill-dot" style="background:${rp.stroke}"></span>
            <span class="me-sim-bar"></span>
            ${rw.label ? `<span>${esc(rw.label)}</span>` : ""}
          </div>`;
        }).join("");

      return `<div class="me-stage me-stage-pipeline">
        ${renderEyebrow(s)}
        ${stepsHtml ? `<div class="me-stepper">${stepsHtml}</div>` : ""}
        <div class="me-flow-body">
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
            ${renderPill(m.roundLabel || "rollouts", "slate", { icon: "play" })}
            <div class="me-dot-matrix">${dots}</div>
          </div>
          <div class="me-c3-card" style="border-color:${pal.stroke}">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:32px;font-weight:700">${esc(m.centerTitle || s.headline)}</span>
              ${m.centerBadge ? renderPill(m.centerBadge, "red", { mono: true }) : ""}
            </div>
            <div class="me-c3-slots">
              <div class="me-c3-slot is-active">
                <span>predicted</span>
                ${meIcon("spark", pal.text, 24)}
              </div>
              <div class="me-c3-slot">?</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
            <div style="font-size:28px;font-weight:700">${esc(m.rightTitle || "SIM")}</div>
            <div class="me-sim-rows">${rightRows}</div>
          </div>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "orange", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_schema_card: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");
      const fieldsHtml = (m.fields || []).map((f, idx) => {
        const fp = resolveColor(f.color, f.highlight ? "orange" : "slate");
        const valNode = f.skeleton
          ? `<div class="me-skeleton-bars"><div class="me-skeleton-line" style="width:84%"></div><div class="me-skeleton-line" style="width:56%"></div></div>`
          : `<div class="me-schema-val" style="color:${f.highlight ? fp.text : "var(--me-ink)"}">${esc(f.val || "")}</div>`;
        return `<div class="me-schema-row ${f.highlight ? "is-highlight" : ""}" data-idx="${idx}">
          ${f.icon ? meIcon(f.icon, fp.text, 22) : ""}
          <div class="me-schema-key">${esc(f.key)}</div>
          ${valNode}
          ${f.status ? renderPill(f.status, f.color || "slate", { mono: true }) : ""}
        </div>`;
      }).join("");

      const attemptHtml = m.attempt ? `<div class="me-attempt-card">
        <div style="display:flex;align-items:center;gap:16px">
          ${renderPill(m.attempt.index || "1", m.attempt.color || "orange", { mono: true })}
          <span style="font-family:var(--mono);font-size:20px;color:var(--me-dim)">${esc(m.attempt.label || "edit")}</span>
          <span style="font-size:24px;font-weight:700;color:${resolveColor(m.attempt.color, "orange").text}">${esc(m.attempt.value || "")}</span>
        </div>
      </div>` : "";

      const deckHtml = (m.deckTag || m.deckLabel) ? `
        <div class="me-orbit-arrow-wrap me-deck-arrow" style="width:130px">
          ${curvedArrowSvg(130, 76, pal)}
        </div>
        <div class="me-deck-col" style="display:flex;flex-direction:column;align-items:center;gap:16px">
          <div class="me-deck-wrap">
            <div class="me-deck-layer" style="transform:translate(14px, -14px);opacity:0.4"></div>
            <div class="me-deck-layer" style="transform:translate(7px, -7px);opacity:0.65"></div>
            <div class="me-deck-front">
              <div class="me-deck-tag">${esc(m.deckTag || "P5")}</div>
            </div>
          </div>
          ${m.deckLabel ? `<div style="font-size:25px;font-weight:600;color:var(--me-dim)">${esc(m.deckLabel)}</div>` : ""}
        </div>` : "";

      const sideDeck = deckHtml || (m.image ? `<div style="width:480px;flex:0 0 auto">${renderBrowserFrame(stageAsset(m.image), m.eyebrow || s.headline, m.title || "evidence")}</div>` : "");
      return `<div class="me-stage me-stage-schema">
        ${renderEyebrow(s)}
        <div class="me-schema-layout">
          <div class="me-schema-box">
            <div class="me-schema-head">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <div style="display:flex;align-items:center;gap:12px">
                  ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:26px;width:auto;border-radius:5px;${m.logoBackground ? `background:${esc(m.logoBackground)};padding:2px 6px` : ""}"/>` : ""}
                  <span style="font-family:var(--mono);font-size:16px;letter-spacing:0.16em;color:var(--me-dim)">${esc(m.eyebrow || "ROOT CAUSE")}</span>
                </div>
                ${m.statusPill ? renderPill(m.statusPill, m.color || "orange", { mono: true }) : ""}
              </div>
              <div style="font-size:36px;font-weight:700">${esc(m.title || s.headline)}</div>
            </div>
            <div class="me-schema-rows">
              ${fieldsHtml}
              ${attemptHtml}
            </div>
          </div>
          ${sideDeck}
        </div>
      </div>`;
    },

    me_editor_window: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "emerald");
      const linesHtml = (m.lines || []).map((ln, idx) => {
        const obj = typeof ln === "string" ? { text: ln, kind: "ctx" } : ln;
        const kind = obj.kind || "ctx";
        const cls = kind === "add" ? "is-add" : kind === "del" ? "is-del" : kind === "hot" ? "is-hot" : "";
        return `<div class="me-editor-line ${cls}" data-idx="${idx}">
          <span class="me-editor-ln">${idx + 1}</span>
          <span>${esc(obj.text)}${obj.cursor ? `<span class="me-editor-caret"></span>` : ""}</span>
        </div>`;
      }).join("");

      const stampHtml = m.stamp ? `<div class="me-editor-stamp" style="border-color:${resolveColor(m.stampColor, "orange").stroke};color:${resolveColor(m.stampColor, "orange").text}">${esc(m.stamp)}</div>` : "";
      const summaryHtml = m.summaryCard ? `<div class="me-editor-summary">
        ${renderPill(m.summaryCard.tag || "P8", m.summaryCard.color || "orange", { mono: true })}
        ${m.summaryCard.badge ? renderPill(m.summaryCard.badge, "slate", { mono: true }) : ""}
      </div>` : "";
      const tlHtml = m.timeline ? `<div class="me-editor-scrub">
        <div class="me-editor-scrub-rail"><div class="me-editor-scrub-fill"></div></div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;color:var(--me-dim)">
          <span style="color:#fb923c">${esc(m.timeline.startLabel || "written")}</span>
          <span>${esc(m.timeline.endLabel || "eval run")}</span>
        </div>
      </div>` : "";

      return `<div class="me-stage me-stage-editor">
        ${renderEyebrow(s)}
        <div class="me-editor-layout">
          <div class="me-editor-win">
            <div class="me-editor-tabbar">
              <div class="me-win-dots"><span class="me-win-dot"></span><span class="me-win-dot"></span><span class="me-win-dot"></span></div>
              <div class="me-editor-tab" style="border-bottom-color:${pal.stroke};display:flex;align-items:center;gap:10px">${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:20px;width:auto"/>` : ""}<span>${esc(m.filename || "harness-log.md")}</span></div>
            </div>
            <div class="me-editor-body">
              ${linesHtml}
              ${stampHtml}
              ${summaryHtml}
            </div>
            <div class="me-editor-status">
              <span>⑂ ${esc(m.branch || "main")}</span>
              <span>${esc(m.statusRight || `Ln ${(m.lines || []).length}, Col 1`)}</span>
            </div>
          </div>
          ${tlHtml}
          ${!tlHtml && m.footerLabel ? renderPill(m.footerLabel, m.color || "emerald", { mono: true }) : ""}
        </div>
      </div>`;
    },

    me_decision_gate: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "emerald");

      if (m.tiers?.length) {
        const tierRows = m.tiers.map((tr, idx) => {
          const tp = resolveColor(tr.color, tr.active ? "orange" : "slate");
          let visHtml = "";
          if (tr.visual === "grid") {
            visHtml = `<div style="display:grid;grid-template-columns:repeat(4,24px);gap:5px">${Array.from({ length: 16 }, () => `<div style="width:24px;height:24px;border-radius:4px;background:#f59e0b"></div>`).join("")}</div>`;
          } else if (tr.visual === "dashed") {
            visHtml = `<div style="width:320px;height:78px;border-radius:12px;border:1.5px dashed rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:18px;color:var(--me-dim)">${esc(tr.detail || "")}</div>`;
          } else if (tr.visual === "stack") {
            visHtml = `<div style="display:flex;flex-direction:column;gap:5px">${Array.from({ length: 5 }, () => `<div style="width:88px;height:12px;border-radius:4px;border:1.5px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.06)"></div>`).join("")}</div>`;
          } else if (tr.detail) {
            visHtml = `<span style="font-family:var(--mono);font-size:20px;color:var(--me-dim)">${esc(tr.detail)}</span>`;
          }
          return `<div class="me-tier-row ${tr.active ? "is-active" : ""} ${tr.dashed ? "is-dim" : ""}" data-idx="${idx}" style="${tr.active ? `border-color:${tp.stroke}` : ""}">
            <span>${esc(tr.label)}</span>
            ${visHtml}
          </div>`;
        }).join("");
        return `<div class="me-stage me-stage-gate">
          ${renderEyebrow(s)}
          <div class="me-tier-layout">
            <div>${curlyBraceSvg(Math.max(260, m.tiers.length * 112), pal.stroke)}</div>
            <div class="me-tier-list">${tierRows}</div>
          </div>
          ${(m.resultPill || m.bottomPill) ? `<div class="me-bottom-pill">${renderPill(m.resultPill || m.bottomPill, m.color || "orange", { icon: "play" })}</div>` : ""}
        </div>`;
      }

      const choicesHtml = (m.choices || []).map((ch, idx) => {
        const obj = typeof ch === "string" ? { text: ch } : ch;
        return `<span class="me-gate-choice ${obj.active ? "is-active" : ""}" data-idx="${idx}">${esc(obj.text)}</span>`;
      }).join("");
      const gatesHtml = (m.gates || []).map((gt, idx) => {
        return `<div class="me-gate-box" data-idx="${idx}">
          <div style="display:flex;align-items:center;gap:14px">
            ${meIcon(gt.ok ? "check" : "shield", gt.ok ? "#34d399" : "#94a3b8", 26)}
            <span>${esc(gt.label)}</span>
          </div>
          ${gt.badge ? renderPill(gt.badge, gt.ok ? "emerald" : "slate", { mono: true }) : ""}
        </div>`;
      }).join("");

      const hasRollouts = Boolean(m.rollouts || m.rolloutCount != null || m.rolloutLabel);
      const rollTotal = Math.max(1, Math.min(8, Number((m.rollouts && m.rollouts.total) ?? m.rolloutCount ?? 5)));
      const rollActive = Math.max(0, Math.min(rollTotal, Number((m.rollouts && m.rollouts.active) ?? m.rolloutActive ?? 1)));
      const rolloutsHtml = hasRollouts ? `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        ${m.rolloutLabel ? `<div style="font-family:var(--mono);font-size:16px;color:var(--me-dim)">${esc(m.rolloutLabel)}</div>` : ""}
        <div class="me-rollout-row">${Array.from({ length: rollTotal }, (_, ri) => `<span class="me-rollout-sq ${ri < rollActive ? "is-on" : ""}"></span>`).join("")}</div>
      </div>` : "";

      let gateLeftHtml = "";
      if (m.image) {
        gateLeftHtml = `<div class="me-gate-side-brand">
          ${rolloutsHtml}
          ${renderBrowserFrame(stageAsset(m.image), m.browserUrl || "", m.browserTab || "")}
          ${m.resultPill ? renderPill(m.resultPill, m.color || "emerald", { icon: "check" }) : ""}
        </div>`;
      } else if (m.logo || (Array.isArray(m.logos) && m.logos.length)) {
        gateLeftHtml = `<div class="me-gate-side-brand">
          ${rolloutsHtml}
          <div class="me-orbit-stage" style="width:360px;height:300px">
            <div class="me-orbit-glow" style="width:260px;height:260px;background:${pal.stroke}"></div>
            ${orbitRingSvg(pal, 340, ME_PALETTE.orange)}
            <div class="me-orbit-hub is-logo" style="border-color:${pal.stroke};${m.logoBackground ? `background:${esc(m.logoBackground)};` : ""}">
              ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt=""/>` : renderTopLogos(m, "", m.color || "emerald")}
            </div>
          </div>
          ${m.resultPill ? renderPill(m.resultPill, m.color || "emerald", { icon: "check" }) : ""}
        </div>`;
      } else if (m.showCore === true) {
        gateLeftHtml = `<div class="me-gate-side-brand">
          ${rolloutsHtml}
          <div class="me-orbit-stage" style="width:390px;height:340px">
            <div class="me-orbit-glow" style="width:280px;height:280px;background:${pal.stroke}"></div>
            ${orbitRingSvg(pal, 370, ME_PALETTE.orange)}
            ${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 196 })}
          </div>
          ${m.resultPill ? renderPill(m.resultPill, m.color || "emerald", { icon: "check" }) : ""}
        </div>`;
      }

      return `<div class="me-stage me-stage-gate">
        ${renderEyebrow(s)}
        <div class="me-gate-layout ${gateLeftHtml ? "" : "is-solo"}">
          ${gateLeftHtml}
          <div class="me-gate-panel">
            <div class="me-modal-card" style="width:100%">
              <div class="me-modal-bar">
                <span><span class="me-pill-dot" style="display:inline-block;background:#f97316;margin-right:8px"></span>${esc(m.statusPill || "decision gate")}</span>
                ${m.counterBadge ? `<span style="color:#fb923c">${esc(m.counterBadge)}</span>` : ""}
              </div>
              <div class="me-modal-body">
                <div style="font-size:31px;font-weight:600">${esc(m.question || s.headline)}</div>
                ${choicesHtml ? `<div class="me-gate-choices">${choicesHtml}</div>` : ""}
              </div>
            </div>
            ${gatesHtml ? `<div class="me-gates-row">${gatesHtml}</div>` : ""}
            ${!gateLeftHtml && m.resultPill ? `<div style="align-self:center;margin-top:6px">${renderPill(m.resultPill, m.color || "emerald", { icon: "check" })}</div>` : ""}
          </div>
        </div>
      </div>`;
    },

    me_token_grid: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "amber");
      const mode = m.mode || (m.layers?.length ? "layers" : m.callout || m.tokenCount ? "bus" : "compress");

      if (mode === "layers") {
        const layersHtml = (m.layers || []).map((ly, idx) => {
          const ticks = Array.from({ length: 14 }, (_, ti) => {
            const h = 10 + ((ti * 7 + idx * 5) % 18);
            return `<span style="width:2.5px;height:${h}px;border-radius:2px;background:rgba(226,232,240,0.42);display:inline-block"></span>`;
          }).join("");
          return `<div class="me-layer-row" data-idx="${idx}">
            ${attentionArcSvg(idx)}
            <div style="display:flex;align-items:center;justify-content:center;gap:8px">${ticks}</div>
            <div style="display:flex;align-items:center;justify-content:center">${ly.ok !== false ? meIcon("check", "#34d399", 22) : meIcon("cross", "#f87171", 22)}</div>
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-schema">
          ${renderEyebrow(s)}
          <div class="me-bus-frame">
            <div class="me-bus-head">
              <div style="display:flex;align-items:center;gap:18px">
                ${m.logo ? renderLogoPlate(m.logo, { bg: m.logoBackground || "", height: 32 }) : ""}
                <span style="font-size:44px;font-weight:800">${esc(m.boxTitle || s.headline)}</span>
                ${m.frozenBadge ? renderPill(m.frozenBadge, "emerald", { mono: true }) : ""}
              </div>
              ${m.locked !== false ? `<div style="display:flex;align-items:center;gap:12px">${meIcon("lock", "#f97316", 34)}</div>` : ""}
            </div>
            <div class="me-layer-list">${layersHtml}</div>
          </div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      if (mode === "bus") {
        const tc = Math.max(8, Math.min(20, Number(m.tokenCount || 16)));
        const tilesHtml = Array.from({ length: tc }, (_, ti) => `<div class="me-bus-tile" data-idx="${ti}">${waveformBarsSvg()}</div>`).join("");
        const pop = m.callout ? `<div class="me-predict-pop" style="align-self:flex-end">
          <div style="font-size:15px;color:var(--me-dim)">${esc(m.callout.title || "token decode")}</div>
          ${m.callout.input ? `<div style="font-size:24px;color:#38bdf8">${esc(m.callout.input)}</div>` : ""}
          <div style="font-size:26px;font-weight:700;color:#7dd3fc">${esc(m.callout.output)}</div>
        </div>` : "";
        return `<div class="me-stage me-stage-schema">
          ${renderEyebrow(s)}
          <div class="me-bus-frame">
            <div class="me-bus-head">
              <div style="display:flex;align-items:center;gap:12px">
                ${m.logo ? renderLogoPlate(m.logo, { bg: m.logoBackground || "", height: 28 }) : (m.locked ? meIcon("lock", "#f97316", 24) : meIcon("layers", pal.text, 24))}
                <span style="font-family:var(--mono);font-size:24px;color:var(--me-ink)">${esc(m.boxTitle || s.headline)}</span>
              </div>
              ${pop}
            </div>
            <div class="me-bus-row-wrap">
              <div class="me-bus-row">${tilesHtml}</div>
              ${m.bracketLabel ? `<div class="me-bus-bracket"><div class="me-bus-bracket-line"></div><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:#fbbf24">${esc(m.bracketLabel)}</div></div>` : ""}
            </div>
          </div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "amber", { mono: true })}</div>` : ""}
        </div>`;
      }

      const gridCount = Math.max(20, Math.min(80, Number(m.sourceCount || 60)));
      const glyphs = Array.from({ length: gridCount }, (_, gi) => `<div class="me-glyph-cell" data-idx="${gi}">${meIcon("chat", "rgba(226,232,240,0.45)", 16)}</div>`).join("");
      const tgts = Array.from({ length: Math.max(4, Math.min(16, Number(m.targetCount || 16))) }, (_, ti) => `<div class="me-amber-cell" data-idx="${ti}"></div>`).join("");
      const statsHtml = (m.stats || []).map((st) => `<div style="display:flex;flex-direction:column;gap:4px">
        <div style="font-size:48px;font-weight:800;color:${resolveColor(st.color, "orange").text}">${countSpan(st.value)}</div>
        <div style="font-size:20px;color:var(--me-dim)">${esc(st.label)}</div>
      </div>`).join("");

      return `<div class="me-stage me-stage-pipeline">
        ${renderEyebrow(s)}
        <div class="me-tok-compress">
          <div style="display:flex;flex-direction:column;gap:18px">
            <div style="display:flex;align-items:center;gap:20px">
              ${m.logo ? `<div class="me-logo-badge"><img src="${esc(stageAsset(m.logo))}" alt=""/></div>` : ""}
              ${m.avatar ? `<div class="me-avatar-ring" style="width:74px;height:74px"><img src="${esc(stageAsset(m.avatar))}" alt=""/></div>` : ""}
              ${m.sourceLabel ? `<div style="font-size:28px;font-weight:700">${esc(m.sourceLabel)}</div>` : ""}
            </div>
            ${statsHtml ? `<div style="display:flex;gap:36px">${statsHtml}</div>` : ""}
            <div class="me-glyph-grid">${glyphs}</div>
          </div>
          <div style="display:flex;justify-content:center">${curvedArrowSvg(110, 80, pal)}</div>
          <div class="me-prompt-box" style="border-color:${pal.stroke}">
            <div class="me-prompt-tag">prompt</div>
            <div class="me-amber-4x4">${tgts}</div>
            <div style="font-family:var(--mono);font-size:32px;font-weight:700;color:#fbbf24">${esc(m.targetLabel || "16 tokens")}</div>
          </div>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "amber", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_timeline: (s) => {
      const m = s.meta || {};
      const events = m.events || [];
      const nodesHtml = events.map((ev, idx) => {
        const ep = resolveColor(ev.color, ev.active ? "orange" : "emerald");
        const side = idx % 2 === 0 ? "is-top" : "is-bottom";
        return `<div class="me-tl-node ${side}" data-idx="${idx}">
          <div class="me-tl-dot" style="border-color:${ep.stroke}"></div>
          <div class="me-tl-card" style="${ev.active ? `border-color:${ep.stroke}` : ""}">
            <div style="font-family:var(--mono);font-size:16px;color:${ep.text}">${esc(ev.label)}</div>
            ${ev.value ? `<div style="font-size:32px;font-weight:700;margin-top:6px">${esc(ev.value)}</div>` : ""}
            ${ev.sub ? `<div style="font-size:17px;color:var(--me-dim);margin-top:6px">${esc(ev.sub)}</div>` : ""}
          </div>
        </div>`;
      }).join("");

      return `<div class="me-stage me-stage-timeline">
        ${renderEyebrow(s)}
        <div class="me-tl-wrap">
          <div class="me-tl-axis">${nodesHtml}</div>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.color || "emerald", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_outro: (s) => {
      const m = s.meta || {};
      const ch = m.channel || s.channel || "";
      const cta = m.cta || s.cta || "Subscribe";
      const sub = m.ctaSub || s.subline || "";
      return `<div class="me-stage me-stage-outro">
        ${renderEyebrow(s)}
        <div class="me-outro-wrap">
          <h2 class="me-hero-headline" style="font-size:70px">${esc(s.headline || "Thanks for watching")}</h2>
          ${sub ? `<p class="me-hero-sub">${esc(sub)}</p>` : ""}
          <div style="display:flex;align-items:center;gap:20px;margin-top:10px">
            ${ch ? renderPill(ch, "slate", { mono: true }) : ""}
            ${cta ? `<div class="me-outro-cta">${esc(cta)}</div>` : ""}
          </div>
        </div>
      </div>`;
    },
  };

  // Fallback mapping for standard engine scene types when style === "motion-explainer"
  R.cold = (s, i) => R.me_title({ ...s, meta: { pills: (s.meta?.chips || []).map((c) => ({ text: c, mono: true })), showCore: true } }, i);
  R.hero = (s, i) => R.me_evidence_card({ ...s, meta: { source: s.meta?.mark || s.eyebrow, title: s.headline, body: s.subline, image: s.meta?.image, logo: s.meta?.logos?.[0]?.src, badge: s.meta?.label } }, i);
  R.statement = (s, i) => R.me_title(s, i);
  R.stat = (s, i) => R.me_stat_split({ ...s, meta: { model: s.eyebrow || s.headline, value: `${s.meta?.prefix || ""}${s.meta?.display || s.meta?.value || ""}${s.meta?.suffix || ""}`, baseline: s.meta?.label || "", sideBars: [{ label: "target", value: `${s.meta?.display || s.meta?.value || ""}`, pct: 75, color: "emerald" }] } }, i);
  R.compare = (s, i) => R.me_bar_compare({ ...s, meta: { header: s.headline, bars: [{ label: s.meta?.left?.t || "Before", value: s.meta?.left?.k || "A", pct: 48, color: "orange" }, { label: s.meta?.right?.t || "After", value: s.meta?.right?.k || "B", pct: 80, color: "emerald" }] } }, i);
  R.code = (s, i) => R.me_editor_window({ ...s, meta: { filename: s.meta?.file || "snippet.ts", lines: (s.meta?.lines || []).map((l) => ({ text: l.t || "", kind: l.bad ? "del" : l.key ? "add" : "ctx" })), footerLabel: s.meta?.announce } }, i);
  R.diff = (s, i) => R.me_editor_window({ ...s, meta: { filename: s.meta?.file || "patch.diff", lines: (s.meta?.lines || []).map((l) => ({ text: l.t || "", kind: l.k || "ctx" })), footerLabel: s.meta?.announce } }, i);
  R.terminal = (s, i) => R.me_editor_window({ ...s, meta: { filename: s.meta?.host || "terminal", lines: (s.meta?.lines || []).map((l) => ({ text: l.t || "", kind: l.k === "err" ? "del" : l.k === "cmd" ? "hot" : "ctx" })), footerLabel: s.meta?.announce } }, i);
  R.flow = (s, i) => R.me_pipeline_flow({ ...s, meta: { nodes: (s.meta?.nodes || []).map((n) => ({ title: n.t, sub: n.s, active: !n.bad, color: n.bad ? "red" : n.hot ? "orange" : "emerald" })) } }, i);
  R.stack = (s, i) => R.me_pipeline_flow({ ...s, meta: { nodes: (s.meta?.layers || []).map((l) => ({ title: l.t, sub: l.s, active: Boolean(l.hot), color: l.bad ? "red" : "emerald" })) } }, i);
  R.ledger = (s, i) => R.me_schema_card({ ...s, meta: { title: s.meta?.head || s.headline, statusPill: s.meta?.stamp, fields: (s.meta?.rows || []).map((r) => ({ key: r.k, val: r.v, highlight: Boolean(r.bad) })) } }, i);
  R.memory = (s, i) => R.me_schema_card({ ...s, meta: { title: s.meta?.segment || s.headline, fields: [{ key: "allocated", val: String(s.meta?.allocated ?? ""), highlight: false }, { key: "corrupted", val: String(s.meta?.corrupted ?? ""), highlight: true }] } }, i);
  R.timeline = (s, i) => R.me_timeline({ ...s, meta: { events: (s.meta?.events || []).map((e) => ({ label: e.t, sub: e.s, active: Boolean(e.hot) })) } }, i);
  R.dateline = (s, i) => R.me_title({ ...s, meta: { badge: `${s.meta?.mon || ""} ${s.meta?.day || ""} ${s.meta?.yr || ""}`.trim() } }, i);
  R.quote = (s, i) => R.me_evidence_card({ ...s, meta: { source: s.subline || "Quote", body: s.headline } }, i);
  R.matrix = (s, i) => R.me_pipeline_flow({ ...s, meta: { centerTitle: s.headline } }, i);
  R.split = (s, i) => R.me_evidence_card({ ...s, meta: { title: s.headline, body: s.subline } }, i);
  R.webref = (s, i) => R.me_evidence_card({ ...s, meta: { source: s.meta?.url || "Reference", title: s.headline, body: s.meta?.quote || s.subline, image: s.meta?.image } }, i);
  R.cloud = (s, i) => R.me_core_orbit(s, i);
  R.mascot = (s, i) => R.me_title(s, i);
  R.meme = (s, i) => R.me_title(s, i);
  R.outro = (s, i) => R.me_outro(s, i);

  return R;
}

export async function renderMotionExplainerDocument({
  project, scenes, total, compositionId, width, height, isPortrait, fps, audio, title, fontsCss, gsapJS, stageAsset,
}) {
  const CSS = await fs.readFile(path.join(PRESET_DIR, "style.css"), "utf8");
  const SFX_JS = await fs.readFile(path.join(PRESET_DIR, "sfx.js"), "utf8");
  const ANIM_JS = (await fs.readFile(path.join(PRESET_DIR, "anim.js"), "utf8"))
    .replace('"__COMPOSITION_ID__"', JSON.stringify(compositionId));

  const RENDERERS = buildRenderers({ stageAsset });
  const body = scenes.map((s, i) => {
    const id = `s${String(i + 1).padStart(3, "0")}`;
    const fn = RENDERERS[s.type] || RENDERERS.me_title;
    const dur = s.end - s.start;
    return `<section id="${id}" class="clip sc sc-${esc(s.type)}" data-start="${s.start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="2" data-hold>
  <div class="sc-in" data-layout-allow-overflow>
    ${fn(s, i)}
  </div>
</section>`;
  }).join("\n");

  const bgmRaw = project.bgm || project.music || null;
  const bgm = bgmRaw ? stageAsset(bgmRaw) : null;

  return `<!doctype html>
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
body { width: ${width}px; height: ${height}px; }
#root { width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
<div id="root" class="${isPortrait ? "is-portrait" : "is-landscape"}" data-aspect="${isPortrait ? "9:16" : "16:9"}" data-style="motion-explainer" data-composition-id="${esc(compositionId)}" data-start="0" data-width="${width}" data-height="${height}" data-fps="${fps}" data-duration="${total.toFixed(3)}">
  <div id="me-bg"></div>
  <div id="me-dots"></div>
  <div id="me-vignette"></div>
  ${body}
  ${bgm ? `<audio id="bgm" src="${esc(bgm)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="5" data-volume="0.14"></audio>` : ""}
  <audio id="vo" src="${esc(audio)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="1" data-volume="1"></audio>
  <audio id="sfx" src="build/sfx_track.wav" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="3" data-volume="1"></audio>
</div>
<script>
window.__COMPOSITION_ID__ = ${JSON.stringify(compositionId)};
window.__SCENES__ = ${JSON.stringify(scenes.map((s) => ({
  start: s.start,
  end: s.end,
  speechStart: s.speechStart ?? null,
  speechEnd: s.speechEnd ?? null,
  type: s.type,
  accent: s.accent,
  act: s.act,
  revealTime: s.revealTime ?? null,
  meta: s.meta || {},
  wordTimings: s.wordTimings || [],
})))};
window.__TOTAL__ = ${total.toFixed(3)};
${SFX_JS}
${ANIM_JS}
</script>
</body>
</html>`;
}
