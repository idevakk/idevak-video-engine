import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
let browser, dir, html;

const compactScenes = [
  {
    type: 'code',
    headline: 'Token-efficient code excerpt',
    meta: {
      file: 'cache.c',
      lines: [
        'int len = req->content_length;',
        { t: 'memcpy(buf, req->body, len);', k: 'hot', key: true }
      ]
    }
  },
  {
    type: 'diff',
    headline: 'Token-efficient diff patch',
    meta: {
      file: 'fix.patch',
      lines: [
        '- old_insecure_call(req);',
        '+ new_validated_call(req);'
      ]
    }
  },
  {
    type: 'flow',
    headline: 'Token-efficient flow nodes',
    meta: {
      nodes: ['AUTH', 'VALIDATE', 'COMMIT']
    }
  },
  {
    type: 'cloud',
    headline: 'Token-efficient cloud topology',
    meta: {
      nodes: [
        { k: 'EDGE', t: 'Cloudflare', icon: '⚡', s: '200 OK' },
        { k: 'GATEWAY', t: 'HTTP API', icon: '🚪', s: 'HEALTHY' }
      ]
    }
  },
  {
    type: 'statement',
    headline: 'Mascot overlay without redundant emotion text',
    mascot: {
      expression: 'happy',
      bubble: 'Everything works!'
    }
  },
  {
    type: 'mascot',
    headline: 'Dedicated mascot scene without emotion text badge',
    meta: {
      expression: 'happy',
      bubble: 'Core architecture confirmed'
    }
  }
].map((s, i) => ({
  id: `s${String(i + 1).padStart(3, '0')}`,
  start: i * 5,
  end: (i + 1) * 5,
  accent: '#38bdf8',
  eyebrow: 'COMPACT TOKEN SPEC',
  narration: s.headline,
  ...s
}));

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'engine-token-'));
  await cp(path.join(root, 'engine'), path.join(dir, 'engine'), { recursive: true });
  await symlink(path.join(root, 'assets'), path.join(dir, 'assets'), 'junction');
  await symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  await mkdir(path.join(dir, 'build'));
  await writeFile(path.join(dir, 'build/project.json'), JSON.stringify({ title: 'Token test', compositionId: 'token-test', width: 1920, height: 1080, fps: 30 }));
  await writeFile(path.join(dir, 'build/scenes.json'), JSON.stringify(compactScenes));
  execFileSync(process.execPath, [path.join(dir, 'engine/build.mjs')]);
  html = (await readFile(path.join(dir, 'index.html'), 'utf8')).replace(/<audio[^>]*><\/audio>/g, '');
  await writeFile(path.join(dir, 'index.html'), html);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});

test('compact string lines and short keys render correctly in code, diff, flow, and cloud', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dir, 'index.html'));

  // 1. Check code lines
  const codeLines = await page.$$eval('#s001 .cl', els => els.map(e => ({
    text: e.querySelector('.cl-c')?.textContent,
    isKey: e.classList.contains('is-key'),
    isHot: e.classList.contains('cl-hot')
  })));
  assert.equal(codeLines.length, 2);
  assert.equal(codeLines[0].text, 'int len = req->content_length;');
  assert.equal(codeLines[1].isKey, true);
  assert.equal(codeLines[1].isHot, true);

  // 2. Check diff lines
  const diffLines = await page.$$eval('#s002 .df-line', els => els.map(e => ({
    sig: e.querySelector('.df-sig')?.textContent,
    text: e.querySelector('.df-t')?.textContent,
    isAdd: e.classList.contains('df-add'),
    isDel: e.classList.contains('df-del')
  })));
  assert.equal(diffLines.length, 2);
  assert.equal(diffLines[0].sig, '-');
  assert.equal(diffLines[0].isDel, true);
  assert.equal(diffLines[1].sig, '+');
  assert.equal(diffLines[1].isAdd, true);

  // 3. Check flow nodes
  const flowNodes = await page.$$eval('#s003 .flow-node', els => els.map(e => e.querySelector('.fn-t')?.textContent));
  assert.deepEqual(flowNodes, ['AUTH', 'VALIDATE', 'COMMIT']);

  // 4. Check cloud nodes
  const cloudNodes = await page.$$eval('#s004 .cloud-node', els => els.map(e => ({
    badge: e.querySelector('.cld-badge')?.textContent,
    title: e.querySelector('.cld-title')?.textContent,
    status: e.querySelector('.cld-status')?.textContent
  })));
  assert.equal(cloudNodes.length, 2);
  assert.equal(cloudNodes[0].badge, 'EDGE');
  assert.equal(cloudNodes[0].title, 'Cloudflare');
  assert.equal(cloudNodes[1].badge, 'GATEWAY');
  assert.equal(cloudNodes[1].title, 'HTTP API');

  // 5. Check mascot overlay does NOT include expression text badge
  const overlayWrapText = await page.$eval('#s005 .m-ov-avatar-wrap', el => el.textContent.trim());
  assert.equal(overlayWrapText, '', 'Avatar wrap must not render expression text');
  const overlayHasTelemetry = await page.$('#s005 .m-ov-telemetry');
  assert.equal(overlayHasTelemetry, null, 'Overlay telemetry pill must not exist');

  // 6. Check dedicated mascot scene does NOT include expression text badge
  const hudText = await page.$eval('#s006 .mascot-hud-frame', el => el.textContent);
  assert.ok(!hudText.includes('HAPPY'), 'HUD frame must not include expression text like HAPPY');
  assert.ok(!hudText.includes('HUD ONLINE'), 'HUD frame must not include HUD ONLINE // EXPR text');

  await page.close();
});
