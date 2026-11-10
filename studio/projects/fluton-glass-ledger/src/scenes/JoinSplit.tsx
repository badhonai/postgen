import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../system';
import {MONO} from '../system';
import {Words} from '../system';
import {sentencesOf,at} from '../lines';
import {ChapterProps} from '../Film';

/**
 * 04 · Spend it and it becomes three. — full-bleed vermillion. The narration runs across the
 * top; the arithmetic builds on "goes in", "crosses the boundary", "equals", "comes out".
 */
export const JoinSplit:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('joinsplit');
 const ink=scene.foreground;
 const tIn=at('joinsplit','in,',0,739);
 const tCross=at('joinsplit','crosses',0,764);
 const tEquals=at('joinsplit','equals',0,805);
 const tOut=at('joinsplit','out.',0,828);
 const rows:[string,number,number][]=[
  ['9.00',tIn,1],['+ 4.37',tIn+4,2],['+ 0.00',tCross,3],['= 13.37',tEquals,4],['= 9.36 + 3.99 + 0.02',tOut,5]];
 return <>
  <div style={{position:'absolute',left:SIDE,top:96,width:1728}}>
   <Words sentence={s[0]} f={frame} size={44} color={ink} maxW={1728} spacing={-1}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:330}}>
   <div style={{fontFamily:'FlutonDisplay',fontSize:142,letterSpacing:-5,lineHeight:0.92}}>ONE IN.</div>
   <div style={{fontFamily:'FlutonDisplay',fontSize:142,letterSpacing:-5,lineHeight:0.92,
     opacity:clamp(sp(frame,640,10))}}>THREE OUT.</div>
  </div>
  <div style={{position:'absolute',left:SIDE,top:660,display:'flex',gap:24,alignItems:'baseline',
    fontFamily:MONO,fontWeight:800}}>
   {rows.map(([t,start,i])=>{
    const o=clamp(sp(frame,start,8));
    return <div key={t} style={{fontSize:i>=4?38:56,letterSpacing:-1,opacity:o,
      transform:`translateY(${(1-o)*18}px)`}}>{t}</div>;
   })}
  </div>
  <div style={{position:'absolute',left:SIDE,top:752,fontFamily:MONO,fontSize:23,letterSpacing:4,
    opacity:0.7*clamp(sp(frame,tCross,10))}}>PUBLIC AMOUNT = 0.00 · NOTHING CROSSES THE POOL</div>
  <div style={{position:'absolute',right:SIDE,top:330,display:'flex',gap:16}}>
   {Array.from({length:3}).map((_,i)=>{
    const on=frame>tEquals+i*5;
    return <div key={i} style={{width:88,height:88,background:on?ink:'transparent',
      border:`5px solid ${ink}`,opacity:on?1:0.3}}/>;
   })}
  </div>
  <div style={{position:'absolute',right:SIDE,top:450,fontFamily:MONO,fontSize:20,lineHeight:1.9,
    textAlign:'right',opacity:0.5}}>
   {Array.from({length:7}).map((_,i)=><div key={i}>{`${((frame*13+i*29)%9999999)}`.padStart(7,'0')}</div>)}
  </div>
 </>;
};
