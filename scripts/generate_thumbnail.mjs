#!/usr/bin/env node
/**
 * Programmatic HTML/CSS + Playwright Thumbnail Generator (Fallback Engine)
 *
 * Produces high-depth 3D dark-carbon motion-explainer YouTube & Shorts thumbnails
 * matching the 81 reference sample aesthetics when native image generation is unavailable.
 *
 * Usage:
 *   node scripts/generate_thumbnail.mjs --project <slug> --spec notes/thumb-a.json --variant a
 *   node scripts/generate_thumbnail.mjs --project <slug> --title "32GB > ~~128GB~~" --archetype versus --accent lime
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  ENGINE_ROOT,
  popProjectArg,
  projectJsonPath,
  resolveProjectDir,
} from "../engine/workspace.mjs";

export const THUMB_PALETTES = {
  lime:    { name: "lime",    main: "#a3e635", light: "#d9f99d", dark: "#4d7c0f", deep: "#1a2e05", glow: "rgba(163, 230, 53, 0.72)", text: "#bef264" },
  emerald: { name: "emerald", main: "#22c55e", light: "#86efac", dark: "#15803d", deep: "#052e16", glow: "rgba(34, 197, 94, 0.72)",  text: "#4ade80" },
  green:   { name: "green",   main: "#22c55e", light: "#86efac", dark: "#15803d", deep: "#052e16", glow: "rgba(34, 197, 94, 0.72)",  text: "#4ade80" },
  blue:    { name: "blue",    main: "#1e90ff", light: "#7dd3fc", dark: "#0369a1", deep: "#082f49", glow: "rgba(30, 144, 255, 0.76)", text: "#38bdf8" },
  cyan:    { name: "cyan",    main: "#06b6d4", light: "#67e8f9", dark: "#0e7490", deep: "#083344", glow: "rgba(6, 182, 212, 0.75)",  text: "#22d3ee" },
  red:     { name: "red",     main: "#ff2e2e", light: "#fca5a5", dark: "#991b1b", deep: "#450a0a", glow: "rgba(255, 46, 46, 0.76)",  text: "#ff3b30" },
  orange:  { name: "orange",  main: "#ff6b00", light: "#fdba74", dark: "#c2410c", deep: "#431407", glow: "rgba(255, 107, 0, 0.76)",  text: "#fb923c" },
  violet:  { name: "violet",  main: "#8b5cf6", light: "#ddd6fe", dark: "#5b21b6", deep: "#2e1065", glow: "rgba(139, 92, 246, 0.76)", text: "#a855f7" },
  purple:  { name: "purple",  main: "#a855f7", light: "#e9d5ff", dark: "#6b21a8", deep: "#3b0764", glow: "rgba(168, 85, 247, 0.76)", text: "#c084fc" },
  pink:    { name: "pink",    main: "#ec4899", light: "#fbcfe8", dark: "#9d174d", deep: "#500724", glow: "rgba(236, 72, 153, 0.74)", text: "#f472b6" },
  amber:   { name: "amber",   main: "#facc15", light: "#fef08a", dark: "#a16207", deep: "#422006", glow: "rgba(250, 204, 21, 0.72)", text: "#fde047" },
  gold:    { name: "gold",    main: "#facc15", light: "#fef08a", dark: "#a16207", deep: "#422006", glow: "rgba(250, 204, 21, 0.72)", text: "#fde047" },
  white:   { name: "white",   main: "#f8fafc", light: "#ffffff", dark: "#94a3b8", deep: "#334155", glow: "rgba(248, 250, 252, 0.55)", text: "#ffffff" },
  slate:   { name: "slate",   main: "#3a404c", light: "#646d7a", dark: "#1d2128", deep: "#101318", glow: "rgba(100, 116, 139, 0.2)", text: "#8a919e" },
};

export function resolvePalette(color, fallback = "blue") {
  if (!color) return THUMB_PALETTES[fallback] || THUMB_PALETTES.blue;
  const key = String(color).toLowerCase().trim();
  if (THUMB_PALETTES[key]) return THUMB_PALETTES[key];
  if (/^#[0-9a-fA-F]{6}$/.test(key)) {
    return {
      name: key,
      main: key,
      light: "#ffffff",
      dark: key,
      deep: "#0f172a",
      glow: `${key}b8`,
      text: key,
    };
  }
  return THUMB_PALETTES[fallback] || THUMB_PALETTES.blue;
}

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\/\*/g, "&#47;*")
    .replace(/\*\//g, "*&#47;");

export function parseArgs(argv) {
  const opts = {
    project: null,
    spec: "",
    title: "",
    subline: "",
    variant: "",
    aspect: "",
    width: 0,
    height: 0,
    out: "",
    archetype: "",
    accent: "",
    leftBrand: "",
    rightBrand: "",
    leftProp: "",
    rightProp: "",
    leftLabel: "",
    rightLabel: "",
    leftBadge: "",
    rightBadge: "",
    operator: "",
    underline: "",
    saveHtml: "",
    help: false,
  };
  const { project, rest } = popProjectArg(argv);
  opts.project = project;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const next = () => rest[++i];
    if (a === "--spec") opts.spec = next() || "";
    else if (a === "--title") opts.title = next() || "";
    else if (a === "--subline") opts.subline = next() || "";
    else if (a === "--variant") opts.variant = next() || "";
    else if (a === "--aspect") opts.aspect = next() || "";
    else if (a === "--width") opts.width = Number(next()) || 0;
    else if (a === "--height") opts.height = Number(next()) || 0;
    else if (a === "--out" || a === "-o") opts.out = next() || "";
    else if (a === "--archetype") opts.archetype = next() || "";
    else if (a === "--accent") opts.accent = next() || "";
    else if (a === "--left-brand") opts.leftBrand = next() || "";
    else if (a === "--right-brand") opts.rightBrand = next() || "";
    else if (a === "--left-prop") opts.leftProp = next() || "";
    else if (a === "--right-prop") opts.rightProp = next() || "";
    else if (a === "--left-label") opts.leftLabel = next() || "";
    else if (a === "--right-label") opts.rightLabel = next() || "";
    else if (a === "--left-badge") opts.leftBadge = next() || "";
    else if (a === "--right-badge") opts.rightBadge = next() || "";
    else if (a === "--operator") opts.operator = next() || "";
    else if (a === "--underline") opts.underline = next() || "";
    else if (a === "--save-html") opts.saveHtml = next() || "";
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

export function resolveThumbnailDimensions(videoJson = {}, overrides = {}) {
  let aspect = overrides.aspect || "";
  if (!aspect) {
    const rawAspect = String(videoJson.aspect || videoJson.aspectRatio || "").trim();
    if (rawAspect === "9:16" || rawAspect === "16:9") {
      aspect = rawAspect;
    } else if (videoJson.composition?.height > videoJson.composition?.width) {
      aspect = "9:16";
    } else {
      aspect = "16:9";
    }
  }
  const defaultSize = aspect === "9:16" ? { width: 1080, height: 1920 } : { width: 1280, height: 720 };
  return {
    aspect,
    width: overrides.width > 0 ? overrides.width : defaultSize.width,
    height: overrides.height > 0 ? overrides.height : defaultSize.height,
  };
}

export function tokenizeTitle(rawTitle = "", accentColor = "blue") {
  const clean = String(rawTitle || "").trim();
  if (!clean) return [{ text: "SYSTEM DESIGN", color: "white" }];
  const words = clean.split(/\s+/);
  const tokens = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.startsWith("~~") && w.endsWith("~~") && w.length > 4) {
      tokens.push({ text: w.slice(2, -2), color: "muted", strike: true });
      continue;
    }
    if (w === ">" || w === "<" || w === "→" || w === "->" || w === "VS" || w === "≠") {
      tokens.push({ text: w === "->" ? "→" : w, color: w === "≠" ? "red" : "white" });
      continue;
    }
    const isNumberOrUnit = /\d+[BKMGT%xX+]|\$\d+/i.test(w);
    const isNeg = /^(NOT|NO|DON'T|STOP|NEVER|KILL|BAN|LOST|HACKED|OVER|TRAPPED)$/i.test(w.replace(/[^a-z']/gi, ""));
    if (isNeg) {
      tokens.push({ text: w, color: accentColor === "red" ? "red" : "white" });
    } else if (isNumberOrUnit || i === words.length - 1) {
      tokens.push({ text: w, color: "accent" });
    } else {
      tokens.push({ text: w, color: "white" });
    }
  }
  if (!tokens.some((t) => t.color === "accent")) {
    tokens[tokens.length - 1].color = "accent";
  }
  return tokens;
}

function detectLightMonochromeSvg(svgText = "") {
  const fills = [...svgText.matchAll(/\b(?:fill|stroke)\s*[:=]\s*["']?([^"';\s>]+)/gi)].map((m) =>
    m[1].toLowerCase().trim()
  );
  const meaningful = fills.filter((v) => v && v !== "none" && v !== "transparent");
  if (meaningful.length === 0) return false;
  return meaningful.every((v) => v === "white" || v === "#fff" || v === "#ffffff" || v === "currentcolor" || v === "#f8fafc");
}

async function resolveLogoAsset(specPathOrSlug, projectDir) {
  if (!specPathOrSlug) return null;
  const raw = String(specPathOrSlug).trim();
  const candidates = [
    path.isAbsolute(raw) ? raw : path.resolve(projectDir, raw),
    path.resolve(projectDir, "assets/logos", `${raw}.svg`),
    path.resolve(projectDir, "assets/logos", `${raw}.png`),
    path.resolve(ENGINE_ROOT, raw),
    path.resolve(ENGINE_ROOT, "assets/logos", `${raw}.svg`),
    path.resolve(ENGINE_ROOT, "assets/logos", `${raw}.png`),
  ];
  for (const cand of candidates) {
    if (fsSync.existsSync(cand) && fsSync.statSync(cand).isFile()) {
      const ext = path.extname(cand).toLowerCase();
      const buf = await fs.readFile(cand);
      const isWhiteMonochrome = ext === ".svg" ? detectLightMonochromeSvg(buf.toString("utf8")) : false;
      const mime =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "image/png";
      return {
        path: cand,
        rel: path.relative(projectDir, cand).replace(/\\/g, "/"),
        dataUri: `data:${mime};base64,${buf.toString("base64")}`,
        isWhiteMonochrome,
      };
    }
  }
  return null;
}

let uidCounter = 0;
const nextUid = (prefix = "g") => `${prefix}${++uidCounter}`;

function renderRedBrushSlashSvg(cls = "brush-slash") {
  const id = nextUid("bs");
  return `<svg class="${cls}" viewBox="0 0 220 44" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="${id}" x="-15%" y="-30%" width="130%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#ff1a1a" flood-opacity="0.55"/>
      </filter>
    </defs>
    <path filter="url(#${id})" d="M6,30 C42,20 112,12 214,8 L218,16 C158,22 72,30 12,38 Z" fill="#ff2424"/>
    <path d="M2,27 L28,23 L22,33 Z M196,7 L220,10 L204,17 Z" fill="#ff3b30"/>
  </svg>`;
}

function renderRedBrushXSvg() {
  const id = nextUid("bx");
  return `<svg class="prop-x-mark" viewBox="0 0 180 180" aria-hidden="true">
    <defs>
      <filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#ff1a1a" flood-opacity="0.65"/>
      </filter>
    </defs>
    <g filter="url(#${id})">
      <path d="M22,32 C56,64 114,116 158,150 L146,162 C104,126 52,78 14,44 Z" fill="#ff2222"/>
      <path d="M156,28 C118,64 68,112 24,154 L36,164 C80,122 128,74 166,40 Z" fill="#ff2a2a"/>
    </g>
  </svg>`;
}

function renderCrownSvg(pal) {
  const id = nextUid("cr");
  return `<svg class="prop-crown" viewBox="0 0 160 110" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="45%" stop-color="#facc15"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <filter id="${id}f" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${pal?.main || "#facc15"}" flood-opacity="0.45"/>
      </filter>
    </defs>
    <g filter="url(#${id}f)">
      <path d="M18,86 L10,32 L48,58 L80,16 L112,58 L150,32 L142,86 Z" fill="url(#${id}g)" stroke="#fef9c3" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="16" y="84" width="128" height="16" rx="6" fill="#ca8a04" stroke="#fde047" stroke-width="1.8"/>
      <circle cx="10" cy="30" r="6" fill="#fef08a"/>
      <circle cx="80" cy="14" r="7" fill="#fef08a"/>
      <circle cx="150" cy="30" r="6" fill="#fef08a"/>
      <circle cx="48" cy="92" r="4.5" fill="#991b1b"/>
      <circle cx="80" cy="92" r="5.5" fill="#ef4444"/>
      <circle cx="112" cy="92" r="4.5" fill="#991b1b"/>
    </g>
  </svg>`;
}

function renderCheckBadgeSvg() {
  const id = nextUid("ck");
  return `<svg class="prop-check-badge" viewBox="0 0 80 80" aria-hidden="true">
    <defs>
      <filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#22c55e" flood-opacity="0.8"/>
      </filter>
    </defs>
    <circle cx="40" cy="40" r="32" fill="#052e16" stroke="#22c55e" stroke-width="4" filter="url(#${id})"/>
    <polyline points="24,41 35,52 57,28" fill="none" stroke="#4ade80" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function renderStatusArrowSvg(dir = "up", color = "lime") {
  const pal = resolvePalette(color, dir === "down" ? "slate" : "lime");
  const isDown = dir === "down";
  const id = nextUid("ar");
  return `<svg class="status-arrow ${isDown ? "is-down" : "is-up"}" viewBox="0 0 80 180" aria-hidden="true">
    <defs>
      <filter id="${id}" x="-40%" y="-20%" width="180%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${pal.main}" flood-opacity="${isDown ? "0.2" : "0.8"}"/>
      </filter>
    </defs>
    <g filter="url(#${id})" transform="${isDown ? "rotate(180 40 90)" : ""}">
      <polygon points="40,10 72,56 52,56 52,114 28,114 28,56 8,56" fill="${isDown ? "#8a919e" : pal.main}"/>
      <rect x="28" y="122" width="24" height="16" rx="2" fill="${isDown ? "#6e7582" : pal.main}" opacity="0.92"/>
      <rect x="28" y="146" width="24" height="12" rx="2" fill="${isDown ? "#555b66" : pal.main}" opacity="0.65"/>
      <rect x="28" y="165" width="24" height="8" rx="2" fill="${isDown ? "#3f444e" : pal.main}" opacity="0.35"/>
    </g>
  </svg>`;
}

function renderChevronsSvg(color = "blue", count = 3) {
  const pal = resolvePalette(color, "blue");
  const id = nextUid("ch");
  const shapes = [];
  for (let i = 0; i < count; i++) {
    const x = i * 38;
    shapes.push(`<polygon points="${x + 4},10 ${x + 24},10 ${x + 44},45 ${x + 24},80 ${x + 4},80 ${x + 24},45" fill="${pal.main}" opacity="${0.65 + i * 0.17}"/>`);
  }
  return `<svg class="flow-chevrons" viewBox="0 0 ${count * 38 + 20} 90" aria-hidden="true">
    <defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#${id})">${shapes.join("")}</g>
  </svg>`;
}

function renderCube3dSvg(item, resolvedLogo) {
  const state = item.state || "lit";
  const isLoser = state === "loser";
  const isCracked = state === "cracked";
  const isDarkRim = item.darkRim === true || isCracked;
  const pal = resolvePalette(isLoser ? "slate" : item.color, "blue");
  const id = nextUid("cb");

  // Colors for 3 faces (Top, Front, Right side)
  const topGrad = isLoser
    ? ["#353b45", "#242931"]
    : isDarkRim
      ? ["#29313d", "#141820"]
      : [pal.light, pal.main];
  const frontGrad = isLoser
    ? ["#22262e", "#16191f"]
    : isDarkRim
      ? ["#171b23", "#0b0e13"]
      : [pal.main, pal.dark];
  const sideGrad = isLoser
    ? ["#171a20", "#0e1014"]
    : isDarkRim
      ? ["#101319", "#07090d"]
      : [pal.dark, pal.deep];

  const rimColor = isLoser ? "rgba(255,255,255,0.12)" : isCracked ? "#ff2e2e" : pal.light;
  const badgeBg = item.badgeBg || (item.darkBadge ? "#11141a" : "#ffffff");
  const textColor = item.darkBadge ? "#ffffff" : "#0b0f17";
  const invertForWhiteBadge =
    resolvedLogo &&
    ((item.invertLogo === true) || (!item.darkBadge && resolvedLogo.isWhiteMonochrome));
  const imgFilters = [
    isLoser ? "grayscale(1)" : "",
    invertForWhiteBadge ? "brightness(0)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const logoContent = resolvedLogo
    ? `<image href="${resolvedLogo.dataUri}" x="90" y="138" width="118" height="118" preserveAspectRatio="xMidYMid meet" ${isLoser ? 'opacity="0.78"' : ""} ${imgFilters ? `style="filter:${imgFilters}"` : ""}/>`
    : `<text x="149" y="210" text-anchor="middle" font-family="Impact, Inter, sans-serif" font-weight="900" font-size="${String(item.cubeText || item.label || "AI").length > 4 ? 38 : 54}" fill="${textColor}" letter-spacing="-1">${esc(item.cubeText || item.label || "AI")}</text>`;

  const cracksOverlay = isCracked
    ? `<g filter="url(#${id}glow)">
        <polyline points="205,90 232,124 218,154 246,188 228,236 250,275" fill="none" stroke="#ff2e2e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="205,90 232,124 218,154 246,188 228,236 250,275" fill="none" stroke="#ffd4d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="232,124 274,108 292,122" fill="none" stroke="#ff2e2e" stroke-width="3.5" stroke-linecap="round"/>
        <polyline points="62,212 94,232 82,258" fill="none" stroke="#ff2e2e" stroke-width="3" stroke-linecap="round"/>
        <polygon points="282,138 298,130 302,146 286,152" fill="#1b1f27" stroke="#ff2e2e" stroke-width="1.5"/>
        <polygon points="274,236 290,228 295,244 278,248" fill="#1b1f27" stroke="#ff2e2e" stroke-width="1.5"/>
      </g>`
    : "";

  return `<svg class="cube-3d-svg" viewBox="0 0 340 320" aria-hidden="true">
    <defs>
      <linearGradient id="${id}top" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="${topGrad[0]}"/>
        <stop offset="100%" stop-color="${topGrad[1]}"/>
      </linearGradient>
      <linearGradient id="${id}front" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${frontGrad[0]}"/>
        <stop offset="100%" stop-color="${frontGrad[1]}"/>
      </linearGradient>
      <linearGradient id="${id}side" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${sideGrad[0]}"/>
        <stop offset="100%" stop-color="${sideGrad[1]}"/>
      </linearGradient>
      <linearGradient id="${id}sheen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.24)"/>
        <stop offset="48%" stop-color="rgba(255,255,255,0.03)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.14)"/>
      </linearGradient>
      <filter id="${id}glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Contact shadow on pedestal -->
    <ellipse cx="170" cy="296" rx="116" ry="18" fill="rgba(0,0,0,0.88)"/>

    <!-- Extruded 3D Top + Right bevel shell -->
    <path d="M58,96 L112,46 Q124,36 142,36 L266,36 Q286,36 286,58 L286,216 Q286,232 274,244 L236,282 L212,262 L212,102 Z" fill="url(#${id}side)"/>
    <path d="M52,102 Q54,88 66,78 L114,44 Q126,36 142,36 L266,36 Q284,36 276,52 L240,94 Q230,104 214,104 L52,104 Z" fill="url(#${id}top)"/>

    <!-- Front main rounded face -->
    <rect x="46" y="90" width="194" height="200" rx="28" fill="url(#${id}front)"/>
    <rect x="46" y="90" width="194" height="200" rx="28" fill="url(#${id}sheen)"/>

    <!-- Neon / Specular bevel rim -->
    <rect x="47" y="91" width="192" height="198" rx="27" fill="none" stroke="${rimColor}" stroke-width="${isLoser ? 1.5 : 3}" ${!isLoser ? `filter="url(#${id}glow)"` : ""}/>
    <path d="M58,96 L114,44 Q126,37 142,37 L266,37 Q285,37 285,58 L285,216 Q285,231 273,243 L236,281" fill="none" stroke="${rimColor}" stroke-width="${isLoser ? 1.2 : 2.5}" stroke-linejoin="round" opacity="${isLoser ? 0.35 : 0.92}"/>

    <!-- Squircle white logo container -->
    <rect x="72" y="120" width="154" height="154" rx="28" fill="${badgeBg}" opacity="${isLoser ? 0.88 : 1}"/>
    <rect x="72" y="120" width="154" height="154" rx="28" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
    ${logoContent}
    ${cracksOverlay}
  </svg>`;
}

function renderGpuSvg(item) {
  const isLoser = item.state === "loser";
  const pal = resolvePalette(isLoser ? "slate" : item.color || "lime", "lime");
  const id = nextUid("gpu");
  return `<svg class="prop-gpu-svg" viewBox="0 0 380 230" aria-hidden="true">
    <defs>
      <linearGradient id="${id}body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${isLoser ? "#2d323b" : "#222832"}"/>
        <stop offset="100%" stop-color="#0b0d11"/>
      </linearGradient>
      <radialGradient id="${id}fan" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3f4754"/>
        <stop offset="45%" stop-color="#14181f"/>
        <stop offset="100%" stop-color="#090b0f"/>
      </radialGradient>
      <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <!-- PCIe bracket left -->
    <path d="M22,26 L36,26 L36,196 L22,196 Z" fill="#94a3b8"/>
    <path d="M12,24 L36,24 L36,34 L12,34 Z" fill="#cbd5e1"/>
    <rect x="25" y="48" width="7" height="22" rx="2" fill="#1e293b"/>
    <rect x="25" y="84" width="7" height="22" rx="2" fill="#1e293b"/>
    <rect x="25" y="120" width="7" height="22" rx="2" fill="#1e293b"/>
    <!-- Gold PCIe fingers -->
    <rect x="66" y="182" width="124" height="16" rx="2" fill="#d97706"/>
    <path d="M72,184 v12 M80,184 v12 M88,184 v12 M96,184 v12 M104,184 v12 M112,184 v12 M120,184 v12 M128,184 v12 M136,184 v12 M144,184 v12 M152,184 v12 M160,184 v12 M168,184 v12 M176,184 v12 M184,184 v12" stroke="#fde047" stroke-width="2.5"/>
    <!-- Main shroud -->
    <path d="M36,38 L338,38 Q356,38 358,56 L358,168 Q358,184 340,184 L36,184 Z" fill="url(#${id}body)" stroke="${isLoser ? "rgba(255,255,255,0.14)" : pal.main}" stroke-width="${isLoser ? 1.5 : 3}" ${!isLoser ? `filter="url(#${id}glow)"` : ""}/>
    <!-- Top neon accent bar -->
    <path d="M48,46 L342,46" stroke="${isLoser ? "#475569" : pal.main}" stroke-width="6" stroke-linecap="round" ${!isLoser ? `filter="url(#${id}glow)"` : ""}/>
    <!-- Dual Fans -->
    ${[120, 266].map((cx) => `
      <circle cx="${cx}" cy="115" r="56" fill="url(#${id}fan)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
      ${[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => `<path d="M${cx},115 Q${cx + 22},90 ${cx + 46},110 Q${cx + 25},126 ${cx},115 Z" fill="#2b313d" transform="rotate(${a} ${cx} 115)"/>`).join("")}
      <circle cx="${cx}" cy="115" r="16" fill="#181c24" stroke="${isLoser ? "#475569" : "rgba(255,255,255,0.28)"}" stroke-width="2"/>
      <circle cx="${cx}" cy="115" r="7" fill="${isLoser ? "#334155" : pal.main}" opacity="0.85"/>
    `).join("")}
    ${item.vramTag ? `
      <g transform="translate(242, 136)">
        <polygon points="10,0 104,0 114,12 114,42 104,52 10,52 0,42 0,12" fill="#0b120e" stroke="${pal.main}" stroke-width="3"/>
        <text x="57" y="36" text-anchor="middle" font-family="Impact, Inter, sans-serif" font-size="28" fill="${pal.light}">${esc(item.vramTag)}</text>
      </g>
    ` : ""}
  </svg>`;
}

function renderMacMiniSvg(item, resolvedLogo) {
  const id = nextUid("mac");
  return `<svg class="prop-mac-svg" viewBox="0 0 300 180" aria-hidden="true">
    <defs>
      <linearGradient id="${id}top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
      <linearGradient id="${id}side" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="45%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
    </defs>
    <rect x="28" y="64" width="244" height="82" rx="22" fill="url(#${id}side)"/>
    <rect x="28" y="28" width="244" height="66" rx="22" fill="url(#${id}top)" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="242" cy="118" r="3.5" fill="#ffffff"/>
    ${resolvedLogo ? `<image href="${resolvedLogo.dataUri}" x="122" y="42" width="56" height="40" preserveAspectRatio="xMidYMid meet"/>` : ""}
  </svg>`;
}

function renderDgxSparkSvg(item, resolvedLogo) {
  const id = nextUid("dgx");
  return `<svg class="prop-dgx-svg" viewBox="0 0 280 180" aria-hidden="true">
    <defs>
      <linearGradient id="${id}gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f3dfbd"/>
        <stop offset="50%" stop-color="#c49d68"/>
        <stop offset="100%" stop-color="#7c5d36"/>
      </linearGradient>
    </defs>
    <path d="M24,62 L84,26 L246,26 L256,40 L256,144 L216,162 L24,162 Z" fill="url(#${id}gold)" stroke="#fde6c4" stroke-width="1.5"/>
    <rect x="28" y="66" width="184" height="90" rx="10" fill="#171412" stroke="#d4af7a" stroke-width="2"/>
    <pattern id="${id}dots" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="2.2" fill="#8b6f47"/>
    </pattern>
    <rect x="36" y="84" width="168" height="64" rx="4" fill="url(#${id}dots)"/>
    <rect x="42" y="72" width="94" height="18" rx="3" fill="#090a0c"/>
    ${resolvedLogo ? `<image href="${resolvedLogo.dataUri}" x="46" y="73" width="86" height="16" preserveAspectRatio="xMidYMid meet"/>` : `<text x="89" y="85" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="11" fill="#84cc16">NVIDIA DGX</text>`}
  </svg>`;
}

function renderRamSvg(item) {
  const pal = resolvePalette(item.color || "lime", "lime");
  const id = nextUid("ram");
  return `<svg class="prop-ram-svg" viewBox="0 0 360 170" aria-hidden="true">
    <defs>
      <linearGradient id="${id}hs" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.light}"/>
        <stop offset="50%" stop-color="${pal.main}"/>
        <stop offset="100%" stop-color="${pal.dark}"/>
      </linearGradient>
      <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M18,52 L322,18 L342,32 L342,126 L20,152 Z" fill="url(#${id}hs)" stroke="${pal.light}" stroke-width="2.5" filter="url(#${id}glow)"/>
    <rect x="26" y="138" width="142" height="16" rx="2" fill="#eab308" transform="rotate(-4.5 26 138)"/>
    <rect x="184" y="126" width="146" height="16" rx="2" fill="#eab308" transform="rotate(-4.5 184 126)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((idx) => `<rect x="${44 + idx * 40}" y="${72 - idx * 4.5}" width="28" height="44" rx="4" fill="#181c22" stroke="rgba(255,255,255,0.16)" transform="rotate(-5 ${44 + idx * 40} ${72 - idx * 4.5})"/>`).join("")}
    <text x="58" y="64" font-family="Impact, Inter, sans-serif" font-size="22" fill="#090c10" transform="rotate(-5 58 64)">${esc(item.chipLabel || "DDR5")}</text>
  </svg>`;
}

function renderPadlockSvg(item) {
  const pal = resolvePalette(item.color || "red", "red");
  const unlocked = item.unlocked !== false;
  const id = nextUid("lk");
  return `<svg class="prop-padlock-svg" viewBox="0 0 220 260" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.light}"/>
        <stop offset="40%" stop-color="${pal.main}"/>
        <stop offset="100%" stop-color="${pal.dark}"/>
      </linearGradient>
      <filter id="${id}glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="${unlocked ? "M64,104 L64,62 C64,28 156,28 156,62 L156,82" : "M64,104 L64,62 C64,28 156,28 156,62 L156,104"}" fill="none" stroke="url(#${id}g)" stroke-width="22" stroke-linecap="round" filter="url(#${id}glow)"/>
    <rect x="34" y="102" width="152" height="134" rx="28" fill="url(#${id}g)" stroke="${pal.light}" stroke-width="3" filter="url(#${id}glow)"/>
    <circle cx="110" cy="154" r="18" fill="#090b0f"/>
    <path d="M102,162 L96,200 L124,200 L118,162 Z" fill="#090b0f"/>
  </svg>`;
}

function renderLaptopSvg(item, resolvedLogos = []) {
  const pal = resolvePalette(item.color || "blue", "blue");
  const id = nextUid("lap");
  const screenTitle = item.screenTitle || "";
  const screenBadges = resolvedLogos.slice(0, 5);
  return `<svg class="prop-laptop-svg" viewBox="0 0 440 280" aria-hidden="true">
    <defs>
      <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <!-- Screen lid -->
    <rect x="44" y="16" width="352" height="214" rx="16" fill="#090c12" stroke="${pal.main}" stroke-width="4" filter="url(#${id}glow)"/>
    <rect x="56" y="28" width="328" height="190" rx="8" fill="#05070b"/>
    <!-- Screen content -->
    ${screenBadges.length ? screenBadges.map((lg, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const bx = 86 + col * 92 + (row === 1 ? 46 : 0);
      const by = 50 + row * 82;
      return `<rect x="${bx}" y="${by}" width="72" height="72" rx="16" fill="#ffffff"/>
              <image href="${lg.dataUri}" x="${bx + 10}" y="${by + 10}" width="52" height="52" preserveAspectRatio="xMidYMid meet" ${lg.isWhiteMonochrome ? 'style="filter:brightness(0)"' : ""}/>`;
    }).join("") : `
      <polyline points="72,188 124,162 164,170 212,128 242,134" fill="none" stroke="#e2e8f0" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="242" y1="44" x2="242" y2="202" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="6 5"/>
      <path d="M242,134 Q306,108 366,64 L366,118 Q306,138 242,134 Z" fill="${pal.main}" opacity="0.28"/>
      <path d="M242,134 Q306,118 366,90" fill="none" stroke="${pal.main}" stroke-width="4" stroke-dasharray="8 6"/>
    `}
    ${screenTitle ? `<text x="220" y="204" text-anchor="middle" font-family="Impact, Inter, sans-serif" font-size="24" fill="#ffffff">${esc(screenTitle)}</text>` : ""}
    <!-- Base deck -->
    <polygon points="40,232 400,232 428,262 12,262" fill="#1e2430" stroke="${pal.main}" stroke-width="2.5"/>
    <rect x="176" y="246" width="88" height="10" rx="4" fill="#0f141d"/>
  </svg>`;
}

function renderPhoneSvg(item) {
  const pal = resolvePalette(item.color || "cyan", "cyan");
  const id = nextUid("ph");
  return `<svg class="prop-phone-svg" viewBox="0 0 210 340" aria-hidden="true">
    <defs>
      <filter id="${id}glow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="26" y="14" width="158" height="312" rx="30" fill="#0b0f16" stroke="${pal.main}" stroke-width="4.5" filter="url(#${id}glow)"/>
    <rect x="36" y="24" width="138" height="292" rx="22" fill="#0d1624"/>
    <rect x="80" y="34" width="50" height="12" rx="6" fill="#020408"/>
    <text x="105" y="176" text-anchor="middle" font-family="Impact, Inter, sans-serif" font-size="52" fill="${pal.light}">${esc(item.screenBig || "AI")}</text>
    <text x="105" y="212" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="16" fill="#e2e8f0">${esc(item.screenSub || "")}</text>
  </svg>`;
}

function renderPedestalHtml(item, resolvedLogo, resolvedExtraLogos = [], { scale = 1 } = {}) {
  const state = item.state || "lit";
  const isLoser = state === "loser";
  const pal = resolvePalette(isLoser ? "slate" : item.color, "blue");
  const kind = item.kind || "cube";

  let visualHtml = "";
  if (kind === "gpu") visualHtml = renderGpuSvg(item);
  else if (kind === "mac-mini") visualHtml = renderMacMiniSvg(item, resolvedLogo);
  else if (kind === "dgx-spark") visualHtml = renderDgxSparkSvg(item, resolvedLogo);
  else if (kind === "ram") visualHtml = renderRamSvg(item);
  else if (kind === "padlock") visualHtml = renderPadlockSvg(item);
  else if (kind === "laptop") visualHtml = renderLaptopSvg(item, resolvedExtraLogos.length ? resolvedExtraLogos : (resolvedLogo ? [resolvedLogo] : []));
  else if (kind === "phone") visualHtml = renderPhoneSvg(item);
  else visualHtml = renderCube3dSvg(item, resolvedLogo);

  const showPedestal = item.pedestal !== false && kind !== "padlock";
  const pillColor = item.badgeColor ? resolvePalette(item.badgeColor, item.color) : null;
  const badgeStyle = pillColor
    ? `background:${pillColor.main};color:#fff;box-shadow:0 0 18px ${pillColor.glow};`
    : isLoser
      ? `background:#242933;color:#94a3b8;border:1px solid rgba(255,255,255,0.12);`
      : `background:#ffffff;color:#090c12;box-shadow:0 4px 16px rgba(0,0,0,0.65);`;

  return `
    <div class="stage-unit ${isLoser ? "is-loser" : "is-hero"}" style="--unit-color:${pal.main};--unit-glow:${pal.glow};--unit-scale:${scale};">
      <div class="unit-bloom"></div>
      ${item.starburst ? `<div class="unit-starburst"></div>` : ""}
      ${item.speedLines ? `
        <div class="speed-lines">
          <span></span><span></span><span></span>
        </div>` : ""}
      <div class="unit-visual-wrap">
        ${item.crown ? renderCrownSvg(pal) : ""}
        ${item.checkBadge ? renderCheckBadgeSvg() : ""}
        ${visualHtml}
        ${item.xMark ? renderRedBrushXSvg() : ""}
      </div>
      ${showPedestal ? `
        <div class="pedestal ${isLoser ? "pedestal-loser" : "pedestal-lit"}">
          <div class="pedestal-tier-top"></div>
          <div class="pedestal-tier-base">
            ${item.badge ? `<span class="pedestal-pill" style="${badgeStyle}">${esc(item.badge)}</span>` : ""}
          </div>
        </div>
      ` : ""}
      ${item.label ? `<div class="unit-label ${isLoser ? "is-dim" : ""}">${esc(item.label)}</div>` : ""}
    </div>
  `;
}

function renderHeadlineHtml(spec, isPortrait) {
  const accentPal = resolvePalette(spec.accent || "blue", "blue");
  const line1 = Array.isArray(spec.headline)
    ? spec.headline
    : tokenizeTitle(spec.title || "SYSTEM EXPLAINER", spec.accent || "blue");
  const line2 = Array.isArray(spec.subline)
    ? spec.subline
    : spec.subline
      ? tokenizeTitle(spec.subline, spec.accent || "blue")
      : [];

  const renderTokens = (tokens) =>
    tokens
      .map((t) => {
        const isAccent = t.color === "accent";
        const isMuted = t.color === "muted";
        const customPal = !isAccent && !isMuted && t.color && t.color !== "white" ? resolvePalette(t.color) : null;
        const colorStyle = isAccent
          ? `color:${accentPal.main};text-shadow:0 0 28px ${accentPal.glow};`
          : isMuted
            ? `color:#787e8a;`
            : customPal
              ? `color:${customPal.main};text-shadow:0 0 24px ${customPal.glow};`
              : `color:#ffffff;`;

        if (t.pill) {
          const pPal = resolvePalette(t.pillColor || spec.accent || "red", "red");
          return `<span class="hl-word hl-pill" style="background:${pPal.main};color:${pPal.name === "lime" || pPal.name === "amber" ? "#090c10" : "#ffffff"};box-shadow:0 0 26px ${pPal.glow};">${esc(t.text)}</span>`;
        }
        return `<span class="hl-word ${t.strike ? "hl-struck" : ""}" style="${colorStyle}">${esc(t.text)}${t.strike ? renderRedBrushSlashSvg() : ""}</span>`;
      })
      .join(" ");

  let barStyle = "";
  if (spec.underline !== false) {
    if (spec.underline === "dual" || (spec.left?.color && spec.right?.color && spec.left.color !== spec.right.color && spec.right.state !== "loser")) {
      const lp = resolvePalette(spec.left?.color || spec.accent, "emerald");
      const rp = resolvePalette(spec.right?.color || spec.accent, "red");
      barStyle = `background:linear-gradient(90deg, ${lp.main}, ${rp.main});box-shadow:0 0 22px ${lp.glow};`;
    } else {
      const up = resolvePalette(typeof spec.underline === "string" ? spec.underline : spec.accent, "blue");
      barStyle = `background:${up.main};box-shadow:0 0 22px ${up.glow};`;
    }
  }

  return `
    <header class="headline-zone ${isPortrait ? "is-portrait" : "is-landscape"}">
      <h1 class="hl-line1">${renderTokens(line1)}</h1>
      ${line2.length ? `<div class="hl-line2">${renderTokens(line2)}</div>` : ""}
      ${spec.underline !== false ? `<div class="hl-underline" style="${barStyle}"></div>` : ""}
    </header>
  `;
}

export async function renderThumbnailHtml(rawSpec, projectDir) {
  const spec = { ...rawSpec };
  const accentPal = resolvePalette(spec.accent || "blue", "blue");
  const width = Number(spec.width) || 1280;
  const height = Number(spec.height) || 720;
  const isPortrait = height > width;
  const archetype = spec.archetype || "versus";

  // Load local fonts as data URIs or relative paths so offline Chromium renders cleanly
  const fontsCssPath = path.join(ENGINE_ROOT, "engine/fonts.css");
  let fontsCss = "";
  if (fsSync.existsSync(fontsCssPath)) {
    fontsCss = (await fs.readFile(fontsCssPath, "utf8")).replace(
      /url\((assets\/fonts\/[^)]+)\)/g,
      (_, rel) => `url("file://${path.join(ENGINE_ROOT, rel).replace(/\\/g, "/")}")`
    );
  }

  // Resolve all logo paths up front
  const leftLogo = spec.left?.logo ? await resolveLogoAsset(spec.left.logo, projectDir) : null;
  const rightLogo = spec.right?.logo ? await resolveLogoAsset(spec.right.logo, projectDir) : null;
  const centerLogo = spec.center?.logo ? await resolveLogoAsset(spec.center.logo, projectDir) : null;

  const leftExtra = [];
  if (Array.isArray(spec.left?.logos)) {
    for (const lg of spec.left.logos) {
      const r = await resolveLogoAsset(lg, projectDir);
      if (r) leftExtra.push(r);
    }
  }
  const rightExtra = [];
  if (Array.isArray(spec.right?.logos)) {
    for (const lg of spec.right.logos) {
      const r = await resolveLogoAsset(lg, projectDir);
      if (r) rightExtra.push(r);
    }
  }

  const resolvedItems = [];
  if (Array.isArray(spec.items)) {
    for (const it of spec.items) {
      resolvedItems.push({ item: it, logo: it.logo ? await resolveLogoAsset(it.logo, projectDir) : null });
    }
  }

  // Build stage markup per archetype
  let stageHtml = "";
  if (archetype === "lineup" && resolvedItems.length) {
    stageHtml = `
      <div class="stage-row stage-lineup">
        ${resolvedItems.map(({ item, logo }) => renderPedestalHtml(item, logo, [], { scale: resolvedItems.length >= 4 ? 0.72 : 0.85 })).join("")}
      </div>
    `;
  } else if (archetype === "hero-orbit") {
    const heroItem = spec.center || spec.left || { kind: "cube", color: spec.accent || "violet", state: "hero" };
    const nodes = Array.isArray(spec.nodes) ? spec.nodes : [];
    stageHtml = `
      <div class="stage-orbit">
        <div class="orbit-ring orbit-ring-outer" style="border-color:${accentPal.glow};"></div>
        <div class="orbit-ring orbit-ring-inner" style="border-color:${accentPal.glow};"></div>
        <div class="orbit-nodes">
          ${nodes.slice(0, 8).map((n, idx) => {
            const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
            const rx = isPortrait ? 38 : 40;
            const ry = isPortrait ? 24 : 35;
            const x = 50 + Math.cos(angle) * rx;
            const y = 50 + Math.sin(angle) * ry;
            return `<div class="orbit-pill" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;border-color:${accentPal.main};box-shadow:0 0 18px ${accentPal.glow};">${esc(typeof n === "string" ? n : n.label)}</div>`;
          }).join("")}
        </div>
        ${renderPedestalHtml(heroItem, centerLogo || leftLogo, [], { scale: 0.95 })}
      </div>
    `;
  } else if (archetype === "pipeline") {
    const stages = resolvedItems.length
      ? resolvedItems
      : [
          { item: spec.left || { kind: "cube", color: spec.accent || "blue", state: "lit" }, logo: leftLogo },
          ...(spec.center ? [{ item: spec.center, logo: centerLogo }] : []),
          { item: spec.right || { kind: "cube", color: "emerald", state: "hero" }, logo: rightLogo },
        ];
    stageHtml = `
      <div class="stage-row stage-pipeline">
        ${stages.map((s, idx) => `
          ${renderPedestalHtml(s.item, s.logo, [], { scale: stages.length >= 3 ? 0.8 : 0.95 })}
          ${idx < stages.length - 1 ? `<div class="operator-slot">${renderChevronsSvg(spec.accent || "blue", 3)}</div>` : ""}
        `).join("")}
      </div>
    `;
  } else if (archetype === "split-compare") {
    const leftSide = spec.left || { label: "BEFORE", badge: "OLD", color: "slate" };
    const rightSide = spec.right || { label: "AFTER", badge: "NEW", color: spec.accent || "emerald" };
    stageHtml = `
      <div class="split-frame" style="border-color:${accentPal.main};box-shadow:0 0 36px ${accentPal.glow};">
        <div class="split-pane split-left">
          <span class="split-pill is-dark">${esc(leftSide.badge || "OLD")}</span>
          <div class="split-big">${esc(leftSide.value || leftSide.label || "480P")}</div>
          <div class="split-sub">${esc(leftSide.sub || "")}</div>
        </div>
        <div class="split-divider"></div>
        <div class="split-pane split-right" style="background:radial-gradient(circle at 50% 50%, ${accentPal.glow}22, transparent 70%);">
          <span class="split-pill" style="background:${accentPal.main};color:#090c10;">${esc(rightSide.badge || "NEW")}</span>
          <div class="split-big" style="color:${accentPal.light};">${esc(rightSide.value || rightSide.label || "4K")}</div>
          <div class="split-sub">${esc(rightSide.sub || "")}</div>
        </div>
      </div>
    `;
  } else {
    // Default: versus or showcase (2-column asymmetric or symmetric)
    const leftItem = { state: "hero", color: spec.accent || "lime", ...(spec.left || {}) };
    const rightItem = { state: archetype === "showcase" ? "lit" : "loser", color: archetype === "showcase" ? (spec.accent || "blue") : "slate", ...(spec.right || {}) };
    const op = spec.operator ?? (archetype === "showcase" ? "" : ">");
    const portraitBoost = isPortrait ? 1.24 : 1.0;
    const leftScale = (leftItem.state === "loser" ? 0.78 : 1.02) * portraitBoost;
    const rightScale = (rightItem.state === "loser" ? 0.78 : 0.98) * portraitBoost;

    stageHtml = `
      <div class="stage-row ${isPortrait ? "is-stacked" : ""}">
        <div class="side-wrap">
          ${leftItem.arrow ? renderStatusArrowSvg(leftItem.arrow, leftItem.color || spec.accent) : ""}
          ${renderPedestalHtml(leftItem, leftLogo, leftExtra, { scale: leftScale })}
        </div>
        ${op ? `<div class="operator-slot">
          ${op === ">>>" ? renderChevronsSvg(spec.accent || "blue", 3) : `<span class="op-glyph">${esc(op)}</span>`}
        </div>` : ""}
        <div class="side-wrap">
          ${renderPedestalHtml(rightItem, rightLogo, rightExtra, { scale: rightScale })}
          ${rightItem.arrow ? renderStatusArrowSvg(rightItem.arrow, rightItem.state === "loser" ? "slate" : (rightItem.color || spec.accent)) : ""}
        </div>
      </div>
    `;
  }

  const leftFloorPal = resolvePalette(spec.left?.color || spec.accent || "blue", "blue");
  const rightFloorPal = resolvePalette(
    spec.right?.state === "loser" ? (spec.right?.xMark ? "red" : "slate") : (spec.right?.color || spec.accent || "blue"),
    "blue"
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(spec.title || "Thumbnail")}</title>
<style>
${fontsCss}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${width}px;
  height: ${height}px;
  overflow: hidden;
  background: #000000;
  color: #ffffff;
  font-family: 'Impact', 'Anton', 'Arial Narrow', 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.canvas {
  position: relative;
  width: ${width}px;
  height: ${height}px;
  background: #000000;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: ${isPortrait ? "148px 50px 210px" : "22px 44px 20px"};
}

/* Perspective dot-matrix floor */
.dot-floor-wrap {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: ${isPortrait ? "34%" : "36%"};
  perspective: 620px;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
.dot-floor-pool {
  position: absolute;
  bottom: -40px;
  width: 55%;
  height: 260px;
  filter: blur(55px);
  opacity: 0.42;
}
.dot-floor-pool.is-left { left: 2%; background: radial-gradient(circle, ${leftFloorPal.main}, transparent 70%); }
.dot-floor-pool.is-right { right: 2%; background: radial-gradient(circle, ${rightFloorPal.main}, transparent 70%); opacity: ${spec.right?.state === "loser" ? "0.22" : "0.42"}; }
.dot-floor-grid {
  position: absolute;
  left: -25%; right: -25%; bottom: -45px;
  height: 360px;
  transform-origin: center bottom;
  transform: rotateX(68deg);
  background-image: radial-gradient(circle, rgba(255,255,255,0.48) 2px, transparent 2.4px);
  background-size: 32px 28px;
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, transparent 95%);
  mask-image: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, transparent 95%);
}

/* Headline Zone */
.headline-zone {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${isPortrait ? "16px" : "6px"};
}
.hl-line1 {
  font-size: ${isPortrait ? "118px" : "108px"};
  line-height: 0.94;
  font-weight: 900;
  letter-spacing: -0.015em;
  text-transform: uppercase;
  white-space: ${isPortrait ? "normal" : "nowrap"};
  transform: scaleX(0.92);
}
.hl-line2 {
  font-size: ${isPortrait ? "56px" : "54px"};
  line-height: 1.0;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  transform: scaleX(0.94);
}
.hl-word {
  position: relative;
  display: inline-block;
  margin: 0 6px;
}
.hl-pill {
  padding: 2px 18px 4px;
  border-radius: 14px;
  transform: rotate(-1.5deg);
}
.brush-slash {
  position: absolute;
  left: -8%;
  top: 26%;
  width: 116%;
  height: 46%;
  transform: rotate(-6deg);
  pointer-events: none;
}
.hl-underline {
  margin-top: 8px;
  width: ${isPortrait ? "78%" : "68%"};
  height: 10px;
  border-radius: 999px;
}

/* Stage Zone */
.stage-zone {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: ${isPortrait ? "24px" : "8px"};
}
.stage-row {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: ${isPortrait ? "24px" : "34px"};
}
.stage-row.is-stacked {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 78px;
}
.side-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.stage-unit {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: scale(var(--unit-scale, 1));
  transform-origin: center bottom;
}
.unit-bloom {
  position: absolute;
  top: 12%;
  width: 310px;
  height: 310px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--unit-glow), transparent 68%);
  filter: blur(36px);
  opacity: 0.55;
  z-index: 0;
  pointer-events: none;
}
.stage-unit.is-loser .unit-bloom { opacity: 0.08; }
.unit-starburst {
  position: absolute;
  top: -12%;
  width: 420px;
  height: 420px;
  background: repeating-conic-gradient(from 0deg, var(--unit-glow) 0deg 8deg, transparent 8deg 24deg);
  -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,0.75) 10%, transparent 66%);
  mask-image: radial-gradient(circle, rgba(0,0,0,0.75) 10%, transparent 66%);
  opacity: 0.48;
  z-index: 0;
  pointer-events: none;
}
.unit-visual-wrap {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cube-3d-svg { width: 280px; height: 265px; display: block; }
.prop-gpu-svg { width: 340px; height: 210px; display: block; }
.prop-mac-svg { width: 285px; height: 175px; display: block; }
.prop-dgx-svg { width: 290px; height: 185px; display: block; }
.prop-ram-svg { width: 320px; height: 155px; display: block; }
.prop-padlock-svg { width: 205px; height: 245px; display: block; }
.prop-laptop-svg { width: 410px; height: 265px; display: block; }
.prop-phone-svg { width: 205px; height: 325px; display: block; }

.prop-crown {
  position: absolute;
  top: -46px;
  left: 22px;
  width: 118px;
  height: 82px;
  transform: rotate(-12deg);
  z-index: 6;
}
.prop-check-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  width: 66px;
  height: 66px;
  z-index: 6;
}
.prop-x-mark {
  position: absolute;
  inset: 14% 16%;
  width: 68%;
  height: 68%;
  z-index: 7;
}
.speed-lines {
  position: absolute;
  left: -95px;
  top: 34%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 2;
}
.speed-lines span {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--unit-color));
  box-shadow: 0 0 14px var(--unit-glow);
}
.speed-lines span:nth-child(1) { width: 110px; }
.speed-lines span:nth-child(2) { width: 140px; margin-left: -20px; }
.speed-lines span:nth-child(3) { width: 95px; }

/* 2-Tier Stepped Pedestal */
.pedestal {
  position: relative;
  z-index: 2;
  margin-top: -22px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pedestal-tier-top {
  width: 248px;
  height: 18px;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, #222732, #12151c);
  border-top: 2.5px solid var(--unit-color);
  box-shadow: 0 -2px 16px var(--unit-glow);
}
.pedestal-tier-base {
  position: relative;
  width: 294px;
  min-height: 46px;
  padding: 6px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #171b23, #0b0d12);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-top: 2px solid var(--unit-color);
  box-shadow: 0 14px 32px rgba(0,0,0,0.9), 0 0 22px var(--unit-glow);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pedestal-loser .pedestal-tier-top {
  width: 224px;
  height: 12px;
  border-top-color: rgba(255,255,255,0.16);
  box-shadow: none;
}
.pedestal-loser .pedestal-tier-base {
  width: 260px;
  min-height: 40px;
  border-top-color: rgba(255,255,255,0.14);
  box-shadow: 0 10px 24px rgba(0,0,0,0.85);
}
.pedestal-pill {
  padding: 3px 18px;
  border-radius: 999px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}
.unit-label {
  margin-top: 10px;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 4px 14px rgba(0,0,0,0.9);
}
.unit-label.is-dim { color: #8c93a0; }

/* Operators & Arrows */
.operator-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin-bottom: 44px;
}
.op-glyph {
  font-size: 92px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 28px rgba(255,255,255,0.35);
}
.flow-chevrons { width: 128px; height: 84px; }
.status-arrow { width: 64px; height: 145px; }

/* Orbit Archetype */
.stage-orbit {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 2.5px solid;
  transform: scaleY(0.46);
  pointer-events: none;
}
.orbit-ring-outer { width: 880px; height: 880px; opacity: 0.72; }
.orbit-ring-inner { width: 620px; height: 620px; opacity: 0.42; border-style: dashed; }
.orbit-nodes { position: absolute; inset: 0; pointer-events: none; }
.orbit-pill {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 10px 24px;
  border-radius: 999px;
  background: #0d1017;
  border: 2.5px solid;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  z-index: 8;
}

/* Split-Compare Archetype */
.split-frame {
  width: 92%;
  height: ${isPortrait ? "560px" : "370px"};
  border-radius: 28px;
  border: 5px solid;
  background: #0b0e14;
  display: grid;
  grid-template-columns: 1fr 4px 1fr;
  overflow: hidden;
}
.split-divider { background: rgba(255,255,255,0.85); }
.split-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
}
.split-pill {
  padding: 6px 24px;
  border-radius: 999px;
  font-size: 32px;
  font-weight: 900;
}
.split-pill.is-dark { background: #262b34; color: #e2e8f0; border: 2px solid rgba(255,255,255,0.2); }
.split-big { font-size: 96px; font-weight: 900; line-height: 1; }
.split-sub { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 700; color: #94a3b8; }
</style>
</head>
<body>
  <main class="canvas">
    <div class="dot-floor-wrap">
      <div class="dot-floor-pool is-left"></div>
      <div class="dot-floor-pool is-right"></div>
      <div class="dot-floor-grid"></div>
    </div>
    ${renderHeadlineHtml(spec, isPortrait)}
    <section class="stage-zone">
      ${stageHtml}
    </section>
  </main>
</body>
</html>`;
}

export async function generateThumbnail(rawOpts) {
  const opts = typeof rawOpts === "object" && rawOpts !== null ? rawOpts : {};
  const projectDir = resolveProjectDir(opts.project, { engineRoot: ENGINE_ROOT, mustExist: true });

  let videoJson = {};
  const vjsonPath = projectJsonPath(projectDir, ENGINE_ROOT);
  if (fsSync.existsSync(vjsonPath)) {
    try {
      videoJson = JSON.parse(await fs.readFile(vjsonPath, "utf8"));
    } catch {
      videoJson = {};
    }
  }

  let spec = {};
  if (opts.spec) {
    const specFile = path.isAbsolute(opts.spec) ? opts.spec : path.resolve(projectDir, opts.spec);
    spec = JSON.parse(await fs.readFile(specFile, "utf8"));
  }

  // Merge CLI overrides cleanly without polluting unrelated fields
  if (opts.title) spec.title = opts.title;
  if (!spec.title && videoJson.title) spec.title = videoJson.title;
  if (opts.subline) spec.subline = opts.subline;
  if (opts.variant) spec.variant = opts.variant;
  if (opts.archetype) spec.archetype = opts.archetype;
  if (opts.accent) spec.accent = opts.accent;
  if (opts.operator) spec.operator = opts.operator;
  if (opts.underline) spec.underline = opts.underline;

  if (opts.leftBrand || opts.leftProp || opts.leftLabel || opts.leftBadge) {
    spec.left = {
      ...(spec.left || {}),
      ...(opts.leftBrand ? { logo: opts.leftBrand, label: opts.leftLabel || opts.leftBrand.toUpperCase() } : {}),
      ...(opts.leftProp ? { kind: opts.leftProp } : {}),
      ...(opts.leftLabel ? { label: opts.leftLabel } : {}),
      ...(opts.leftBadge ? { badge: opts.leftBadge } : {}),
    };
  }
  if (opts.rightBrand || opts.rightProp || opts.rightLabel || opts.rightBadge) {
    spec.right = {
      ...(spec.right || {}),
      ...(opts.rightBrand ? { logo: opts.rightBrand, label: opts.rightLabel || opts.rightBrand.toUpperCase() } : {}),
      ...(opts.rightProp ? { kind: opts.rightProp } : {}),
      ...(opts.rightLabel ? { label: opts.rightLabel } : {}),
      ...(opts.rightBadge ? { badge: opts.rightBadge } : {}),
    };
  }

  const dims = resolveThumbnailDimensions(videoJson, {
    aspect: opts.aspect || spec.aspect || "",
    width: opts.width || spec.width || 0,
    height: opts.height || spec.height || 0,
  });
  spec.aspect = dims.aspect;
  spec.width = dims.width;
  spec.height = dims.height;

  const variantKey = String(spec.variant || "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-") || "default";

  const thumbsDir = path.join(projectDir, "thumbnails");
  await fs.mkdir(thumbsDir, { recursive: true });

  const defaultOutName = variantKey === "default" ? "thumbnail.png" : `thumb-${variantKey}.png`;
  const outPath = opts.out
    ? (path.isAbsolute(opts.out) ? opts.out : path.resolve(projectDir, opts.out))
    : path.join(thumbsDir, defaultOutName);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const html = await renderThumbnailHtml(spec, projectDir);
  if (opts.saveHtml) {
    const htmlOut = path.isAbsolute(opts.saveHtml) ? opts.saveHtml : path.resolve(projectDir, opts.saveHtml);
    await fs.mkdir(path.dirname(htmlOut), { recursive: true });
    await fs.writeFile(htmlOut, html, "utf8");
  }

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({
      viewport: { width: dims.width, height: dims.height },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: outPath, type: "png" });
  } finally {
    await browser.close();
  }

  // Update per-workspace A/B manifest without mixing variants
  const manifestPath = path.join(thumbsDir, "manifest.json");
  let manifest = { project: path.basename(projectDir), variants: {} };
  if (fsSync.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      if (!manifest.variants || typeof manifest.variants !== "object") manifest.variants = {};
    } catch {
      manifest = { project: path.basename(projectDir), variants: {} };
    }
  }
  manifest.variants[variantKey] = {
    variant: variantKey,
    title: spec.title || "",
    archetype: spec.archetype || "versus",
    aspect: dims.aspect,
    width: dims.width,
    height: dims.height,
    method: "html-css-playwright",
    output: path.relative(projectDir, outPath).replace(/\\/g, "/"),
    spec,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return {
    outputPath: outPath,
    manifestPath,
    variant: variantKey,
    aspect: dims.aspect,
    width: dims.width,
    height: dims.height,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(
      [
        "Usage: node scripts/generate_thumbnail.mjs --project <slug> [options]",
        "",
        "Options:",
        "  --spec <path>         JSON spec file (relative to workspace or absolute)",
        "  --variant <id>        Variant key for A/B isolation (e.g. a, b -> thumb-a.png)",
        "  --title <text>        Headline text (supports ~~word~~ for red brush strikethrough)",
        "  --subline <text>      Optional secondary sub-headline",
        "  --archetype <name>    versus | pipeline | hero-orbit | lineup | showcase | split-compare",
        "  --accent <color>      lime | emerald | blue | cyan | red | orange | violet | amber | #rrggbb",
        "  --aspect <16:9|9:16>  Override aspect ratio from video.json",
        "  --out <path>          Output PNG path (default: workspaces/<slug>/thumbnails/thumb-<variant>.png)",
      ].join("\n")
    );
    process.exit(0);
  }
  const res = await generateThumbnail(opts);
  console.log(`[thumbnail] Generated ${res.aspect} (${res.width}x${res.height}) -> ${res.outputPath}`);
  console.log(`[thumbnail] Manifest updated -> ${res.manifestPath}`);
}
