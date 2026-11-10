import React from 'react';
import {useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
// Orchestrator-owned planning captions. Replace with recording-aligned timings later.
const wrap=(text:string,max=72):string[]=>{
 const words=text.split(/\s+/);const lines:string[]=[];let cur='';
 for(const w of words){
  if((cur+' '+w).trim().length>max&&cur){lines.push(cur);cur=w;}else{cur=(cur+' '+w).trim();}
 }
 if(cur)lines.push(cur);
 return lines.slice(0,2);
};

export const CaptionOverlay:React.FC=()=>{
 const frame=useCurrentFrame(),scene=getSceneAtFrame(frame);
 const captionEnd=scene.captionEndFrame??Infinity;
 const lines=wrap(frame<captionEnd?(scene.captionLines[0]??''):'');
 return <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  {lines.map((line,i)=><text key={i} x="960" y={film.safeAreas.captionTop+24+i*film.safeAreas.captionLineHeight} textAnchor="middle" fontSize="31" fontWeight="600" fill={scene.foreground}>{line}</text>)}
  {scene.id==='brand'&&<text x="960" y={film.safeAreas.finalNoticeTop+28} textAnchor="middle" fontSize="28" fontWeight="600" fill={scene.foreground}>{film.finalNotice}</text>}
 </svg>;
};
