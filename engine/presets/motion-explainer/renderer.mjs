// Dedicated renderer for the 'motion-explainer' style preset.
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
  emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.14)", text: "#34d399", solid: "#22c55e" },
  orange:  { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.14)", text: "#fb923c", solid: "#ea580c" },
  blue:    { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.14)", text: "#7dd3fc", solid: "#0ea5e9" },
  red:     { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.14)",  text: "#f87171", solid: "#dc2626" },
  amber:   { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.14)", text: "#fbbf24", solid: "#d97706" },
  violet:  { stroke: "#a78bfa", fill: "rgba(167, 139, 250, 0.14)", text: "#c4b5fd", solid: "#8b5cf6" },
  slate:   { stroke: "rgba(226, 232, 240, 0.34)", fill: "rgba(226, 232, 240, 0.06)", text: "#e2e8f0", solid: "#475569" },
};

function resolveColor(name, fallback = "emerald") {
  if (!name) return ME_PALETTE[fallback] || ME_PALETTE.emerald;
  if (ME_PALETTE[name]) return ME_PALETTE[name];
  if (/^#[0-9a-fA-F]{6}$/.test(name)) {
    return { stroke: name, fill: `${name}22`, text: name, solid: name };
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
  return `<svg class="me-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function isoCubeSvg(pal, { icon = "lock", size = 180, dashed = false, platform = true } = {}) {
  const s = size;
  const dashAttr = dashed ? 'stroke-dasharray="6 5"' : "";
  const faceOp = dashed ? "0.18" : "1";
  return `<svg class="me-iso-cube" width="${s}" height="${s}" viewBox="0 0 200 200" aria-hidden="true">
    ${platform ? `<ellipse cx="100" cy="158" rx="84" ry="26" fill="rgba(255,255,255,0.04)" stroke="${pal.stroke}" stroke-opacity="0.35" stroke-width="1.3"/>` : ""}
    <g opacity="${faceOp}">
      <polygon points="100,26 164,62 100,98 36,62" fill="#2c3340" stroke="rgba(255,255,255,0.22)" stroke-width="1.2" ${dashAttr}/>
      <polygon points="36,62 100,98 100,164 36,128" fill="#1e232d" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" ${dashAttr}/>
      <polygon points="100,98 164,62 164,128 100,164" fill="#141820" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" ${dashAttr}/>
      <polygon points="62,56 78,47 92,55 76,64" fill="rgba(255,255,255,0.08)"/>
      <polygon points="116,74 134,64 148,72 130,82" fill="rgba(255,255,255,0.07)"/>
      <rect x="52" y="92" width="16" height="16" rx="2" transform="skewY(28)" fill="rgba(255,255,255,0.06)"/>
      <rect x="74" y="102" width="12" height="12" rx="2" transform="skewY(28)" fill="rgba(255,255,255,0.05)"/>
      <rect x="118" y="128" width="16" height="16" rx="2" transform="skewY(-28)" fill="rgba(255,255,255,0.05)"/>
    </g>
    ${dashed ? `<polygon points="100,26 164,62 164,128 100,164 36,128 36,62" fill="none" stroke="${pal.stroke}" stroke-width="1.8" stroke-dasharray="6 5"/>` : ""}
    ${!dashed && icon ? `<g transform="translate(116, 94) scale(1.15)">
      <rect x="0" y="0" width="28" height="28" rx="7" fill="rgba(10,14,18,0.88)" stroke="${pal.stroke}" stroke-width="1.5"/>
      <g transform="translate(2, 2)">${meIcon(icon, pal.text, 24).replace(/<\/?svg[^>]*>/g, "")}</g>
    </g>` : ""}
  </svg>`;
}

function orbitRingSvg(pal, size = 380) {
  const c = size / 2;
  const rOuter = size * 0.43;
  const rInner = size * 0.36;
  return `<svg class="me-orbit-svg" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/>
    <circle class="me-ring-arc" cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="${pal.stroke}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(rOuter * 1.45).toFixed(1)} ${(rOuter * 0.65).toFixed(1)} ${(rOuter * 1.1).toFixed(1)} ${(rOuter * 0.8).toFixed(1)}"/>
    <circle class="me-ring-inner" cx="${c}" cy="${c}" r="${rInner}" fill="none" stroke="${pal.stroke}" stroke-opacity="0.32" stroke-width="1.4" stroke-dasharray="4 10"/>
  </svg>`;
}

function curvedArrowSvg(w = 180, h = 90, pal = ME_PALETTE.orange) {
  const d = `M 12 ${(h * 0.25).toFixed(1)} C ${(w * 0.42).toFixed(1)} ${(h * 0.22).toFixed(1)}, ${(w * 0.56).toFixed(1)} ${(h * 0.78).toFixed(1)}, ${w - 18} ${(h * 0.75).toFixed(1)}`;
  return `<svg class="me-arrow-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path class="me-draw-path" d="${d}" fill="none" stroke="${pal.stroke}" stroke-width="2.6" stroke-linecap="round"/>
    <polygon class="me-arrow-head" points="${w - 22},${h * 0.75 - 7} ${w - 8},${h * 0.75} ${w - 22},${h * 0.75 + 7}" fill="${pal.stroke}"/>
  </svg>`;
}

function renderPill(text, colorName = "slate", { mono = false, icon = null, extraClass = "" } = {}) {
  if (!text) return "";
  const pal = resolveColor(colorName, "slate");
  return `<div class="me-pill ${mono ? "is-mono" : ""} ${extraClass}">
    ${icon ? meIcon(icon, pal.text, 18) : `<span class="me-pill-dot" style="background:${pal.stroke}"></span>`}
    <span>${esc(text)}</span>
  </div>`;
}

function renderEyebrow(s) {
  return s.eyebrow ? `<div class="me-eyebrow">${esc(s.eyebrow)}</div>` : "";
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

      const headline = esc(s.headline || "");
      const highlight = m.highlight ? `<span class="me-hero-highlight">${esc(m.highlight)}</span>` : "";

      return `<div class="me-stage me-stage-title">
        ${renderEyebrow(s)}
        <div class="me-title-wrap">
          ${m.logo ? `<div class="me-logo-badge"><img src="${esc(stageAsset(m.logo))}" alt=""/>${m.badge ? `<span class="me-pill is-mono">${esc(m.badge)}</span>` : ""}</div>` : (m.badge ? renderPill(m.badge, m.color || "orange", { mono: true }) : "")}
          ${m.showCore ? `<div class="me-title-core">${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 150 })}</div>` : ""}
          <h1 class="me-hero-headline">${headline}${highlight ? `<br/>${highlight}` : ""}</h1>
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
        "top:16%; left:-6%;",
        "top:18%; right:-8%;",
        "bottom:16%; left:-4%;",
        "bottom:16%; right:-6%;",
      ];
      const nodesHtml = nodes.map((n, idx) => {
        const obj = typeof n === "string" ? { label: n } : n;
        const np = resolveColor(obj.color, m.color || "emerald");
        return `<div class="me-orbit-node" data-idx="${idx}" style="${posStyles[idx % posStyles.length]} border-color:${np.stroke}66">
          ${meIcon(obj.icon || "spark", np.text, 18)}
          <span>${esc(obj.label || "")}</span>
        </div>`;
      }).join("");

      let sideHtml = "";
      if (m.modal) {
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
          <div class="me-orbit-stage" style="width:270px;height:240px">
            ${orbitRingSvg(pal, 240)}
            ${isoCubeSvg(pal, { icon: m.targetIcon || "code", size: 148, dashed: Boolean(m.targetDashed) })}
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
            <div style="font-size:20px;color:var(--me-dim)">${esc(d0.label || "memory")}</div>
          </div>
        </div>`;
      }

      return `<div class="me-stage me-stage-orbit">
        ${renderEyebrow(s)}
        <div class="me-orbit-layout">
          <div class="me-orbit-stage">
            ${m.topPill ? `<div class="me-orbit-top">${renderPill(m.topPill, "slate", { mono: true })}</div>` : ""}
            ${orbitRingSvg(pal, 420)}
            ${isoCubeSvg(pal, { icon: m.coreIcon || "lock", size: 210 })}
            ${nodesHtml}
            ${m.bottomPill ? `<div class="me-orbit-bottom">${renderPill(m.bottomPill, m.color || "emerald")}</div>` : ""}
          </div>
          ${sideHtml ? `
            <div class="me-orbit-arrow-wrap">
              ${curvedArrowSvg(180, 90, arrowPal)}
              ${m.arrowLabel ? `<div class="me-orbit-arrow-label">${renderPill(m.arrowLabel, m.arrowColor || "orange", { mono: true })}</div>` : ""}
            </div>
            ${sideHtml}
          ` : ""}
        </div>
      </div>`;
    },

    me_bar_compare: (s) => {
      const m = s.meta || {};
      const headerLeft = `<div style="display:flex;align-items:center;gap:16px">
        ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:36px;width:auto"/>` : ""}
        <h2 class="me-bar-title">${esc(m.header || s.headline || "")}</h2>
      </div>`;
      const headerRight = m.badge ? renderPill(m.badge, m.deltaColor || "slate", { mono: true }) : "";

      if (m.groups?.length) {
        const groupsHtml = m.groups.map((g, gi) => {
          const gp = resolveColor(g.color, g.active ? "orange" : "slate");
          const gBars = (g.bars || []).map((gb, bi) => {
            const bp = resolveColor(gb.color, bi === 0 ? "orange" : "emerald");
            const pct = Math.max(8, Math.min(100, Number(gb.pct || 50)));
            return `<div class="me-bar-col" data-idx="${gi}-${bi}">
              <div class="me-bar-value-top" style="color:${bp.text};font-size:22px">${esc(gb.value)}</div>
              <div class="me-bar-shell" style="height:${pct}%">
                <div class="me-bar-fill" style="height:100%;background:${bp.solid}"></div>
              </div>
              <div class="me-bar-label" style="font-size:16px">${esc(gb.label)}</div>
            </div>`;
          }).join("");
          return `<div class="me-group-box ${g.active ? "is-active" : ""}" data-idx="${gi}">
            ${renderPill(g.title, g.active ? (g.color || "orange") : "slate", { mono: false })}
            <div class="me-group-bars">${gBars}</div>
          </div>`;
        }).join("");

        return `<div class="me-stage me-stage-bars">
          ${renderEyebrow(s)}
          <div class="me-bar-head">${headerLeft}${headerRight}</div>
          <div class="me-groups-grid">${groupsHtml}</div>
          ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, "emerald", { mono: true })}</div>` : ""}
        </div>`;
      }

      const barsHtml = (m.bars || []).map((b, bi) => {
        const bp = resolveColor(b.color, bi === 0 ? "orange" : "emerald");
        const pct = Math.max(8, Math.min(92, Number(b.pct || 60)));
        return `<div class="me-bar-col" data-idx="${bi}">
          ${b.delta ? `<div class="me-bar-delta" style="color:${bp.text}">${esc(b.delta)}</div>` : ""}
          <div class="me-bar-shell" style="height:${pct}%">
            ${b.dashedCap ? `<div class="me-bar-cap"></div>` : ""}
            <div class="me-bar-fill" style="height:100%;background:linear-gradient(180deg, ${bp.text} 0%, ${bp.solid} 100%)">${esc(b.value)}</div>
          </div>
          <div class="me-bar-label">
            ${b.logo ? `<img src="${esc(stageAsset(b.logo))}" alt="" style="height:20px;width:auto"/>` : ""}
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
        <div class="me-chart-panel">
          <div class="me-bars-row">
            ${thrLine}
            ${barsHtml}
          </div>
          <div style="height:44px"></div>
        </div>
        ${m.bottomPill ? `<div class="me-bottom-pill">${renderPill(m.bottomPill, m.deltaColor || "emerald", { mono: true })}</div>` : ""}
      </div>`;
    },

    me_stat_split: (s) => {
      const m = s.meta || {};
      const pal = resolveColor(m.color, "orange");
      const pct = Math.max(10, Math.min(100, Number(m.pct ?? 78)));
      const sideBars = (m.sideBars || []).map((sb, idx) => {
        const sp = resolveColor(sb.color, idx === 0 ? "orange" : "emerald");
        const spPct = Math.max(10, Math.min(92, Number(sb.pct || 50)));
        return `<div class="me-bar-col" data-idx="${idx}">
          ${sb.prefix ? `<div style="font-size:15px;color:var(--me-dim);margin-bottom:4px">${esc(sb.prefix)}</div>` : ""}
          <div class="me-bar-delta" style="color:${sp.text}">${esc(sb.value)}</div>
          <div class="me-bar-shell" style="height:${spPct}%">
            <div class="me-bar-fill" style="height:100%;background:${sp.solid}"></div>
          </div>
          <div class="me-bar-label">${esc(sb.label)}</div>
        </div>`;
      }).join("");

      return `<div class="me-stage me-stage-split">
        ${renderEyebrow(s)}
        <div class="me-split-grid">
          <div class="me-split-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              ${renderPill(m.model || s.headline, m.color || "orange", { icon: "spark" })}
              ${m.benchmark ? `<span style="font-family:var(--mono);font-size:17px;color:var(--me-dim)">${esc(m.benchmark)}</span>` : ""}
            </div>
            <div class="me-stat-hero-row">
              <div class="me-stat-vbar-wrap">
                <div class="me-stat-vbar-fill" style="height:${pct}%;background:linear-gradient(180deg, ${pal.text}, ${pal.solid})"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px">
                <div class="me-stat-big" style="color:${pal.text}">${esc(m.value)}</div>
                ${m.baseline ? `<div class="me-stat-base">${esc(m.baseline)}</div>` : ""}
                ${m.delta ? `<div><span class="me-delta-chip">${esc(m.delta)}</span></div>` : ""}
              </div>
            </div>
          </div>
          <div class="me-split-card">
            <div style="display:flex;align-items:center;justify-content:space-between">
              ${renderPill(m.sideTitle || "Generalization", "slate", { icon: "doc" })}
              ${m.sideBadge ? renderPill(m.sideBadge, "emerald", { mono: true }) : ""}
            </div>
            <div class="me-bars-row" style="height:290px;margin-bottom:36px">
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
              <div style="display:flex;align-items:center;gap:12px">
                ${m.logo ? `<img src="${esc(stageAsset(m.logo))}" alt="" style="height:26px;width:auto"/>` : meIcon("doc", pal.text, 22)}
                <span>${esc(m.source || "")}${m.handle ? ` · ${esc(m.handle)}` : ""}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                ${m.date ? `<span>${esc(m.date)}</span>` : ""}
                ${m.badge ? renderPill(m.badge, m.color || "orange", { mono: true }) : ""}
              </div>
            </div>
            ${m.title ? `<h3 class="me-paper-title">${esc(m.title)}</h3>` : ""}
            ${bodyHtml ? `<div class="me-paper-body">${bodyHtml}</div>` : ""}
            ${m.image ? `<img src="${esc(stageAsset(m.image))}" alt="" style="max-height:360px;width:100%;object-fit:contain;border-radius:10px;border:1px solid var(--me-border)"/>` : ""}
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
          return `${idx > 0 ? `<div style="width:52px;flex:0 0 auto">${curvedArrowSvg(52, 34, np)}</div>` : ""}
          <div class="me-pipe-node ${nd.active ? "is-active" : ""}" data-idx="${idx}">
            <div style="display:flex;align-items:center;gap:10px">
              ${meIcon(nd.icon || "layers", np.text, 22)}
              <span style="font-size:24px;font-weight:700">${esc(nd.title)}</span>
            </div>
            ${nd.sub ? `<div style="font-family:var(--mono);font-size:16px;color:var(--me-dim)">${esc(nd.sub)}</div>` : ""}
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
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
            ${renderPill("rollouts", "slate", { icon: "play" })}
            <div class="me-dot-matrix">${dots}</div>
          </div>
          <div class="me-c3-card" style="border-color:${pal.stroke}">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:28px;font-weight:700">${esc(m.centerTitle || s.headline)}</span>
              ${m.centerBadge ? renderPill(m.centerBadge, "red", { mono: true }) : ""}
            </div>
            <div class="me-c3-slots">
              <div class="me-c3-slot">?</div>
              <div class="me-c3-slot">?</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
            <div style="font-size:26px;font-weight:700">${esc(m.rightTitle || "SIM")}</div>
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
          ? `<div class="me-skeleton-bars"><div class="me-skeleton-line" style="width:82%"></div><div class="me-skeleton-line" style="width:54%"></div></div>`
          : `<div class="me-schema-val" style="color:${f.highlight ? fp.text : "var(--me-ink)"}">${esc(f.val || "")}</div>`;
        return `<div class="me-schema-row ${f.highlight ? "is-highlight" : ""}" data-idx="${idx}">
          <div class="me-schema-key">${esc(f.key)}</div>
          ${valNode}
        </div>`;
      }).join("");

      const attemptHtml = m.attempt ? `<div class="me-attempt-card">
        <div style="display:flex;align-items:center;gap:14px">
          ${renderPill(m.attempt.index || "1", m.attempt.color || "orange", { mono: true })}
          <span style="font-family:var(--mono);font-size:19px;color:var(--me-dim)">${esc(m.attempt.label || "edit")}</span>
          <span style="font-size:22px;font-weight:700;color:${resolveColor(m.attempt.color, "orange").text}">${esc(m.attempt.value || "")}</span>
        </div>
      </div>` : "";

      const deckHtml = (m.deckTag || m.deckLabel) ? `
        <div class="me-orbit-arrow-wrap me-deck-arrow" style="width:120px">
          ${curvedArrowSvg(120, 70, pal)}
        </div>
        <div class="me-deck-col" style="display:flex;flex-direction:column;align-items:center;gap:14px">
          <div class="me-deck-wrap">
            <div class="me-deck-layer" style="transform:translate(14px, -14px);opacity:0.4"></div>
            <div class="me-deck-layer" style="transform:translate(7px, -7px);opacity:0.65"></div>
            <div class="me-deck-front">
              <div class="me-deck-tag">${esc(m.deckTag || "P5")}</div>
            </div>
          </div>
          ${m.deckLabel ? `<div style="font-size:24px;font-weight:600;color:var(--me-dim)">${esc(m.deckLabel)}</div>` : ""}
        </div>` : "";

      return `<div class="me-stage me-stage-schema">
        ${renderEyebrow(s)}
        <div class="me-schema-layout">
          <div class="me-schema-box">
            <div class="me-schema-head">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <span style="font-family:var(--mono);font-size:15px;letter-spacing:0.16em;color:var(--me-dim)">${esc(m.eyebrow || "ROOT CAUSE")}</span>
                ${m.statusPill ? renderPill(m.statusPill, m.color || "orange", { mono: true }) : ""}
              </div>
              <div style="font-size:32px;font-weight:700">${esc(m.title || s.headline)}</div>
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

      return `<div class="me-stage me-stage-editor">
        ${renderEyebrow(s)}
        <div class="me-editor-layout">
          <div class="me-editor-win">
            <div class="me-editor-tabbar">
              <div class="me-win-dots"><span class="me-win-dot"></span><span class="me-win-dot"></span><span class="me-win-dot"></span></div>
              <div class="me-editor-tab" style="border-bottom-color:${pal.stroke}">${esc(m.filename || "harness-log.md")}</div>
            </div>
            <div class="me-editor-body">${linesHtml}</div>
            <div class="me-editor-status">
              <span>⑂ ${esc(m.branch || "main")}</span>
              <span>${esc(m.statusRight || `Ln ${(m.lines || []).length}, Col 1`)}</span>
            </div>
          </div>
          ${m.footerLabel ? renderPill(m.footerLabel, m.color || "emerald", { mono: true }) : ""}
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
          <div style="display:flex;align-items:center;gap:12px">
            ${meIcon(gt.ok ? "check" : "shield", gt.ok ? "#34d399" : "#94a3b8", 24)}
            <span>${esc(gt.label)}</span>
          </div>
          ${gt.badge ? renderPill(gt.badge, gt.ok ? "emerald" : "slate", { mono: true }) : ""}
        </div>`;
      }).join("");

      return `<div class="me-stage me-stage-gate">
        ${renderEyebrow(s)}
        <div class="me-gate-layout">
          <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
            <div class="me-orbit-stage" style="width:360px;height:320px">
              ${orbitRingSvg(pal, 340)}
              ${isoCubeSvg(pal, { icon: "lock", size: 176 })}
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
                <div style="font-size:28px;font-weight:600">${esc(m.question || s.headline)}</div>
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
            <div style="font-family:var(--mono);font-size:15px;color:${ep.text}">${esc(ev.label)}</div>
            ${ev.value ? `<div style="font-size:28px;font-weight:700;margin-top:4px">${esc(ev.value)}</div>` : ""}
            ${ev.sub ? `<div style="font-size:16px;color:var(--me-dim);margin-top:4px">${esc(ev.sub)}</div>` : ""}
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
          <h2 class="me-hero-headline" style="font-size:64px">${esc(s.headline || "Thanks for watching")}</h2>
          ${sub ? `<p class="me-hero-sub">${esc(sub)}</p>` : ""}
          <div style="display:flex;align-items:center;gap:18px;margin-top:8px">
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
