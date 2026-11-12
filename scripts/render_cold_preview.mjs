import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const framesDir = path.join(root, 'build', 'cold_frames');
await fs.rm(framesDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const project = JSON.parse(await fs.readFile(path.join(root, 'build/project.json'), 'utf8'));
const compId = project.compositionId;
const fps = 30;
const totalDuration = 5.0; // 5 seconds
const totalFrames = Math.round(totalDuration * fps);

console.log(`Rendering ${totalFrames} frames for cold scene preview...`);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.join(root, 'index.html').replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

for (let i = 0; i < totalFrames; i++) {
  const t = i / fps;
  await page.evaluate(({ t, compId }) => {
    window.__timelines[compId].seek(t, false);
    const clips = document.querySelectorAll('section.clip');
    clips.forEach((s) => {
      const start = Number(s.dataset.start);
      const end = start + Number(s.dataset.duration);
      s.style.visibility = t >= start - 1e-4 && t < end - 1e-4 ? 'visible' : 'hidden';
    });
  }, { t, compId });

  const frameNum = String(i).padStart(4, '0');
  const framePath = path.join(framesDir, `frame_${frameNum}.png`);
  await page.screenshot({ path: framePath });
  if (i % 30 === 0) {
    console.log(`Rendered frame ${i}/${totalFrames} (${(i / fps).toFixed(1)}s)`);
  }
}

await browser.close();
console.log('Frames captured. Encoding MP4 with FFmpeg...');

const outMp4 = path.join(root, 'build', 'cold_preview.mp4');
const sfxPath = path.join(root, 'build', 'sfx_track.wav');
const inputPattern = path.join(framesDir, 'frame_%04d.png').replace(/\\/g, '/');

const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -ss 0 -t ${totalDuration} -i "${sfxPath.replace(/\\/g, '/')}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${outMp4.replace(/\\/g, '/')}"`;

execSync(ffmpegCmd, { stdio: 'inherit' });
console.log(`Success! Video rendered to: ${outMp4}`);
