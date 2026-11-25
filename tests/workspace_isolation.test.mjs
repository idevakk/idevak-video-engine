import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SLUG = `iso-test-${process.pid}-${Date.now()}`;
const WS_DIR = path.join(ROOT, 'workspaces', SLUG);

after(async () => {
  await fs.rm(WS_DIR, { recursive: true, force: true });
});

test('workspaces/* is gitignored while workspaces/README.md stays tracked', () => {
  const ignored = spawnSync('git', ['check-ignore', `workspaces/${SLUG}/video.json`, `workspaces/${SLUG}/notes/script.md`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(ignored.status, 0);
  assert.match(ignored.stdout, new RegExp(`workspaces/${SLUG}/video\\.json`));

  const readmeIgnored = spawnSync('git', ['check-ignore', 'workspaces/README.md'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.notEqual(readmeIgnored.status, 0, 'workspaces/README.md must remain unignored');
});

test('isolated workspace scaffolds, validates, aligns, builds, and runs QA without touching template root', async () => {
  const starterBefore = await fs.readFile(path.join(ROOT, 'content/video.json'), 'utf8');
  const rootBuildExisted = fsSync.existsSync(path.join(ROOT, 'build'));
  const rootIndexExisted = fsSync.existsSync(path.join(ROOT, 'index.html'));
  const rootHfExisted = fsSync.existsSync(path.join(ROOT, 'hyperframes.json'));

  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG, '--title', 'Isolation Test'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'video.json')));
  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'notes/README.md')));
  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'assets/SOURCES.md')));

  // Reference both a workspace-local asset and a shared template mascot asset.
  await fs.writeFile(
    path.join(WS_DIR, 'assets/custom.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  );
  const video = JSON.parse(await fs.readFile(path.join(WS_DIR, 'video.json'), 'utf8'));
  assert.equal(video.slug, SLUG);
  assert.equal(video.compositionId, SLUG);
  assert.equal(video.audio, 'voiceover.wav');
  video.scenes = [
    {
      id: 's001',
      type: 'cold',
      act: video.acts[0].id,
      eyebrow: 'ISOLATION',
      headline: 'Workspace stays clean',
      narration: 'Every project file stays inside the isolated workspace folder.',
      meta: { chips: ['ISOLATED', 'GITIGNORED'], ghost: 'CLEAN' },
    },
    {
      id: 's002',
      type: 'hero',
      act: video.acts[0].id,
      eyebrow: 'ASSETS',
      headline: 'Local and shared assets resolve',
      narration: 'Local screenshots and shared mascot frames load inside the workspace.',
      meta: { image: 'assets/custom.png', label: 'LOCAL PNG', caption: 'Workspace-local image' },
    },
    {
      id: 's003',
      type: 'outro',
      act: video.acts[0].id,
      eyebrow: 'DONE',
      headline: 'Template untouched',
      narration: 'The template root remains clean and unaffected.',
      meta: { channel: '@iDevak', cta: 'Subscribe', ghost: 'TEMPLATE' },
    },
  ];
  await fs.writeFile(path.join(WS_DIR, 'video.json'), JSON.stringify(video, null, 2));

  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG, '--draft'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG], { cwd: ROOT, stdio: 'pipe' });

  const builtHtml = await fs.readFile(path.join(WS_DIR, 'index.html'), 'utf8');
  assert.match(builtHtml, /url\(build\/fonts\/inter-0\.woff2\)/);
  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'build/fonts/inter-0.woff2')));
  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'build/sfx_track.wav')));
  assert.ok(fsSync.existsSync(path.join(WS_DIR, 'hyperframes.json')));

  const qaReport = JSON.parse(await fs.readFile(path.join(WS_DIR, 'build/qa/local/report.json'), 'utf8'));
  assert.equal(qaReport.overflow.length, 0);
  assert.equal(qaReport.jitter.length, 0);
  assert.ok(qaReport.shots.length >= 3);

  // Verify template root was completely untouched.
  assert.equal(await fs.readFile(path.join(ROOT, 'content/video.json'), 'utf8'), starterBefore);
  assert.equal(fsSync.existsSync(path.join(ROOT, 'build')), rootBuildExisted);
  assert.equal(fsSync.existsSync(path.join(ROOT, 'index.html')), rootIndexExisted);
  assert.equal(fsSync.existsSync(path.join(ROOT, 'hyperframes.json')), rootHfExisted);
});

test('workspaces work with custom directory outside repo too', async () => {
  const extDir = await fs.mkdtemp(path.join(os.tmpdir(), 'idevak-ext-ws-'));
  try {
    await fs.writeFile(path.join(extDir, 'video.json'), JSON.stringify({
      title: 'External Workspace',
      slug: 'ext-ws',
      compositionId: 'ext-ws',
      audio: 'voiceover.wav',
      channel: '@iDevak',
      ghost: 'EXT',
      acts: [{ id: 'act-1', name: 'ACT ONE', accent: '#38bdf8' }],
      scenes: [
        {
          id: 's001',
          type: 'cold',
          act: 'act-1',
          eyebrow: 'EXTERNAL',
          headline: 'External workspace path',
          narration: 'Running in a directory outside the repository.',
          meta: { chips: ['EXT'], ghost: 'EXT' },
        },
        {
          id: 's002',
          type: 'outro',
          act: 'act-1',
          eyebrow: 'END',
          headline: 'All artifacts stay external',
          narration: 'Build outputs stay in the external folder.',
          meta: { channel: '@iDevak', cta: 'Subscribe', ghost: 'END' },
        },
      ],
    }, null, 2));

    execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', extDir], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', extDir, '--draft'], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', extDir], { cwd: ROOT, stdio: 'pipe' });

    assert.ok(fsSync.existsSync(path.join(extDir, 'index.html')));
    assert.ok(fsSync.existsSync(path.join(extDir, 'build/sfx_track.wav')));
  } finally {
    await fs.rm(extDir, { recursive: true, force: true });
  }
});
