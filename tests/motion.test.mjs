import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
let browser, dir, html;
const scenes = [
  {type:'cold', headline:'The Quietest Release of the Year'},
  {type:'hero', headline:'Distributed systems', meta:{mark:'SYSTEMS', punch:true}},
  {type:'statement', variant:2, headline:'Stable words stay readable', wordTimings:[
    {w:'Stable',t:2,d:0.35},{w:'words',t:2.4,d:0.35},
    {w:'stay',t:2.8,d:0.35},{w:'readable',t:3.2,d:0.4}
  ]},
  {type:'stat', headline:'Measured throughput', meta:{display:'1,024', suffix:'ops', stat:{to:1024, sep:true}}},
  {type:'flow', headline:'One step at a time', meta:{nodes:[{t:'READ'},{t:'CHECK'},{t:'WRITE'}]}},
  {type:'ledger', headline:'Evidence stays still', meta:{rows:[{k:'STATUS',v:'VERIFIED'}]}},
  {type:'hero', headline:'Reveal ~~evidence~~ clearly', meta:{mark:'PROOF'}, mascot:{expression:'thinking',bubble:'Read the evidence.'}},
  {type:'outro', headline:'Keep the useful motion'}
].map((s,i)=>({id:`s${String(i+1).padStart(3,'0')}`,start:i*12,end:(i+1)*12,accent:'#38bdf8',eyebrow:'MOTION REGRESSION',subline:'Silent test fixture - not a narration-aligned project.',act:i<4?'one':'two',...s}));

before(async()=>{
  dir = await mkdtemp(path.join(tmpdir(),'engine-motion-'));
  await cp(path.join(root,'engine'), path.join(dir,'engine'), {recursive:true});
  await symlink(path.join(root,'assets'),path.join(dir,'assets'), 'junction');
  await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'), 'junction');
  await mkdir(path.join(dir,'build'));
  await writeFile(path.join(dir,'build/project.json'),JSON.stringify({title:'Motion regression',compositionId:'motion-test',width:1920,height:1080,fps:30}));
  await writeFile(path.join(dir,'build/scenes.json'),JSON.stringify(scenes));
  execFileSync(process.execPath,[path.join(dir,'engine/build.mjs')]);
  html = (await readFile(path.join(dir,'index.html'),'utf8')).replace(/<audio[^>]*><\/audio>/g,'');
  await writeFile(path.join(dir,'index.html'),html);
  if(process.env.MOTION_REVIEW_DIR) {
    await mkdir(process.env.MOTION_REVIEW_DIR,{recursive:true});
    await cp(dir,process.env.MOTION_REVIEW_DIR,{recursive:true,dereference:true});
  }
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();if(dir)await rm(dir,{recursive:true,force:true});});

async function open() {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.route('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js', route=>route.fulfill({path:require.resolve('gsap/dist/gsap.min.js'),contentType:'text/javascript'}));
  await page.goto('file://'+path.join(dir,'index.html'));
  await page.evaluate(()=>document.fonts.ready);
  return page;
}

test('camera and decorative drift have no frame-boundary snapbacks', async()=>{
 const page=await open();
 const result=await page.evaluate(()=>{
  const tl=window.__timelines['motion-test'];
  let last, maxGhostJump=0, maxCameraJump=0, minScale=2,maxScale=0;
  for(let frame=360;frame<720;frame++){
   tl.seek(frame/30,false);
   const x=gsap.getProperty('#s002 .hero-mark','x');
   const cameraX=gsap.getProperty('#s002 .sc-in','x');
   const scale=gsap.getProperty('#s002 .sc-in','scaleX');
   if(last){maxCameraJump=Math.max(maxCameraJump,Math.abs(cameraX-last.cameraX));if(frame>405)maxGhostJump=Math.max(maxGhostJump,Math.abs(x-last.x));}
   minScale=Math.min(minScale,scale);maxScale=Math.max(maxScale,scale);last={x,cameraX};
  }
  return {maxGhostJump,maxCameraJump,minScale,maxScale};
 });
 assert.ok(result.maxGhostJump<0.2,JSON.stringify(result));
 assert.equal(result.maxCameraJump,0);
 assert.ok(result.minScale>=1 && result.maxScale<=1.025);
 await page.close();
});

test('build exports the actual stat, redaction, mascot and chapter cue schedule', async()=>{
 const events=JSON.parse(await readFile(path.join(dir,'build/sfx_track.json'),'utf8'));
 assert.ok(events.some(e=>e.type==='thud' && Math.abs(e.at-36.25)<0.001));
 assert.ok(events.some(e=>e.type==='tick' && e.at>36));
 assert.ok(events.some(e=>e.type==='unmask' && e.at>=72));
 assert.ok(events.some(e=>e.type==='chime' && Math.abs(e.at-72.15)<0.001));
 assert.ok(!html.includes('https://cdn.jsdelivr.net'));
 const wav=await readFile(path.join(dir,'build/sfx_track.wav'));
 assert.equal(wav.readUInt32LE(40),96*48000*2);
 const project=JSON.parse(await readFile(path.join(dir,'build/project.json'),'utf8'));
 assert.equal(project.audio,undefined);
});

test('fresh, sequential and reverse seeks produce identical visible state',async()=>{
 const page=await open();
 const sample=async p=>p.evaluate(()=>{
  const tl=window.__timelines['motion-test'];tl.seek(12.26,false);
  return [...document.querySelectorAll('#s002 .wi, #s002 .sc-in, #s002 .hero-mark')].map(n=>({text:n.textContent,transform:getComputedStyle(n).transform,opacity:getComputedStyle(n).opacity}));
 });
 const first=await sample(page);
 await page.evaluate(()=>{const tl=window.__timelines['motion-test'];for(let f=0;f<2800;f++)tl.seek(f/30,false);});
 assert.deepEqual(await sample(page),first);
 const fresh=await open();assert.deepEqual(await sample(fresh),first);
 await fresh.close();await page.close();
});

test('data panels stay fixed after entrance and horizontal word reveals settle at zero',async()=>{
 const page=await open();
 const result=await page.evaluate(()=>{
  const tl=window.__timelines['motion-test'];const states=[];
  for(const t of [51,53,58]){tl.seek(t,false);states.push(getComputedStyle(document.querySelector('#s005 .flow-node')).transform);}
  tl.seek(29,false);return {states,x:gsap.getProperty('#s003 .wi','x')};
 });
 assert.equal(new Set(result.states).size,1);assert.equal(result.x,0);
 await page.close();
});

test('spoken word matches keep headline color and shadow stable during playback',async()=>{
 const page=await open();
 const samples=await page.evaluate(()=>{
  const tl=window.__timelines['motion-test'];
  const states=[];
  for(let frame=750;frame<=900;frame++){
   tl.seek(frame/30,false);
   states.push([...document.querySelectorAll('#s003 .wi')].map(n=>{
    const style=getComputedStyle(n);
    return {color:style.color,shadow:style.textShadow};
   }));
  }
  return states;
 });
 for(const state of samples){
  assert.deepEqual(state,samples[0],'Narration matching must not flash individual words');
  assert.ok(state.every(word=>word.shadow==='none'));
 }
 await page.close();
});

test('counter increases to the exact result without moving its unit',async()=>{
 const page=await open();
 const result=await page.evaluate(()=>{
  const tl=window.__timelines['motion-test'];let last=0;let monotonic=true;const xs=[];
  for(let f=1100;f<1180;f++){
   tl.seek(f/30,false);
   const v=Number(document.querySelector('#s004 .stat-value').textContent.replaceAll(',',''));
   monotonic &&= v>=last;last=v;
   xs.push(document.querySelector('#s004 .stat-suffix').getBoundingClientRect().x);
  }
  return {last,monotonic,unitDrift:Math.max(...xs)-Math.min(...xs)};
 });
 assert.equal(result.last,1024);assert.ok(result.monotonic);assert.ok(result.unitDrift<0.01,JSON.stringify(result));
 await page.close();
});

test('opening words retain readable gaps and remain inside the frame',async()=>{
 const page=await open();
 const result=await page.evaluate(()=>{
  window.__timelines['motion-test'].seek(0,false);
  const boxes=[...document.querySelectorAll('#s001 .wi')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
  return boxes;
 });
 for(let i=0;i<result.length;i++){
  assert.ok(result[i].x>=0 && result[i].right<=1920 && result[i].bottom<=1080);
  if(i && Math.abs(result[i].y-result[i-1].y)<2)assert.ok(result[i].x-result[i-1].right>=12,JSON.stringify(result));
 }
 await page.close();
});

test('redaction and flare state is repeatable across fresh and reverse seeks',async()=>{
 const a=await open(), b=await open();
 const sample=async page=>page.evaluate(()=>{
  window.__timelines['motion-test'].seek(73.05,false);
  return ['#s007 .redact-text','#s007 .redact-tape','#s007 .redact-laser','.flare-core'].map(sel=>{
   const n=document.querySelector(sel), s=getComputedStyle(n);return [s.opacity,s.transform,s.filter];
  });
 });
 const first=await sample(a);
 await a.evaluate(()=>{window.__timelines['motion-test'].seek(95,false);});
 assert.deepEqual(await sample(a),first);assert.deepEqual(await sample(b),first);
 await a.close();await b.close();
});

test('long decorative hero words fit on one line',async()=>{
 const page=await open();
 const bounds=await page.evaluate(()=>{
  window.__timelines['motion-test'].seek(18,false);
  const n=document.querySelector('#s002 .hero-mark');
  const r=n.getBoundingClientRect();
  return {width:r.width,height:r.height,lineHeight:parseFloat(getComputedStyle(n).lineHeight)};
 });
 assert.ok(bounds.width<=432,JSON.stringify(bounds));
 assert.ok(bounds.height<bounds.lineHeight*1.1,JSON.stringify(bounds));
 await page.close();
});
