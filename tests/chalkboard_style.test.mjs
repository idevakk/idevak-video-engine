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
        type: 'cb_sandbox',
        act: 'math',
        eyebrow: 'PACKET CAPTURE SANDBOX',
        headline: 'Host Boundary Capture',
        narration: 'Intercept outbound telemetry inside a local boundary.',
        meta: {
          mode: 'capture',
          hostLabel: 'my Mac mini',
          hostColor: 'green',
          sources: [
            { title: 'LM Studio', sub: 'LOCAL APP', icon: 'terminal', color: 'amber', lasso: true },
            { title: 'Ollama', sub: 'DAEMON', icon: 'server', color: 'cyan', blocked: true },
          ],
          packets: [{ label: 'POST /telemetry' }, { blocked: true, label: '0 connections' }],
          targets: [{ title: 'Packet Funnel', icon: 'funnel', color: 'coral', funnel: true, recLabel: 'REC', recSub: 'FULL CAPTURE' }],
          meter: { label: 'CAPTURE VOLUME', value: '0.5 GB', targetValue: '1.0 GB', pct: 68, color: 'cyan', hatched: true },
          shield: { label: 'defence', color: 'green', icon: 'shield' },
        },
      },
      {
        id: 's008',
        type: 'cb_sandbox',
        act: 'math',
        eyebrow: 'DNS RESOLUTION CHAIN',
        headline: 'Resolution Path',
        narration: 'Queries pass through the local resolver before reaching DNS.',
        meta: {
          mode: 'chain',
          steps: [
            { title: 'LM Studio', sub: 'CLIENT', icon: 'terminal', color: 'cyan' },
            { title: 'lmstudio.ai?', sub: 'QUERY', icon: 'dns', color: 'ochre', lasso: true, subCallout: 'asked by app' },
            { title: 'system resolver', sub: 'OS', icon: 'hacker', color: 'coral' },
            { title: 'DNS', sub: 'UPSTREAM', icon: 'globe', color: 'green' },
          ],
          bottomPill: 'UNENCRYPTED HOST LOOKUP',
          bottomColor: 'coral',
        },
      },
      {
        id: 's009',
        type: 'cb_log',
        act: 'math',
        eyebrow: 'SERVER LOGS & PERMISSIONS',
        headline: 'Log Inspection',
        narration: 'Sensitive tokens appear word for word in plain text logs.',
        meta: {
          mode: 'permissions',
          permBits: '- rw- --- ---',
          envPill: 'OLLAMA_NOHISTORY=1',
          envPillColor: 'cyan',
          thumbsUp: true,
          filename: 'server.log',
          lines: [
            { text: '[INFO] POST /v1/chat/completions canary-pw-7731', highlight: 'canary-pw-7731', circle: 'canary-pw-7731', highlightColor: 'ochre' },
            { text: 'OPENAI_API_KEY=sk-live-000-73-1337', highlight: 'sk-live-000-73-1337', color: 'coral' },
          ],
          notes: [{ text: 'word for word', color: 'ochre' }],
        },
      },
      {
        id: 's010',
        type: 'cb_issue',
        act: 'math',
        eyebrow: 'UPSTREAM ISSUE & TOGGLE',
        headline: 'Open Issue',
        narration: 'An open issue tracks the missing auto-update off switch.',
        meta: {
          repo: 'ollama/ollama',
          number: '4123',
          status: 'Open',
          statusColor: 'green',
          issueTitle: 'Add clean opt-out toggle for background telemetry',
          dateLabel: 'open since May 2024',
          toggle: { label: 'Auto-update', sub: 'off switch?', on: true, flipTo: false, onColor: 'green', offColor: 'coral', badge: 'DISABLED' },
        },
      },
      {
        id: 's011',
        type: 'cb_timeline',
        act: 'math',
        eyebrow: 'RELEASE TIMELINE',
        headline: 'Version History',
        narration: 'Compare fixed releases against the affected local version.',
        meta: {
          calendar: { topLabel: 'PATCHED', mainLabel: 'Feb', color: 'ochre' },
          notes: [{ text: 'Docker images', color: 'cyan', icon: 'docker' }],
          events: [
            { label: '0.17.1', sub: 'FIXED', side: 'above', color: 'green' },
            { label: '0.30.1?', sub: 'OLD', side: 'below', color: 'coral', xOut: true },
            { label: '0.40.2', sub: 'MINE', side: 'above', color: 'ochre', lasso: true },
            { label: '0.40.11', sub: 'CURRENT', side: 'below', color: 'cyan' },
          ],
        },
      },
      {
        id: 's012',
        type: 'cb_stamp_card',
        act: 'math',
        eyebrow: 'DEPRECATED FEATURE & CANARIES',
        headline: 'Stamp & Spy Rows',
        narration: 'Even after deprecation, canary strings reveal outbound tracing.',
        meta: {
          card: { title: 'Telemetry Flag', sub: 'LEGACY TELEMETRY', icon: 'warning', color: 'cyan' },
          stamp: { text: 'RETIRED', color: 'coral', angle: -7 },
          calendar: { topLabel: 'BACK IN', mainLabel: 'Sep', color: 'ochre' },
          rows: [
            { tag: 'canary-pw-7731', tagColor: 'ochre', left: 'Qwen 3.5 4B', leftSub: 'LOCAL', right: 'Ollama', rightSub: 'UPSTREAM', eye: true, color: 'coral' },
          ],
        },
      },
      {
        id: 's013',
        type: 'cb_prompt_card',
        act: 'math',
        eyebrow: 'QUICK CHECK',
        headline: 'Honest Prompt',
        narration: 'Have you ever bound your local server to all interfaces?',
        meta: {
          mode: 'prompt',
          question: 'Ever bound local inference to',
          codeToken: 'OLLAMA_HOST=0.0.0.0',
          subNote: 'be honest',
          choices: [
            { text: 'yes', active: true, color: 'green' },
            { text: 'no', color: 'coral' },
          ],
        },
      },
      {
        id: 's014',
        type: 'cb_prompt_card',
        act: 'math',
        eyebrow: 'SOURCE VIDEO CAPTURE',
        headline: 'Media Card',
        narration: 'Four hundred thousand views triggered a closer packet audit.',
        meta: {
          mode: 'media',
          platform: 'YouTube',
          badge: 'SOURCE CLIP',
          title: 'I Actually Spied on Local AI Apps',
          viewsStart: '~397,059',
          viewsEnd: '~400,000 views',
          scrubPct: 72,
          lasso: true,
          eye: true,
          chatPill: 'audit thread',
        },
      },
      {
        id: 's015',
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

  // Verify word-synced kinetic pacing: timeline registers synchronously and elements pop progressively, not all at once
  const scenesJson = JSON.parse(await fs.readFile(path.join(WS_CHALK, 'build/scenes.json'), 'utf8'));
  assert.ok(scenesJson[1].wordTimings && scenesJson[1].wordTimings.length > 0, 'draft alignment must populate estimated wordTimings');

  // Verify dedicated chalkboard SFX synthesis + progressive kinetic timeline timing
  const browser = await chromium.launch({ headless: true });
  try {
    const compPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await compPage.goto('file://' + path.join(WS_CHALK, 'index.html').replace(/\\/g, '/'));
    const s2 = scenesJson[1];
    const prog = await compPage.evaluate(({ s2, compId }) => {
      const tl = window.__timelines && window.__timelines[compId];
      if (!tl) return { missingTimeline: true };
      const cardsAt = (t) => {
        tl.seek(t, false);
        return Array.from(document.querySelectorAll('#s002 .cb-card')).map((c) => Number(getComputedStyle(c).opacity));
      };
      return {
        missingTimeline: false,
        atStart: cardsAt(s2.start + 0.05),
        atMid: cardsAt(s2.start + (s2.end - s2.start) * 0.45),
        atEnd: cardsAt(s2.end - 0.35),
      };
    }, { s2, compId: project.compositionId });
    assert.equal(prog.missingTimeline, false);
    assert.ok(prog.atStart[1] === 0 && prog.atStart[3] === 0, 'later cards must stay hidden at scene start: ' + JSON.stringify(prog));
    assert.ok(prog.atMid[0] > 0.9 && prog.atMid[3] < 0.1, 'cards must reveal progressively across narration: ' + JSON.stringify(prog));
    assert.ok(prog.atEnd.every((v) => v > 0.99), 'all cards must settle cleanly before scene cut: ' + JSON.stringify(prog));
    await compPage.close();

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
