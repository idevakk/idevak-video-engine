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
const SLUG_ME = `motion-exp-${process.pid}-${Date.now()}`;
const SLUG_ME_PORTRAIT = `motion-port-${process.pid}-${Date.now()}`;
const WS_ME = path.join(ROOT, 'workspaces', SLUG_ME);
const WS_ME_PORTRAIT = path.join(ROOT, 'workspaces', SLUG_ME_PORTRAIT);

after(async () => {
  await fs.rm(WS_ME, { recursive: true, force: true });
  await fs.rm(WS_ME_PORTRAIT, { recursive: true, force: true });
});

function motionExplainerSample(slug, extra = {}) {
  return {
    title: 'Motion Explainer Dedicated Scenes Check',
    slug,
    compositionId: slug,
    style: 'motion-explainer',
    audio: 'voiceover.wav',
    defaultAccent: '#10b981',
    acts: [
      { id: 'intro', name: 'CORE IDEA', accent: '#f97316' },
      { id: 'eval', name: 'BENCHMARKS', accent: '#10b981' },
    ],
    scenes: [
      {
        id: 's001',
        type: 'me_title',
        act: 'intro',
        eyebrow: 'ARXIV 2611.18856',
        headline: 'Continual Recursive Self-Improvement',
        subline: 'Agent harness evolution across models',
        narration: 'Self improvement memory enables continual recursive self improvement without updating model weights.',
        meta: {
          badge: 'Google Research',
          highlight: 'without updating model weights',
          showCore: true,
          coreIcon: 'lock',
          color: 'orange',
          pills: [
            { text: 'prompts', icon: 'doc', color: 'slate' },
            { text: 'tools', icon: 'code', color: 'emerald' },
            { text: 'harness', icon: 'gear', color: 'orange' },
          ],
        },
      },
      {
        id: 's002',
        type: 'me_core_orbit',
        act: 'intro',
        eyebrow: 'HARNESS TRANSFER',
        headline: 'Core Orbit Diagram',
        narration: 'The harness evolves around prompts, tools, flow, and memory, then transfers to the next model.',
        meta: {
          topPill: 'EVOLVED ON · Opus 5.5',
          bottomPill: 'Gemini 3.8 Flash',
          coreIcon: 'lock',
          color: 'emerald',
          orbitNodes: [
            { label: 'prompts', icon: 'chat', color: 'emerald' },
            { label: 'tools', icon: 'gear', color: 'emerald' },
            { label: 'flow', icon: 'check', color: 'emerald' },
            { label: 'code', icon: 'code', color: 'orange' },
          ],
          arrowLabel: 'workspace',
          arrowColor: 'orange',
          targetLabel: 'next model',
          targetIcon: 'code',
          targetDashed: true,
        },
      },
      {
        id: 's003',
        type: 'me_bar_compare',
        act: 'eval',
        eyebrow: 'BENCHMARK DELTA',
        headline: 'Transplant vs Seed',
        narration: 'Transplant scores sixty eight point four one compared to seventy three point eight nine for seed.',
        meta: {
          header: 'Terminal-Bench 2.1',
          badge: '+5.48 headroom',
          thresholdPct: 82,
          thresholdLabel: 'seed baseline',
          bars: [
            { label: 'transplant', value: '68.41', pct: 74, delta: '+5.48', color: 'orange', dashedCap: true },
            { label: 'Gemini seed', value: '73.89', pct: 82, color: 'emerald' },
          ],
          bottomPill: 'CROSS-MODEL TRANSFER',
        },
      },
      {
        id: 's004',
        type: 'me_bar_compare',
        act: 'eval',
        eyebrow: 'TABLE 1',
        headline: 'Grouped Comparison',
        narration: 'Across three models, continue beats fresh.',
        meta: {
          header: 'Gemini Suite · TB2.1',
          badge: 'Table 1',
          groups: [
            { title: '3.5 Flash', active: true, color: 'orange', bars: [{ label: 'continue', value: '52%', pct: 68, color: 'orange' }, { label: 'fresh', value: '41%', pct: 52, color: 'emerald' }] },
            { title: '3.8 Flash', active: false, color: 'slate', bars: [{ label: 'continue', value: '68%', pct: 82, color: 'orange' }, { label: 'fresh', value: '61%', pct: 74, color: 'emerald' }] },
          ],
        },
      },
      {
        id: 's005',
        type: 'me_stat_split',
        act: 'eval',
        eyebrow: 'OPUS 4.8',
        headline: 'Terminal-Bench Score',
        narration: 'Opus reaches eighty point two, up six points from seventy four point two, while unseen gains reach four point seven.',
        meta: {
          model: 'Opus 4.8',
          benchmark: 'Terminal-Bench 2.1',
          value: '80.2',
          baseline: '74.2',
          delta: '+6.0',
          pct: 80,
          color: 'orange',
          sideTitle: 'The Decoder',
          sideBadge: 'Generalization',
          sideBars: [
            { label: 'training', value: '+14.1', pct: 78, prefix: 'up to', color: 'orange' },
            { label: 'unseen', value: '+4.7', pct: 36, prefix: 'up to', color: 'emerald' },
          ],
        },
      },
      {
        id: 's006',
        type: 'me_evidence_card',
        act: 'intro',
        eyebrow: 'SOURCE EVIDENCE',
        headline: 'Preprint Summary',
        narration: 'The preprint shows that useful memory is not a universal guarantee.',
        meta: {
          source: 'Google DeepMind',
          handle: '@kimmonismus',
          date: '2026-11-13',
          badge: 'THE IDEA',
          title: 'Self-Improvement Memory',
          body: 'Google had AI rewrite an agent harness and keep a log of every change. Useful memory. Not a universal guarantee.',
          highlight: 'Useful memory. Not a universal guarantee.',
          color: 'orange',
          points: [
            { text: 'Logs root cause, predicted flips, and observed outcomes', color: 'emerald' },
          ],
          callout: 'No weight updates required',
        },
      },
      {
        id: 's007',
        type: 'me_pipeline_flow',
        act: 'eval',
        eyebrow: 'EVOLUTION LOOP',
        headline: 'C3 Selection Pipeline',
        narration: 'Each round runs rollouts, proposes edits, selects candidates in C3, and records results in SIM.',
        meta: {
          steps: [
            { label: 'RUN' },
            { label: 'PROPOSE' },
            { label: 'SELECT' },
            { label: 'RECORD', active: true },
          ],
          centerTitle: 'C3',
          centerBadge: 'NOT PUBLIC',
          rightTitle: 'SIM',
          rightRows: [
            { label: 'worker-1', color: 'emerald' },
            { label: 'worker-2', color: 'emerald' },
            { label: 'worker-3', color: 'emerald' },
          ],
          bottomPill: '4-STAGE LOOP',
          color: 'orange',
        },
      },
      {
        id: 's008',
        type: 'me_schema_card',
        act: 'intro',
        eyebrow: 'ROOT CAUSE',
        headline: 'Premature Completion',
        narration: 'The P5 root cause schema logs rationale, predicted, observed, and the execution gating interlock edit.',
        meta: {
          statusPill: 'diagnosis only',
          eyebrow: 'ROOT CAUSE',
          title: 'P5 · premature completion',
          color: 'orange',
          fields: [
            { key: 'rationale', skeleton: true },
            { key: 'predicted', val: 'pass verification gates', highlight: false },
            { key: 'observed', val: 'marked complete early', highlight: true, color: 'orange' },
            { key: 'provenance', skeleton: true },
          ],
          attempt: { index: '1', label: 'edit', value: 'execution-gating interlock', color: 'orange' },
          deckTag: 'P5',
          deckLabel: 'memory',
        },
      },
      {
        id: 's009',
        type: 'me_editor_window',
        act: 'intro',
        eyebrow: 'HARNESS LOG',
        headline: 'Markdown Log',
        narration: 'The harness log captures root cause, expected flips, and what happened.',
        meta: {
          filename: 'harness-log.md',
          branch: 'main',
          statusRight: 'Ln 3, Col 15  Markdown',
          color: 'emerald',
          stamp: 'BEFORE EVAL',
          stampColor: 'orange',
          summaryCard: { tag: 'P8', badge: 'UNRESOLVED', color: 'orange' },
          timeline: { startLabel: 'written', endLabel: 'eval run' },
          lines: [
            { text: '1. root cause + reason', kind: 'ctx' },
            { text: '2. expected flips', kind: 'add' },
            { text: '3. what happened', kind: 'hot', cursor: true },
          ],
        },
      },
      {
        id: 's013',
        type: 'me_line_chart',
        act: 'eval',
        eyebrow: 'MEAN SCORE LIFT',
        headline: 'SIM vs No SIM',
        narration: 'Across ten runs, SIM climbs from eighteen point three six to twenty one point seven zero.',
        meta: {
          header: 'avg score across 10 runs',
          yLabel: 'avg score',
          badge: '+2.36 pts',
          yMin: 18,
          yMax: 22.5,
          series: [
            { label: 'SIM', color: 'emerald', active: true, points: [{ y: 18.36 }, { y: 21.70 }] },
            { label: 'no SIM', color: 'slate', active: false, points: [{ y: 18.36 }, { y: 19.33 }] },
          ],
          bottomPill: 'CONSISTENT POSITIVE LIFT',
        },
      },
      {
        id: 's010',
        type: 'me_decision_gate',
        act: 'eval',
        eyebrow: 'STOP CHECK',
        headline: 'Execution Gating',
        narration: 'Before marking complete, the gate verifies intent and evidence.',
        meta: {
          statusPill: 'stop check',
          counterBadge: '×3',
          question: 'Are you sure you want to mark the task as complete?',
          resultPill: 'COMPLETE',
          color: 'emerald',
          choices: [
            { text: 'yes', active: false },
            { text: 'yes', active: false },
            { text: 'yes', active: true },
          ],
          gates: [
            { label: 'intent', ok: true, badge: 'PASS' },
            { label: 'evidence', ok: true, badge: 'COMPLETE' },
          ],
        },
      },
      {
        id: 's011',
        type: 'me_timeline',
        act: 'eval',
        eyebrow: 'COMPUTE SCALING',
        headline: 'Evolution Rounds',
        narration: 'Ten rounds take eight hours while forty rounds take forty hours.',
        meta: {
          color: 'emerald',
          events: [
            { label: 'ROUND 1', value: 'seed', sub: 'baseline' },
            { label: 'ROUND 10', value: '≈ 8 h', sub: 'early gains', active: true, color: 'orange' },
            { label: 'ROUND 40', value: '≈ 40 h', sub: 'peak harness' },
          ],
          bottomPill: 'COST VS GAIN',
        },
      },
      {
        id: 's012',
        type: 'me_bar_compare',
        act: 'eval',
        eyebrow: 'LATENCY RACE',
        headline: 'Twenty Seven Times Faster',
        narration: 'Memorilla answers in zero point one two seconds compared to nineteen point three three seconds.',
        meta: {
          orientation: 'horizontal',
          heroDelta: '27x',
          heroUnit: 'faster',
          paperTable: {
            title: 'PAPER TABLE',
            cols: ['STEP', 'TIME'],
            rows: [
              { step: 'Encode 512 docs', time: '2,588.84 ms' },
              { step: 'Memorilla answer', time: '739 ms', hot: true },
            ],
          },
          bars: [
            { label: 'Memorilla', value: '0.12 s', pct: 6, color: 'orange', segments: [{ value: '2.59 s', pct: 45, color: 'slate' }, { pct: 18, color: 'orange' }], delta: '≈ 3.3 s' },
            { label: 'Full context', value: '19.33 s', pct: 86, color: 'slate', dashedTail: true },
          ],
          bottomPill: 'END-TO-END LATENCY',
        },
      },
      {
        id: 's014',
        type: 'me_bar_compare',
        act: 'eval',
        eyebrow: 'HARD TEST',
        headline: 'Benchmark Score Matrix',
        narration: 'Retrieval gets one out of four while twenty nine thousand tokens fit in context.',
        meta: {
          header: "Sam's clues",
          badge: '150 chats',
          scoreRows: [
            { label: 'No memory', totalSlots: 3, okCount: 0, score: '0/4', color: 'slate' },
            { label: 'Retrieval', totalSlots: 3, okCount: 1, score: '1/4', color: 'emerald' },
            { label: 'Memorilla', totalSlots: 3, okCount: 0, score: '0/4', active: true, color: 'orange' },
          ],
          contextMeter: { label: 'Qwen3-8B', total: 64, filled: 48, badge: '150 seen', ticks: ['0', '~29K', '40,960'] },
        },
      },
      {
        id: 's015',
        type: 'me_stat_split',
        act: 'eval',
        eyebrow: 'PREFILL DIAL',
        headline: 'Streaming Queue Latency',
        narration: 'Eight nine documents push latency to ten point five seconds.',
        meta: {
          mode: 'dial',
          dialSeconds: 10.5,
          dialMax: 15,
          dialSplitText: '1 doc',
          queueTitle: 'prompt',
          queueBadge: '89 docs',
          queueCount: 24,
          badges: [{ text: 'H100', icon: 'server', color: 'emerald' }, { text: 'Qwen3-8B', icon: 'layers', color: 'blue' }],
          delta: 'FIRST-TOKEN WAIT',
        },
      },
      {
        id: 's016',
        type: 'me_token_grid',
        act: 'intro',
        eyebrow: 'COMPRESSION',
        headline: 'Sixteen Token Prefix',
        narration: 'One hundred fifty chats compress into sixteen continuous vectors before spelling breakfast.',
        meta: {
          mode: 'bus',
          boxTitle: 'inside Qwen3-8B',
          locked: true,
          tokenCount: 16,
          bracketLabel: '16 tokens',
          callout: { title: 'spelling', input: 'bre', output: 'breakfast?' },
          bottomPill: 'SOFT PREFIX',
        },
      },
      {
        id: 's017',
        type: 'me_token_grid',
        act: 'intro',
        eyebrow: 'FROZEN MODEL',
        headline: 'Weights Unchanged',
        narration: 'All attention layers inside Qwen remain frozen and unchanged.',
        meta: {
          mode: 'layers',
          boxTitle: 'Qwen3-8B',
          frozenBadge: 'frozen',
          locked: true,
          layers: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
        },
      },
      {
        id: 's018',
        type: 'me_evidence_card',
        act: 'intro',
        eyebrow: 'CAVEAT',
        headline: 'Sample Size Quote',
        narration: 'The author cautions to read them as behaviour, not statistics, across four to ten questions.',
        meta: {
          speaker: { name: 'Andris Gauracs', quote: '...as behaviour, not statistics.', attribution: 'ANDRIS GAURACS', dotsFrom: 4, dotsTo: 10, color: 'orange' },
        },
      },
      {
        id: 's019',
        type: 'me_decision_gate',
        act: 'eval',
        eyebrow: 'INTEGRATION MODES',
        headline: 'Replace Beside or Skip',
        narration: 'You can replace full context, run beside it, or skip it altogether.',
        meta: {
          tiers: [
            { label: 'Replace', visual: 'grid', active: true, color: 'orange' },
            { label: 'Beside', visual: 'dashed', detail: 'hybrid context' },
            { label: 'Skip', visual: 'stack' },
          ],
          resultPill: 'Replace or beside',
        },
      },
      {
        id: 's020',
        type: 'me_token_grid',
        act: 'intro',
        eyebrow: 'TOKEN COMPRESSION',
        headline: 'Hundreds of Chats to 16 Tokens',
        narration: 'One hundred fifty chats shrink into sixteen tokens inside the prompt.',
        meta: {
          mode: 'compress',
          sourceLabel: '150 chats',
          sourceCount: 40,
          targetCount: 16,
          targetLabel: '16 tokens',
          stats: [{ value: '150', label: 'chats', color: 'slate' }, { value: '~29K', label: 'tokens', color: 'orange' }],
          bottomPill: '108X COMPRESSION',
        },
      },
      {
        id: 's021',
        type: 'me_evidence_card',
        act: 'intro',
        eyebrow: 'CLAIM VS PAPER',
        headline: 'Beats Memory Baselines on 5 of 8',
        narration: 'On five of eight benchmarks Memorilla beats memory baselines.',
        meta: {
          title: 'Memorilla: Latent Semantic Memory for LLMs',
          body: 'Outperforms baselines on five of eight benchmarks with 108x fewer tokens.',
          browserUrl: 'arxiv.org/abs/2610.21375',
          claim: { eyebrow: 'CLAIM', pill: 'Coverage, 5 Nov', statement: 'beats baselines', checks: 5, footLabel: '5 benchmarks', color: 'emerald' },
        },
      },
      {
        id: 's022',
        type: 'me_outro',
        act: 'eval',
        eyebrow: 'SUMMARY',
        headline: 'Harness engineering is the multiplier.',
        subline: 'Subscribe for deep technical breakdowns.',
        narration: 'Thanks for watching.',
        meta: { channel: '@iDevak', cta: 'Subscribe', color: 'emerald' },
      },
    ],
    ...extra,
  };
}

test('motion-explainer renders dedicated me_* scenes in 16:9 with zero Cyber-Tech/chalkboard leakage, word-synced reveals, and deterministic SFX', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_ME, '--title', 'Motion Explainer Check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await fs.writeFile(path.join(WS_ME, 'video.json'), JSON.stringify(motionExplainerSample(SLUG_ME), null, 2));

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG_ME], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG_ME, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG_ME], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG_ME], { cwd: ROOT, stdio: 'pipe' });

  const project = JSON.parse(await fs.readFile(path.join(WS_ME, 'build/project.json'), 'utf8'));
  assert.equal(project.style, 'motion-explainer');

  const html = await fs.readFile(path.join(WS_ME, 'index.html'), 'utf8');
  assert.match(html, /data-style="motion-explainer"/);
  assert.match(html, /__ME_PLAY_SFX__/);
  assert.doesNotMatch(html, /#bg-grid/);
  assert.doesNotMatch(html, /#cb-bg/);
  assert.doesNotMatch(html, /class="m-ov /);
  assert.ok(fsSync.existsSync(path.join(WS_ME, 'build/sfx_track.wav')));

  const qaReport = JSON.parse(await fs.readFile(path.join(WS_ME, 'build/qa/local/report.json'), 'utf8'));
  assert.deepEqual(qaReport.overflow, []);
  assert.deepEqual(qaReport.jitter, []);

  const scenesJson = JSON.parse(await fs.readFile(path.join(WS_ME, 'build/scenes.json'), 'utf8'));
  assert.ok(scenesJson[1].wordTimings && scenesJson[1].wordTimings.length > 0);

  const browser = await chromium.launch({ headless: true });
  try {
    const compPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await compPage.goto('file://' + path.join(WS_ME, 'index.html').replace(/\\/g, '/'));
    const s2 = scenesJson[1];
    const prog = await compPage.evaluate(({ s2, compId }) => {
      const tl = window.__timelines && window.__timelines[compId];
      if (!tl) return { missingTimeline: true };
      const nodesAt = (t) => {
        tl.seek(t, false);
        return Array.from(document.querySelectorAll('#s002 .me-orbit-node')).map((c) => Number(getComputedStyle(c).opacity));
      };
      return {
        missingTimeline: false,
        atStart: nodesAt(s2.start + 0.04),
        atMid: nodesAt(s2.start + (s2.end - s2.start) * 0.55),
        atEnd: nodesAt(s2.end - 0.3),
      };
    }, { s2, compId: project.compositionId });
    assert.equal(prog.missingTimeline, false);
    assert.ok(prog.atStart.every((v) => v < 0.05), 'orbit nodes start hidden: ' + JSON.stringify(prog));
    assert.ok(prog.atEnd.every((v) => v > 0.99), 'orbit nodes settle before cut: ' + JSON.stringify(prog));

    // Verify no blank-card hold: even when revealOn is late, primary metric/bars appear within 1.5s
    const s5 = scenesJson[4];
    const s5StatOpacity = await compPage.evaluate(({ s5, compId }) => {
      const tl = window.__timelines[compId];
      tl.seek(s5.start + 1.5, false);
      return Number(getComputedStyle(document.querySelector('#s005 .me-stat-big')).opacity);
    }, { s5, compId: project.compositionId });
    assert.ok(s5StatOpacity > 0.9, 'hero stat must not sit blank at +1.5s: ' + s5StatOpacity);

    // Verify me_core_orbit side target enters promptly rather than leaving half screen blank
    const sideOp = await compPage.evaluate(({ s2, compId }) => {
      const tl = window.__timelines[compId];
      tl.seek(s2.start + Math.min(2.6, (s2.end - s2.start) * 0.7), false);
      return Number(getComputedStyle(document.querySelector('#s002 .me-orbit-side')).opacity);
    }, { s2, compId: project.compositionId });
    assert.ok(sideOp > 0.85, 'orbit side target must not sit invisible mid-scene: ' + sideOp);

    // Verify no pointless cubes or hardcoded 5 rollout squares appear without opt-in
    const visualClean = await compPage.evaluate(() => {
      const gate = document.querySelector('.sc-me_decision_gate');
      return {
        s002Cubes: document.querySelectorAll('#s002 .me-iso-cube').length,
        s002Hubs: document.querySelectorAll('#s002 .me-orbit-hub, #s002 .me-target-card').length,
        gateRollouts: gate ? gate.querySelectorAll('.me-rollout-sq').length : -1,
        gateCubes: gate ? gate.querySelectorAll('.me-iso-cube').length : -1,
        gateSolo: gate ? gate.querySelectorAll('.me-gate-layout.is-solo').length : -1,
      };
    });
    assert.equal(visualClean.s002Cubes, 0, 'me_core_orbit with semantic label should use module hub/target card instead of cubes');
    assert.ok(visualClean.s002Hubs >= 2);
    assert.equal(visualClean.gateRollouts, 0, 'me_decision_gate must not render hardcoded rollout squares by default');
    assert.equal(visualClean.gateCubes, 0, 'me_decision_gate must not render hardcoded cube by default');
    assert.equal(visualClean.gateSolo, 1);

    // Verify sfx_track.json is chronologically sorted and deduped (>= 75ms apart)
    const sfxTrack = JSON.parse(await fs.readFile(path.join(WS_ME, 'build/sfx_track.json'), 'utf8'));
    assert.ok(sfxTrack.length >= 10, 'expected substantial SFX cues across 22 scenes');
    for (let si = 1; si < sfxTrack.length; si++) {
      assert.ok(sfxTrack[si].at >= sfxTrack[si - 1].at, `sfx_track.json must be chronological at index ${si}`);
      assert.ok(sfxTrack[si].at - sfxTrack[si - 1].at >= 0.074, `sfx_track.json cues too close at index ${si}: ${sfxTrack[si - 1].at} vs ${sfxTrack[si].at}`);
    }

    // Verify late-scene timeline & line-chart cues sync beyond the old 2.6s cap
    const s13 = scenesJson[9]; // me_line_chart: 18.36 -> 21.70
    const s11 = scenesJson[11]; // me_timeline: ROUND 1, ROUND 10, ROUND 40
    const syncCheck = await compPage.evaluate(({ s13, s11, compId }) => {
      const tl = window.__timelines[compId];
      // Check me_timeline node 2 (ROUND 40) is hidden early at +1.0s and visible at end
      tl.seek(s11.start + 0.9, false);
      const r40Early = Number(getComputedStyle(document.querySelectorAll('#s012 .me-tl-node')[2]).opacity);
      tl.seek(s11.end - 0.35, false);
      const r40End = Number(getComputedStyle(document.querySelectorAll('#s012 .me-tl-node')[2]).opacity);
      // Check me_line_chart dots settle cleanly before cut
      tl.seek(s13.end - 0.35, false);
      const lineDots = Array.from(document.querySelectorAll('#s010 .me-line-dot')).map((d) => Number(getComputedStyle(d).opacity));
      return { r40Early, r40End, lineDots };
    }, { s13, s11, compId: project.compositionId });
    assert.ok(syncCheck.r40Early < 0.2, 'late timeline milestone should wait until spoken (~4s+), got opacity ' + syncCheck.r40Early);
    assert.ok(syncCheck.r40End > 0.99, 'late timeline milestone must settle before cut: ' + syncCheck.r40End);
    assert.ok(syncCheck.lineDots.every((v) => v > 0.99), 'line chart dots must settle before cut: ' + JSON.stringify(syncCheck.lineDots));
    await compPage.close();

    // Verify unordered bar cues & duplicate sequential gate choices in an isolated browser harness
    const syncPage = await browser.newPage();
    await syncPage.setContent(`
      <div id="root" data-style="motion-explainer">
        <section id="s001" class="clip sc sc-me_bar_compare">
          <div class="sc-in">
            <div class="me-eyebrow">BARS</div>
            <div class="me-bar-head"></div>
            <div class="me-chart-panel">
              <div class="me-bars-row">
                <div class="me-bar-col"><div class="me-bar-fill"></div><div class="me-bar-label">Alpha</div></div>
                <div class="me-bar-col"><div class="me-bar-fill"></div><div class="me-bar-label">Beta</div></div>
              </div>
            </div>
          </div>
        </section>
        <section id="s002" class="clip sc sc-me_decision_gate">
          <div class="sc-in">
            <div class="me-eyebrow">GATE</div>
            <div class="me-modal-card">
              <div class="me-gate-choices">
                <span class="me-gate-choice">yes</span>
                <span class="me-gate-choice">yes</span>
                <span class="me-gate-choice">yes</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    `);
    await syncPage.addScriptTag({ path: require.resolve('gsap/dist/gsap.min.js') });
    await syncPage.evaluate(() => {
      window.__SCENES__ = [
        {
          start: 0, end: 6.0, speechStart: 0.2, speechEnd: 5.7, type: 'me_bar_compare',
          meta: { bars: [{ label: 'Alpha', value: '10', pct: 40 }, { label: 'Beta', value: '80', pct: 80 }] },
          wordTimings: [
            { w: 'Beta', t: 0.7, d: 0.3 },
            { w: 'leads', t: 1.1, d: 0.3 },
            { w: 'while', t: 2.5, d: 0.3 },
            { w: 'Alpha', t: 3.8, d: 0.3 },
            { w: 'trails', t: 4.2, d: 0.3 },
          ],
        },
        {
          start: 6.0, end: 13.0, speechStart: 6.25, speechEnd: 12.6, type: 'me_decision_gate',
          meta: { choices: [{ text: 'yes' }, { text: 'yes' }, { text: 'yes', active: true }] },
          wordTimings: [
            { w: 'First', t: 0.4, d: 0.2 }, { w: 'yes', t: 0.9, d: 0.2 },
            { w: 'then', t: 2.4, d: 0.2 }, { w: 'yes', t: 3.1, d: 0.2 },
            { w: 'and', t: 4.5, d: 0.2 }, { w: 'yes', t: 5.2, d: 0.2 },
          ],
        },
      ];
      window.__TOTAL__ = 13.0;
    });
    await syncPage.addScriptTag({ content: await fs.readFile(path.join(ROOT, 'engine/presets/motion-explainer/anim.js'), 'utf8') });
    const harness = await syncPage.evaluate(() => {
      const tl = window.__timelines['__COMPOSITION_ID__'];
      tl.seek(1.5, false);
      const barsAt15 = Array.from(document.querySelectorAll('#s001 .me-bar-col')).map((c) => Number(getComputedStyle(c).opacity));
      tl.seek(8.0, false);
      const chAt80 = Array.from(document.querySelectorAll('#s002 .me-gate-choice')).map((c) => Number(getComputedStyle(c).opacity));
      tl.seek(9.6, false);
      const chAt96 = Array.from(document.querySelectorAll('#s002 .me-gate-choice')).map((c) => Number(getComputedStyle(c).opacity));
      tl.seek(11.6, false);
      const chAt116 = Array.from(document.querySelectorAll('#s002 .me-gate-choice')).map((c) => Number(getComputedStyle(c).opacity));
      const sfx = window.__SFX_EVENTS__.slice();
      return { barsAt15, chAt80, chAt96, chAt116, sfx };
    });
    // Beta (index 1) spoken at 0.7s must be visible at 1.5s while Alpha (index 0) spoken at 3.8s is still hidden!
    assert.ok(harness.barsAt15[1] > 0.95 && harness.barsAt15[0] < 0.05, 'unordered bars must follow actual speech order: ' + JSON.stringify(harness.barsAt15));
    // Sequential duplicate "yes" choices must pop at 0.9s (6.9), 3.1s (9.1), 5.2s (11.2)
    assert.ok(harness.chAt80[0] > 0.95 && harness.chAt80[1] < 0.05 && harness.chAt80[2] < 0.05, 'choice 0 only at +2.0s: ' + JSON.stringify(harness.chAt80));
    assert.ok(harness.chAt96[1] > 0.95 && harness.chAt96[2] < 0.05, 'choice 0 & 1 at +3.6s: ' + JSON.stringify(harness.chAt96));
    assert.ok(harness.chAt116[2] > 0.95, 'all 3 choices visible after +5.6s: ' + JSON.stringify(harness.chAt116));
    // Scene 2 transition whoosh/swipe should fire near speech onset (6.25s)
    assert.ok(harness.sfx.some((e) => e.at >= 6.0 && e.at <= 6.3 && (e.type === 'whoosh' || e.type === 'swipe')), 'transition SFX near voiceover onset: ' + JSON.stringify(harness.sfx));
    await syncPage.close();

    const page = await browser.newPage();
    await page.setContent('<div id="root" data-style="motion-explainer"></div>');
    await page.addScriptTag({ path: require.resolve('gsap/dist/gsap.min.js') });
    await page.evaluate(() => { window.__SCENES__ = []; window.__TOTAL__ = 4; });
    await page.addScriptTag({ content: await fs.readFile(path.join(ROOT, 'engine/presets/motion-explainer/sfx.js'), 'utf8') });
    await page.addScriptTag({ content: await fs.readFile(path.join(ROOT, 'engine/presets/motion-explainer/anim.js'), 'utf8') });
    const res = await page.evaluate(async () => {
      const types = ['pop', 'ding', 'chime', 'whoosh', 'swipe', 'click', 'tick', 'thud', 'alert'];
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

test('motion-explainer dedicated me_* scenes render cleanly in 9:16 portrait (1080x1920) with zero overflow or jitter', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_ME_PORTRAIT, '--title', 'Motion Portrait Check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await fs.writeFile(
    path.join(WS_ME_PORTRAIT, 'video.json'),
    JSON.stringify(motionExplainerSample(SLUG_ME_PORTRAIT, { aspect: '9:16' }), null, 2),
  );

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG_ME_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG_ME_PORTRAIT, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG_ME_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG_ME_PORTRAIT], { cwd: ROOT, stdio: 'pipe' });

  const project = JSON.parse(await fs.readFile(path.join(WS_ME_PORTRAIT, 'build/project.json'), 'utf8'));
  assert.equal(project.aspect, '9:16');
  assert.equal(project.width, 1080);
  assert.equal(project.height, 1920);

  const html = await fs.readFile(path.join(WS_ME_PORTRAIT, 'index.html'), 'utf8');
  assert.match(html, /class="is-portrait"/);
  assert.match(html, /data-style="motion-explainer"/);

  const qaReport = JSON.parse(await fs.readFile(path.join(WS_ME_PORTRAIT, 'build/qa/local/report.json'), 'utf8'));
  assert.deepEqual(qaReport.overflow, []);
  assert.deepEqual(qaReport.jitter, []);
});
