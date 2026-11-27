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

      return `<div class="me-stage me-stage-title">
        ${renderEyebrow(s)}
        <div class="me-title-wrap">
          ${wm}
          ${m.logo ? `<div class="me-logo-badge"><img src="${esc(stageAsset(m.logo))}" alt=""/>${m.badge ? `<span class="me-pill is-mono" style="border:none;padding:0;background:transparent">${esc(m.badge)}</span>` : ""}</div>` : (m.badge ? renderPill(m.badge, m.color || "orange", { mono: true }) : "")}
          ${m.showCore ? `<div class="me-title-core">${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 176 })}</div>` : ""}
          <h1 class="me-hero-headline">${formatHeroHeadline(s.headline)}</h1>
          ${highlight}
          ${s.subline ? `<p class="me-hero-sub">${esc(s.subline)}</p>` : ""}
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

      let sideHtml = "";
      if (m.targetBar) {
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
      } else if (m.targetLabel) {
        sideHtml = `<div class="me-orbit-side">
          <div class="me-orbit-stage" style="width:300px;height:260px">
            <div class="me-orbit-glow" style="width:220px;height:220px;background:${pal.stroke}"></div>
            ${orbitRingSvg(pal, 260, arrowPal)}
            ${isoCubeSvg(pal, { icon: m.targetIcon || "code", size: 160, dashed: Boolean(m.targetDashed) })}
          </div>
          ${renderPill(m.targetLabel, m.color || "emerald", { icon: m.targetIcon || "spark" })}
        </div>`;
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
            ${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 245 })}
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
            ${m.image ? `<img src="${esc(stageAsset(m.image))}" alt="" style="max-height:380px;width:100%;object-fit:contain;border-radius:10px;border:1px solid var(--me-border)"/>` : ""}
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
              ${meIcon(nd.icon || "layers", np.text, 24)}
              <span style="font-size:26px;font-weight:700">${esc(nd.title)}</span>
            </div>
            ${nd.sub ? `<div style="font-family:var(--mono);font-size:17px;color:var(--me-dim)">${esc(nd.sub)}</div>` : ""}
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-pipeline">
          ${renderEyebrow(s)}
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

      return `<div class="me-stage me-stage-schema">
        ${renderEyebrow(s)}
        <div class="me-schema-layout">
          <div class="me-schema-box">
            <div class="me-schema-head">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <span style="font-family:var(--mono);font-size:16px;letter-spacing:0.16em;color:var(--me-dim)">${esc(m.eyebrow || "ROOT CAUSE")}</span>
                ${m.statusPill ? renderPill(m.statusPill, m.color || "orange", { mono: true }) : ""}
              </div>
              <div style="font-size:36px;font-weight:700">${esc(m.title || s.headline)}</div>
            </div>
            <div class="me-schema-rows">
              ${fieldsHtml}
              ${attemptHtml}
            </div>
          </div>
          ${deckHtml}
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
              <div class="me-editor-tab" style="border-bottom-color:${pal.stroke}">${esc(m.filename || "harness-log.md")}</div>
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

      const rolloutsHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        ${m.rolloutLabel ? `<div style="font-family:var(--mono);font-size:16px;color:var(--me-dim)">${esc(m.rolloutLabel)}</div>` : ""}
        <div class="me-rollout-row">
          <span class="me-rollout-sq is-on"></span>
          <span class="me-rollout-sq"></span>
          <span class="me-rollout-sq"></span>
          <span class="me-rollout-sq"></span>
          <span class="me-rollout-sq"></span>
        </div>
      </div>`;

      return `<div class="me-stage me-stage-gate">
        ${renderEyebrow(s)}
        <div class="me-gate-layout">
          <div style="display:flex;flex-direction:column;align-items:center;gap:18px">
            ${rolloutsHtml}
            <div class="me-orbit-stage" style="width:390px;height:340px">
              <div class="me-orbit-glow" style="width:280px;height:280px;background:${pal.stroke}"></div>
              ${orbitRingSvg(pal, 370, ME_PALETTE.orange)}
              ${isoCubeSvg(pal, { icon: "lock", size: 196 })}
            </div>
            ${renderPill(m.resultPill || "COMPLETE", "emerald", { icon: "check" })}
          </div>
          <div class="me-gate-panel">
            <div class="me-modal-card" style="width:100%">
              <div class="me-modal-bar">
                <span><span class="me-pill-dot" style="display:inline-block;background:#f97316;margin-right:8px"></span>${esc(m.statusPill || "stop check")}</span>
                <span style="color:#fb923c">${esc(m.counterBadge || "×3")}</span>
              </div>
              <div class="me-modal-body">
                <div style="font-size:31px;font-weight:600">${esc(m.question || s.headline)}</div>
                ${choicesHtml ? `<div class="me-gate-choices">${choicesHtml}</div>` : ""}
              </div>
            </div>
            ${gatesHtml ? `<div class="me-gates-row">${gatesHtml}</div>` : ""}
          </div>
        </div>
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
