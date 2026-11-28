import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {
  generateThumbnail,
  renderThumbnailHtml,
  resolveThumbnailDimensions,
  tokenizeTitle,
} from '../scripts/generate_thumbnail.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SLUG_16_9 = `_test-thumb-16-9-${process.pid}`;
const SLUG_9_16 = `_test-thumb-9-16-${process.pid}`;
const WS_16_9 = path.join(ROOT, 'workspaces', SLUG_16_9);
const WS_9_16 = path.join(ROOT, 'workspaces', SLUG_9_16);

function readPngDimensions(buf) {
  // PNG signature (8 bytes) + IHDR length (4) + "IHDR" (4) + width (4 BE) + height (4 BE)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'valid PNG header');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

after(async () => {
  await fs.rm(WS_16_9, { recursive: true, force: true });
  await fs.rm(WS_9_16, { recursive: true, force: true });
});

test('resolveThumbnailDimensions inherits video.json aspect ratio unless overridden', () => {
  assert.deepEqual(resolveThumbnailDimensions({}), { aspect: '16:9', width: 1280, height: 720 });
  assert.deepEqual(resolveThumbnailDimensions({ aspect: '9:16' }), { aspect: '9:16', width: 1080, height: 1920 });
  assert.deepEqual(
    resolveThumbnailDimensions({ composition: { width: 1080, height: 1920 } }),
    { aspect: '9:16', width: 1080, height: 1920 }
  );
  assert.deepEqual(
    resolveThumbnailDimensions({ aspect: '9:16' }, { aspect: '16:9' }),
    { aspect: '16:9', width: 1280, height: 720 }
  );
});

test('tokenizeTitle parses strikethroughs and accents cleanly', () => {
  const tokens = tokenizeTitle('32GB > ~~128GB~~', 'lime');
  assert.equal(tokens[0].text, '32GB');
  assert.equal(tokens[0].color, 'accent');
  assert.equal(tokens[1].text, '>');
  assert.equal(tokens[2].text, '128GB');
  assert.equal(tokens[2].strike, true);
  assert.equal(tokens[2].color, 'muted');
});

test('generates isolated 16:9 A/B variants sequentially and 9:16 portrait thumbnails', async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_16_9, '--title', 'Title A Test'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  assert.ok(fsSync.existsSync(path.join(WS_16_9, 'thumbnails')), 'project:new creates thumbnails/ directory');

  // Place a crisp local SVG logo AND a white-only dark-mode SVG logo inside the workspace
  await fs.writeFile(
    path.join(WS_16_9, 'assets/logos/demo-core.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="#16a34a"/><path d="M32 52 L46 66 L70 36" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg>',
    'utf8'
  );
  await fs.writeFile(
    path.join(WS_16_9, 'assets/logos/white-mono.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="white"/></svg>',
    'utf8'
  );
  const htmlWithMono = await renderThumbnailHtml(
    {
      title: 'WHITE MONO TEST',
      left: { kind: 'cube', logo: 'white-mono', label: 'WHITE MONO' },
      right: { kind: 'cube', logo: 'demo-core', label: 'COLORED', state: 'loser' },
    },
    WS_16_9
  );
  assert.match(htmlWithMono, /brightness\(0\)/, 'white monochrome SVG auto-darkened for white squircle badge');

  // Variant A
  const resA = await generateThumbnail({
    project: SLUG_16_9,
    variant: 'a',
    title: '65B BEATS ~~501B~~',
    subline: 'ON 16GB VRAM',
    archetype: 'versus',
    accent: 'lime',
    leftBrand: 'demo-core',
    leftLabel: 'DEMO 65B',
    leftBadge: '78 TOK/S',
    rightLabel: 'LEGACY 501B',
    rightBadge: '12 TOK/S',
  });
  assert.equal(resA.aspect, '16:9');
  assert.equal(resA.width, 1280);
  assert.equal(resA.height, 720);
  const pngA = readPngDimensions(await fs.readFile(resA.outputPath));
  assert.deepEqual(pngA, { width: 1280, height: 720 });

  // Variant B (distinct title and layout, must not overwrite Variant A)
  const resB = await generateThumbnail({
    project: SLUG_16_9,
    variant: 'b',
    title: 'STOP PAYING FOR APIS',
    archetype: 'showcase',
    accent: 'red',
    leftBrand: 'demo-core',
    leftLabel: 'LOCAL MODEL',
    leftBadge: 'FREE',
    rightProp: 'padlock',
    rightLabel: 'NO CLOUD',
  });
  assert.equal(resB.variant, 'b');
  assert.ok(fsSync.existsSync(resA.outputPath), 'Variant A PNG preserved');
  assert.ok(fsSync.existsSync(resB.outputPath), 'Variant B PNG created');

  const manifest = JSON.parse(await fs.readFile(resB.manifestPath, 'utf8'));
  assert.equal(manifest.variants.a.title, '65B BEATS ~~501B~~');
  assert.equal(manifest.variants.b.title, 'STOP PAYING FOR APIS');
  assert.notEqual(manifest.variants.a.output, manifest.variants.b.output);

  // 9:16 portrait workspace inherits 1080x1920 automatically
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG_9_16, '--aspect', '9:16', '--title', 'LOCAL != SAFE'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  const resPort = await generateThumbnail({
    project: SLUG_9_16,
    variant: 'a',
    title: 'LOCAL ≠ SAFE',
    archetype: 'showcase',
    accent: 'red',
    rightProp: 'padlock',
  });
  assert.equal(resPort.aspect, '9:16');
  assert.equal(resPort.width, 1080);
  assert.equal(resPort.height, 1920);
  const pngPort = readPngDimensions(await fs.readFile(resPort.outputPath));
  assert.deepEqual(pngPort, { width: 1080, height: 1920 });
});
