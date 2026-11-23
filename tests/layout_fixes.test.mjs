import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
let browser, dirLandscape, dirPortrait;

const testScenes = [
  // Scene 1: compare with NO mid/vs divider
  {
    id: 's001',
    type: 'compare',
    headline: 'Comparison without divider',
    meta: {
      left: { k: 'LEGACY', t: 'Monolithic architecture', pts: ['Single deployment', 'Shared database'] },
      right: { k: 'MODERN', t: 'Microservices architecture', pts: ['Independent scaling', 'Fault isolation'] }
    }
  },
  // Scene 2: compare WITH mid/vs divider
  {
    id: 's002',
    type: 'compare',
    headline: 'Comparison with divider',
    meta: {
      left: { k: 'ON-PREM', t: 'Hardware appliances', pts: ['Fixed capacity'] },
      right: { k: 'CLOUD', t: 'Serverless compute', pts: ['Elastic capacity'] },
      vs: 'VS'
    }
  },
  // Scene 3: hero with split evidence card and long headline
  {
    id: 's003',
    type: 'hero',
    headline: 'Zero-Day Vulnerability Discovered in Distributed Microservices Authentication',
    meta: {
      image: 'assets/mascot/neutral.png',
      label: 'EXPLOIT REPORT',
      caption: 'Detailed breakdown of the authentication bypass.'
    }
  },
  // Scene 4: matrix with long headline
  {
    id: 's004',
    type: 'matrix',
    headline: 'Microarchitectural Failure Across All Distributed GPU Infrastructure Nodes',
    meta: {
      cells: 64,
      badCount: 16,
      legendOk: 'HEALTHY',
      legendBad: 'FAILED',
      count: '64 CLUSTER GPUS / 16 FAILED'
    }
  },
  // Scene 5: hero with max-length headline (96 chars) and logos
  {
    id: 's005',
    type: 'hero',
    headline: 'Critical Microservices Authentication Vulnerability Allows Remote Code Execution In Cluster Root',
    meta: {
      logos: [
        { src: 'assets/mascot/neutral.png', name: 'Vendor A' },
        { src: 'assets/mascot/neutral.png', name: 'Vendor B' }
      ]
    }
  },
  // Scene 6: matrix with max-length headline (96 chars) and no legend or count
  {
    id: 's006',
    type: 'matrix',
    headline: 'Critical Microservices Authentication Vulnerability Allows Remote Code Execution In Cluster Root',
    meta: {
      cells: 48,
      badCount: 24
    }
  },
  // Scene 7: compare without mid and with uneven bullets
  {
    id: 's007',
    type: 'compare',
    headline: 'Extreme comparison without divider and long descriptions',
    meta: {
      left: { t: 'Asynchronous event-driven architecture with distributed queues', pts: ['High throughput', 'Decoupled services', 'Complex observability', 'Eventual consistency'] },
      right: { t: 'Synchronous REST request-response pipeline with API gateway', pts: ['Immediate consistency'] }
    }
  }
].map((s, i) => ({
  start: i * 5,
  end: (i + 1) * 5,
  accent: '#38bdf8',
  eyebrow: 'LAYOUT TEST',
  narration: s.headline,
  ...s
}));

before(async () => {
  // Build Landscape composition
  dirLandscape = await mkdtemp(path.join(tmpdir(), 'engine-layout-ls-'));
  await cp(path.join(root, 'engine'), path.join(dirLandscape, 'engine'), { recursive: true });
  await symlink(path.join(root, 'assets'), path.join(dirLandscape, 'assets'), 'junction');
  await symlink(path.join(root, 'node_modules'), path.join(dirLandscape, 'node_modules'), 'junction');
  await mkdir(path.join(dirLandscape, 'build'));
  await writeFile(path.join(dirLandscape, 'build/project.json'), JSON.stringify({ title: 'Layout Landscape', compositionId: 'layout-ls', width: 1920, height: 1080, fps: 30 }));
  await writeFile(path.join(dirLandscape, 'build/scenes.json'), JSON.stringify(testScenes));
  execFileSync(process.execPath, [path.join(dirLandscape, 'engine/build.mjs')]);
  let htmlLs = (await readFile(path.join(dirLandscape, 'index.html'), 'utf8')).replace(/<audio[^>]*><\/audio>/g, '');
  await writeFile(path.join(dirLandscape, 'index.html'), htmlLs);

  // Build Portrait composition
  dirPortrait = await mkdtemp(path.join(tmpdir(), 'engine-layout-pt-'));
  await cp(path.join(root, 'engine'), path.join(dirPortrait, 'engine'), { recursive: true });
  await symlink(path.join(root, 'assets'), path.join(dirPortrait, 'assets'), 'junction');
  await symlink(path.join(root, 'node_modules'), path.join(dirPortrait, 'node_modules'), 'junction');
  await mkdir(path.join(dirPortrait, 'build'));
  await writeFile(path.join(dirPortrait, 'build/project.json'), JSON.stringify({ title: 'Layout Portrait', compositionId: 'layout-pt', width: 1080, height: 1920, isPortrait: true, aspect: '9:16', fps: 30 }));
  await writeFile(path.join(dirPortrait, 'build/scenes.json'), JSON.stringify(testScenes));
  execFileSync(process.execPath, [path.join(dirPortrait, 'engine/build.mjs')]);
  let htmlPt = (await readFile(path.join(dirPortrait, 'index.html'), 'utf8')).replace(/<audio[^>]*><\/audio>/g, '');
  await writeFile(path.join(dirPortrait, 'index.html'), htmlPt);

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  if (dirLandscape) await rm(dirLandscape, { recursive: true, force: true });
  if (dirPortrait) await rm(dirPortrait, { recursive: true, force: true });
});

test('compare scene: right column does NOT collapse into 140px sliver when divider is omitted', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dirLandscape, 'index.html'));
  await page.evaluate(() => document.fonts.ready);

  const boxes = await page.evaluate(() => {
    window.__timelines['layout-ls'].seek(3, false);
    const s1 = document.querySelector('#s001');
    const left = s1.querySelector('.cmp-left').getBoundingClientRect();
    const right = s1.querySelector('.cmp-right').getBoundingClientRect();
    const mid = s1.querySelector('.cmp-mid');
    return {
      leftWidth: left.width,
      rightWidth: right.width,
      hasMid: Boolean(mid)
    };
  });

  assert.equal(boxes.hasMid, false, 'Divider should not be rendered when omitted');
  assert.ok(boxes.rightWidth > 700, `Right column width (${boxes.rightWidth}px) should not collapse into 140px sliver`);
  assert.ok(Math.abs(boxes.leftWidth - boxes.rightWidth) < 5, `Columns should be evenly balanced: left=${boxes.leftWidth}, right=${boxes.rightWidth}`);

  // Also check s002 (with divider)
  const boxes2 = await page.evaluate(() => {
    window.__timelines['layout-ls'].seek(7, false);
    const s2 = document.querySelector('#s002');
    const left = s2.querySelector('.cmp-left').getBoundingClientRect();
    const right = s2.querySelector('.cmp-right').getBoundingClientRect();
    const mid = s2.querySelector('.cmp-mid').getBoundingClientRect();
    return {
      leftWidth: left.width,
      rightWidth: right.width,
      midWidth: mid.width
    };
  });
  assert.ok(boxes2.midWidth > 0, 'Divider should exist when authored');
  assert.ok(boxes2.leftWidth > 600 && boxes2.rightWidth > 600, 'Columns should be well sized when divider is present');

  // Also check s007 (compare without mid and with uneven bullets)
  const boxes7 = await page.evaluate(() => {
    window.__timelines['layout-ls'].seek(32, false);
    const s7 = document.querySelector('#s007');
    const left = s7.querySelector('.cmp-left').getBoundingClientRect();
    const right = s7.querySelector('.cmp-right').getBoundingClientRect();
    return {
      leftWidth: left.width,
      rightWidth: right.width
    };
  });
  assert.ok(boxes7.rightWidth > 700, `s007 right column width (${boxes7.rightWidth}px) should not collapse`);
  assert.ok(Math.abs(boxes7.leftWidth - boxes7.rightWidth) < 5, `s007 columns balanced: left=${boxes7.leftWidth}, right=${boxes7.rightWidth}`);

  await page.close();
});

test('hero scene: headline text does not overflow horizontally across split evidence cards', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dirLandscape, 'index.html'));
  await page.evaluate(() => document.fonts.ready);

  const heroLayout = await page.evaluate(() => {
    const s3 = document.querySelector('#s003');
    const left = s3.querySelector('.hero-left').getBoundingClientRect();
    const title = s3.querySelector('.hero-title').getBoundingClientRect();
    const right = s3.querySelector('.hero-right').getBoundingClientRect();
    const evidence = s3.querySelector('.evidence-frame').getBoundingClientRect();

    const s5 = document.querySelector('#s005');
    const left5 = s5.querySelector('.hero-left').getBoundingClientRect();
    const title5 = s5.querySelector('.hero-title').getBoundingClientRect();
    const right5 = s5.querySelector('.hero-right').getBoundingClientRect();
    const brandGrid = s5.querySelector('.brand-grid').getBoundingClientRect();

    return {
      s3: {
        leftWidth: left.width,
        titleWidth: title.width,
        titleRight: title.right,
        rightLeft: right.left,
        evidenceLeft: evidence.left
      },
      s5: {
        leftWidth: left5.width,
        titleWidth: title5.width,
        titleRight: title5.right,
        rightLeft: right5.left,
        brandLeft: brandGrid.left
      }
    };
  });

  assert.ok(heroLayout.s3.titleWidth <= 641, `Hero title width (${heroLayout.s3.titleWidth}px) must not exceed 640px column`);
  assert.ok(heroLayout.s3.titleRight <= heroLayout.s3.rightLeft + 1, `Hero title right (${heroLayout.s3.titleRight}px) must not overflow into right column (${heroLayout.s3.rightLeft}px)`);
  assert.ok(heroLayout.s3.titleRight <= heroLayout.s3.evidenceLeft + 1, `Hero title right (${heroLayout.s3.titleRight}px) must not collide with evidence frame (${heroLayout.s3.evidenceLeft}px)`);

  assert.ok(heroLayout.s5.titleWidth <= 641, `Hero s005 title width (${heroLayout.s5.titleWidth}px) must not exceed 640px column`);
  assert.ok(heroLayout.s5.titleRight <= heroLayout.s5.rightLeft + 1, `Hero s005 title right (${heroLayout.s5.titleRight}px) must not overflow into right column (${heroLayout.s5.rightLeft}px)`);
  assert.ok(heroLayout.s5.titleRight <= heroLayout.s5.brandLeft + 1, `Hero s005 title right (${heroLayout.s5.titleRight}px) must not collide with brand grid (${heroLayout.s5.brandLeft}px)`);

  await page.close();
});

test('matrix scene: headline text does not overflow into GPU status matrix cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dirLandscape, 'index.html'));
  await page.evaluate(() => document.fonts.ready);

  const matrixLayout = await page.evaluate(() => {
    const s4 = document.querySelector('#s004');
    const left = s4.querySelector('.mx-left').getBoundingClientRect();
    const title = s4.querySelector('.mx-title').getBoundingClientRect();
    const right = s4.querySelector('.mx-right').getBoundingClientRect();
    const cells = s4.querySelector('.mx-cells').getBoundingClientRect();

    const s6 = document.querySelector('#s006');
    const left6 = s6.querySelector('.mx-left').getBoundingClientRect();
    const title6 = s6.querySelector('.mx-title').getBoundingClientRect();
    const right6 = s6.querySelector('.mx-right').getBoundingClientRect();
    const cells6 = s6.querySelector('.mx-cells').getBoundingClientRect();

    return {
      s4: {
        leftWidth: left.width,
        titleWidth: title.width,
        titleRight: title.right,
        rightLeft: right.left,
        cellsLeft: cells.left
      },
      s6: {
        leftWidth: left6.width,
        titleWidth: title6.width,
        titleRight: title6.right,
        rightLeft: right6.left,
        cellsLeft: cells6.left
      }
    };
  });

  assert.ok(matrixLayout.s4.titleWidth <= 641, `Matrix title width (${matrixLayout.s4.titleWidth}px) must not exceed 640px column`);
  assert.ok(matrixLayout.s4.titleRight <= matrixLayout.s4.rightLeft + 1, `Matrix title right (${matrixLayout.s4.titleRight}px) must not overflow into right column (${matrixLayout.s4.rightLeft}px)`);
  assert.ok(matrixLayout.s4.titleRight <= matrixLayout.s4.cellsLeft + 1, `Matrix title right (${matrixLayout.s4.titleRight}px) must not collide with matrix cells (${matrixLayout.s4.cellsLeft}px)`);

  assert.ok(matrixLayout.s6.titleWidth <= 641, `Matrix s006 title width (${matrixLayout.s6.titleWidth}px) must not exceed 640px column`);
  assert.ok(matrixLayout.s6.titleRight <= matrixLayout.s6.rightLeft + 1, `Matrix s006 title right (${matrixLayout.s6.titleRight}px) must not overflow into right column (${matrixLayout.s6.rightLeft}px)`);
  assert.ok(matrixLayout.s6.titleRight <= matrixLayout.s6.cellsLeft + 1, `Matrix s006 title right (${matrixLayout.s6.titleRight}px) must not collide with matrix cells (${matrixLayout.s6.cellsLeft}px)`);

  await page.close();
});

test('9:16 aspect ratio: verify portrait layouts and 52px typography are NOT affected', async () => {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(dirPortrait, 'index.html'));
  await page.evaluate(() => document.fonts.ready);

  const portraitState = await page.evaluate(() => {
    const s1 = document.querySelector('#s001');
    const s3 = document.querySelector('#s003');
    const s4 = document.querySelector('#s004');

    const s1Stage = getComputedStyle(s1.querySelector('.cmp-stage'));
    const s1Left = s1.querySelector('.cmp-left').getBoundingClientRect();
    const s1Right = s1.querySelector('.cmp-right').getBoundingClientRect();

    const s3Grid = getComputedStyle(s3.querySelector('.hero-grid'));
    const s3Title = getComputedStyle(s3.querySelector('.hero-title'));

    const s4Grid = getComputedStyle(s4.querySelector('.mx-grid'));
    const s4Title = getComputedStyle(s4.querySelector('.mx-title'));

    return {
      cmpFlexDirection: s1Stage.flexDirection,
      cmpLeftWidth: s1Left.width,
      cmpRightWidth: s1Right.width,
      heroFlexDirection: s3Grid.flexDirection,
      heroTitleFontSize: s3Title.fontSize,
      matrixFlexDirection: s4Grid.flexDirection,
      matrixTitleFontSize: s4Title.fontSize
    };
  });

  // Verify compare stacks vertically with full width columns in portrait
  assert.equal(portraitState.cmpFlexDirection, 'column', 'Compare stage should be vertical flex column in 9:16');
  assert.ok(portraitState.cmpLeftWidth > 800, `Compare left column width in portrait (${portraitState.cmpLeftWidth}px) should be full width`);
  assert.ok(portraitState.cmpRightWidth > 800, `Compare right column width in portrait (${portraitState.cmpRightWidth}px) should be full width`);

  // Verify hero stacks vertically and retains 52px typography in portrait
  assert.equal(portraitState.heroFlexDirection, 'column', 'Hero grid should be vertical flex column in 9:16');
  assert.equal(portraitState.heroTitleFontSize, '52px', 'Hero title must strictly retain 52px baseline in 9:16');

  // Verify matrix stacks vertically and retains 52px typography in portrait
  assert.equal(portraitState.matrixFlexDirection, 'column', 'Matrix grid should be vertical flex column in 9:16');
  assert.equal(portraitState.matrixTitleFontSize, '52px', 'Matrix title must strictly retain 52px baseline in 9:16');

  await page.close();
});
