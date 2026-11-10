import React from 'react';
import {useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
/** Safe width for captions: the art area minus both margins. */
const MAX=Math.round((film.width-film.safeAreas.side*2)/26);
const wrap=(text:string,max=MAX):string[]=>{
 const words=text.split(/\s+/);const lines:string[]=[];let cur='';
 for(const w of words){
  if((cur+' '+w).trim().length>max&&cur){lines.push(cur);cur=w;}else cur=(cur+' '+w).trim();
 }
 if(cur)lines.push(cur);
 return lines.slice(0,3);
};
/** Captions live under the art, on the recording's timeline, one spoken line per scene. */
export const CaptionOverlay:React.FC=()=>{
 const frame=useCurrentFrame(),scene=getSceneAtFrame(frame);
 const end=scene.captionEndFrame??Infinity;
 const text=frame<end?(scene.captionLines[0]??''):'';
 const lines=wrap(text);
 // A short rise as each line lands, driven only by frames since the scene started.
 const local=frame-scene.startFrame;
 const rise=Math.min(1,local/9);
 const base=film.safeAreas.captionTop;
 return <svg width={film.width} height={film.height} viewBox={`0 0 ${film.width} ${film.height}`} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  <rect x={film.safeAreas.side} y={base-64} width={film.width-film.safeAreas.side*2} height={2} fill={scene.foreground} opacity={0.12}/>
  {lines.map((line,i)=><text key={i} x={film.safeAreas.side} y={base+i*film.safeAreas.captionLineHeight}
    fontSize="44" fontWeight="600" letterSpacing="-0.5" fill={scene.foreground}
    opacity={Math.max(0,Math.min(1,(rise*1.4)-i*0.25))}>{line}</text>)}
  {scene.id==='seal'&&<text x={film.width/2} y={film.safeAreas.finalNoticeTop} textAnchor="middle"
    fontSize="26" fontWeight="800" letterSpacing="4" fill={film.palette.warn} opacity={Math.min(1,Math.max(0,(frame-scene.startFrame-40)/20))}>{film.finalNotice}</text>}
 </svg>;
};
