import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const scenesTiming = JSON.parse(fs.readFileSync(path.join(root, 'build/qa/scenes_timing.json'), 'utf8'));
const project = JSON.parse(fs.readFileSync(path.join(root, 'build/project.json'), 'utf8'));

const compId = project.compositionId || 'main';
const compWidth = Number(project.width) || 1080;
const compHeight = Number(project.height) || 1920;

console.log(`Capturing settled frames for ${scenesTiming.length} scenes in ${compWidth}x${compHeight}...`);

const outDir = path.join(root, 'build/qa/all_scenes_portrait');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: compWidth, height: compHeight } });

await page.goto('file://' + path.join(root, 'index.html').replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

for (const s of scenesTiming) {
  const t = s.mid;
  await page.evaluate(({ t, compId }) => {
    if (window.__timelines && window.__timelines[compId]) {
      window.__timelines[compId].seek(t, false);
    }
    const clips = document.querySelectorAll('section.clip');
    clips.forEach((sec) => {
      const start = Number(sec.dataset.start);
      const end = start + Number(sec.dataset.duration);
      sec.style.visibility = t >= start - 1e-4 && t < end - 1e-4 ? 'visible' : 'hidden';
    });
  }, { t, compId });

  await page.waitForTimeout(100);
  const outPath = path.join(outDir, `${s.id}_${s.type}.png`);
  await page.screenshot({ path: outPath });
  console.log(`Saved ${s.id}_${s.type}.png at t=${t.toFixed(2)}s`);
}

await browser.close();
console.log('All frames captured successfully.');
