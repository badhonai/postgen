import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {ROOT,project,options,frameRange,assetDir,reportPaths,fingerprint} from './lib.mjs';
const [action='list',id='starter',...args]=process.argv.slice(2), opt=options(args);
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
try {
 if(action==='list') { console.log(['starter (test fixture)',...fs.readdirSync(path.join(ROOT,'projects')).filter(n=>fs.existsSync(path.join(ROOT,'projects',n,'project.json')))].join('\n')); }
 else {
  const {dir,spec}=project(id), scale=Number(opt.scale||1);
  if(![1,.5,.25].includes(scale) || spec.width*scale%2 || spec.height*scale%2) throw new Error('Use scale 1, 0.5 or 0.25 with even output dimensions.');
  const range=frameRange(opt.frames,spec.durationInFrames), paths=reportPaths(id,opt), pub=assetDir(id,dir);
  if(action==='studio') {
   const port=Number(opt.port||3000);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port.');
   const child=spawn(process.execPath,[path.join(ROOT,'node_modules/@remotion/cli/remotion-cli.js'),'studio',path.join(dir,spec.entry),'--public-dir='+pub,'--port='+port,'--no-open','--host=0.0.0.0'],{cwd:ROOT,stdio:'inherit'});
   child.on('exit',code=>process.exit(code??1));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
  } else {
   const {bundle}=await import('@remotion/bundler');
   const out=path.join(ROOT,'.cache',id,'bundle');fs.rmSync(out,{recursive:true,force:true});
   const sourceHash=fingerprint(dir);
   const serveUrl=await bundle({entryPoint:path.join(dir,spec.entry),publicDir:pub,outDir:out,onProgress:()=>{}});
   if(fingerprint(dir)!==sourceHash)throw new Error('Source changed while bundling; rerun.');
   if(action==='bundle')console.log('Bundled:',id);
   else {
    const {openBrowser,selectComposition,renderStill,renderMedia}=await import('@remotion/renderer');
    let browser=await openBrowser('chrome',{chromiumOptions:{gl:'swangle'}});
    try {
     const logs=[]; const log=l=>{if(l.type==='error')logs.push(l.text)};
     const composition=await selectComposition({serveUrl,id:spec.compositionId,puppeteerInstance:browser});
     for(const k of ['width','height','fps','durationInFrames'])if(composition[k]!==spec[k])throw new Error(`Composition and project.json disagree: ${k}`);
     if(action==='still') {
      const frame=Number(opt.frame||0);if(!Number.isInteger(frame)||frame<0||frame>=spec.durationInFrames)throw new Error('Frame outside composition.');
      const output=path.join(ROOT,'renders',id,`frame-${frame}.png`);await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,scale,imageFormat:'png',output,onBrowserLog:log});console.log(output);
     } else if(action==='render') {
      let previous=-1;
      await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:paths.movie,frameRange:range,scale,concurrency:2,imageFormat:'png',colorSpace:'bt709',crf:18,x264Preset:'medium',audioCodec:'aac',audioBitrate:'320k',onBrowserLog:log,onProgress:r=>{const n=Math.floor(r.progress*10);if(n!==previous){previous=n;console.log(`${n*10}%`)}}});
      if(logs.length)throw new Error('Browser errors: '+logs.join('; '));
      write(paths.render,{project:id,range,frames:range[1]-range[0]+1,width:spec.width*scale,height:spec.height*scale,fps:spec.fps,scale,codec:'h264',gl:'swangle',browserErrors:logs,sourceHash,fileSHA256:crypto.createHash('sha256').update(fs.readFileSync(paths.movie)).digest('hex')});console.log(paths.movie);
     } else if(action==='qa') {
      const tmp=path.join(ROOT,'.cache',id,'qa');fs.mkdirSync(tmp,{recursive:true});
      const mid=Math.floor(spec.durationInFrames/2), frames=[mid,spec.durationInFrames-1,0,mid];
      for(let i=0;i<frames.length;i++)await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:frames[i],scale:.5,imageFormat:'png',output:path.join(tmp,`${i}.png`),onBrowserLog:log});
      await browser.close({silent:true});browser=await openBrowser('chrome',{chromiumOptions:{gl:'swangle'}});
      await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:mid,scale:.5,imageFormat:'png',output:path.join(tmp,'fresh.png'),onBrowserLog:log});
      const hash=n=>crypto.createHash('sha256').update(fs.readFileSync(path.join(tmp,n+'.png'))).digest('hex');
      const seek=hash('0')===hash('3')&&hash('0')===hash('fresh');
      const result={project:id,seekDeterministic:seek,testedFrames:frames,freshBrowserFrame:mid,browserErrors:logs,encoded:null,reviewLimit:'Automated technical checks and sampled stills are not continuous AV viewing/listening or independent critique.'};
      if(fs.existsSync(paths.movie)) {
       if(!fs.existsSync(paths.render))throw new Error('Render report missing. Re-render or explicitly verify the external file.');
       const expected=JSON.parse(fs.readFileSync(paths.render,'utf8'));
       if(expected.sourceHash!==sourceHash)throw new Error('Render is stale: source/assets/dependency lock changed. Re-render.');
       if(expected.fileSHA256!==crypto.createHash('sha256').update(fs.readFileSync(paths.movie)).digest('hex'))throw new Error('Rendered file changed since its report. Verify/re-render the correct final.');
       const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',paths.movie],{encoding:'utf8'}));
       const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
       execFileSync('ffmpeg',['-v','error','-i',paths.movie,'-f','null','-'],{stdio:'pipe'});
       const ok=video.width===expected.width&&video.height===expected.height&&Number(video.nb_frames)===expected.frames&&Math.abs(Number(probe.format.duration)-expected.frames/expected.fps)<.04&&Number(video.r_frame_rate.split('/')[0])/Number(video.r_frame_rate.split('/')[1])===expected.fps;
       result.encoded={file:path.relative(ROOT,paths.movie),pass:ok,fullDecode:true,width:video.width,height:video.height,frames:Number(video.nb_frames),fps:video.r_frame_rate,duration:Number(probe.format.duration),audioPresent:!!audio};
       if(audio){
        const measurement=spawnSync('ffmpeg',['-hide_banner','-i',paths.movie,'-af','loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json','-f','null','-'],{encoding:'utf8'});
        if(measurement.status!==0)throw new Error('Encoded audio measurement failed.');
        const chunks=measurement.stderr.match(/\{[^{}]*\}/g);if(!chunks?.length)throw new Error('No loudness measurement returned.');
        const m=JSON.parse(chunks.at(-1));result.encoded.audio={channels:audio.channels,sampleRate:Number(audio.sample_rate),integratedLUFS:Number(m.input_i),truePeakDBTP:Number(m.input_tp),truePeakPass:Number(m.input_tp)<=-1};
        if(!result.encoded.audio.truePeakPass){write(paths.qa,result);throw new Error('Audio exceeds -1 dBTP default ceiling; master/review it before delivery.');}
       }
       if(!ok)throw new Error('Encoded metadata check failed.');
      }
      write(paths.qa,result);if(!seek||logs.length)throw new Error('Seek/browser QA failed.');console.log(JSON.stringify(result,null,2));
     } else throw new Error('Use list, studio, bundle, still, render or qa.');
    } finally {await browser.close({silent:true});}
   }
  }
 }
} catch(e){console.error(e.message);process.exitCode=1;}
