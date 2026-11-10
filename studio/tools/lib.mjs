import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function validId(id) { if (!ID.test(id || '') || id.length > 64) throw new Error('Use a short lowercase slug, e.g. belief-market-film.'); return id; }
export function inside(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw new Error('Expected a relative project path.');
  const p = path.resolve(root, relative);
  if (p !== root && !p.startsWith(root + path.sep)) throw new Error('Path escapes project.');
  return p;
}
export function validateSpec(s) {
  validId(s.id);
  if (s.schemaVersion !== 1 || !/^[A-Za-z][A-Za-z0-9-]*$/.test(s.compositionId || '')) throw new Error('Invalid schema/composition id.');
  for (const k of ['width','height','fps','durationInFrames']) if (!Number.isInteger(s[k]) || s[k] <= 0) throw new Error(`Invalid ${k}.`);
  if (s.width % 2 || s.height % 2 || s.fps > 120) throw new Error('Use even dimensions and fps <= 120.');
  inside('/project', s.entry);
  return s;
}
export function project(id = 'starter') {
  validId(id); const dir = id === 'starter' ? path.join(ROOT, 'templates/starter') : path.join(ROOT, 'projects', id);
  const spec = validateSpec(JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')));
  if (spec.id !== id) throw new Error('Folder and project.json id differ.');
  if (!fs.existsSync(inside(dir, spec.entry))) throw new Error('Composition entry is missing.');
  return {dir, spec};
}
export function options(args) {
  const out = {};
  for (const a of args) { if (!a.startsWith('--') || !a.includes('=')) throw new Error(`Expected --name=value, received ${a}`); const [k,...v] = a.slice(2).split('='); if (!['frames','scale','frame','port'].includes(k)) throw new Error(`Unknown option ${k}`); out[k] = v.join('='); }
  return out;
}
export function frameRange(value, count) {
  if (!value) return [0, count - 1];
  const m = /^(\d+)-(\d+)$/.exec(value);
  if (!m || Number(m[1]) > Number(m[2]) || Number(m[2]) >= count) throw new Error('Frames must be an inclusive in-bounds range, e.g. --frames=0-11.');
  return [Number(m[1]), Number(m[2])];
}
export function assetDir(id, dir) {
  const dest = path.join(ROOT,'.cache',id,'public'); fs.rmSync(dest,{recursive:true,force:true}); fs.mkdirSync(dest,{recursive:true});
  fs.cpSync(path.join(ROOT,'public'), dest, {recursive:true, dereference:true});
  if (fs.existsSync(path.join(dir,'public'))) fs.cpSync(path.join(dir,'public'),dest,{recursive:true,dereference:true});
  const manifestFile=path.join(dir,'assets.json');
  const bundled=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')).bundled||[]:[];
  for(const asset of bundled){
    if(!/^brand\/[A-Za-z0-9._-]+\.png$/.test(asset.source||'')||!/^brand\/[A-Za-z0-9._-]+\.png$/.test(asset.publicPath||'')||!asset.permission)throw new Error('Bundled assets must be declared flat brand/*.png files with a rights note.');
    const src=inside(dir,asset.source),real=fs.realpathSync(src),brand=path.join(dir,'brand');
    if(!real.startsWith(brand+path.sep))throw new Error('Bundled brand asset escapes its project.');
    const data=fs.readFileSync(real);
    if(data.length>64*1024||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Bundled asset must be a PNG <=64 KiB.');
    if(crypto.createHash('sha256').update(data).digest('hex')!==asset.sha256)throw new Error('Bundled brand hash mismatch: '+asset.source);
    const target=inside(dest,asset.publicPath);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);
  }
  return dest;
}
export function reportPaths(id, opt) {
  const suffix = opt.frames ? `-frames-${opt.frames}` : '';
  const dir = path.join(ROOT, 'renders', id); fs.mkdirSync(dir,{recursive:true});
  const base = path.join(dir, id + suffix);
  return {movie:base+'.mp4', render:base+'.render.json', qa:base+'.qa.json'};
}

export function fingerprint(dir) {
  const hash=crypto.createHash('sha256');
  const add=(base,label)=>{
    if(!fs.existsSync(base))return;
    if(fs.statSync(base).isDirectory()){for(const name of fs.readdirSync(base).sort())add(path.join(base,name),label+'/'+name);}
    else{hash.update(label+'\0');hash.update(fs.readFileSync(base));}
  };
  for(const name of ['project.json','src','public','assets.json','brand'])add(path.join(dir,name),name);
  add(path.join(ROOT,'public'),'shared-public');add(path.join(ROOT,'package-lock.json'),'package-lock.json');
  return hash.digest('hex');
}
