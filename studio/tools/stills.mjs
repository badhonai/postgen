import fs from 'node:fs';
import path from 'node:path';
import {ROOT,project,options,assetDir} from './lib.mjs';
// Review-only helper: renders an arbitrary list of stills from one bundle+ browser session.
const [id='starter',...rest]=process.argv.slice(2), opt=options(rest);
const frames=(opt.frames||'0').split(',').map(Number);
const scale=Number(opt.scale||0.5);
try{
 const {dir,spec}=project(id);
 if(![1,.5,.25].includes(scale)||spec.width*scale%2||spec.height*scale%2)throw new Error('Use scale 1, 0.5 or 0.25.');
 if(!frames.length||frames.some(f=>!Number.isInteger(f)||f<0||f>=spec.durationInFrames))throw new Error('All frames must be in-bounds integers.');
 const out=path.join(ROOT,'.cache','review',id);fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const pub=assetDir(id,dir);
 const {bundle}=await import('@remotion/bundler');
 const serveUrl=await bundle({entryPoint:path.join(dir,spec.entry),publicDir:pub,outDir:path.join(ROOT,'.cache',id,'review-bundle'),onProgress:()=>{}});
 const {openBrowser,selectComposition,renderStill}=await import('@remotion/renderer');
 const browser=await openBrowser('chrome',{chromiumOptions:{gl:'swangle'}});
 try{
  const logs=[];const composition=await selectComposition({serveUrl,id:spec.compositionId,puppeteerInstance:browser});
  for(const frame of frames){
   const output=path.join(out,`frame-${String(frame).padStart(4,'0')}.png`);
   await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,scale,imageFormat:'png',output,onBrowserLog:l=>{if(l.type==='error')logs.push(l.text)}});
  }
  if(logs.length)throw new Error('Browser errors: '+logs.join('; '));
  fs.writeFileSync(path.join(out,'stills.json'),JSON.stringify({project:id,frames,scale,width:spec.width*scale,height:spec.height*scale,browserErrors:logs},null,2)+'\n');
  console.log(out);
 } finally {await browser.close({silent:true});}
} catch(e){console.error(e.message);process.exitCode=1;}
