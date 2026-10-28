// Headless still-frame QA for a generated composition. Writes only under
// build/qa/local, which is already ignored by git.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'build', 'qa', 'local');
const framesDir = path.join(outDir, 'frames');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const scenes = JSON.parse(await fs.readFile(path.join(root, 'build/scenes.json'), 'utf8'));
const project = JSON.parse(await fs.readFile(path.join(root, 'build/project.json'), 'utf8'));
const compId = project.compositionId;
const width = Number(project.width) || 1920;
const height = Number(project.height) || 1080;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto('file://' + path.join(root, 'index.html').replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

// index.html has no player runtime: emulate clip visibility from data-start/duration.
const seek = async (t) => {
  await page.evaluate(({ t, compId }) => {
    window.__timelines[compId].seek(t, false);
    const clips = document.querySelectorAll('section.clip');
    clips.forEach((s) => {
      const start = Number(s.dataset.start);
      const end = start + Number(s.dataset.duration);
      s.style.visibility = t >= start - 1e-4 && t < end - 1e-4 ? 'visible' : 'hidden';
    });
  }, { t, compId });
  await page.waitForTimeout(50);
};

const audit = async (sid) => page.evaluate(({ sid, width, height }) => {
  const section = document.getElementById(sid);
  if (!section) return [{ text: 'SECTION MISSING', cls: '', box: [] }];
  const bad = [];
  const nodes = section.querySelectorAll('h1,h2,h3,h4,p,span,li,div');
  for (const el of nodes) {
    const txt = el.textContent.trim();
    if (!txt) continue;
    if (el.children.length) continue;
    if (el.closest('.ghost,.cold-ghost,.meme-ghost,.st-ghost,.amb')) continue;
    // Intentional overflow is marked in the markup. Skip those subtrees, but keep
    // auditing the scene body: `.sc-in` is marked because the container may
    // overflow, not so text inside it can be clipped.
    const exempt = el.closest('[data-layout-allow-overflow],[data-layout-ignore]');
    if (exempt && !exempt.classList.contains('sc-in')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.left < -2 || r.top < -2 || r.right > width + 2 || r.bottom > height + 2) {
      bad.push({ text: txt.slice(0, 60), cls: el.className.toString().slice(0, 40), box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
    }
  }
  return bad;
}, { sid, width, height });

const report = { overflow: [], jitter: [], shots: [] };
let n = 0;
const capture = async (t, label) => {
  await seek(t);
  const file = `${String(n++).padStart(3, '0')}_${label}.png`;
  await page.screenshot({ path: path.join(framesDir, file) });
  report.shots.push({ t, file });
};

// Word reveals land on sub-pixel offsets, so a 1px shift is rounding, not jitter.
const within = (a, b) => Math.abs(a - b) <= 2;
const stable = (a, b) => a.length === b.length && a.every((row, i) =>
  row[0] === b[i][0] && row.slice(1).every((value, k) => within(value, b[i][k + 1])));

await capture(0, 'first');
for (const s of scenes) {
  const mid = s.start + Math.min(1.0, (s.end - s.start) * 0.5);
  await seek(mid);
  const bad = await audit(s.id);
  if (bad.length) report.overflow.push({ scene: s.id, t: mid, bad });
  await capture(mid, `cut_${s.id}_${s.type}`);

  const t2 = Math.max(s.start + 0.2, s.end - 0.5);
  await seek(t2);
  const boxesAt = async () => page.evaluate((sid) => {
    const els = document.querySelectorAll(`#${sid} h1,#${sid} h2,#${sid} .st-sub,#${sid} .code-sub,#${sid} .web-foot-sub,#${sid} .cmp-cap`);
    return Array.from(els).map(e => { const r = e.getBoundingClientRect(); return [e.className, r.x, r.y, r.width, r.height].map(v => typeof v === 'number' ? Math.round(v * 100) / 100 : v); });
  }, s.id);
  const a = await boxesAt();
  await seek(t2 + 33 / 1000);
  const b = await boxesAt();
  if (!stable(a, b)) report.jitter.push({ scene: s.id, t: t2, a, b });
}
await capture(scenes[scenes.length - 1].end - 0.05, 'last');

await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
console.log('overflow scenes:', report.overflow.length, 'jitter scenes:', report.jitter.length, 'shots:', report.shots.length);
await browser.close();
