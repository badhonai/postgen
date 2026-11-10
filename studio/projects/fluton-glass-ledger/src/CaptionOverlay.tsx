import React from 'react';
import {useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
import {C,W,H,ART,SIDE,clamp,ex} from './visual-system';

/** Subtitles sit in the caption band under the art, inside one fixed mask. */
const wrap=(text:string,max=78):string[]=>{
 const words=text.split(/\s+/);const lines:string[]=[];let cur='';
 for(const w of words){
  if((cur+' '+w).trim().length>max&&cur){lines.push(cur);cur=w;}else cur=(cur+' '+w).trim();
 }
 if(cur)lines.push(cur);
 return lines.slice(0,2);
};

export const CaptionOverlay:React.FC=()=>{
 const frame=useCurrentFrame(),scene=getSceneAtFrame(frame);
 const end=scene.captionEndFrame??Infinity;
 const text=frame<end?(scene.captionLines[0]??''):'';
 const lines=wrap(text);
 const local=frame-scene.startFrame;
 const rise=ex(local,0,10);
 const base=film.safeAreas.captionTop;
 return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  <line x1={SIDE} y1={ART+18} x2={W-SIDE} y2={ART+18} stroke={C.grid} strokeWidth={2}/>
  {lines.map((line,i)=>(
   <text key={i} x={SIDE} y={base+i*film.safeAreas.captionLineHeight} fontSize="32" fontWeight="600"
     letterSpacing="0.2" fill={C.ink} opacity={clamp(rise*1.6-i*0.3)}>{line}</text>
  ))}
  {scene.id==='close'&&(
   <text x={W-SIDE} y={base} textAnchor="end" fontSize="20" fontWeight="800" letterSpacing="4"
     fill={C.green} opacity={clamp((local-40)/18)}>{film.finalNotice}</text>
  )}
 </svg>;
};
