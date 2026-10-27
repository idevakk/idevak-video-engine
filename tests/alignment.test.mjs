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

test('spoken-word boundaries retain the previous sentence and align split compound tokens', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-sync-'));
  try {
    const project = path.join(dir, 'video.json');
    const transcript = path.join(dir, 'vo.json');
    const output = path.join(dir, 'build');
    const words = [
      ['Inspect',.1,.4],['the',.4,.6],['panel.',.6,1],
      ['claude',1.02,1.2],['-code',1.2,1.4],['-deepseq',1.4,1.6],['-v4',1.6,1.8],['.1flash',1.8,2],['runs',2,2.2],['here.',2.2,2.4],
      ['Read',2.42,2.6],['all',2.6,2.8],['logs.',2.8,3.2]
    ].map(([w,s,e])=>({w,s,e,p:1}));
    await fs.writeFile(project, JSON.stringify({scenes:[
      {type:'cold',headline:'Inspect',narration:'Inspect the panel.'},
      {type:'hero',headline:'One harness',narration:'claude-code-deepseq-v4.1flash runs here.'},
      {type:'outro',headline:'Read',narration:'Read all logs.',meta:{revealOn:'all logs'}}
    ]}));
    await fs.writeFile(transcript,JSON.stringify({duration:3.6,segments:[{words}]}));
    const python=process.platform==='win32'?'python':'python3';
    execFileSync(python,['engine/align.py',project,transcript,'--out-dir',output]);
    const scenes=JSON.parse(await fs.readFile(path.join(output,'scenes.json')));
    assert.equal(scenes[1].start,1.02,'the visual must begin with the first compound-token component');
    assert.equal(scenes[2].start,2.42,'default scene timing must not anticipate speech');
    assert.ok(scenes[1].end>=2.4,'hold the scene until its final word finishes');
    assert.deepEqual(scenes[1].wordTimings.map(w=>w.w),words.slice(3,10).map(w=>w.w));
    assert.equal(scenes[1].speechStart,1.02);
    assert.equal(scenes[1].speechEnd,2.4);
    assert.equal(scenes[2].revealTime,0.18,'a reveal cue must use the spoken phrase timestamp');
    execFileSync(python,['engine/align.py',project,transcript,'--out-dir',output,'--lead-in','0.3']);
    const anticipated=JSON.parse(await fs.readFile(path.join(output,'scenes.json')));
    assert.ok(anticipated[1].start>=1,'opt-in anticipation may use silence but never cut the previous word');
    assert.ok(anticipated[2].start>=2.4);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
