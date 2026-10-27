import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('alignment preserves chapters and requires an explicit draft without a transcript', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-align-'));
  try {
    const project = path.join(dir, 'video.json');
    await fs.writeFile(project, JSON.stringify({
      acts: [{ id: 'one' }, { id: 'two' }],
      scenes: [
        { type: 'cold', act: 'one', headline: 'First', narration: 'First chapter with the original narration.' },
        { type: 'outro', act: 'two', headline: 'Second', narration: 'Second chapter with the original narration.' },
      ],
    }));
    const args = ['engine/align.py', project, path.join(dir, 'missing.json'), '--out-dir', path.join(dir, 'build')];
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const failed = spawnSync(python, args, { encoding: 'utf8' });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /missing file/);
    execFileSync(python, [...args, '--draft']);
    const scenes = JSON.parse(await fs.readFile(path.join(dir, 'build/scenes.json')));
    assert.deepEqual(scenes.map(s => s.act), ['one', 'two']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
