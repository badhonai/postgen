import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
import {MONO} from './fonts';
import {W,H,SIDE,clamp,sp} from './sys';
import {Ledger} from './scenes/Ledger';
import {NoteScene} from './scenes/NoteScene';
import {TreeScene} from './scenes/TreeScene';
import {JoinSplit} from './scenes/JoinSplit';
import {NullifierScene} from './scenes/NullifierScene';
import {ExtData} from './scenes/ExtData';
import {BoundaryScene} from './scenes/BoundaryScene';
import {Close} from './scenes/Close';

export type ChapterProps={frame:number;f:number;scene:ReturnType<typeof getSceneAtFrame>};

const CHAPTERS:{[id:string]:React.FC<ChapterProps>}={
 ledger:Ledger,note:NoteScene,tree:TreeScene,joinsplit:JoinSplit,
 nullifier:NullifierScene,extdata:ExtData,boundary:BoundaryScene,close:Close,
};

/**
 * The ground, the shutter and the printed chrome. A chapter change is a cut: the ground flips
 * colour and a shutter wipes off it in 7 frames. Nothing cross-fades.
 */
export const Film:React.FC=()=>{
 const frame=useCurrentFrame();
 const scene=getSceneAtFrame(frame);
 const dur=scene.endFrameExclusive-scene.startFrame;
 const f=Math.max(0,frame-scene.startFrame);
 const Chapter=CHAPTERS[scene.id]??CHAPTERS.ledger;
 const fg=scene.foreground;
 const idx=film.scenes.findIndex(s=>s.id===scene.id);
 const p=clamp(frame/(film.durationInFrames-1));
 const pop=1+0.025*(1-sp(f,0,9));
 const shutter=1-sp(f,0,7);
 return <AbsoluteFill style={{background:scene.background,color:fg}}>
  <div style={{position:'absolute',inset:0,transform:`scale(${pop})`}}>
   <Chapter frame={frame} f={f} scene={scene}/>
  </div>
  {shutter>0.002&&<div style={{position:'absolute',top:0,bottom:0,left:0,width:`${100*shutter}%`,background:fg}}/>}
  {/* printed chrome — same ink as the chapter, never a UI overlay */}
  <div style={{position:'absolute',left:SIDE,top:44,fontFamily:MONO,fontWeight:700,fontSize:21,
    letterSpacing:7,opacity:0.8}}>FLUTON</div>
  <div style={{position:'absolute',right:SIDE,top:44,fontFamily:MONO,fontWeight:700,fontSize:21,
    letterSpacing:5,opacity:0.8}}>{`${String(idx+1).padStart(2,'0')} / 08`}</div>
  {/* register: a hairline that travels the whole chapter, and a live frame counter */}
  <div style={{position:'absolute',left:0,right:0,top:`${((f*1.6)%(H+80))-40}px`,height:2,background:fg,
    opacity:0.16}}/>
  <div style={{position:'absolute',left:SIDE,bottom:34,fontFamily:MONO,fontWeight:700,fontSize:18,
    letterSpacing:4,opacity:0.5}}>{`${String(frame).padStart(4,'0')} · ${((frame*37)%997).toString().padStart(3,'0')}`}</div>
  <div style={{position:'absolute',right:SIDE,bottom:34,fontFamily:MONO,fontWeight:700,fontSize:18,
    letterSpacing:4,opacity:0.5}}>{`${(frame/30).toFixed(2)}S`}</div>
  <div style={{position:'absolute',left:0,right:0,bottom:0,height:10,background:fg,opacity:0.16}}/>
  <div style={{position:'absolute',left:0,bottom:0,height:10,width:`${p*100}%`,background:fg}}/>
  {scene.id==='close'&&<div style={{position:'absolute',right:SIDE,bottom:40,fontFamily:MONO,
    fontWeight:800,fontSize:20,letterSpacing:3,opacity:clamp((frame-scene.startFrame-90)/16)}}>
   {film.finalNotice}</div>}
 </AbsoluteFill>;
};
