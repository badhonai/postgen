import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../system';
import {MONO} from '../system';
import {Words} from '../system';
import {sentencesOf,at} from '../lines';
import {ChapterProps} from '../Film';

/** 05 · All the chain learns is a nullifier — spent, never which one. */
export const NullifierScene:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('nullifier');
 const ink=scene.foreground;
 const fire=at('nullifier','nullifier,',0,902);
 const lock=at('nullifier','spent,',0,962);
 const nf=`0x${((frame*17)%16777215).toString(16)}${((frame*7)%65535).toString(16)}`.padEnd(18,'0');
 return <>
  <div style={{position:'absolute',left:SIDE,top:104,width:1240}}>
   <Words sentence={s[0]} f={frame} size={62} color={ink} hot={['nullifier,','spent,']} hotColor={P.verm}
     maxW={1240}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:430,fontFamily:'FlutonDisplay',fontSize:150,
    letterSpacing:-4}}>NULLIFIER</div>
  <div style={{position:'absolute',left:SIDE,top:600,fontFamily:MONO,fontWeight:800,fontSize:40,
    letterSpacing:1,opacity:clamp(sp(frame,fire,10))}}>
   {frame>lock?'0x8f2a 41c9 d87e 04b1':nf}
  </div>
  <div style={{position:'absolute',left:SIDE,top:684,fontFamily:MONO,fontSize:23,letterSpacing:4,
    opacity:0.65*clamp(sp(frame,lock+8,10))}}>ONE PER NOTE · REVEALED ONCE</div>
  <div style={{position:'absolute',right:SIDE,top:180,display:'flex',flexDirection:'column',gap:9}}>
   {Array.from({length:22}).map((_,i)=>{
    const on=i===8&&frame>=fire;
    return <div key={i} style={{width:on?56:30,height:13,background:on?P.verm:ink,opacity:on?1:0.3}}/>;
   })}
  </div>
  <div style={{position:'absolute',right:SIDE+90,top:186,fontFamily:MONO,fontSize:21,letterSpacing:3,
    textAlign:'right',opacity:0.75}}>
   <div style={{opacity:frame>=fire?1:0.35}}>SPENT — PROVABLE</div>
   <div style={{marginTop:22,opacity:0.55}}>WHICH — NOT</div>
  </div>
 </>;
};
