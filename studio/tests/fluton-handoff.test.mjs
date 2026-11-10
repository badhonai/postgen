import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ROOT,project,assetDir} from '../tools/lib.mjs';
const id='fluton-private-actions';
test('prepared Fluton metadata and seven contiguous scene windows remain valid',()=>{
 const {dir,spec}=project(id);assert.deepEqual([spec.width,spec.height,spec.fps,spec.durationInFrames],[1920,1080,60,1800]);assert.equal(spec.workflowMode,'visual-handoff');
 const film=JSON.parse(fs.readFileSync(path.join(dir,'src/film-data.json'),'utf8'));assert.equal(film.scenes.length,7);let cursor=0;
 for(const s of film.scenes){assert.equal(s.startFrame,cursor);assert.ok(s.endFrameExclusive>s.startFrame);assert.ok(s.keyStateFrame>=s.startFrame&&s.keyStateFrame<s.endFrameExclusive);assert.ok(s.captionLines.length<=2);assert.ok(s.captionLines.every(x=>x.length<=66));cursor=s.endFrameExclusive;}
 assert.equal(cursor,1800);assert.match(film.finalNotice,/TESTNET ONLY/);assert.match(film.finalNotice,/NO REAL FUNDS/);
});
test('two supplied Fluton brand PNGs are verified and staged without altering bytes',()=>{
 const {dir}=project(id),pub=assetDir(id,dir),manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets.json'),'utf8'));assert.equal(manifest.bundled.length,2);
 for(const a of manifest.bundled){const src=fs.readFileSync(path.join(dir,a.source)),out=fs.readFileSync(path.join(pub,a.publicPath));assert.ok(src.equals(out));assert.equal(crypto.createHash('sha256').update(out).digest('hex'),a.sha256);assert.ok(src.length<=64*1024);}
});
test('bundled brand copy rejects mismatches and escaped destinations',()=>{
 const folder=path.join(ROOT,'.cache','fixtures','asset-negative-fixture');fs.mkdirSync(path.dirname(folder),{recursive:true});fs.rmSync(folder,{recursive:true,force:true});fs.mkdirSync(path.join(folder,'brand'),{recursive:true});
 const image=fs.readFileSync(path.join(ROOT,'projects',id,'brand/fluton-mark-white.png'));fs.writeFileSync(path.join(folder,'brand/logo.png'),image);
 const base={source:'brand/logo.png',publicPath:'brand/logo.png',sha256:'0'.repeat(64),permission:'Test fixture only'};
 const set=a=>fs.writeFileSync(path.join(folder,'assets.json'),JSON.stringify({bundled:[a]}));set(base);assert.throws(()=>assetDir('asset-negative-fixture',folder),/hash mismatch/);
 set({...base,sha256:crypto.createHash('sha256').update(image).digest('hex'),publicPath:'../outside.png'});assert.throws(()=>assetDir('asset-negative-fixture',folder),/flat brand/);
 fs.rmSync(folder,{recursive:true,force:true});
});
