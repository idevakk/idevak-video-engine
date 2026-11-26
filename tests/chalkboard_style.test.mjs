import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.dirname);
const ROOT = path.resolve(import.meta.dirname, '..');
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SLUG_DEFAULT = `chalk-def-${process.pid}-${Date.now()}`;
const SLUG_CHALK = `chalk-opt-${process.pid}-${Date.now()}`;
const SLUG_PORTRAIT = `chalk-port-${process.pid}-${Date.now()}`;
const WS_DEFAULT = path.join(ROOT, 'workspaces', SLUG_DEFAULT);
const WS_CHALK = path.join(ROOT, 'workspaces', SLUG_CHALK);
const WS_PORTRAIT = path.join(ROOT, 'workspaces', SLUG_PORTRAIT);

after(async () => {
  await fs.rm(WS_DEFAULT, { recursive: true, force: true });
  await fs.rm(WS_CHALK, { recursive: true, force: true });
  await fs.rm(WS_PORTRAIT, { recursive: true, force: true });
});

function defaultSample(slug) {
  return {
    title: 'Default Cyber-Tech Build Check',
    slug,
    compositionId: slug,
    audio: 'voiceover.wav',
    defaultAccent: '#38bdf8',
    acts: [{ id: 'act-1', name: 'THE CLAIM', accent: '#38bdf8' }],
    scenes: [
      {
        id: 's001',
        type: 'cold',
        act: 'act-1',
        eyebrow: 'THE CLAIM',
        headline: 'Default style untouched',
        subline: 'Cyber-Tech preset stays intact',
        narration: 'Default builds never load the chalkboard preset.',
        meta: { chips: ['DEFAULT', 'ISOLATED'], ghost: 'ZERO' },
      },
      {
        id: 's002',
        type: 'stat',
        act: 'act-1',
        eyebrow: 'METRIC',
        headline: 'KV cache size',
        narration: 'Sixty four gigabytes.',
        mascot: { expression: 'shocked', bubble: 'Huge!' },
        meta: { value: 64, suffix: ' GB', label: 'KV CACHE' },
      },
      {
        id: 's003',
        type: 'outro',
        act: 'act-1',
        eyebrow: 'DONE',
        headline: 'Subscribe',
        narration: 'Thanks for watching.',
        meta: { channel: '@iDevak', cta: 'Subscribe', ghost: 'END' },
      },
    ],
  };
}

function chalkboardSample(slug, extra = {}) {
  return {
    title: 'Chalkboard Dedicated Scenes Check',
    slug,
    compositionId: slug,
    style: 'chalkboad-explainer',
    audio: 'voiceover.wav',
    defaultAccent: '#589f76',
    acts: [
      { id: 'req', name: 'THE ACTUAL REQUIREMENT', accent: '#4d8da6' },
      { id: 'math', name: 'THE MEMORY MATH', accent: '#b94a58' },
    ],
    scenes: [
      {
        id: 's001',
        type: 'cb_title',
        act: 'req',
        eyebrow: 'THE ACTUAL REQUIREMENT',
        headline: 'Qwen3.8 · 27B',
        narration: 'Twenty seven billion parameters need thirty two gigabytes.',
        meta: {
          title: 'Qwen3.8 · 27B',
          barLabel: 'NATIVE CONTEXT WINDOW',
          barValue: '262,144 tokens',
          barPct: 100,
          barColor: 'cyan',
          pill: 'FAST',
          stat: '32',
          statUnit: 'GB',
          statLabel: 'OF FAST VRAM',
          statColor: 'green',
          trend: true,
        },
      },
      {
        id: 's002',
        type: 'cb_cards',
        act: 'req',
        eyebrow: 'FOUR ROUTES TO 32 GB',
        headline: 'Four Routes',
        narration: 'Compare used data center cards, dual cards, workstation cards, or unified memory.',
        meta: {
          cards: [
            { icon: 'layers', title: 'USED DATA-CENTER', color: 'amber', active: true },
            { icon: 'dual-gpu', title: 'DUAL-CARD SETUPS', color: 'cyan' },
            { icon: 'gpu', title: 'WORKSTATION HARDWARE', color: 'green' },
            { icon: 'chip', title: 'UNIFIED MEMORY', color: 'violet', xOut: true },
          ],
          bottomPill: '32 GB IS THE HARD REQUIREMENT',
          bottomColor: 'ochre',
        },
      },
      {
        id: 's003',
        type: 'cb_formula',
        act: 'math',
        eyebrow: 'THE PER-TOKEN FORMULA',
        headline: 'Formula',
        narration: 'Multiply sixteen by four by two hundred fifty six by two.',
        meta: {
          factors: [
            { val: '16', label: 'LAYERS', color: 'amber' },
            { val: '4', label: 'KV HEADS', op: '×', color: 'ochre' },
            { val: '256', label: 'HEAD DIM', op: '×', color: 'cyan' },
            { val: '2', label: 'K + V', op: '×', color: 'violet' },
          ],
          result: '32,768',
          resultLabel: 'PARAMETERS PER TOKEN',
          resultColor: 'ochre',
        },
      },
      {
        id: 's004',
        type: 'cb_vram_stack',
        act: 'math',
        eyebrow: 'STACK WHAT ACTUALLY HAS TO BE RESIDENT',
        headline: 'Resident Stack',
        narration: 'Weights, KV cache, CUDA runtime, and scratch buffers fill the tank.',
        meta: {
          ceiling: '32 GB card',
          ceilingColor: 'ochre',
          layers: [
            { size: '1.1 GB', title: 'CUDA runtime', pct: 10, color: 'amber' },
            { size: '9.0 GB', title: 'KV cache', pct: 28, color: 'cyan' },
            { size: '17.6 GB', title: 'model weights', pct: 48, color: 'violet' },
          ],
        },
      },
      {
        id: 's005',
        type: 'cb_wiring',
        act: 'math',
        eyebrow: 'HOW A CONSUMER BOARD IS ACTUALLY WIRED',
        headline: 'PCIe Wiring',
        narration: 'Slot one goes direct to CPU while slot two routes via chipset.',
        meta: {
          nodes: [
            { title: 'CPU', sub: 'HOST', color: 'slate' },
            { title: 'chipset', sub: 'DMI', color: 'ochre' },
            { title: 'x16', sub: 'SLOT 1 · DIRECT', color: 'green' },
            { title: 'x4', sub: 'SLOT 2 · VIA CHIPSET', color: 'coral' },
          ],
          edges: [
            { from: 0, to: 2, thick: true, color: 'green' },
            { from: 0, to: 1, elbow: true, color: 'slate' },
            { from: 1, to: 3, pulse: true, color: 'coral' },
          ],
          pills: [{ text: 'CROSS-CARD SYNC LATENCY', color: 'coral', icon: 'warning' }],
        },
      },
      {
        id: 's006',
        type: 'cb_gpu_spec',
        act: 'math',
        eyebrow: 'SINGLE CARD OPTIONS',
        headline: 'Workstation Comparison',
        narration: 'Compare Intel Arc Pro B70 and AMD Radeon AI Pro.',
        meta: {
          mode: 'compare',
          cards: [
            { brand: 'intel', tagline: 'MODERN', title: 'Arc Pro B70', bullets: ['32 GB GDDR6'], price: 'under $1,300', color: 'cyan' },
            { brand: 'AMD', tagline: 'WORKSTATION', title: 'R9700', bullets: ['No adapters'], price: 'under $1,400', color: 'amber' },
          ],
        },
      },
      {
        id: 's007',
        type: 'cb_outro',
        act: 'math',
        eyebrow: 'TAKEAWAY',
        headline: 'Measure First',
        narration: 'Measure the full context window.',
        meta: { channel: '@iDevak', cta: 'Subscribe' },
      },
    ],
    ...extra,
  };
}

test('default builds remain untouched when style is omitted', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_DEFAULT, '--title', 'Default Check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await fs.writeFile(path.join(WS_DEFAULT, 'video.json'), JSON.stringify(defaultSample(SLUG_DEFAULT), null, 2));

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG_DEFAULT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG_DEFAULT, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG_DEFAULT], { cwd: ROOT, stdio: 'pipe' });

  const project = JSON.parse(await fs.readFile(path.join(WS_DEFAULT, 'build/project.json'), 'utf8'));
  assert.equal(project.style, undefined);

  const html = await fs.readFile(path.join(WS_DEFAULT, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /data-style="chalkboard-explainer"/);
  assert.doesNotMatch(html, /__CB_PLAY_SFX__/);
  assert.match(html, /#bg-grid/);
  assert.match(html, /class="m-ov /);
});

test('chalkboard-explainer renders dedicated cb_* scenes in 16:9 with zero Cyber-Tech CSS, Excalifont, and deterministic soft SFX', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_CHALK, '--title', 'Chalkboard Check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await fs.writeFile(path.join(WS_CHALK, 'video.json'), JSON.stringify(chalkboardSample(SLUG_CHALK), null, 2));

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG_CHALK], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG_CHALK, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG_CHALK], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG_CHALK], { cwd: ROOT, stdio: 'pipe' });

  const project = JSON.parse(await fs.readFile(path.join(WS_CHALK, 'build/project.json'), 'utf8'));
  assert.equal(project.style, 'chalkboard-explainer');

  const html = await fs.readFile(path.join(WS_CHALK, 'index.html'), 'utf8');
  assert.match(html, /data-style="chalkboard-explainer"/);
  assert.match(html, /__CB_PLAY_SFX__/);
  assert.doesNotMatch(html, /#bg-grid/);
  assert.doesNotMatch(html, /class="m-ov /);
  assert.ok(fsSync.existsSync(path.join(WS_CHALK, 'build/fonts/excalifont-0.woff2')));
  assert.ok(fsSync.existsSync(path.join(WS_CHALK, 'build/fonts/excalifont-1.woff2')));
  assert.ok(fsSync.existsSync(path.join(WS_CHALK, 'build/sfx_track.wav')));

  const qaReport = JSON.parse(await fs.readFile(path.join(WS_CHALK, 'build/qa/local/report.json'), 'utf8'));
  assert.deepEqual(qaReport.overflow, []);
  assert.deepEqual(qaReport.jitter, []);

  // Verify dedicated chalkboard SFX synthesis is deterministic
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root" data-style="chalkboard-explainer"></div>');
    await page.addScriptTag({ path: require.resolve('gsap/dist/gsap.min.js') });
    await page.evaluate(() => { window.__SCENES__ = []; window.__TOTAL__ = 4; });
    await page.addScriptTag({ content: await fs.readFile(path.join(ROOT, 'engine/presets/chalkboard-explainer/sfx.js'), 'utf8') });
    await page.addScriptTag({ content: await fs.readFile(path.join(ROOT, 'engine/presets/chalkboard-explainer/anim.js'), 'utf8') });
    const res = await page.evaluate(async () => {
      const types = ['pop', 'ding', 'whoosh', 'swipe', 'click', 'tick', 'thud'];
      window.__SFX_EVENTS__.push(...types.map((type, i) => ({ type, at: i * 0.4, vol: 1 })));
      const a = await window.__synthesizeSFX();
      const b = await window.__synthesizeSFX();
      return types.map((type) => ({
        type,
        energy: a.clips[type].reduce((s, v) => s + v * v, 0),
        deterministic: a.clips[type].every((v, i) => v === b.clips[type][i]),
      }));
    });
    for (const s of res) {
      assert.ok(s.energy > 0.0005, JSON.stringify(s));
      assert.ok(s.deterministic, s.type);
    }
  } finally {
    await browser.close();
  }
});

test('chalkboard-explainer dedicated cb_* scenes render cleanly in 9:16 portrait (1080x1920) with zero overflow or jitter', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_PORTRAIT, '--title', 'Chalkboard Portrait Check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await fs.writeFile(
    path.join(WS_PORTRAIT, 'video.json'),
    JSON.stringify(chalkboardSample(SLUG_PORTRAIT, { aspect: '9:16', style: 'chalkboard-explainer' }), null, 2),
  );

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG_PORTRAIT, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });

  const project = JSON.parse(await fs.readFile(path.join(WS_PORTRAIT, 'build/project.json'), 'utf8'));
  assert.equal(project.aspect, '9:16');
  assert.equal(project.width, 1080);
  assert.equal(project.height, 1920);

  const html = await fs.readFile(path.join(WS_PORTRAIT, 'index.html'), 'utf8');
  assert.match(html, /class="is-portrait"/);
  assert.match(html, /data-style="chalkboard-explainer"/);

  const qaReport = JSON.parse(await fs.readFile(path.join(WS_PORTRAIT, 'build/qa/local/report.json'), 'utf8'));
  assert.deepEqual(qaReport.overflow, []);
  assert.deepEqual(qaReport.jitter, []);
});
