import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { captureWebref } from "../scripts/capture_webref.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

let workDir, lsDir, ptDir, fixturePath, shotPath, captureMeta, browser;

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "webref-capture-test-"));
  fixturePath = path.join(workDir, "fixture.html");
  shotPath = path.join(workDir, "sample.png");

  await writeFile(
    fixturePath,
    `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Engram Paper Spec</title>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #0b1020; color: #e2e8f0; padding: 48px; }
          .spacer { height: 900px; }
          .card { max-width: 780px; padding: 24px; border: 1px solid #334155; border-radius: 10px; background: #111827; font-size: 20px; line-height: 1.6; }
          code { background: #1e293b; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Engram Architecture</h1>
        <div class="spacer"></div>
        <div class="card" id="target-card">
          Static world knowledge can be <strong>stored as <code>sparse n-gram</code> hash tables</strong> in host memory.
        </div>
        <div class="spacer"></div>
      </body>
    </html>`,
  );

  captureMeta = await captureWebref({
    url: pathToFileURL(fixturePath).href,
    out: shotPath,
    highlights: ["stored as sparse n-gram hash tables"],
    labels: ["KEY MECHANISM"],
    width: 1280,
    height: 740,
    dpr: 2,
    waitMs: 100,
  });

  const scenes = [
    {
      id: "s001",
      type: "webref",
      act: "one",
      start: 0,
      end: 8,
      accent: "#38bdf8",
      eyebrow: "PRIMARY SOURCE",
      headline: "Accurate Highlighting on Real Captures",
      subline: "Browser frame stays proportional without flattening the page.",
      narration: "Static world knowledge can be stored as sparse n-gram hash tables.",
      meta: {
        url: "arxiv.org/abs/2609.deepseek-v4-engram",
        badge: "WHITE PAPER",
        image: "assets/webref/sample.png",
        alt: "Engram paper specification page",
        highlightRects: captureMeta.highlightRects,
        source: "Source: Engram technical specification",
      },
    },
  ];

  async function setupComp(dir, projectJson) {
    await mkdir(dir, { recursive: true });
    await cp(path.join(root, "engine"), path.join(dir, "engine"), { recursive: true });
    await mkdir(path.join(dir, "assets", "webref"), { recursive: true });
    await cp(shotPath, path.join(dir, "assets", "webref", "sample.png"));
    await symlink(path.join(root, "assets", "fonts"), path.join(dir, "assets", "fonts"), "junction");
    await symlink(path.join(root, "assets", "mascot"), path.join(dir, "assets", "mascot"), "junction");
    await symlink(path.join(root, "node_modules"), path.join(dir, "node_modules"), "junction");
    await mkdir(path.join(dir, "build"));
    await writeFile(path.join(dir, "build", "project.json"), JSON.stringify(projectJson));
    await writeFile(path.join(dir, "build", "scenes.json"), JSON.stringify(scenes));
    execFileSync(process.execPath, [path.join(dir, "engine", "build.mjs")]);
    await writeFile(
      path.join(dir, "index.html"),
      (await readFile(path.join(dir, "index.html"), "utf8")).replace(/<audio[^>]*><\/audio>/g, ""),
    );
  }

  lsDir = path.join(workDir, "ls");
  ptDir = path.join(workDir, "pt");
  await setupComp(lsDir, { title: "Webref LS", compositionId: "webref-ls", width: 1920, height: 1080, fps: 30 });
  await setupComp(ptDir, { title: "Webref PT", compositionId: "webref-pt", width: 1080, height: 1920, isPortrait: true, aspect: "9:16", fps: 30 });

  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
});

after(async () => {
  await browser?.close();
  if (workDir) await rm(workDir, { recursive: true, force: true });
});

test("captureWebref scrolls to cross-tag text and returns accurate percentage highlightRects", async () => {
  assert.equal(captureMeta.pixelWidth, 2560);
  assert.equal(captureMeta.pixelHeight, 1480);
  assert.equal(captureMeta.highlights.length, 1);
  assert.equal(captureMeta.highlights[0].found, true);
  assert.ok(captureMeta.highlightRects.length >= 1);
  const r = captureMeta.highlightRects[0];
  assert.equal(r.label, "KEY MECHANISM");
  // Scrolled into upper-middle third (~30% of viewport height)
  assert.ok(r.y >= 15 && r.y <= 50, `Expected highlight y near 30%, got ${r.y}%`);
  assert.ok(r.w > 10 && r.h > 2 && r.h < 15, `Unexpected rect dimensions ${JSON.stringify(r)}`);
});

test("landscape webref screenshot preserves natural ~16:10/16:9 aspect ratio and aligns highlight overlays", async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.route("https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js", (route) =>
    route.fulfill({ path: require.resolve("gsap/dist/gsap.min.js"), contentType: "text/javascript" }),
  );
  await page.goto(pathToFileURL(path.join(workDir, "ls", "index.html")).href);
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const tl = window.__timelines["webref-ls"];
    tl.seek(0.1, false);
    const initialOpacity = Number(getComputedStyle(document.querySelector("#s001 .web-shot-hl")).opacity);

    tl.seek(4.0, false);
    const shell = document.querySelector("#s001 .web-shell").getBoundingClientRect();
    const vp = document.querySelector("#s001 .web-viewport").getBoundingClientRect();
    const stage = document.querySelector("#s001 .web-screenshot-stage").getBoundingClientRect();
    const img = document.querySelector("#s001 .web-screenshot");
    const imgBox = img.getBoundingClientRect();
    const hl = document.querySelector("#s001 .web-shot-hl");
    const hlBox = hl.getBoundingClientRect();
    const hlTag = document.querySelector("#s001 .web-shot-hl-tag");
    const hlTagStyle = hlTag ? getComputedStyle(hlTag) : null;
    const head = document.querySelector("#s001 .web-head-title").getBoundingClientRect();
    const sub = document.querySelector("#s001 .web-foot-sub").getBoundingClientRect();
    const scrollbar = document.querySelector("#s001 .web-scrollbar");

    return {
      initialOpacity,
      settledOpacity: Number(getComputedStyle(hl).opacity),
      tagVisible: hlTagStyle ? Number(hlTagStyle.opacity) === 1 && hlTag.getBoundingClientRect().height > 10 : false,
      shellWidth: shell.width,
      vpWidth: vp.width,
      vpHeight: vp.height,
      vpAspect: vp.width / vp.height,
      stageBox: { x: stage.x, y: stage.y, w: stage.width, h: stage.height },
      imgBox: { x: imgBox.x, y: imgBox.y, w: imgBox.width, h: imgBox.height },
      naturalAspect: img.naturalWidth / img.naturalHeight,
      stageAspect: stage.width / stage.height,
      hlRelX: ((hlBox.x - stage.x) / stage.width) * 100,
      hlRelY: ((hlBox.y - stage.y) / stage.height) * 100,
      hlRelW: (hlBox.width / stage.width) * 100,
      headBottom: head.bottom,
      subBottom: sub.bottom,
      hasScrollbar: Boolean(scrollbar),
    };
  });

  assert.equal(metrics.initialOpacity, 0);
  assert.equal(metrics.settledOpacity, 1);
  assert.equal(metrics.tagVisible, true);
  assert.equal(metrics.hasScrollbar, false);
  assert.ok(metrics.shellWidth <= 1025, `Expected narrower centered shell <= 1020px, got ${metrics.shellWidth}`);
  assert.ok(metrics.vpHeight >= 575, `Expected taller viewport >= 580px, got ${metrics.vpHeight}`);
  assert.ok(metrics.vpAspect < 1.85 && metrics.vpAspect > 1.5, `Expected balanced ~16:9/16:10 viewport aspect, got ${metrics.vpAspect}`);
  assert.ok(Math.abs(metrics.stageAspect - metrics.naturalAspect) < 0.02, `Stage aspect ${metrics.stageAspect} diverged from natural ${metrics.naturalAspect}`);
  assert.ok(Math.abs(metrics.stageBox.w - metrics.imgBox.w) < 1 && Math.abs(metrics.stageBox.h - metrics.imgBox.h) < 1);

  const expected = captureMeta.highlightRects[0];
  assert.ok(Math.abs(metrics.hlRelX - expected.x) < 0.25, `Highlight X ${metrics.hlRelX} != ${expected.x}`);
  assert.ok(Math.abs(metrics.hlRelY - expected.y) < 0.25, `Highlight Y ${metrics.hlRelY} != ${expected.y}`);
  assert.ok(Math.abs(metrics.hlRelW - expected.w) < 0.25, `Highlight W ${metrics.hlRelW} != ${expected.w}`);
  assert.ok(metrics.subBottom <= 1020, `Subline bottom ${metrics.subBottom} too low`);

  await page.close();
});

test("portrait webref screenshot uses taller 540px viewport without flattening", async () => {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.route("https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js", (route) =>
    route.fulfill({ path: require.resolve("gsap/dist/gsap.min.js"), contentType: "text/javascript" }),
  );
  await page.goto(pathToFileURL(path.join(workDir, "pt", "index.html")).href);
  await page.evaluate(() => document.fonts.ready);

  const pt = await page.evaluate(() => {
    window.__timelines["webref-pt"].seek(4.0, false);
    const vp = document.querySelector("#s001 .web-viewport").getBoundingClientRect();
    const stage = document.querySelector("#s001 .web-screenshot-stage").getBoundingClientRect();
    const img = document.querySelector("#s001 .web-screenshot");
    return {
      vpHeight: vp.height,
      vpAspect: vp.width / vp.height,
      stageAspect: stage.width / stage.height,
      naturalAspect: img.naturalWidth / img.naturalHeight,
    };
  });

  assert.ok(pt.vpHeight >= 535, `Expected portrait viewport height >= 540px, got ${pt.vpHeight}`);
  assert.ok(pt.vpAspect < 1.85, `Expected portrait aspect < 1.85, got ${pt.vpAspect}`);
  assert.ok(Math.abs(pt.stageAspect - pt.naturalAspect) < 0.02);

  await page.close();
});
