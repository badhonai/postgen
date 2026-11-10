import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT,validateSpec} from './lib.mjs';
let errors=[];let bytes=0;
// The studio lives at `studio/` inside the PostGen repo, so the checks must be
// scoped to this directory instead of assuming it is the repository root.
// `git ls-files` resolves pathspecs and prints paths relative to cwd, so running
// from ROOT with `-- .` scopes the scan to the studio directory.
const files=execFileSync('git',['ls-files','-z','--','.'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=/^(local|raw|exports|reference|renders|tmp|node_modules|\.cache)\//;
const media=/\.(mp4|mov|webm|mkv|mp3|wav|m4a|flac|zip|7z|tar|gz|xz)$/i;
// The paid narration is the timing source of truth, so it is committed on purpose.
const narration=/^projects\/[a-z][a-z0-9-]*\/production\/narration\.mp3$/;
const secrets=[/github_pat_[A-Za-z0-9_]{20,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,/https:\/\/[^\s/@:]+:[^\s/@]+@github\.com/];
for(const file of files){
 const p=path.join(ROOT,file);if(!fs.existsSync(p)){errors.push('Tracked path absent from working tree; stage deletions: '+file);continue;}
 if(forbidden.test(file)||(media.test(file)&&!narration.test(file))||/(^|\/)\.env(?:\.|$)/.test(file)&&!file.endsWith('.example'))errors.push('Forbidden tracked path: '+file);
 const blob=execFileSync('git',['show',':./'+file],{cwd:ROOT});const size=blob.length;bytes+=size;if(size>1024*1024)errors.push('Tracked file exceeds 1 MiB: '+file);
 if(file.includes('/public/')&&!file.endsWith('/.gitkeep'))errors.push('Project media should stay local: '+file);
 if(file.endsWith('.png')){
  const m=/^(projects\/[a-z][a-z0-9-]*)\/(brand\/[^/]+\.png)$/.exec(file);
  if(!m||size>64*1024||!blob.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))errors.push('Unexpected/oversized binary asset: '+file);
  else{
   try{const manifest=JSON.parse(execFileSync('git',['show',':./'+m[1]+'/assets.json'],{cwd:ROOT,encoding:'utf8'}));const item=(manifest.bundled||[]).find(x=>x.source===m[2]);if(!item||!item.permission||item.sha256!==crypto.createHash('sha256').update(blob).digest('hex'))errors.push('Unverified brand PNG: '+file);}catch{errors.push('Missing staged asset manifest for '+file);}
  }
  continue;
 }
 if(file.endsWith('.woff2')){if(!file.startsWith('public/fonts/'))errors.push('Unexpected binary font: '+file);continue;}
 const text=blob.toString('utf8');if(secrets.some(r=>r.test(text)))errors.push('Potential credential: '+file);
 if(file.endsWith('.md'))for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const url=m[1].split('#')[0];if(!url||/^[a-z]+:/.test(url))continue;
  if(!fs.existsSync(path.resolve(path.dirname(p),url)))errors.push(`Broken local link in ${file}: ${url}`);
 }
}
validateSpec(JSON.parse(fs.readFileSync(path.join(ROOT,'templates/starter/project.json'),'utf8')));
for(const name of ['motion-direction','motion-choreography','frame-safe-motion','motion-sound-qa']){
 const s=fs.readFileSync(path.join(ROOT,'.agents/skills',name,'SKILL.md'),'utf8');if(!s.startsWith('---\nname: '+name+'\n'))errors.push('Skill frontmatter mismatch: '+name);
}
const deps=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).dependencies;
for(const [name,version] of Object.entries(deps))if(name.startsWith('@remotion/')&&version!==deps.remotion)errors.push('Remotion version mismatch: '+name);
console.log(`Checked ${files.length} tracked paths; ${(bytes/1024).toFixed(1)} KiB current tree. History is not scanned or rewritten.`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('No forbidden media, oversized files, known credential patterns or broken Markdown links found. Not a comprehensive security audit.');
