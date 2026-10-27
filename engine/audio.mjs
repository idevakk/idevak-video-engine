// Bake the animation's own cue schedule into a framework-owned audio track.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

export function mixSFX(events, clips, duration, sampleRate = 48000) {
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  for (const { type, at, vol } of events) {
    const clip = clips[type];
    if (!clip) throw new Error(`Unknown SFX type: ${type}`);
    const start = Math.round(at * sampleRate);
    for (let i = 0; i < clip.length && start + i < samples.length; i++) {
      if (start + i >= 0) samples[start + i] += clip[i] * vol;
    }
  }
  // Preserve relative levels while leaving headroom for overlapping effects.
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0.8 ? 0.8 / peak : 1;
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    wav.writeInt16LE(Math.round(samples[i] * gain * 32767), 44 + i * 2);
  }
  return wav;
}

export async function bakeSFX(html, duration, output) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Fonts and media are unnecessary to construct the animation's cue schedule.
    await page.route('**/*', route => route.abort());
    await page.setContent(html, { waitUntil: 'load' });
    if (errors.length) throw new Error(errors.join('\n'));
    const { events, clips } = await page.evaluate(() => window.__synthesizeSFX());
    await fs.writeFile(output, mixSFX(events, clips, duration));
    await fs.writeFile(output.replace(/\.wav$/, '.json'), JSON.stringify(events, null, 2) + '\n');
    console.log(`[sfx] Baked ${events.length} cues into ${duration.toFixed(1)}s of audio`);
  } finally {
    await browser.close();
  }
}
