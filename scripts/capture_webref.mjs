// Capture a real website screenshot at high DPI and locate exact percentage
// bounding boxes (`highlightRects`) for target text or DOM selectors so
// `webref` scenes can animate highlights accurately over authentic evidence.
//
// Usage:
//   node scripts/capture_webref.mjs --url https://example.com --out assets/webref/s004.png --highlight "exact quote"
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

function parseArgs(argv) {
  const opts = {
    url: "",
    out: "",
    highlights: [],
    labels: [],
    selector: "",
    scrollTo: "",
    width: 1280,
    height: 740,
    dpr: 2,
    colorScheme: "dark",
    waitMs: 600,
    padding: 4,
    noScroll: false,
    metaOut: "",
    timeoutMs: 30000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--url") opts.url = next() || "";
    else if (a === "--out") opts.out = next() || "";
    else if (a === "--highlight" || a === "-h") opts.highlights.push(next() || "");
    else if (a === "--label") opts.labels.push(next() || "");
    else if (a === "--selector") opts.selector = next() || "";
    else if (a === "--scroll-to") opts.scrollTo = next() || "";
    else if (a === "--width") { const v = Number(next()); if (Number.isFinite(v) && v > 0) opts.width = v; }
    else if (a === "--height") { const v = Number(next()); if (Number.isFinite(v) && v > 0) opts.height = v; }
    else if (a === "--dpr") { const v = Number(next()); if (Number.isFinite(v) && v > 0) opts.dpr = v; }
    else if (a === "--color-scheme") opts.colorScheme = next() || "dark";
    else if (a === "--wait-ms") { const v = Number(next()); if (Number.isFinite(v) && v >= 0) opts.waitMs = v; }
    else if (a === "--padding") { const v = Number(next()); if (Number.isFinite(v) && v >= 0) opts.padding = v; }
    else if (a === "--meta-out") opts.metaOut = next() || "";
    else if (a === "--timeout-ms") { const v = Number(next()); if (Number.isFinite(v) && v > 0) opts.timeoutMs = v; }
    else if (a === "--no-scroll") opts.noScroll = true;
    else if (a === "--help") opts.help = true;
  }
  return opts;
}

export async function captureWebref(rawOpts) {
  const opts = {
    highlights: [],
    labels: [],
    selector: "",
    scrollTo: "",
    width: 1280,
    height: 740,
    dpr: 2,
    colorScheme: "dark",
    waitMs: 600,
    padding: 4,
    noScroll: false,
    timeoutMs: 30000,
    ...rawOpts,
  };

  if (!opts.url) throw new Error("--url is required");
  if (!opts.out) throw new Error("--out is required");

  const outPath = path.resolve(opts.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: opts.height },
      deviceScaleFactor: opts.dpr,
      colorScheme: opts.colorScheme,
    });
    const page = await context.newPage();
    await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: Math.min(opts.timeoutMs, 10000) }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    if (opts.waitMs > 0) await page.waitForTimeout(opts.waitMs);

    const scrollStep = async () =>
      page.evaluate(
        ({ highlights, selector, scrollTo, noScroll, vpHeight }) => {
          const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "TEXTAREA", "SELECT"]);
          const BLOCK_DISPLAYS = new Set([
            "block", "flex", "grid", "list-item", "table", "table-row", "table-cell", "table-caption", "section", "article",
          ]);
          const isVisibleEl = (el) => {
            if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName)) return false;
            const cs = getComputedStyle(el);
            return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0;
          };
          const nearestBlock = (node) => {
            let cur = node.parentElement;
            while (cur && cur !== document.body) {
              if (BLOCK_DISPLAYS.has(getComputedStyle(cur).display)) return cur;
              cur = cur.parentElement;
            }
            return document.body;
          };
          const buildTextIndex = () => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
              acceptNode(node) {
                let cur = node.parentElement;
                if (!cur) return NodeFilter.FILTER_REJECT;
                while (cur && cur !== document.documentElement) {
                  if (!isVisibleEl(cur)) return NodeFilter.FILTER_REJECT;
                  cur = cur.parentElement;
                }
                const r = document.createRange();
                r.selectNodeContents(node);
                const rect = r.getBoundingClientRect();
                return rect.width === 0 && rect.height === 0 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
              },
            });
            let text = "";
            const map = [];
            let lastBlock = null;
            let node;
            while ((node = walker.nextNode())) {
              const blk = nearestBlock(node);
              if (lastBlock && blk !== lastBlock && text.length > 0 && !text.endsWith(" ")) {
                text += " ";
                map.push({ node, offset: 0, virtual: true });
              }
              lastBlock = blk;
              const raw = node.nodeValue || "";
              let inSpace = text.length === 0 || text.endsWith(" ");
              for (let i = 0; i < raw.length; i++) {
                const ch = raw[i];
                if (/\s/.test(ch)) {
                  if (!inSpace) {
                    text += " ";
                    map.push({ node, offset: i });
                    inSpace = true;
                  }
                } else {
                  text += ch;
                  map.push({ node, offset: i });
                  inSpace = false;
                }
              }
            }
            return { text, map };
          };
          const findRange = (index, rawQuery) => {
            const q = (rawQuery || "").trim().replace(/\s+/g, " ");
            if (!q) return null;
            let pos = index.text.indexOf(q);
            if (pos < 0) pos = index.text.toLowerCase().indexOf(q.toLowerCase());
            if (pos < 0) return null;
            const endPos = pos + q.length - 1;
            let sIdx = pos;
            let startEntry = index.map[sIdx];
            while (startEntry?.virtual && sIdx < endPos) {
              sIdx++;
              startEntry = index.map[sIdx];
            }
            const endEntry = index.map[endPos];
            if (!startEntry || !endEntry) return null;
            const range = document.createRange();
            range.setStart(startEntry.node, startEntry.offset);
            range.setEnd(endEntry.node, Math.min(endEntry.node.nodeValue.length, endEntry.offset + 1));
            return range;
          };

          if (noScroll) return false;
          const index = buildTextIndex();
          let rect = null;
          for (const h of highlights) {
            const r = findRange(index, h);
            if (r) { rect = r.getBoundingClientRect(); break; }
          }
          if (!rect && selector) {
            try {
              const el = document.querySelector(selector);
              if (el) rect = el.getBoundingClientRect();
            } catch {}
          }
          if (!rect && scrollTo) {
            try {
              const el = document.querySelector(scrollTo);
              if (el) rect = el.getBoundingClientRect();
            } catch {}
            if (!rect) {
              const r = findRange(index, scrollTo);
              if (r) rect = r.getBoundingClientRect();
            }
          }
          if (rect && (rect.top < vpHeight * 0.12 || rect.bottom > vpHeight * 0.84)) {
            window.scrollTo({
              top: Math.max(0, window.scrollY + rect.top - vpHeight * 0.30),
              behavior: "instant",
            });
            return true;
          }
          return false;
        },
        {
          highlights: opts.highlights,
          selector: opts.selector,
          scrollTo: opts.scrollTo,
          noScroll: opts.noScroll,
          vpHeight: opts.height,
        },
      );

    const scrolled = await scrollStep();
    if (scrolled) await page.waitForTimeout(180);

    const locResult = await page.evaluate(
      ({ highlights, labels, selector, padding, vpWidth, vpHeight }) => {
        const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "TEXTAREA", "SELECT"]);
        const BLOCK_DISPLAYS = new Set([
          "block", "flex", "grid", "list-item", "table", "table-row", "table-cell", "table-caption", "section", "article",
        ]);
        function isVisibleEl(el) {
          if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName)) return false;
          const cs = getComputedStyle(el);
          return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0;
        }
        function nearestBlock(node) {
          let cur = node.parentElement;
          while (cur && cur !== document.body) {
            if (BLOCK_DISPLAYS.has(getComputedStyle(cur).display)) return cur;
            cur = cur.parentElement;
          }
          return document.body;
        }
        function buildTextIndex() {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              let cur = node.parentElement;
              if (!cur) return NodeFilter.FILTER_REJECT;
              while (cur && cur !== document.documentElement) {
                if (!isVisibleEl(cur)) return NodeFilter.FILTER_REJECT;
                cur = cur.parentElement;
              }
              const r = document.createRange();
              r.selectNodeContents(node);
              const rect = r.getBoundingClientRect();
              return rect.width === 0 && rect.height === 0 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            },
          });
          let text = "";
          const map = [];
          let lastBlock = null;
          let node;
          while ((node = walker.nextNode())) {
            const blk = nearestBlock(node);
            if (lastBlock && blk !== lastBlock && text.length > 0 && !text.endsWith(" ")) {
              text += " ";
              map.push({ node, offset: 0, virtual: true });
            }
            lastBlock = blk;
            const raw = node.nodeValue || "";
            let inSpace = text.length === 0 || text.endsWith(" ");
            for (let i = 0; i < raw.length; i++) {
              const ch = raw[i];
              if (/\s/.test(ch)) {
                if (!inSpace) {
                  text += " ";
                  map.push({ node, offset: i });
                  inSpace = true;
                }
              } else {
                text += ch;
                map.push({ node, offset: i });
                inSpace = false;
              }
            }
          }
          return { text, map };
        }
        function findRangeForQuery(index, rawQuery) {
          const q = (rawQuery || "").trim().replace(/\s+/g, " ");
          if (!q) return null;
          let pos = index.text.indexOf(q);
          if (pos < 0) pos = index.text.toLowerCase().indexOf(q.toLowerCase());
          if (pos < 0) return null;
          const endPos = pos + q.length - 1;
          let sIdx = pos;
          let startEntry = index.map[sIdx];
          while (startEntry?.virtual && sIdx < endPos) {
            sIdx++;
            startEntry = index.map[sIdx];
          }
          const endEntry = index.map[endPos];
          if (!startEntry || !endEntry) return null;
          const range = document.createRange();
          range.setStart(startEntry.node, startEntry.offset);
          range.setEnd(endEntry.node, Math.min(endEntry.node.nodeValue.length, endEntry.offset + 1));
          return { range, matchedText: index.text.slice(pos, pos + q.length) };
        }
        function mergeLineRects(rawRects) {
          const valid = rawRects
            .filter((r) => r.width >= 1 && r.height >= 1)
            .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }))
            .sort((a, b) => (Math.abs(a.top - b.top) <= 6 ? a.left - b.left : a.top - b.top));
          const merged = [];
          for (const r of valid) {
            const prev = merged[merged.length - 1];
            if (
              prev &&
              Math.abs(prev.top - r.top) <= 6 &&
              Math.abs(prev.bottom - r.bottom) <= 6 &&
              r.left <= prev.right + 16
            ) {
              prev.left = Math.min(prev.left, r.left);
              prev.top = Math.min(prev.top, r.top);
              prev.right = Math.max(prev.right, r.right);
              prev.bottom = Math.max(prev.bottom, r.bottom);
            } else {
              merged.push({ ...r });
            }
          }
          return merged;
        }
        function toPercentRect(box) {
          const left = Math.max(0, box.left - padding);
          const top = Math.max(0, box.top - padding);
          const right = Math.min(vpWidth, box.right + padding);
          const bottom = Math.min(vpHeight, box.bottom + padding);
          const w = Math.max(0, right - left);
          const h = Math.max(0, bottom - top);
          if (w <= 0 || h <= 0) return null;
          return {
            x: Number(((left / vpWidth) * 100).toFixed(2)),
            y: Number(((top / vpHeight) * 100).toFixed(2)),
            w: Number(((w / vpWidth) * 100).toFixed(2)),
            h: Number(((h / vpHeight) * 100).toFixed(2)),
          };
        }

        const index = buildTextIndex();
        const highlightRects = [];
        const details = [];
        for (let i = 0; i < highlights.length; i++) {
          const found = findRangeForQuery(index, highlights[i]);
          if (!found) {
            details.push({ query: highlights[i], found: false, matchedText: null, rects: [] });
            continue;
          }
          const rects = mergeLineRects([...found.range.getClientRects()])
            .map(toPercentRect)
            .filter(Boolean);
          if (labels[i] && rects.length > 0) rects[0].label = labels[i];
          highlightRects.push(...rects);
          details.push({
            query: highlights[i],
            found: rects.length > 0,
            matchedText: found.matchedText,
            rects,
          });
        }

        if (selector) {
          try {
            const el = document.querySelector(selector);
            if (el) {
              const pr = toPercentRect(el.getBoundingClientRect());
              if (pr) {
                if (labels[0] && !highlights.length) pr.label = labels[0];
                highlightRects.push(pr);
                details.push({ selector, found: true, rects: [pr] });
              }
            }
          } catch {}
        }

        return {
          title: document.title || "",
          scrollY: window.scrollY,
          highlightRects,
          details,
        };
      },
      {
        highlights: opts.highlights,
        labels: opts.labels,
        selector: opts.selector,
        padding: opts.padding,
        vpWidth: opts.width,
        vpHeight: opts.height,
      },
    );

    await page.screenshot({ path: outPath, fullPage: false });

    const payload = {
      url: opts.url,
      out: opts.out,
      title: locResult.title,
      viewport: { width: opts.width, height: opts.height, dpr: opts.dpr },
      pixelWidth: Math.round(opts.width * opts.dpr),
      pixelHeight: Math.round(opts.height * opts.dpr),
      highlightRects: locResult.highlightRects,
      highlights: locResult.details,
    };

    if (opts.metaOut) {
      const metaPath = path.resolve(opts.metaOut);
      await fs.mkdir(path.dirname(metaPath), { recursive: true });
      await fs.writeFile(metaPath, JSON.stringify(payload, null, 2));
    }

    return payload;
  } finally {
    await browser.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.url || !opts.out) {
    console.log(
      "Usage: node scripts/capture_webref.mjs --url <url> --out <path> " +
      "[--highlight <text>] [--label <text>] [--selector <css>] [--scroll-to <text|css>] " +
      "[--width 1280] [--height 740] [--dpr 2] [--color-scheme dark|light] [--meta-out <json>]",
    );
    process.exit(opts.help ? 0 : 1);
  }
  const result = await captureWebref(opts);
  console.log(JSON.stringify(result, null, 2));
}
