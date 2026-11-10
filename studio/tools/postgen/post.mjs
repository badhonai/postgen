#!/usr/bin/env node
/**
 * Upload a finished film to PostGen and create a DRAFT post (you approve/publish).
 *
 *   POSTGEN_API_KEY=… node tools/postgen/post.mjs <slug> --postgen-project=<uuid> \
 *       [--video=renders/<slug>/<slug>-final.mp4] [--caption=production/post-caption.txt] [--title=…]
 *
 * Nothing is stored in the repo: the video goes to PostGen's private R2 bucket only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,project} from '../lib.mjs';
import {createDraftPost,uploadAsset} from './client.mjs';

const [slug,...rest]=process.argv.slice(2);
const opt={};
for(const a of rest){
  const m=/^--([a-z-]+)=?(.*)$/.exec(a);
  if(!m)throw new Error(`Expected --name=value, received ${a}`);
  opt[m[1]]=m[2]||'true';
}
const pgProject=opt['postgen-project'];
if(!slug||!pgProject){console.error('Usage: POSTGEN_API_KEY=… node tools/postgen/post.mjs <slug> --postgen-project=<uuid> [--video=…] [--caption=…]');process.exit(1);}
const {dir}=project(slug);
const video=path.join(ROOT,opt.video||`renders/${slug}/${slug}-final.mp4`);
if(!fs.existsSync(video))throw new Error(`Missing video: ${path.relative(ROOT,video)}. Render and master first.`);
const size=fs.statSync(video).size;
if(size>50*1024*1024)throw new Error(`Video is ${(size/1048576).toFixed(1)} MB; PostGen accepts 50 MB for video. Re-encode or shorten.`);
const captionPath=path.join(dir,opt.caption||'production/post-caption.txt');
if(!fs.existsSync(captionPath))throw new Error('Missing caption file (production/post-caption.txt).');
const caption=fs.readFileSync(captionPath,'utf8').trim();
const uploaded=await uploadAsset(pgProject,video,'video/mp4');
const draft=createDraftPost({
  projectId:pgProject,
  title:opt.title||`${slug} — video`,
  tweets:[caption],
  assetId:uploaded.asset.id,
});
const result=await draft;
console.log(JSON.stringify({assetId:uploaded.asset.id,postId:result.post?.id,status:result.post?.status,videoMB:+(size/1048576).toFixed(2)},null,2));
