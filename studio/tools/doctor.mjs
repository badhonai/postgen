import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './lib.mjs';
let fail=0;
for(const [name,args] of [['node',['--version']],['npm',['--version']],['ffmpeg',['-version']],['ffprobe',['-version']]]){
 const r=spawnSync(name,args,{encoding:'utf8'});const ok=!r.error&&r.status===0;console.log(`${ok?'OK':'MISSING'} ${name}${ok?': '+r.stdout.split('\n')[0]:''}`);if(!ok)fail++;
}
for(const file of ['node_modules/remotion/package.json','public/fonts/Inter-600.woff2']){const ok=fs.existsSync(path.join(ROOT,file));console.log(`${ok?'OK':'MISSING'} ${file}`);if(!ok)fail++;}
console.log('Browser/OS-library readiness is established by an actual still/render, not this inventory. See docs/SETUP.md.');process.exitCode=fail?1:0;
