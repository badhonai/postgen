import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../sys';
import {MONO} from '../fonts';
import {Words} from '../type';
import {sentencesOf} from '../lines';
import {ChapterProps} from '../Film';

/** 02 · Fluton keeps a different book: it holds no balances, only notes. */
export const NoteScene:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('note');
 const ink=scene.foreground;
 const rosette=(r:number,k:number,ph:number)=>{
  const pts:string[]=[];
  for(let i=0;i<=240;i++){
   const t=(i/240)*Math.PI*2;
   const rr=r*(1+0.14*Math.sin(k*t+ph));
   pts.push(`${(330+rr*Math.cos(t+ph)).toFixed(1)},${(330+rr*Math.sin(t+ph)).toFixed(1)}`);
  }
  return <polyline points={pts.join(' ')} fill="none" stroke={P.verm} strokeWidth={3}/>;
 };
 return <>
  <div style={{position:'absolute',left:SIDE,top:130,width:1180}}>
   <Words sentence={s[0]} f={frame} size={86} color={ink} maxW={1180} exitAt={s[1].startFrame-8}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:300,width:1180}}>
   <Words sentence={s[1]} f={frame} size={74} color={ink} hot={['balances,']} hotColor={P.verm}
     hotStyle="strike" maxW={1180}/>
  </div>
  <svg width={660} height={660} style={{position:'absolute',right:-70,top:300}}>
   {rosette(280,7,frame*0.008)}
   {rosette(228,11,-frame*0.013)}
   {rosette(170,5,frame*0.022)}
  </svg>
  <div style={{position:'absolute',left:SIDE,top:660,fontFamily:MONO,fontWeight:800,fontSize:130,
    letterSpacing:-3,opacity:clamp(sp(frame,s[1].startFrame+24,14))}}>13.37</div>
  <div style={{position:'absolute',left:SIDE+560,top:700,fontFamily:MONO,fontSize:23,letterSpacing:3,
    opacity:0.55}}>{`SERIAL 0x${((frame*11)%16777215).toString(16).padStart(6,'0')}`}</div>
  <div style={{position:'absolute',left:SIDE,top:812,fontFamily:MONO,fontSize:23,letterSpacing:3,
    opacity:0.55}}>COMMITMENT · POSEIDON(AMOUNT, KEY, BLINDING, ASSET)</div>
 </>;
};
