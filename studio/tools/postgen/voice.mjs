#!/usr/bin/env node
/**
 * Fetch narration from PostGen for a project and save it into the local project.
 *
 *   POSTGEN_API_KEY=… node tools/postgen/voice.mjs <project-slug> --postgen-project=<uuid> \
 *       [--script=path] [--voice=<elevenlabs-id>] [--confirm]
 *
 * Dry run by default. `--list-voices` prints the account's voices and whether each
 * one can be synthesized through the API on the current plan.
 *
 * Without --confirm it only prints the script + caps and exits: generation is paid.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,project} from '../lib.mjs';
import {downloadSigned,generateVoiceover,listAssets,listVoices} from './client.mjs';

const [slug,...rest]=process.argv.slice(2);
const opt={};
for(const a of rest){
  const m=/^--([a-z-]+)=?(.*)$/.exec(a);
  if(!m)throw new Error(`Expected --name=value, received ${a}`);
  opt[m[1]]=m[2]||'true';
}
const pgProject=opt['postgen-project'];
if(opt['list-voices']){
  const v=await listVoices();
  console.log('plan:',v.tier,'| configured:',v.configured_voice_id);
  for(const x of v.voices)console.log(`  ${x.usable_on_api?'OK  ':'NO  '} ${x.voice_id}  ${(x.category||'?').padEnd(12)} ${x.name}`);
  process.exit(0);
}
if(!slug||!pgProject){console.error('Usage: POSTGEN_API_KEY=… node tools/postgen/voice.mjs <slug> --postgen-project=<uuid> [--script=production/voiceover.txt] [--confirm]');process.exit(1);}
const {dir}=project(slug);
const scriptPath=path.join(dir,opt.script||'production/voiceover.txt');
const text=fs.readFileSync(scriptPath,'utf8').trim();
if(!text)throw new Error('Narration script is empty.');
// Always preflight for free: configuration, plan, voice usability and remaining caps.
let pre;
try{
  pre=await generateVoiceover(pgProject,text,{voiceId:opt.voice,dryRun:true});
}catch(e){
  console.error('\nPreflight stopped before spending anything:\n  '+e.message.split(' — ')[0]);
  console.error('\nRun with --list-voices to see which voices this plan can use through the API.');
  process.exit(1);
}
console.log('preflight:',JSON.stringify({voice:pre.voice_name,voice_id:pre.voice_id,category:pre.voice_category,plan:pre.plan_tier,chars:pre.characters,caps:pre.caps}));
if(!opt.confirm){
  console.log(`\nScript (${text.length} chars):\n\n${text}\n\nDry run only — nothing generated. Re-run with --confirm to spend 1 generation.`);
  process.exit(0);
}
const out=await generateVoiceover(pgProject,text,{voiceId:opt.voice});
const assets=await listAssets(pgProject);
const asset=(assets.assets||[]).find(a=>a.id===out.asset_id);
if(!asset?.url)throw new Error('Generated asset not found in the project asset list.');
const bytes=await downloadSigned(asset.url);
const dest=path.join(dir,'production','narration.mp3');
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,bytes);
fs.writeFileSync(path.join(dir,'production','narration.alignment.json'),JSON.stringify({
  assetId:out.asset_id,voiceId:out.voice_id,characters:out.characters,caps:out.caps,
  alignment:out.alignment,voiceName:pre.voice_name,planTier:pre.plan_tier
},null,2)+'\n');
fs.writeFileSync(path.join(dir,'production','voiceover.txt'),text+'\n');
console.log(`Saved ${dest} (${bytes.length} bytes). Caps left today: ${out.caps?.remaining_today}.`);
