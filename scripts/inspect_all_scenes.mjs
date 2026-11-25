import fs from 'fs';
import path from 'path';
import { ENGINE_ROOT, popProjectArg, resolveProjectDir } from '../engine/workspace.mjs';

const { project: projectArg } = popProjectArg();
const root = resolveProjectDir(projectArg, { engineRoot: ENGINE_ROOT });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const regex = /<section id="([^"]+)" class="[^"]*sc-([a-z0-9_-]+)[^"]*"\s+data-start="([^"]+)"\s+data-duration="([^"]+)"/g;
let match;
const scenes = [];
while ((match = regex.exec(html)) !== null) {
  const start = parseFloat(match[3]);
  const dur = parseFloat(match[4]);
  scenes.push({
    id: match[1],
    type: match[2],
    start: start,
    duration: dur,
    mid: start + dur * 0.70
  });
}

console.log(`Found ${scenes.length} scenes in index.html:`);
for (const s of scenes) {
  console.log(`${s.id.padEnd(6)} | type: ${s.type.padEnd(12)} | start: ${s.start.toFixed(2).padStart(6)}s | mid: ${s.mid.toFixed(2).padStart(6)}s | dur: ${s.duration.toFixed(2).padStart(5)}s`);
}

fs.mkdirSync(path.join(root, 'build/qa'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/qa/scenes_timing.json'), JSON.stringify(scenes, null, 2));
