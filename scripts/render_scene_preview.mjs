import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
function getArg(key, def) {
  const idx = args.indexOf(key);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return def;
}

const fromSceneId = getArg('--from', '');
const toSceneId = getArg('--to', '');
const scenesArg = getArg('--scenes', '');
const sceneId = getArg('--scene', 's002');

const root = process.cwd();
const scenes = JSON.parse(await fs.readFile(path.join(root, 'build/scenes.json'), 'utf8'));
const project = JSON.parse(await fs.readFile(path.join(root, 'build/project.json'), 'utf8'));
const compId = project.compositionId;

let startTime;
let targetDuration;
let outLabel = sceneId;

if (fromSceneId && toSceneId) {
  const fromScene = scenes.find((s) => s.id === fromSceneId) || scenes[0];
  const toScene = scenes.find((s) => s.id === toSceneId) || scenes[scenes.length - 1];
  startTime = fromScene.start;
  const durationArg = getArg('--duration', '');
  targetDuration = durationArg ? Number(durationArg) : (toScene.end - fromScene.start);
  outLabel = `${fromSceneId}_to_${toSceneId}`;
} else if (scenesArg) {
  const ids = scenesArg.split(',').map(s => s.trim());
  const firstScene = scenes.find(s => s.id === ids[0]) || scenes[0];
  const lastScene = scenes.find(s => s.id === ids[ids.length - 1]) || firstScene;
  startTime = firstScene.start;
  const durationArg = getArg('--duration', '');
  targetDuration = durationArg ? Number(durationArg) : (lastScene.end - firstScene.start);
  outLabel = `${ids[0]}_to_${ids[ids.length - 1]}`;
} else {
  const targetScene = scenes.find((s) => s.id === sceneId) || scenes[0];
  startTime = targetScene.start;
  targetDuration = Number(getArg('--duration', '5.0'));
}

const outFileName = getArg('--output', `build/${outLabel}_preview.mp4`);
const framesDir = path.join(root, 'build', `${outLabel}_frames`);
await fs.rm(framesDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const fps = 30;
const totalFrames = Math.round(targetDuration * fps);

console.log(`Rendering scenes [${outLabel}]: start=${startTime.toFixed(2)}s, duration=${targetDuration.toFixed(2)}s (${totalFrames} frames)`);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.join(root, 'index.html').replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

for (let i = 0; i < totalFrames; i++) {
  const t = startTime + (i / fps);
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
  const framePath = path.join(framesDir, `frame_${frameNum}.jpg`);
  await page.screenshot({ path: framePath, type: 'jpeg', quality: 95 });
  if (i % 60 === 0 || i === totalFrames - 1) {
    console.log(`Rendered frame ${i}/${totalFrames} (time ${(startTime + i / fps).toFixed(2)}s)`);
  }
}

await browser.close();
console.log('Frames captured. Encoding MP4 with FFmpeg...');

const outMp4 = path.isAbsolute(outFileName) ? outFileName : path.join(root, outFileName);
const sfxPath = path.join(root, 'build', 'sfx_track.wav');
const inputPattern = path.join(framesDir, 'frame_%04d.jpg').replace(/\\/g, '/');

const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -ss ${startTime.toFixed(3)} -t ${targetDuration} -i "${sfxPath.replace(/\\/g, '/')}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${outMp4.replace(/\\/g, '/')}"`;

execSync(ffmpegCmd, { stdio: 'inherit' });
await fs.rm(framesDir, { recursive: true, force: true });
console.log(`Success! Video rendered to: ${outMp4}`);
