// Dedicated renderer for the 'chalkboard-explainer' style preset.
// Completely self-contained: does NOT load engine/style.css or engine/anim.js,
// ensuring zero mixed visuals or font mismatches.
import fs from "node:fs/promises";
import fsSync from "node:fs";
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

export const CHALK_PALETTE = {
  green:  { stroke: "#589f76", fill: "rgba(88, 159, 118, 0.09)", text: "#63b384" },
  cyan:   { stroke: "#4d8da6", fill: "rgba(77, 141, 166, 0.09)", text: "#5aa5c2" },
  ochre:  { stroke: "#b5983b", fill: "rgba(181, 152, 59, 0.09)", text: "#ccb04b" },
  coral:  { stroke: "#b94a58", fill: "rgba(185, 74, 88, 0.10)", text: "#d86d7b" },
  violet: { stroke: "#8a6eb8", fill: "rgba(138, 110, 184, 0.09)", text: "#9c80cc" },
  amber:  { stroke: "#b86d3b", fill: "rgba(184, 109, 59, 0.09)", text: "#cc7d48" },
  slate:  { stroke: "rgba(212, 216, 223, 0.34)", fill: "rgba(212, 216, 223, 0.03)", text: "#d4d8df" },
};

function resolveColor(name, fallback = "cyan") {
  if (!name) return CHALK_PALETTE[fallback] || CHALK_PALETTE.cyan;
  if (CHALK_PALETTE[name]) return CHALK_PALETTE[name];
  if (/^#[0-9a-fA-F]{6}$/.test(name)) {
    return { stroke: name, fill: `${name}18`, text: name };
  }
  return CHALK_PALETTE[fallback] || CHALK_PALETTE.cyan;
}

// Deterministic pseudo-random offset in [-1, 1] for hand-inked paths.
function jitter(seed, k) {
  const n = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

// Hand-drawn slightly bowed rounded rectangle SVG path.
function sketchRectPath(x, y, w, h, r = 12, seed = 1) {
  const rr = Math.min(r, w / 4, h / 4);
  const j = (k, amp = 1.4) => Number((jitter(seed, k) * amp).toFixed(2));
  const x0 = x + j(1, 0.8), y0 = y + j(2, 0.8);
  const x1 = x + w + j(3, 0.8), y1 = y + h + j(4, 0.8);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return [
    `M ${(x0 + rr).toFixed(1)} ${y0.toFixed(1)}`,
    `Q ${(mx + j(5, 3)).toFixed(1)} ${(y0 + j(6, 1.8)).toFixed(1)} ${(x1 - rr).toFixed(1)} ${y0.toFixed(1)}`,
    `Q ${(x1 + j(7, 1)).toFixed(1)} ${(y0 + j(8, 1)).toFixed(1)} ${x1.toFixed(1)} ${(y0 + rr).toFixed(1)}`,
    `Q ${(x1 + j(9, 1.8)).toFixed(1)} ${(my + j(10, 3)).toFixed(1)} ${x1.toFixed(1)} ${(y1 - rr).toFixed(1)}`,
    `Q ${(x1 + j(11, 1)).toFixed(1)} ${(y1 + j(12, 1)).toFixed(1)} ${(x1 - rr).toFixed(1)} ${y1.toFixed(1)}`,
    `Q ${(mx + j(13, 3)).toFixed(1)} ${(y1 + j(14, 1.8)).toFixed(1)} ${(x0 + rr).toFixed(1)} ${y1.toFixed(1)}`,
    `Q ${(x0 + j(15, 1)).toFixed(1)} ${(y1 + j(16, 1)).toFixed(1)} ${x0.toFixed(1)} ${(y1 - rr).toFixed(1)}`,
    `Q ${(x0 + j(17, 1.8)).toFixed(1)} ${(my + j(18, 3)).toFixed(1)} ${x0.toFixed(1)} ${(y0 + rr).toFixed(1)}`,
    `Q ${(x0 + j(19, 1)).toFixed(1)} ${(y0 + j(20, 1)).toFixed(1)} ${(x0 + rr).toFixed(1)} ${y0.toFixed(1)} Z`,
  ].join(" ");
}

function sketchBoxSvg(w, h, r, pal, seed = 1, { doublePass = true, strokeWidth = 1.6, extraClass = "" } = {}) {
  const p1 = sketchRectPath(3, 3, w - 6, h - 6, r, seed);
  const p2 = doublePass ? sketchRectPath(4.2, 4.0, w - 8.4, h - 8.0, r, seed + 17) : "";
  return `<svg class="cb-box-svg ${extraClass}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="cb-fill" d="${p1}" fill="${pal.fill}" stroke="none"/>
    ${doublePass ? `<path class="cb-draw cb-draw-ghost" d="${p2}" fill="none" stroke="${pal.stroke}" stroke-width="${(strokeWidth * 0.75).toFixed(2)}" stroke-opacity="0.28" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <path class="cb-draw cb-draw-main" d="${p1}" fill="none" stroke="${pal.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function sketchXOverlay(w = 400, h = 280, seed = 9) {
  const pad = 12;
  const d1 = `M ${pad} ${pad} Q ${(w * 0.5 + jitter(seed, 1) * 8).toFixed(1)} ${(h * 0.5 + jitter(seed, 2) * 8).toFixed(1)} ${w - pad} ${h - pad}`;
  const d2 = `M ${w - pad} ${pad} Q ${(w * 0.5 + jitter(seed, 3) * 8).toFixed(1)} ${(h * 0.5 + jitter(seed, 4) * 8).toFixed(1)} ${pad} ${h - pad}`;
  return `<svg class="cb-x-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="cb-x-stroke" d="${d1}" fill="none" stroke="#cb5a69" stroke-width="3.2" stroke-linecap="round"/>
    <path class="cb-x-stroke" d="${d2}" fill="none" stroke="#cb5a69" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;
}

function chalkIcon(name, stroke = "#d4d8df", size = 44) {
  const paths = {
    layers: `<path class="cb-draw" d="M24 8 L40 16 L24 24 L8 16 Z"/><path class="cb-draw" d="M8 24 L24 32 L40 24"/><path class="cb-draw" d="M8 32 L24 40 L40 32"/>`,
    ladder: `<path class="cb-draw" d="M16 7 L16 41"/><path class="cb-draw" d="M32 7 L32 41"/><path class="cb-draw" d="M16 14 L32 14"/><path class="cb-draw" d="M16 22 L32 22"/><path class="cb-draw" d="M16 30 L32 30"/><path class="cb-draw" d="M16 38 L32 38"/>`,
    kv: `<rect class="cb-draw" x="7" y="10" width="34" height="11" rx="3"/><rect class="cb-draw" x="7" y="27" width="34" height="11" rx="3"/><path class="cb-draw" d="M13 13 L13 18 M13 15.5 L17 13 M14.5 15.5 L17 18 M23 15.5 L34 15.5"/><path class="cb-draw" d="M13 30 L15 35 L17 30 M23 32.5 L34 32.5"/>`,
    gpu: `<rect class="cb-draw" x="6" y="12" width="36" height="22" rx="4"/><circle class="cb-draw" cx="18" cy="23" r="6"/><circle class="cb-draw" cx="32" cy="23" r="6"/><path class="cb-draw" d="M12 34 L12 38 L22 38 L22 34"/>`,
    "dual-gpu": `<rect class="cb-draw" x="5" y="10" width="24" height="15" rx="3"/><circle class="cb-draw" cx="14" cy="17.5" r="3.5"/><circle class="cb-draw" cx="23" cy="17.5" r="3.5"/><rect class="cb-draw" x="19" y="23" width="24" height="15" rx="3"/><circle class="cb-draw" cx="28" cy="30.5" r="3.5"/><circle class="cb-draw" cx="37" cy="30.5" r="3.5"/>`,
    chip: `<rect class="cb-draw" x="14" y="14" width="20" height="20" rx="3"/><path class="cb-draw" d="M19 8 L19 14 M24 8 L24 14 M29 8 L29 14 M19 34 L19 40 M24 34 L24 40 M29 34 L29 40 M8 19 L14 19 M8 24 L14 24 M8 29 L14 29 M34 19 L40 19 M34 24 L40 24 M34 29 L40 29"/>`,
    wrench: `<path class="cb-draw" d="M31 10 A8 8 0 0 0 21 21 L10 32 A3 3 0 0 0 14 36 L25 25 A8 8 0 0 0 36 15 L31 19 L27 15 Z"/>`,
    clock: `<circle class="cb-draw" cx="24" cy="26" r="14"/><path class="cb-draw" d="M20 8 L28 8 M24 8 L24 12 M24 26 L24 18 M24 26 L30 29"/>`,
    doc: `<path class="cb-draw" d="M12 8 L30 8 L36 14 L36 40 L12 40 Z"/><path class="cb-draw" d="M30 8 L30 14 L36 14"/><path class="cb-draw" d="M17 22 L31 22 M17 28 L31 28 M17 34 L26 34"/>`,
    chat: `<path class="cb-draw" d="M9 11 L39 11 Q41 11 41 13 L41 31 Q41 33 39 33 L21 33 L13 40 L13 33 L9 33 Q7 33 7 31 L7 13 Q7 11 9 11 Z"/><path class="cb-draw" d="M15 20 L33 20 M15 26 L26 26"/>`,
    warning: `<path class="cb-draw" d="M24 8 L42 38 L6 38 Z"/><path class="cb-draw" d="M24 19 L24 28"/><circle cx="24" cy="33" r="1.4" fill="${stroke}"/>`,
    check: `<rect class="cb-draw" x="9" y="9" width="30" height="30" rx="5"/><path class="cb-draw" d="M16 24 L22 30 L33 17"/>`,
    cross: `<rect class="cb-draw" x="9" y="9" width="30" height="30" rx="5"/><path class="cb-draw" d="M17 17 L31 31 M31 17 L17 31"/>`,
    plug: `<path class="cb-draw" d="M18 10 L18 18 M30 10 L30 18 M13 18 L35 18 L33 28 Q24 34 15 28 Z M24 31 L24 40"/>`,
    retailer: `<path class="cb-draw" d="M9 18 L39 18 L39 38 L9 38 Z"/><path class="cb-draw" d="M7 18 L11 10 L37 10 L41 18"/><path class="cb-draw" d="M19 26 L29 26 L29 38 L19 38 Z"/>`,
    cube: `<path class="cb-draw" d="M24 8 L39 16 L39 32 L24 40 L9 32 L9 16 Z"/><path class="cb-draw" d="M9 16 L24 24 L39 16 M24 24 L24 40"/>`,
    terminal: `<rect class="cb-draw" x="7" y="10" width="34" height="28" rx="4"/><path class="cb-draw" d="M14 19 L20 24 L14 29 M23 29 L33 29"/>`,
    equal: `<rect class="cb-draw" x="8" y="14" width="32" height="20" rx="6"/><path class="cb-draw" d="M17 21 L31 21 M17 27 L31 27"/>`,
    "trend-up": `<path class="cb-draw" d="M8 34 L19 23 L26 28 L39 13"/><path class="cb-draw" d="M31 13 L39 13 L39 21"/>`,
    thermometer: `<path class="cb-draw" d="M21 10 A3 3 0 0 1 27 10 L27 27 A6 6 0 1 1 21 27 Z"/><path class="cb-draw" d="M24 20 L24 32"/>`,
    mail: `<rect class="cb-draw" x="7" y="13" width="34" height="22" rx="4"/><path class="cb-draw" d="M8 15 L24 27 L40 15"/>`,
    packet: `<rect class="cb-draw" x="7" y="13" width="34" height="22" rx="4"/><path class="cb-draw" d="M8 15 L24 27 L40 15"/>`,
    funnel: `<path class="cb-draw" d="M8 10 L40 10 L28 25 L28 38 L20 35 L20 25 Z"/>`,
    dns: `<circle class="cb-draw" cx="24" cy="24" r="15"/><path class="cb-draw" d="M9 24 L39 24 M24 9 Q32 24 24 39 M24 9 Q16 24 24 39"/>`,
    globe: `<circle class="cb-draw" cx="24" cy="24" r="15"/><path class="cb-draw" d="M9 24 L39 24 M24 9 Q32 24 24 39 M24 9 Q16 24 24 39"/>`,
    shield: `<path class="cb-draw" d="M24 7 L38 13 L38 24 C38 33 31 39 24 42 C17 39 10 33 10 24 L10 13 Z"/><path class="cb-draw" d="M18 24 L22.5 28.5 L31 19.5"/>`,
    skull: `<path class="cb-draw" d="M14 27 C11 24 11 10 24 10 C37 10 37 24 34 27 L32 36 L16 36 Z"/><circle class="cb-draw" cx="19" cy="21" r="2.8"/><circle class="cb-draw" cx="29" cy="21" r="2.8"/><path class="cb-draw" d="M20 36 L20 31 M24 36 L24 31 M28 36 L28 31"/>`,
    hacker: `<path class="cb-draw" d="M10 39 C12 31 17 28 24 28 C31 28 36 31 38 39"/><path class="cb-draw" d="M12 18 L24 11 L36 18 L34 24 L14 24 Z"/><path class="cb-draw" d="M9 18 L39 18"/>`,
    bug: `<ellipse class="cb-draw" cx="24" cy="26" rx="9" ry="11"/><path class="cb-draw" d="M18 15 L20 10 M30 15 L28 10 M15 22 L8 19 M33 22 L40 19 M15 28 L8 28 M33 28 L40 28 M17 34 L10 38 M31 34 L38 38 M17 23 L31 23"/>`,
    github: `<path class="cb-draw" d="M19 39 C13 37 10 31 11 23 L13 13 L18 16 C22 15 26 15 30 16 L35 13 L37 23 C38 31 35 37 29 39"/><circle cx="19.5" cy="25" r="1.5" fill="${stroke}"/><circle cx="28.5" cy="25" r="1.5" fill="${stroke}"/>`,
    key: `<circle class="cb-draw" cx="16" cy="24" r="7"/><path class="cb-draw" d="M23 24 L40 24 L40 30 M34 24 L34 29"/>`,
    eye: `<path class="cb-draw" d="M6 24 C12 15 36 15 42 24 C36 33 12 33 6 24 Z"/><circle class="cb-draw" cx="24" cy="24" r="4.5"/>`,
    "thumbs-up": `<path class="cb-draw" d="M15 22 L22 10 Q25 9 25 14 L24 20 L35 20 Q38 20 37 24 L35 35 Q34 38 30 38 L15 38 Z"/><rect class="cb-draw" x="9" y="21" width="6" height="17" rx="2"/>`,
    calendar: `<rect class="cb-draw" x="8" y="12" width="32" height="28" rx="4"/><path class="cb-draw" d="M8 20 L40 20 M17 8 L17 15 M31 8 L31 15"/>`,
    lock: `<rect class="cb-draw" x="11" y="21" width="26" height="19" rx="4"/><path class="cb-draw" d="M17 21 L17 15 A7 7 0 0 1 31 15 L31 21"/><circle cx="24" cy="30" r="2" fill="${stroke}"/>`,
    folder: `<path class="cb-draw" d="M7 13 L19 13 L23 17 L41 17 L41 37 L7 37 Z"/>`,
    docker: `<path class="cb-draw" d="M7 27 L41 27 C40 36 33 39 22 39 C12 39 8 34 7 27 Z"/><rect class="cb-draw" x="12" y="21" width="5" height="5"/><rect class="cb-draw" x="19" y="21" width="5" height="5"/><rect class="cb-draw" x="26" y="21" width="5" height="5"/><rect class="cb-draw" x="19" y="15" width="5" height="5"/><rect class="cb-draw" x="26" y="15" width="5" height="5"/>`,
    play: `<polygon class="cb-draw" points="16,12 36,24 16,36"/>`,
    "chat-dots": `<path class="cb-draw" d="M9 11 L39 11 Q41 11 41 13 L41 31 Q41 33 39 33 L21 33 L13 40 L13 33 L9 33 Q7 33 7 31 L7 13 Q7 11 9 11 Z"/><circle cx="17" cy="22" r="1.8" fill="${stroke}"/><circle cx="24" cy="22" r="1.8" fill="${stroke}"/><circle cx="31" cy="22" r="1.8" fill="${stroke}"/>`,
    server: `<rect class="cb-draw" x="9" y="10" width="30" height="12" rx="3"/><rect class="cb-draw" x="9" y="26" width="30" height="12" rx="3"/><circle cx="15" cy="16" r="1.5" fill="${stroke}"/><circle cx="15" cy="32" r="1.5" fill="${stroke}"/><path class="cb-draw" d="M22 16 L33 16 M22 32 L33 32"/>`,
  };
  const body = paths[name] || paths.layers;
  return `<svg class="cb-icon" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function sketchDashedBoxSvg(w, h, r, pal, seed = 3, strokeWidth = 1.8) {
  const p = sketchRectPath(4, 4, w - 8, h - 8, r, seed);
  return `<svg class="cb-box-svg cb-dashed-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="cb-fill" d="${p}" fill="${pal.fill}" stroke="none"/>
    <path class="cb-dashed-stroke" d="${p}" fill="none" stroke="${pal.stroke}" stroke-width="${strokeWidth}" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function sketchLassoSvg(w = 240, h = 150, colorName = "ochre", seed = 5) {
  const pal = resolveColor(colorName, "ochre");
  const cx = w / 2, cy = h / 2;
  const rx = w * 0.45, ry = h * 0.43;
  const d = `M ${(cx - rx).toFixed(1)} ${cy.toFixed(1)} C ${(cx - rx).toFixed(1)} ${(cy - ry * 1.12).toFixed(1)}, ${(cx + rx * 0.96).toFixed(1)} ${(cy - ry * 1.06 + jitter(seed, 1) * 4).toFixed(1)}, ${(cx + rx).toFixed(1)} ${cy.toFixed(1)} C ${(cx + rx * 1.04).toFixed(1)} ${(cy + ry * 1.1).toFixed(1)}, ${(cx - rx * 0.94).toFixed(1)} ${(cy + ry * 1.08 + jitter(seed, 2) * 4).toFixed(1)}, ${(cx - rx + 6).toFixed(1)} ${(cy - 4).toFixed(1)}`;
  return `<svg class="cb-lasso-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="cb-lasso-stroke" d="${d}" fill="none" stroke="${pal.text}" stroke-width="2.8" stroke-linecap="round"/>
  </svg>`;
}

function sketchCalendarSvg(topLabel, mainLabel, colorName = "ochre", seed = 7) {
  const pal = resolveColor(colorName, "ochre");
  return `<div class="cb-cal-card" style="--cb-stroke:${pal.stroke};--cb-text:${pal.text}">
    ${sketchBoxSvg(168, 134, 10, pal, seed, { doublePass: true, strokeWidth: 1.6 })}
    <div class="cb-cal-top" style="border-bottom-color:${pal.stroke};background:${pal.fill}">
      <span class="cb-tracked cb-cal-sub">${esc(topLabel || "BACK IN")}</span>
    </div>
    <div class="cb-cal-main cb-hand" style="color:${pal.text}">${esc(mainLabel)}</div>
  </div>`;
}

function renderTokenHighlights(text, highlight, circle, highlightColor = "ochre") {
  const hlPal = resolveColor(highlightColor, "ochre");
  const raw = String(text || "");
  const hls = Array.isArray(highlight) ? highlight.filter(Boolean) : (highlight ? [highlight] : []);
  const targets = [];
  for (const h of hls) {
    targets.push({ tok: String(h), kind: circle && String(circle) === String(h) ? "both" : "hl" });
  }
  if (circle && !hls.some((h) => String(h) === String(circle))) {
    targets.push({ tok: String(circle), kind: "circle" });
  }
  if (!targets.length) return esc(raw);

  // Split greedily on earliest matching token (single pass, no double escaping)
  let out = "";
  let pos = 0;
  while (pos < raw.length) {
    let bestIdx = -1;
    let bestTarget = null;
    for (const t of targets) {
      const idx = raw.indexOf(t.tok, pos);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestTarget = t;
      }
    }
    if (bestIdx === -1 || !bestTarget) {
      out += esc(raw.slice(pos));
      break;
    }
    if (bestIdx > pos) out += esc(raw.slice(pos, bestIdx));
    const tokEsc = esc(bestTarget.tok);
    const hasHl = bestTarget.kind === "hl" || bestTarget.kind === "both";
    const hasCir = bestTarget.kind === "circle" || bestTarget.kind === "both";
    out += `<span class="cb-hl-tok">${hasHl ? `<span class="cb-hl-bg" style="background:${hlPal.fill};border-bottom:2px solid ${hlPal.stroke}"></span>` : ""}<span class="cb-hl-txt" style="${hasHl ? `color:${hlPal.text}` : ""}">${tokEsc}</span>${hasCir ? `<svg class="cb-oval-ring" viewBox="0 0 160 44" preserveAspectRatio="none" aria-hidden="true"><ellipse class="cb-draw" cx="80" cy="22" rx="76" ry="18" fill="none" stroke="#cb5a69" stroke-width="2.4"/></svg>` : ""}</span>`;
    pos = bestIdx + bestTarget.tok.length;
  }
  return out;
}

function renderBrandAsset(logoPath, label, stageAsset, resolveLocalPath) {
  if (!logoPath) return "";
  const abs = resolveLocalPath(logoPath);
  if (abs && abs.toLowerCase().endsWith(".svg")) {
    try {
      const svgText = fsSync.readFileSync(abs, "utf8");
      return `<span class="cb-brand-svg" aria-label="${esc(label || "")}">${svgText}</span>`;
    } catch {
      // fall back to img
    }
  }
  return `<img class="cb-brand-img" src="${esc(stageAsset(logoPath))}" alt="${esc(label || "")}"/>`;
}

function renderEyebrow(s) {
  const txt = s.eyebrow || "";
  return txt ? `<div class="cb-eyebrow">${esc(txt)}</div>` : "";
}

function renderPill(text, colorName = "ochre", iconName = "", extraCls = "") {
  const pal = resolveColor(colorName, "ochre");
  const w = Math.max(180, Math.min(620, text.length * 14 + (iconName ? 72 : 48)));
  return `<div class="cb-pill ${extraCls}" style="--cb-stroke:${pal.stroke};--cb-text:${pal.text}">
    ${sketchBoxSvg(w, 48, 24, pal, text.length + 5, { doublePass: false, strokeWidth: 1.4 })}
    <div class="cb-pill-in">
      ${iconName ? chalkIcon(iconName, pal.text, 22) : ""}
      <span>${esc(text)}</span>
    </div>
  </div>`;
}

function buildRenderers({ stageAsset, resolveLocalPath }) {
  const R = {
    cb_title(s, i) {
      const m = s.meta || {};
      const title = m.title || s.headline || "";
      const barPct = Math.max(5, Math.min(100, Number(m.barPct ?? 100)));
      const barPal = resolveColor(m.barColor, "cyan");
      const statPal = resolveColor(m.statColor, "green");
      const brand = m.logo ? renderBrandAsset(m.logo, title, stageAsset, resolveLocalPath) : "";
      const pill = m.pill ? renderPill(m.pill, m.pillColor || "green", m.pillIcon || "gpu", "cb-title-pill") : "";

      return `
      <div class="cb-stage cb-stage-title">
        ${renderEyebrow(s)}
        <div class="cb-hero-row">
          ${brand}
          <h1 class="cb-hand cb-hero-title">${esc(title)}</h1>
        </div>
        ${m.barLabel || m.barValue ? `
        <div class="cb-bar-wrap">
          <div class="cb-sketch-bar" data-pct="${barPct}">
            ${sketchBoxSvg(1160, 56, 8, CHALK_PALETTE.slate, i + 3, { doublePass: false, strokeWidth: 1.5 })}
            <div class="cb-sketch-bar-fill" style="--bar-stroke:${barPal.stroke};--bar-fill:${barPal.fill};width:${barPct}%"></div>
            <div class="cb-bar-ticks"><span></span><span></span><span></span><span></span></div>
          </div>
          <div class="cb-bar-meta">
            ${m.barLabel ? `<span class="cb-tracked cb-bar-label">${esc(m.barLabel)}</span>` : ""}
            ${m.barValue ? `<span class="cb-hand cb-bar-val" style="color:${barPal.text}">${esc(m.barValue)}</span>` : ""}
          </div>
        </div>` : ""}
        ${m.stat ? `
        <div class="cb-payoff-row">
          ${pill}
          <div class="cb-payoff-metric">
            <div class="cb-payoff-num-row">
              <span class="cb-hand cb-big-num" style="color:${statPal.text}">${esc(m.stat)}</span>
              ${m.statUnit ? `<span class="cb-hand cb-big-unit">${esc(m.statUnit)}</span>` : ""}
              ${m.trend ? `<span class="cb-trend-overlay">${chalkIcon("trend-up", "#cb5a69", 54)}</span>` : ""}
            </div>
            ${m.statLabel ? `<div class="cb-tracked cb-payoff-label">${esc(m.statLabel)}</div>` : ""}
          </div>
        </div>` : (s.subline ? `<div class="cb-hand cb-sub-center">${esc(s.subline)}</div>` : "")}
      </div>`;
    },

    cb_cards(s, i) {
      const m = s.meta || {};
      const cards = m.cards || [];
      const cols = cards.length;
      const cardsHtml = cards.map((c, k) => {
        const pal = resolveColor(c.color, ["amber", "cyan", "green", "violet"][k % 4]);
        return `<div class="cb-card ${c.xOut ? "is-xout" : ""} ${c.active ? "is-active" : ""}" data-k="${k}" style="--cb-text:${pal.text};--cb-stroke:${pal.stroke}">
          ${sketchBoxSvg(360, 260, 12, pal, (i + 1) * 11 + k, { doublePass: true, strokeWidth: 1.6 })}
          <div class="cb-card-in">
            ${chalkIcon(c.icon || "layers", pal.text, 44)}
            <div class="cb-hand cb-card-title" style="color:${pal.text}">${esc(c.title)}</div>
            ${c.sub ? `<div class="cb-hand cb-card-sub">${esc(c.sub)}</div>` : ""}
          </div>
          ${c.xOut ? sketchXOverlay(360, 260, k + 7) : ""}
        </div>`;
      }).join("");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      return `
      <div class="cb-stage cb-stage-cards">
        ${renderEyebrow(s)}
        <div class="cb-cards-grid cols-${cols}">${cardsHtml}</div>
        ${bottom}
      </div>`;
    },

    cb_formula(s, i) {
      const m = s.meta || {};
      const factors = m.factors || [];
      const resPal = resolveColor(m.resultColor, "ochre");
      const factorsHtml = factors.map((f, k) => {
        const pal = resolveColor(f.color, ["amber", "ochre", "cyan", "violet"][k % 4]);
        return `${k > 0 ? `<span class="cb-hand cb-op">${esc(f.op || "×")}</span>` : ""}
        <div class="cb-factor" data-k="${k}">
          <div class="cb-hand cb-factor-val" style="color:${pal.text}">${esc(f.val)}</div>
          ${f.label ? `<div class="cb-tracked cb-factor-lbl">${esc(f.label)}</div>` : ""}
        </div>`;
      }).join("");

      return `
      <div class="cb-stage cb-stage-formula">
        ${renderEyebrow(s)}
        <div class="cb-formula-box">
          ${sketchBoxSvg(1120, 190, 12, CHALK_PALETTE.slate, i + 19, { doublePass: true, strokeWidth: 1.6 })}
          <div class="cb-formula-row">${factorsHtml}</div>
        </div>
        <div class="cb-formula-result">
          <div class="cb-formula-res-line">
            ${chalkIcon("equal", resPal.text, 52)}
            <span class="cb-hand cb-big-num" style="color:${resPal.text}">${esc(m.result || "")}</span>
          </div>
          ${m.resultLabel ? `<div class="cb-tracked cb-payoff-label">${esc(m.resultLabel)}</div>` : ""}
        </div>
      </div>`;
    },

    cb_stat_bar(s, i) {
      const m = s.meta || {};
      const mode = m.mode || (m.bars ? "bars" : m.sourceCard ? "conversion" : "metric_bar");
      const valPal = resolveColor(m.color, "coral");
      const barPal = resolveColor(m.barColor, "coral");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      if (mode === "conversion") {
        const srcPal = resolveColor(m.sourceColor, "slate");
        const barPct = Math.max(5, Math.min(100, Number(m.barPct ?? 100)));
        return `
        <div class="cb-stage cb-stage-statbar">
          ${renderEyebrow(s)}
          <div class="cb-conv-row">
            <div class="cb-conv-card">
              ${sketchBoxSvg(360, 260, 12, srcPal, i + 23, { doublePass: true, strokeWidth: 1.6 })}
              <div class="cb-card-in">
                ${chalkIcon(m.sourceIcon || "layers", srcPal.text, 56)}
                <div class="cb-hand cb-conv-title">${esc(m.sourceCard || "")}</div>
              </div>
            </div>
            <svg class="cb-conv-arrow" viewBox="0 0 180 40" aria-hidden="true">
              <path class="cb-draw" d="M 6 20 Q 90 18 166 20" fill="none" stroke="rgba(212,216,223,0.48)" stroke-width="2" stroke-linecap="round"/>
              <path class="cb-draw" d="M 154 11 L 170 20 L 154 29" fill="none" stroke="rgba(212,216,223,0.48)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="cb-conv-right">
              ${m.midIcon ? chalkIcon(m.midIcon, valPal.text, 56) : chalkIcon("kv", valPal.text, 56)}
              <div class="cb-conv-metric">
                <div class="cb-payoff-num-row">
                  <span class="cb-hand cb-big-num" style="color:${valPal.text}">${esc(m.value || "")}</span>
                  ${m.unit ? `<span class="cb-hand cb-big-unit">${esc(m.unit)}</span>` : ""}
                </div>
                ${m.label ? `<div class="cb-tracked cb-payoff-label">${esc(m.label)}</div>` : ""}
              </div>
            </div>
          </div>
          ${m.barLabel || m.barValue ? `
          <div class="cb-bar-wrap">
            <div class="cb-sketch-bar" data-pct="${barPct}">
              ${sketchBoxSvg(1160, 56, 8, CHALK_PALETTE.slate, i + 31, { doublePass: false, strokeWidth: 1.5 })}
              <div class="cb-sketch-bar-fill" style="--bar-stroke:${barPal.stroke};--bar-fill:${barPal.fill};width:${barPct}%"></div>
            </div>
            <div class="cb-bar-meta">
              ${m.barLabel ? `<span class="cb-tracked cb-bar-label">${esc(m.barLabel)}</span>` : ""}
              ${m.barValue ? `<span class="cb-hand cb-bar-val" style="color:${barPal.text}">${esc(m.barValue)}</span>` : ""}
            </div>
          </div>` : ""}
          ${bottom}
        </div>`;
      }

      if (mode === "bars") {
        const bars = (m.bars || []).map((b, k) => {
          const bp = resolveColor(b.color, ["green", "ochre", "coral"][k % 3]);
          const pct = Math.max(4, Math.min(100, Number(b.pct || 50)));
          const brand = b.logo ? renderBrandAsset(b.logo, b.label, stageAsset, resolveLocalPath) : "";
          return `<div class="cb-hrow" data-k="${k}">
            <div class="cb-hrow-lbl">${brand}<span class="cb-hand">${esc(b.label)}</span></div>
            <div class="cb-hrow-track">
              ${sketchBoxSvg(680, 40, 6, CHALK_PALETTE.slate, i * 7 + k, { doublePass: false, strokeWidth: 1.3 })}
              <div class="cb-hrow-fill" data-pct="${pct}" style="--bar-stroke:${bp.stroke};--bar-fill:${bp.fill};width:${pct}%"></div>
              ${b.thresholdPct ? `<div class="cb-hrow-thresh" style="left:${Number(b.thresholdPct)}%"><span>${esc(b.thresholdLabel || "")}</span></div>` : ""}
            </div>
            <div class="cb-hand cb-hrow-val" style="color:${bp.text}">${esc(b.value)}</div>
            ${b.status ? `<div class="cb-hrow-badge" style="color:${bp.text};border-color:${bp.stroke}">${esc(b.status)}</div>` : ""}
          </div>`;
        }).join("");

        return `
        <div class="cb-stage cb-stage-bars">
          ${renderEyebrow(s)}
          <div class="cb-bars-list">${bars}</div>
          ${bottom}
        </div>`;
      }

      // metric_bar mode (4½ minutes + GPU PINNED AT 515W, or $5,000+ with optional xOut)
      const barPct = Math.max(5, Math.min(100, Number(m.barPct ?? 88)));
      return `
      <div class="cb-stage cb-stage-metricbar">
        ${renderEyebrow(s)}
        <div class="cb-metric-hero ${m.xOut ? "is-xout" : ""}">
          <div class="cb-payoff-num-row">
            ${m.icon ? chalkIcon(m.icon, valPal.text, 54) : ""}
            <span class="cb-hand cb-big-num" style="color:${valPal.text}">${esc(m.value || "")}</span>
            ${m.unit ? `<span class="cb-hand cb-big-unit">${esc(m.unit)}</span>` : ""}
          </div>
          ${m.label ? `<div class="cb-tracked cb-payoff-label">${esc(m.label)}</div>` : ""}
          ${m.xOut ? sketchXOverlay(440, 170, i + 41) : ""}
        </div>
        ${m.barLabel || m.barRight ? `
        <div class="cb-pinned-row">
          ${m.barIcon ? chalkIcon(m.barIcon, barPal.text, 34) : ""}
          <div class="cb-pinned-bar-col">
            ${m.barLabel ? `<div class="cb-tracked cb-pinned-lbl">${esc(m.barLabel)}</div>` : ""}
            <div class="cb-sketch-bar cb-sketch-bar-sm" data-pct="${barPct}">
              ${sketchBoxSvg(680, 34, 17, CHALK_PALETTE.slate, i + 13, { doublePass: false, strokeWidth: 1.4 })}
              <div class="cb-sketch-bar-fill" style="--bar-stroke:${barPal.stroke};--bar-fill:${barPal.fill};width:${barPct}%"></div>
            </div>
          </div>
          ${m.barRight ? `<div class="cb-hand cb-pinned-val" style="color:${barPal.text}">${esc(m.barRight)}</div>` : ""}
        </div>` : ""}
        ${bottom}
      </div>`;
    },

    cb_vram_stack(s, i) {
      const m = s.meta || {};
      const ceilPal = resolveColor(m.ceilingColor, "ochre");
      const layers = m.layers || [];
      // Render layers bottom-to-top inside the vertical tank
      const layersHtml = layers.map((ly, k) => {
        const lp = resolveColor(ly.color, ["violet", "cyan", "amber", "ochre"][k % 4]);
        const pct = Math.max(4, Math.min(72, Number(ly.pct || 20)));
        return `<div class="cb-vram-row" data-k="${k}" style="height:${pct}%">
          <div class="cb-vram-lbl">
            <div class="cb-hand cb-vram-size" style="color:${lp.text}">${esc(ly.size)}</div>
            <div class="cb-hand cb-vram-name">${esc(ly.title)}</div>
          </div>
          <div class="cb-vram-block" style="border-color:${lp.stroke};background:${lp.fill}"></div>
        </div>`;
      }).join("");

      return `
      <div class="cb-stage cb-stage-vram">
        ${renderEyebrow(s)}
        <div class="cb-vram-wrap">
          <div class="cb-vram-tank-frame">
            ${sketchBoxSvg(340, 620, 8, CHALK_PALETTE.slate, i + 5, { doublePass: true, strokeWidth: 1.7 })}
            ${m.ceiling ? `<div class="cb-vram-ceiling" style="--ceil:${ceilPal.stroke}">
              <span class="cb-hand" style="color:${ceilPal.text}">${esc(m.ceiling)}</span>
            </div>` : ""}
            <div class="cb-vram-stack-col">${layersHtml}</div>
          </div>
        </div>
      </div>`;
    },

    cb_layer_grid(s, i) {
      const m = s.meta || {};
      const cols = Math.max(4, Math.min(16, Number(m.cols || 12)));
      const rows = Math.max(2, Math.min(6, Number(m.rows || 4)));
      const activeCols = new Set((m.activeCols || [2, 5, 8, 11]).map(Number));
      const pal = resolveColor(m.color, "amber");

      let cells = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = activeCols.has(c);
          cells += `<div class="cb-grid-cell ${lit ? "is-lit" : ""}" data-col="${c}" style="--cell-stroke:${pal.stroke};--cell-fill:${pal.fill}"></div>`;
        }
      }

      const specs = (m.specs || []).map((sp, k) => {
        const spPal = resolveColor(sp.color, ["amber", "ochre", "cyan"][k % 3]);
        return `<div class="cb-spec-row" data-k="${k}">
          <div class="cb-spec-left">
            ${sp.icon ? chalkIcon(sp.icon, spPal.text, 26) : ""}
            <span class="cb-tracked">${esc(sp.label)}</span>
          </div>
          <div class="cb-spec-leader"></div>
          <div class="cb-hand cb-spec-val" style="color:${spPal.text}">${esc(sp.value)}</div>
        </div>`;
      }).join("");

      return `
      <div class="cb-stage cb-stage-grid">
        ${renderEyebrow(s)}
        <div class="cb-layer-matrix" style="grid-template-columns:repeat(${cols}, 1fr)">${cells}</div>
        ${specs ? `<div class="cb-specs-list">${specs}</div>` : ""}
      </div>`;
    },

    cb_wiring(s, i) {
      const m = s.meta || {};
      const nodes = m.nodes || [];
      const edges = m.edges || [];
      // Default 4-node board layout matching shot_048:
      // 0: CPU (left-top), 1: chipset (left-bottom), 2: Slot 1 (right-top), 3: Slot 2 (right-bottom)
      const defaultPos = [
        { x: 160, y: 200, w: 230, h: 140 },
        { x: 430, y: 460, w: 210, h: 105 },
        { x: 1060, y: 120, w: 360, h: 125 },
        { x: 1060, y: 410, w: 360, h: 125 },
      ];

      const svgEdges = edges.map((e, k) => {
        const from = defaultPos[e.from ?? 0] || defaultPos[0];
        const to = defaultPos[e.to ?? 2] || defaultPos[2];
        const ep = resolveColor(e.color, e.thick ? "green" : e.pulse ? "coral" : "slate");
        const x1 = from.x + from.w;
        const y1 = from.y + from.h * 0.5;
        const x2 = to.x;
        const y2 = to.y + to.h * 0.5;

        if (e.elbow) {
          const mx = from.x + from.w * 0.5;
          const my = from.y + from.h;
          const d = `M ${x1} ${y1 + 25} L ${x1 + 115} ${y1 + 25} L ${x1 + 115} ${to.y}`;
          return `<path class="cb-draw cb-wire-edge" d="M ${mx} ${my} L ${mx} ${y2} L ${to.x} ${y2}" fill="none" stroke="${ep.stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        if (e.thick) {
          const cx1 = x1 + (x2 - x1) * 0.45;
          const cx2 = x1 + (x2 - x1) * 0.55;
          const ribbon = `M ${x1} ${y1 - 2} C ${cx1} ${y1 - 2}, ${cx2} ${y2 - 14}, ${x2} ${y2 - 14} L ${x2} ${y2 + 14} C ${cx2} ${y2 + 14}, ${cx1} ${y1 + 4}, ${x1} ${y1 + 4} Z`;
          return `<path class="cb-wire-ribbon" d="${ribbon}" fill="${ep.stroke}" fill-opacity="0.72"/>`;
        }
        const cx1 = x1 + (x2 - x1) * 0.45;
        const cx2 = x1 + (x2 - x1) * 0.55;
        const curve = `M ${x1} ${y1} C ${cx1} ${y1 + 12}, ${cx2} ${y2 - 8}, ${x2} ${y2}`;
        const mx = ((x1 + x2) * 0.5).toFixed(1);
        const my = ((y1 + y2) * 0.5 + 2).toFixed(1);
        return `<path class="cb-draw cb-wire-edge" d="${curve}" fill="none" stroke="${ep.stroke}" stroke-width="3.2" stroke-linecap="round"/>
          ${e.pulse ? `<circle class="cb-wire-dot" cx="${mx}" cy="${my}" r="5.5" fill="${ep.text}"/>` : ""}`;
      }).join("");

      const nodesHtml = nodes.slice(0, 4).map((n, k) => {
        const pos = defaultPos[k] || defaultPos[0];
        const np = resolveColor(n.color, k === 2 ? "green" : k === 3 ? "coral" : k === 1 ? "ochre" : "slate");
        return `<div class="cb-wire-node" data-k="${k}" style="left:${pos.x}px;top:${pos.y}px;width:${pos.w}px;height:${pos.h}px;--cb-text:${np.text}">
          ${sketchBoxSvg(pos.w, pos.h, 10, np, i * 5 + k, { doublePass: false, strokeWidth: 1.6 })}
          <div class="cb-wire-node-in">
            <div class="cb-hand cb-wire-title" style="color:${np.text}">${esc(n.title)}</div>
            ${n.sub ? `<div class="cb-tracked cb-wire-sub">${esc(n.sub)}</div>` : ""}
          </div>
        </div>`;
      }).join("");

      const pillsHtml = (m.pills || []).map((p) => {
        const txt = typeof p === "string" ? p : p.text;
        const col = typeof p === "string" ? "coral" : (p.color || "coral");
        const icon = typeof p === "string" ? "warning" : (p.icon || "");
        return renderPill(txt, col, icon);
      }).join("");

      return `
      <div class="cb-stage cb-stage-wiring">
        ${renderEyebrow(s)}
        <div class="cb-wiring-canvas">
          <svg class="cb-wiring-svg" viewBox="0 0 1600 660" aria-hidden="true">${svgEdges}</svg>
          ${nodesHtml}
        </div>
        ${pillsHtml ? `<div class="cb-pills-row">${pillsHtml}</div>` : ""}
      </div>`;
    },

    cb_gpu_spec(s, i) {
      const m = s.meta || {};
      const mode = m.mode || (m.cards ? "compare" : "blueprint");

      if (mode === "compare") {
        const cards = (m.cards || []).map((c, k) => {
          const cp = resolveColor(c.color, k === 0 ? "cyan" : "amber");
          const brand = c.logo ? renderBrandAsset(c.logo, c.brand || c.title, stageAsset, resolveLocalPath) : `<span class="cb-hand cb-brand-txt" style="color:${cp.text}">${esc(c.brand || "")}</span>`;
          const pts = (c.bullets || c.pts || []).map((pt) => `<div class="cb-hand cb-cmp-bullet"><span class="cb-dot" style="background:${cp.text}"></span><span>${esc(pt)}</span></div>`).join("");
          return `<div class="cb-gpu-cmp-card" data-k="${k}">
            ${sketchBoxSvg(560, 560, 12, cp, i * 9 + k, { doublePass: true, strokeWidth: 1.6 })}
            <div class="cb-gpu-cmp-in">
              <div class="cb-gpu-brand">${brand}</div>
              ${c.tagline ? `<div class="cb-tracked cb-gpu-tagline">${esc(c.tagline)}</div>` : ""}
              <div class="cb-hand cb-gpu-model" style="color:${cp.text}">${esc(c.title)}</div>
              <div class="cb-gpu-bullets">${pts}</div>
              <div class="cb-gpu-divider"></div>
              <div class="cb-hand cb-gpu-price" style="color:${cp.text}">${esc(c.price)}</div>
            </div>
          </div>`;
        }).join("");

        return `
        <div class="cb-stage cb-stage-gpucmp">
          ${renderEyebrow(s)}
          <div class="cb-gpu-cmp-grid">${cards}</div>
        </div>`;
      }

      // Blueprint GPU outline card
      const pal = resolveColor(m.color, "cyan");
      const brand = m.logo ? renderBrandAsset(m.logo, m.brand || m.model, stageAsset, resolveLocalPath) : "";
      const gpuSvg = `<svg class="cb-gpu-blueprint" viewBox="0 0 640 240" aria-hidden="true">
        <path class="cb-draw" d="${sketchRectPath(24, 24, 592, 184, 14, i + 7)}" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="2" stroke-linecap="round"/>
        <circle class="cb-draw cb-fan-ring" cx="155" cy="116" r="56" fill="none" stroke="${pal.stroke}" stroke-width="1.8"/>
        <path class="cb-draw" d="M155 68 L155 164 M107 116 L203 116 M121 82 L189 150 M189 82 L121 150" stroke="${pal.stroke}" stroke-width="1.4" stroke-opacity="0.65" stroke-linecap="round"/>
        <path class="cb-draw" d="M270 46 L592 46 M270 68 L592 68 M270 90 L592 90 M270 112 L592 112 M270 134 L592 134 M270 156 L592 156 M270 178 L592 178" stroke="${pal.stroke}" stroke-width="1.2" stroke-opacity="0.45" stroke-linecap="round"/>
        <path class="cb-draw" d="M100 208 L100 226 L210 226 L210 208" fill="none" stroke="${pal.stroke}" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;

      return `
      <div class="cb-stage cb-stage-gpubp">
        ${renderEyebrow(s)}
        <div class="cb-bp-box ${m.xOut ? "is-xout" : ""}">
          ${brand ? `<div class="cb-bp-brand">${brand}</div>` : ""}
          ${gpuSvg}
          <div class="cb-hand cb-bp-model" style="color:${pal.text}">${esc(m.model || "")}</div>
          ${m.sub ? `<div class="cb-tracked cb-bp-sub">${esc(m.sub)}</div>` : ""}
          ${m.xOut ? sketchXOverlay(640, 280, i + 3) : ""}
        </div>
        <div class="cb-bp-footer">
          ${m.badge ? renderPill(m.badge, m.badgeColor || "slate", m.badgeIcon || "retailer") : ""}
          ${m.price ? `<div class="cb-bp-price-col">
            <div class="cb-hand cb-big-num" style="color:${resolveColor(m.priceColor || "green").text}">${esc(m.price)}</div>
            ${m.priceSub ? `<div class="cb-tracked cb-payoff-label">${esc(m.priceSub)}</div>` : ""}
          </div>` : ""}
        </div>
      </div>`;
    },

    cb_timeline_split(s, i) {
      const m = s.meta || {};
      const mode = m.mode || "prefill_decode";
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      if (mode === "attention_triangle") {
        const size = Math.max(5, Math.min(10, Number(m.gridSize || 8)));
        const cellPal = resolveColor(m.color, "cyan");
        let triCells = "";
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const active = c <= r;
            triCells += `<div class="cb-tri-cell ${active ? "is-active" : ""}" data-row="${r}" style="--cell-stroke:${cellPal.stroke};--cell-fill:${cellPal.fill}"></div>`;
          }
        }
        return `
        <div class="cb-stage cb-stage-tri">
          ${renderEyebrow(s)}
          ${m.promptLabel ? `<div class="cb-tri-prompt">
            <div class="cb-sketch-bar cb-sketch-bar-sm" data-pct="${Number(m.promptPct || 6)}">
              ${sketchBoxSvg(1120, 44, 6, CHALK_PALETTE.slate, i + 9, { doublePass: false, strokeWidth: 1.4 })}
              <div class="cb-sketch-bar-fill" style="--bar-stroke:#589f76;--bar-fill:rgba(88,159,118,0.22);width:${Number(m.promptPct || 6)}%"></div>
            </div>
            <div class="cb-bar-meta"><span class="cb-tracked">${esc(m.promptLabel)}</span><span class="cb-hand" style="color:#63b384">${esc(m.promptVal || "")}</span></div>
          </div>` : ""}
          <div class="cb-tri-row">
            <div class="cb-tri-grid" style="grid-template-columns:repeat(${size}, 34px)">${triCells}</div>
            ${m.sideNote ? `<div class="cb-hand cb-tri-note" style="color:${cellPal.text}">${esc(m.sideNote)}</div>` : ""}
          </div>
          ${bottom}
        </div>`;
      }

      const prefillPct = Math.max(15, Math.min(92, Number(m.prefillPct || 86)));
      return `
      <div class="cb-stage cb-stage-splitbar">
        ${renderEyebrow(s)}
        ${m.topLabel ? `<div class="cb-bar-wrap">
          <div class="cb-sketch-bar" data-pct="100">
            ${sketchBoxSvg(1160, 48, 8, CHALK_PALETTE.coral, i + 11, { doublePass: false, strokeWidth: 1.4 })}
            <div class="cb-sketch-bar-fill" style="--bar-stroke:#b94a58;--bar-fill:rgba(185,74,88,0.12);width:100%"></div>
          </div>
          <div class="cb-bar-meta"><span class="cb-tracked">${esc(m.topLabel)}</span><span class="cb-hand" style="color:#cb5a69">${esc(m.topValue || "")}</span></div>
        </div>` : ""}
        <div class="cb-splitbar-wrap">
          <div class="cb-splitbar-box">
            ${sketchBoxSvg(1160, 68, 8, CHALK_PALETTE.slate, i + 21, { doublePass: false, strokeWidth: 1.6 })}
            <div class="cb-split-prefill" style="width:${prefillPct}%"></div>
            <div class="cb-split-divider" style="left:${prefillPct}%">
              <span class="cb-hand">${esc(m.markerLabel || "first token")}</span>
            </div>
            <div class="cb-split-decode" style="left:${prefillPct}%;width:${100 - prefillPct}%"></div>
          </div>
          <div class="cb-splitbar-labels">
            <span class="cb-hand" style="color:#cb5a69">${esc(m.prefillLabel || "prefill")}</span>
            <span class="cb-hand" style="color:#63b384">${esc(m.decodeLabel || "decode")}</span>
          </div>
        </div>
        ${bottom}
      </div>`;
    },

    cb_checklist(s, i) {
      const m = s.meta || {};
      const pills = (m.pills || []).map((p) => renderPill(p.text, p.color || "green", p.icon || "")).join("");
      const items = (m.items || []).map((it, k) => {
        const ip = resolveColor(it.color, it.ok === false ? "coral" : "green");
        return `<div class="cb-chk-row" data-k="${k}">
          ${chalkIcon(it.ok === false ? "cross" : "check", ip.text, 30)}
          <span class="cb-hand cb-chk-txt" style="color:${ip.text}">${esc(it.text)}</span>
        </div>`;
      }).join("");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "amber", m.bottomIcon || "", "cb-bottom-pill") : "";

      return `
      <div class="cb-stage cb-stage-checklist">
        ${renderEyebrow(s)}
        ${m.headerTitle ? `<div class="cb-chk-header">${chalkIcon(m.headerIcon || "terminal", "#d4d8df", 38)}<span class="cb-tracked cb-chk-htitle">${esc(m.headerTitle)}</span></div>` : ""}
        ${pills ? `<div class="cb-pills-row">${pills}</div>` : ""}
        <div class="cb-chk-list">${items}</div>
        ${bottom}
      </div>`;
    },

    cb_outro(s) {
      const m = s.meta || {};
      const cta = m.cta || "";
      const ctaSub = m.ctaSub || s.subline || "";
      return `
      <div class="cb-stage cb-stage-outro">
        ${renderEyebrow(s)}
        <h1 class="cb-hand cb-outro-title">${esc(s.headline || "")}</h1>
        ${ctaSub ? `<div class="cb-hand cb-outro-sub">${esc(ctaSub)}</div>` : ""}
        <div class="cb-pills-row">
          ${cta ? renderPill(cta, "green", "check") : ""}
          ${m.channel ? renderPill(m.channel, "cyan", "") : ""}
        </div>
      </div>`;
    },

    cb_sandbox(s, i) {
      const m = s.meta || {};
      const mode = m.mode || (m.steps ? "chain" : "capture");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      if (mode === "chain") {
        const steps = m.steps || [];
        const chainHtml = steps.map((st, k) => {
          const pal = resolveColor(st.color, ["cyan", "ochre", "slate", "green"][k % 4]);
          const media = st.logo
            ? renderBrandAsset(st.logo, st.title, stageAsset, resolveLocalPath)
            : chalkIcon(st.icon || "dns", pal.text, 34);
          return `${k > 0 ? `<svg class="cb-chain-arrow" viewBox="0 0 64 32" aria-hidden="true">
            <path class="cb-draw" d="M 4 16 L 54 16" fill="none" stroke="rgba(212,216,223,0.52)" stroke-width="2" stroke-linecap="round"/>
            <path class="cb-draw" d="M 44 8 L 56 16 L 44 24" fill="none" stroke="rgba(212,216,223,0.52)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>` : ""}
          <div class="cb-chain-step-col" data-k="${k}">
            <div class="cb-chain-node ${st.lasso ? "cb-lasso-host" : ""}">
              ${sketchBoxSvg(280, 132, 12, pal, i * 13 + k, { doublePass: true, strokeWidth: 1.5 })}
              <div class="cb-card-in">
                ${media}
                <div class="cb-hand cb-sb-node-title" style="color:${pal.text}">${esc(st.title)}</div>
                ${st.sub ? `<div class="cb-tracked cb-sb-node-sub">${esc(st.sub)}</div>` : ""}
              </div>
              ${st.lasso ? sketchLassoSvg(280, 144, st.lassoColor || "ochre", i + k + 3) : ""}
            </div>
            ${st.subCallout ? `<div class="cb-sub-callout">
              ${sketchDashedBoxSvg(240, 56, 10, CHALK_PALETTE.slate, i + k + 9, 1.4)}
              <span class="cb-hand" style="position:relative;z-index:1">${esc(st.subCallout)}</span>
            </div>` : ""}
          </div>`;
        }).join("");

        const shieldHtml = m.shield
          ? `<div class="cb-sb-shield-row">${renderPill(m.shield.label, m.shield.color || "green", m.shield.icon || "shield")}</div>`
          : "";

        return `
        <div class="cb-stage cb-stage-sandbox">
          ${renderEyebrow(s)}
          <div class="cb-chain-row">${chainHtml}</div>
          ${shieldHtml}
          ${bottom}
        </div>`;
      }

      const sources = m.sources || [];
      const targets = m.targets || [];
      const pkts = Array.isArray(m.packets) ? m.packets : Array.from({ length: Math.min(4, Number(m.packets || 2)) }, () => ({}));

      const srcHtml = sources.map((src, k) => {
        const pal = resolveColor(src.color, ["amber", "cyan", "slate", "violet"][k % 4]);
        const media = src.logo
          ? renderBrandAsset(src.logo, src.title, stageAsset, resolveLocalPath)
          : chalkIcon(src.icon || "terminal", pal.text, 34);
        return `<div class="cb-sb-node ${src.lasso ? "cb-lasso-host" : ""} ${src.blocked ? "is-xout" : ""}" data-k="${k}">
          ${sketchBoxSvg(360, 118, 12, pal, i * 7 + k, { doublePass: true, strokeWidth: 1.5 })}
          ${media}
          <div class="cb-sb-node-body">
            <div class="cb-hand cb-sb-node-title" style="color:${pal.text}">${esc(src.title)}</div>
            ${src.sub ? `<div class="cb-tracked cb-sb-node-sub">${esc(src.sub)}</div>` : ""}
          </div>
          ${src.lasso ? sketchLassoSvg(360, 126, "ochre", i + k) : ""}
          ${src.blocked ? sketchXOverlay(360, 118, i + k + 5) : ""}
        </div>`;
      }).join("");

      const tgtHtml = targets.map((tgt, k) => {
        const pal = resolveColor(tgt.color, tgt.funnel ? "coral" : "cyan");
        const media = tgt.logo
          ? renderBrandAsset(tgt.logo, tgt.title, stageAsset, resolveLocalPath)
          : chalkIcon(tgt.icon || (tgt.funnel ? "funnel" : "server"), pal.text, 36);
        return `<div class="cb-sb-node ${tgt.lasso ? "cb-lasso-host" : ""}" data-k="${k}">
          ${sketchBoxSvg(360, 124, 12, pal, i * 11 + k, { doublePass: true, strokeWidth: 1.5 })}
          ${media}
          <div class="cb-sb-node-body">
            <div class="cb-sb-funnel-row">
              <div class="cb-hand cb-sb-node-title" style="color:${pal.text}">${esc(tgt.title)}</div>
              ${tgt.recLabel ? `<span class="cb-rec-badge"><span class="cb-rec-dot"></span><span>${esc(tgt.recLabel)}</span></span>` : ""}
            </div>
            ${tgt.sub || tgt.recSub ? `<div class="cb-tracked cb-sb-node-sub">${esc(tgt.sub || tgt.recSub)}</div>` : ""}
          </div>
          ${tgt.lasso ? sketchLassoSvg(360, 130, "coral", i + k + 17) : ""}
        </div>`;
      }).join("");

      const lanesSvg = `<svg class="cb-sb-lanes" viewBox="0 0 250 240" aria-hidden="true">
        ${pkts.map((pk, k) => {
          const y0 = 60 + k * Math.min(54, 120 / Math.max(1, pkts.length));
          const y1 = 120;
          const col = pk.blocked ? "#cb5a69" : "#63b384";
          const pathD = `M 8 ${y0} C 95 ${y0}, 145 ${y1}, 240 ${y1}`;
          return `<path class="cb-draw cb-sb-traj" d="${pathD}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="7 6" stroke-linecap="round"/>
            ${pk.blocked
              ? `<path class="cb-x-stroke" d="M 110 ${y0 - 14} L 138 ${y0 + 14}" fill="none" stroke="#cb5a69" stroke-width="3" stroke-linecap="round"/>
                 <path class="cb-x-stroke" d="M 138 ${y0 - 14} L 110 ${y0 + 14}" fill="none" stroke="#cb5a69" stroke-width="3" stroke-linecap="round"/>`
              : `<g class="cb-sb-pkt" data-k="${k}">
                  <rect x="-15" y="-11" width="30" height="22" rx="4" fill="#0b0d11" stroke="${col}" stroke-width="1.8"/>
                  <path d="M -13 -9 L 0 2 L 13 -9" fill="none" stroke="${col}" stroke-width="1.6"/>
                </g>`}
            ${pk.label ? `<text x="125" y="${y0 - 14}" text-anchor="middle" fill="${col}" font-size="14" font-family="Excalifont, sans-serif">${esc(pk.label)}</text>` : ""}`;
        }).join("")}
      </svg>`;

      const meterHtml = m.meter ? (() => {
        const mp = resolveColor(m.meter.color, "cyan");
        const pct = Math.max(4, Math.min(100, Number(m.meter.pct ?? 75)));
        const hatchId = `cbHatch_${i}`;
        return `<div class="cb-hatch-wrap">
          <div class="cb-hatch-track" data-pct="${pct}">
            ${sketchBoxSvg(980, 52, 8, CHALK_PALETTE.slate, i + 41, { doublePass: false, strokeWidth: 1.5 })}
            <svg class="cb-hatch-fill-svg" viewBox="0 0 970 42" preserveAspectRatio="none" style="width:${pct}%">
              <defs>
                <pattern id="${hatchId}" width="14" height="14" patternTransform="rotate(42 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="14" stroke="${mp.stroke}" stroke-width="4" stroke-opacity="0.68"/>
                </pattern>
              </defs>
              <rect x="0" y="0" width="970" height="42" rx="5" fill="${m.meter.hatched !== false ? `url(#${hatchId})` : mp.fill}" stroke="${mp.stroke}" stroke-width="1.6"/>
            </svg>
          </div>
          <div class="cb-bar-meta">
            <span class="cb-tracked cb-bar-label">${esc(m.meter.label || "")}</span>
            <span class="cb-hand cb-bar-val" style="color:${mp.text}">${esc(m.meter.value || "")}${m.meter.targetValue ? ` -> ${esc(m.meter.targetValue)}` : ""}</span>
          </div>
        </div>`;
      })() : "";

      const gridContent = `<div class="cb-sb-grid">
        <div class="cb-sb-col">${srcHtml}</div>
        ${lanesSvg}
        <div class="cb-sb-col">${tgtHtml}</div>
      </div>`;

      const hostPal = resolveColor(m.hostColor, "green");
      const bounded = m.hostLabel
        ? `<div class="cb-dashed-wrap">
            ${sketchDashedBoxSvg(1340, 420, 18, hostPal, i + 23, 1.8)}
            <div class="cb-host-badge">${renderPill(m.hostLabel, m.hostColor || "green", m.hostIcon || "server")}</div>
            ${gridContent}
            ${meterHtml}
          </div>`
        : `${gridContent}${meterHtml}`;

      return `
      <div class="cb-stage cb-stage-sandbox">
        ${renderEyebrow(s)}
        <div class="cb-sb-wrap">${bounded}</div>
        ${m.shield ? `<div class="cb-sb-shield-row">${renderPill(m.shield.label, m.shield.color || "green", m.shield.icon || "shield")}</div>` : ""}
        ${bottom}
      </div>`;
    },

    cb_log(s, i) {
      const m = s.meta || {};
      const lines = m.lines || [];
      const notes = m.notes || [];
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      let headerHtml = "";
      if (m.mode === "permissions" || m.permBits) {
        const cols = (m.permBits || "- rw- --- ---").trim().split(/\s+/).slice(0, 4);
        const labels = ["TYPE", "YOU", "GROUP", "EVERYONE"];
        const permInner = cols.map((bits, k) => {
          const isOpen = k > 0 && bits !== "---";
          const col = k === 0 ? "slate" : (isOpen && k > 1 ? "coral" : (isOpen ? "green" : "slate"));
          const pal = resolveColor(col);
          return `<div class="cb-perm-col">
            <div class="cb-perm-bits" style="color:${pal.text}">${esc(bits)}</div>
            <div class="cb-tracked cb-perm-lbl">${esc(labels[k] || "")}</div>
          </div>`;
        }).join("");
        headerHtml = `<div class="cb-perm-header">
          <div class="cb-perm-block">
            ${sketchBoxSvg(520, 96, 10, CHALK_PALETTE.slate, i + 11, { doublePass: false, strokeWidth: 1.4 })}
            ${permInner}
          </div>
          ${m.envPill ? renderPill(m.envPill, m.envPillColor || "cyan", "lock") : ""}
          ${m.thumbsUp ? chalkIcon("thumbs-up", "#63b384", 42) : ""}
        </div>`;
      } else if (m.envPill) {
        headerHtml = `<div class="cb-perm-header">${renderPill(m.envPill, m.envPillColor || "cyan", "terminal")}</div>`;
      }

      const linesHtml = lines.map((ln, k) => {
        const lp = ln.color ? resolveColor(ln.color) : null;
        const body = renderTokenHighlights(ln.text, ln.highlight, ln.circle, ln.highlightColor || "ochre");
        return `<div class="cb-term-line ${ln.dim ? "is-dim" : ""}" data-k="${k}" style="${lp ? `color:${lp.text}` : ""}">${body}</div>`;
      }).join("");

      const notesHtml = notes.length
        ? `<div class="cb-log-notes">${notes.map((nt, k) => {
            const np = resolveColor(nt.color, k === 0 ? "ochre" : "coral");
            return `<div class="cb-log-note" data-k="${k}" style="color:${np.text}">
              <svg width="42" height="28" viewBox="0 0 42 28" aria-hidden="true">
                <path class="cb-draw" d="M 38 22 Q 18 22 10 8" fill="none" stroke="${np.text}" stroke-width="2" stroke-linecap="round"/>
                <path class="cb-draw" d="M 4 14 L 10 7 L 18 11" fill="none" stroke="${np.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="cb-hand">${esc(nt.text)}</span>
            </div>`;
          }).join("")}</div>`
        : "";

      return `
      <div class="cb-stage cb-stage-log">
        ${renderEyebrow(s)}
        ${headerHtml}
        <div class="cb-term-win">
          ${sketchBoxSvg(1140, Math.max(240, 120 + lines.length * 46), 12, CHALK_PALETTE.slate, i + 17, { doublePass: true, strokeWidth: 1.5 })}
          <div class="cb-term-bar">
            <span class="cb-term-dot"></span><span class="cb-term-dot"></span><span class="cb-term-dot"></span>
            <span class="cb-term-fname">${esc(m.filename || m.title || "terminal")}</span>
          </div>
          <div class="cb-term-lines">${linesHtml}</div>
        </div>
        ${notesHtml}
        ${bottom}
      </div>`;
    },

    cb_issue(s, i) {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "slate");
      const statusPalName = m.statusColor || "green";
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      const issueCard = `<div class="cb-issue-card">
        ${sketchBoxSvg(760, 380, 12, pal, i + 29, { doublePass: true, strokeWidth: 1.6 })}
        <div class="cb-issue-top">
          <div class="cb-issue-repo">
            ${chalkIcon("github", "#dfe3ea", 30)}
            <span>${esc(m.repo || "repo")}${m.number ? ` #${esc(m.number)}` : ""}</span>
          </div>
          ${renderPill(m.status || "Open", statusPalName, "bug")}
        </div>
        <div class="cb-hand cb-issue-title">${esc(m.issueTitle || m.title || s.headline || "")}</div>
        ${m.body ? `<div class="cb-hand cb-issue-body">${esc(m.body)}</div>` : ""}
        <div class="cb-issue-meta">
          ${m.dateLabel ? `<span class="cb-tracked" style="display:inline-flex;align-items:center;gap:8px;color:#ccb04b">${chalkIcon("calendar", "#ccb04b", 22)}${esc(m.dateLabel)}</span>` : ""}
          ${m.author ? `<span class="cb-tracked">${esc(m.author)}</span>` : ""}
        </div>
      </div>`;

      const tg = m.toggle;
      const toggleBox = tg ? (() => {
        const isOnStart = Boolean(tg.on);
        const flipTo = tg.flipTo === undefined ? isOnStart : Boolean(tg.flipTo);
        const onPal = resolveColor(tg.onColor, "green");
        const offPal = resolveColor(tg.offColor, "coral");
        return `<div class="cb-toggle-box" data-start-on="${isOnStart}" data-end-on="${flipTo}">
          ${sketchBoxSvg(390, 310, 12, flipTo ? onPal : offPal, i + 37, { doublePass: true, strokeWidth: 1.6 })}
          <div class="cb-toggle-track">
            <div class="cb-toggle-on-fill" style="background:${onPal.fill};border:2px solid ${onPal.stroke}"></div>
            <div class="cb-toggle-knob"></div>
          </div>
          <div class="cb-hand cb-toggle-label" style="color:${(flipTo ? onPal : offPal).text}">${esc(tg.label)}</div>
          ${tg.sub ? `<div class="cb-hand cb-toggle-sub">${esc(tg.sub)}</div>` : ""}
          ${tg.badge ? renderPill(tg.badge, flipTo ? (tg.onColor || "green") : (tg.offColor || "coral"), "") : ""}
        </div>`;
      })() : (m.sideNote ? `<div class="cb-toggle-box">${sketchBoxSvg(360, 220, 12, CHALK_PALETTE.ochre, i + 43)}<div class="cb-hand cb-toggle-label" style="color:#ccb04b">${esc(m.sideNote)}</div></div>` : "");

      return `
      <div class="cb-stage cb-stage-issue">
        ${renderEyebrow(s)}
        <div class="cb-issue-grid">
          ${issueCard}
          ${toggleBox}
        </div>
        ${bottom}
      </div>`;
    },

    cb_timeline(s, i) {
      const m = s.meta || {};
      const events = m.events || [];
      const notes = m.notes || [];
      const axisPal = resolveColor(m.axisColor, "slate");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      const topStrip = (m.calendar || notes.length) ? `<div class="cb-tl-top-strip">
        <div class="cb-tl-notes">${notes.map((nt) => renderPill(nt.text, nt.color || "cyan", nt.icon || "docker")).join("")}</div>
        ${m.calendar ? sketchCalendarSvg(m.calendar.topLabel || "RELEASE", m.calendar.mainLabel, m.calendar.color || "ochre", i + 7) : ""}
      </div>` : "";

      const colsHtml = events.map((ev, k) => {
        const side = ev.side || (k % 2 === 0 ? "above" : "below");
        const pal = resolveColor(ev.color, ev.xOut ? "coral" : (ev.lasso ? "ochre" : ["green", "cyan", "slate", "ochre"][k % 4]));
        const card = `<div class="cb-tl-card ${ev.lasso ? "cb-lasso-host" : ""} ${ev.xOut ? "is-xout" : ""}">
          ${sketchBoxSvg(210, 96, 10, pal, i * 9 + k, { doublePass: false, strokeWidth: 1.5 })}
          <div class="cb-hand cb-tl-ev-lbl" style="color:${pal.text}">${esc(ev.label)}</div>
          ${ev.sub ? `<div class="cb-tracked cb-tl-ev-sub">${esc(ev.sub)}</div>` : ""}
          ${ev.lasso ? sketchLassoSvg(214, 104, "ochre", i + k + 3) : ""}
          ${ev.xOut ? sketchXOverlay(210, 96, i + k + 5) : ""}
        </div>`;
        const stem = `<svg class="cb-tl-stem" viewBox="0 0 8 54" aria-hidden="true">
          <path class="cb-draw" d="M 4 2 L 4 52" fill="none" stroke="${pal.stroke}" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        return `<div class="cb-tl-col" data-k="${k}">
          <div class="cb-tl-slot-above">${side === "above" ? `${card}${stem}` : ""}</div>
          <div class="cb-tl-dot" style="border-color:${pal.text}"></div>
          <div class="cb-tl-slot-below">${side === "below" ? `${stem}${card}` : ""}</div>
        </div>`;
      }).join("");

      return `
      <div class="cb-stage cb-stage-timeline">
        ${renderEyebrow(s)}
        ${topStrip}
        <div class="cb-tl-wrap" style="grid-template-columns:repeat(${events.length}, minmax(0, 1fr))">
          <svg class="cb-tl-axis-line" viewBox="0 0 1280 24" preserveAspectRatio="none" aria-hidden="true">
            <path class="cb-draw cb-tl-axis-path" d="M 8 12 L 1266 12" fill="none" stroke="${axisPal.stroke}" stroke-width="2.4" stroke-linecap="round"/>
            <path class="cb-draw" d="M 1254 4 L 1270 12 L 1254 20" fill="none" stroke="${axisPal.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${colsHtml}
        </div>
        ${bottom}
      </div>`;
    },

    cb_stamp_card(s, i) {
      const m = s.meta || {};
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      const heroHtml = (m.card || m.calendar) ? `<div class="cb-stamp-hero">
        ${m.card ? (() => {
          const cp = resolveColor(m.card.color, "cyan");
          const media = m.card.logo
            ? renderBrandAsset(m.card.logo, m.card.title, stageAsset, resolveLocalPath)
            : chalkIcon(m.card.icon || "cube", cp.text, 44);
          const st = m.stamp;
          const sp = st ? resolveColor(st.color, "coral") : null;
          const angle = st && st.angle != null ? Number(st.angle) : -7;
          return `<div class="cb-stamp-target">
            ${sketchBoxSvg(520, 220, 12, cp, i + 13, { doublePass: true, strokeWidth: 1.6 })}
            ${media}
            <div class="cb-hand cb-card-title" style="color:${cp.text};position:relative;z-index:1">${esc(m.card.title)}</div>
            ${m.card.sub ? `<div class="cb-hand cb-card-sub" style="position:relative;z-index:1">${esc(m.card.sub)}</div>` : ""}
            ${st ? `<div class="cb-stamp-badge" data-angle="${angle}" style="--stamp-stroke:${sp.stroke};--stamp-text:${sp.text};transform:rotate(${angle}deg)">${esc(st.text)}</div>` : ""}
          </div>`;
        })() : ""}
        ${m.calendar ? sketchCalendarSvg(m.calendar.topLabel || "BACK IN", m.calendar.mainLabel, m.calendar.color || "ochre", i + 19) : ""}
      </div>` : "";

      const rowsHtml = (m.rows || []).length ? `<div class="cb-spy-rows">${(m.rows || []).map((rw, k) => {
        const rp = resolveColor(rw.color, "coral");
        const tag = rw.tag ? renderPill(rw.tag, rw.tagColor || "ochre", "key") : `<span></span>`;
        const rightMedia = rw.rightLogo ? renderBrandAsset(rw.rightLogo, rw.right, stageAsset, resolveLocalPath) : "";
        return `<div class="cb-spy-row" data-k="${k}">
          ${tag}
          <div class="cb-spy-node">
            ${sketchBoxSvg(340, 72, 10, CHALK_PALETTE.slate, i + k + 23, { doublePass: false, strokeWidth: 1.4 })}
            <div style="position:relative;z-index:1">
              <div class="cb-hand" style="font-size:24px">${esc(rw.left)}</div>
              ${rw.leftSub ? `<div class="cb-tracked" style="font-size:10px">${esc(rw.leftSub)}</div>` : ""}
            </div>
          </div>
          <div class="cb-spy-edge">
            <svg viewBox="0 0 150 24" aria-hidden="true">
              <path class="cb-draw" d="M 4 12 L 138 12" fill="none" stroke="${rp.stroke}" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>
              <path class="cb-draw" d="M 130 6 L 142 12 L 130 18" fill="none" stroke="${rp.stroke}" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${rw.eye !== false ? `<span class="cb-spy-eye">${chalkIcon("eye", rp.text, 24)}</span>` : ""}
          </div>
          <div class="cb-spy-node">
            ${sketchBoxSvg(340, 72, 10, rp, i + k + 31, { doublePass: false, strokeWidth: 1.4 })}
            <div style="position:relative;z-index:1;display:flex;align-items:center;gap:10px">
              ${rightMedia}
              <div>
                <div class="cb-hand" style="font-size:24px;color:${rp.text}">${esc(rw.right)}</div>
                ${rw.rightSub ? `<div class="cb-tracked" style="font-size:10px">${esc(rw.rightSub)}</div>` : ""}
              </div>
            </div>
          </div>
        </div>`;
      }).join("")}</div>` : "";

      return `
      <div class="cb-stage cb-stage-stamp">
        ${renderEyebrow(s)}
        ${heroHtml}
        ${rowsHtml}
        ${bottom}
      </div>`;
    },

    cb_prompt_card(s, i) {
      const m = s.meta || {};
      const mode = m.mode || "prompt";
      const pal = resolveColor(m.color, mode === "media" ? "coral" : "cyan");
      const bottom = m.bottomPill ? renderPill(m.bottomPill, m.bottomColor || "ochre", m.bottomIcon || "", "cb-bottom-pill") : "";

      if (mode === "media") {
        const scrubPct = Math.max(8, Math.min(96, Number(m.scrubPct ?? 72)));
        const thumb = m.thumbnail ? `<img class="cb-media-thumb" src="${esc(stageAsset(m.thumbnail))}" alt="${esc(m.title)}"/>` : "";
        return `
        <div class="cb-stage cb-stage-prompt">
          ${renderEyebrow(s)}
          <div class="cb-media-card ${m.lasso ? "cb-lasso-host" : ""}">
            ${sketchBoxSvg(860, 480, 14, pal, i + 7, { doublePass: true, strokeWidth: 1.6 })}
            <div class="cb-media-head">
              ${renderPill(m.platform || "Video", "coral", "play")}
              ${m.badge ? renderPill(m.badge, "ochre", "") : ""}
            </div>
            <div class="cb-media-viewport">
              ${thumb}
              <div style="position:relative;z-index:1;display:flex;align-items:center;gap:18px;padding:0 28px;text-align:center">
                ${chalkIcon(m.eye ? "eye" : "play", pal.text, 54)}
                <div class="cb-hand" style="font-size:32px;color:#dfe3ea">${esc(m.title)}</div>
              </div>
            </div>
            <div class="cb-media-scrub" data-pct="${scrubPct}">
              <div class="cb-media-scrub-fill" style="width:${scrubPct}%"></div>
              <div class="cb-media-scrub-dot" style="left:calc(${scrubPct}% - 9px)"></div>
            </div>
            <div class="cb-media-foot">
              ${m.viewsStart || m.viewsEnd ? `<div class="cb-hand" style="font-size:28px;color:#ccb04b">${esc(m.viewsStart || "")}${m.viewsEnd ? ` -> ${esc(m.viewsEnd)}` : ""}</div>` : "<span></span>"}
              ${m.chatPill ? renderPill(m.chatPill, "green", "chat-dots") : ""}
            </div>
            ${m.lasso ? sketchLassoSvg(872, 492, "coral", i + 19) : ""}
          </div>
          ${bottom}
        </div>`;
      }

      const choicesHtml = (m.choices || []).map((ch, k) => {
        const obj = typeof ch === "string" ? { text: ch } : ch;
        const cp = resolveColor(obj.color, obj.active ? "green" : "slate");
        return `<div class="cb-choice-pill ${obj.active ? "is-active" : ""}" data-k="${k}">
          ${sketchBoxSvg(164, 58, 28, cp, i * 5 + k, { doublePass: false, strokeWidth: obj.active ? 2.0 : 1.4 })}
          <span class="cb-hand" style="position:relative;z-index:1;color:${cp.text}">${esc(obj.text)}</span>
          ${obj.active ? `<span style="position:relative;z-index:1;display:inline-flex">${chalkIcon("check", cp.text, 22)}</span>` : ""}
        </div>`;
      }).join("");

      const avatarBox = (m.avatar || m.avatarLabel) ? `<div class="cb-cal-card" style="width:220px;height:210px;padding:18px;justify-content:center;gap:12px">
        ${sketchBoxSvg(220, 210, 12, CHALK_PALETTE.ochre, i + 41, { doublePass: true, strokeWidth: 1.5 })}
        ${m.avatar ? `<img src="${esc(stageAsset(m.avatar))}" alt="${esc(m.avatarLabel || "")}" style="position:relative;z-index:1;width:120px;height:120px;object-fit:cover;border-radius:8px"/>` : chalkIcon("hacker", "#ccb04b", 64)}
        ${m.avatarLabel ? `<div class="cb-hand" style="position:relative;z-index:1;font-size:22px;color:#ccb04b">${esc(m.avatarLabel)}</div>` : ""}
      </div>` : "";

      return `
      <div class="cb-stage cb-stage-prompt">
        ${renderEyebrow(s)}
        <div class="cb-prompt-layout">
          <div class="cb-speech-card">
            ${sketchBoxSvg(820, 360, 16, pal, i + 11, { doublePass: true, strokeWidth: 1.6 })}
            ${m.icon ? chalkIcon(m.icon, pal.text, 44) : ""}
            <div class="cb-hand cb-speech-q">${esc(m.question || "")}</div>
            ${m.codeToken ? `<div class="cb-code-token">${esc(m.codeToken)}</div>` : ""}
            ${m.subNote ? `<div class="cb-hand" style="position:relative;z-index:1;font-size:26px;color:var(--dim)">${esc(m.subNote)}</div>` : ""}
            ${choicesHtml ? `<div class="cb-choices-row">${choicesHtml}</div>` : ""}
          </div>
          ${avatarBox}
        </div>
        ${bottom}
      </div>`;
    },
  };

  // Fallback mapping if a chalkboard video uses standard cold/outro/stat/hero types
  R.cold = (s, i) => R.cb_title({ ...s, meta: { title: s.headline, pill: s.meta?.chips?.[0], stat: s.meta?.chips?.[1], statLabel: s.subline } }, i);
  R.outro = (s, i) => R.cb_outro(s, i);
  R.hero = (s, i) => R.cb_title({ ...s, meta: { title: s.headline, logo: s.meta?.logos?.[0]?.src, barLabel: s.meta?.label, barValue: s.meta?.caption, pill: s.meta?.mark } }, i);
  R.stat = (s, i) => R.cb_stat_bar({ ...s, meta: { mode: "metric_bar", value: String(s.meta?.display || s.meta?.value || ""), unit: s.meta?.suffix || "", label: s.meta?.label || s.headline, color: "coral" } }, i);
  R.compare = (s, i) => R.cb_gpu_spec({ ...s, meta: { mode: "compare", cards: [
    { brand: s.meta?.left?.k, title: s.meta?.left?.t, bullets: s.meta?.left?.pts || [], price: s.meta?.left?.pts?.slice(-1)[0] || "", color: "cyan" },
    { brand: s.meta?.right?.k, title: s.meta?.right?.t, bullets: s.meta?.right?.pts || [], price: s.meta?.right?.pts?.slice(-1)[0] || "", color: "amber" },
  ] } }, i);
  R.stack = (s, i) => R.cb_vram_stack({ ...s, meta: { ceiling: s.headline, layers: (s.meta?.layers || []).map((l, k) => ({ size: l.t, title: l.s, pct: Math.round(70 / Math.max(1, (s.meta?.layers || []).length)), color: ["violet", "cyan", "amber", "ochre"][k % 4] })) } }, i);
  R.flow = (s, i) => R.cb_wiring({ ...s, meta: { nodes: (s.meta?.nodes || []).map((n) => ({ title: n.t, sub: n.s })), edges: [{ from: 0, to: 2, thick: true, color: "green" }, { from: 0, to: 1, elbow: true }, { from: 1, to: 3, pulse: true, color: "coral" }] } }, i);
  return R;
}

export async function renderChalkboardDocument({
  project, scenes, total, compositionId, width, height, isPortrait, fps, audio, title, fontsCss, gsapJS, stageAsset, resolveLocalPath,
}) {
  const CSS = await fs.readFile(path.join(PRESET_DIR, "style.css"), "utf8");
  const SFX_JS = await fs.readFile(path.join(PRESET_DIR, "sfx.js"), "utf8");
  const ANIM_JS = (await fs.readFile(path.join(PRESET_DIR, "anim.js"), "utf8"))
    .replace('"__COMPOSITION_ID__"', JSON.stringify(compositionId));

  const RENDERERS = buildRenderers({ stageAsset, resolveLocalPath });
  const body = scenes.map((s, i) => {
    const id = `s${String(i + 1).padStart(3, "0")}`;
    const fn = RENDERERS[s.type] || RENDERERS.cb_title;
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
<div id="root" class="${isPortrait ? "is-portrait" : "is-landscape"}" data-aspect="${isPortrait ? "9:16" : "16:9"}" data-style="chalkboard-explainer" data-composition-id="${esc(compositionId)}" data-start="0" data-width="${width}" data-height="${height}" data-fps="${fps}" data-duration="${total.toFixed(3)}">
  <div id="cb-bg"></div>
  <div id="cb-vignette"></div>
  <div id="cb-grain"></div>
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
