import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { mixSFX } from '../engine/audio.mjs';

const require = createRequire(import.meta.url);

test('offline synthesis covers every sound and is repeatable without browser playback', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="bg-bloom"></div>');
    await page.addScriptTag({ path: require.resolve('gsap/dist/gsap.min.js') });
    await page.evaluate(() => { window.__SCENES__ = []; window.__TOTAL__ = 6; });
    await page.addScriptTag({ content: await fs.readFile(new URL('../engine/anim.js', import.meta.url), 'utf8') });
    const result = await page.evaluate(async () => {
      const types = ['whoosh', 'thud', 'click', 'chime', 'swipe', 'unmask', 'flare', 'decrypt', 'tick'];
      window.__SFX_EVENTS__.push(...types.map((type, i) => ({ type, at: i / 2, vol: 1 })));
      const a = await window.__synthesizeSFX();
      const b = await window.__synthesizeSFX();
      return types.map(type => ({
        type,
        energy: a.clips[type].reduce((sum, v) => sum + v * v, 0),
        deterministic: a.clips[type].every((v, i) => v === b.clips[type][i]),
      }));
    });
    for (const sound of result) {
      assert.ok(sound.energy > 0.001, JSON.stringify(sound));
      assert.ok(sound.deterministic, sound.type);
    }
  } finally { await browser.close(); }
});

test('SFX track retains late cues beyond 64 events, silence, volume and full duration', () => {
  const events = Array.from({ length: 80 }, (_, i) => ({ type: 'click', at: i, vol: i === 79 ? 0.5 : 1 }));
  const wav = mixSFX(events, { click: [0.2, -0.2] }, 81, 100);
  assert.equal(wav.readUInt32LE(40), 8100 * 2);
  assert.equal(wav.readInt16LE(44 + 7900 * 2), Math.round(0.1 * 32767));
  assert.equal(wav.readInt16LE(44 + 7850 * 2), 0);
  assert.equal(wav.readInt16LE(wav.length - 2), 0);
  assert.deepEqual(mixSFX(events, { click: [0.2, -0.2] }, 81, 100), wav);
});

test('overlapping effects retain headroom and end-of-video tails are trimmed', () => {
  const wav = mixSFX([
    { type: 'thud', at: 0, vol: 5 }, { type: 'thud', at: 0, vol: 5 },
    { type: 'thud', at: 0.99, vol: 1 },
  ], { thud: [0.5, 0.5, 0.5] }, 1, 100);
  assert.equal(wav.length, 244);
  assert.ok(wav.readInt16LE(44) <= Math.ceil(0.8 * 32767));
  assert.ok(wav.readInt16LE(wav.length - 2) > 0);
});
