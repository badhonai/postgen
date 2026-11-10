import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,validId,inside,validateSpec,frameRange,project,options,fingerprint} from '../tools/lib.mjs';
test('safe project slugs; no traversal',()=>{assert.equal(validId('new-film-2'),'new-film-2');for(const id of ['../x','UPPER','a/b','','a--b'])assert.throws(()=>validId(id));assert.throws(()=>inside('/project','../../secret'));});
test('starter contract and frame-range boundaries',()=>{const {spec}=project();assert.equal(validateSpec(spec).fps,60);assert.deepEqual(frameRange('0-11',900),[0,11]);assert.deepEqual(frameRange(undefined,900),[0,899]);for(const r of ['-1-2','2-1','0-900'])assert.throws(()=>frameRange(r,900));assert.throws(()=>validateSpec({...spec,width:1919}));assert.throws(()=>validateSpec({...spec,entry:'../private'}));});
test('explicit option parsing rejects unknown/shell-like arguments',()=>{assert.deepEqual(options(['--scale=0.25','--frames=0-11']),{scale:'0.25',frames:'0-11'});assert.throws(()=>options(['--oops=yes']));assert.throws(()=>options([';rm -rf /']));});
test('generator creates independent source, refuses overwrite, and cleans test files',()=>{
 const id=`test-fixture-${process.pid}`,dir=path.join(ROOT,'projects',id);assert.equal(fs.existsSync(dir),false);
 try{const r=spawnSync(process.execPath,['tools/new-project.mjs',id],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(project(id).spec.id,id);assert.ok(fs.existsSync(path.join(dir,'brief.md')));const before=fs.readFileSync(path.join(dir,'project.json'),'utf8');const again=spawnSync(process.execPath,['tools/new-project.mjs',id],{cwd:ROOT,encoding:'utf8'});assert.notEqual(again.status,0);assert.equal(fs.readFileSync(path.join(dir,'project.json'),'utf8'),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('researched sources remain pinned pointers, not media downloads',()=>{const x=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/research/source-index.json'),'utf8'));assert.equal(x.sources.length,12);for(const s of x.sources){assert.match(s.commit,/^[a-f0-9]{40}$/);assert.equal(s.sourceBundled,false);for(const e of s.entrypoints)assert.match(e.sha256,/^[a-f0-9]{64}$/);}});

test('source fingerprint is repeatable',()=>{const {dir}=project();assert.match(fingerprint(dir),/^[a-f0-9]{64}$/);assert.equal(fingerprint(dir),fingerprint(dir));});
