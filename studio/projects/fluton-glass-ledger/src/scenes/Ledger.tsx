import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../system';
import {MONO} from '../system';
import {Words} from '../system';
import {sentencesOf} from '../lines';
import {ChapterProps} from '../Film';

/**
 * 01 · Every public chain is a glass ledger. — the narration is set at the top; underneath it a
 * band of amounts scrolls without stopping and a serial column ticks, so no frame is dead.
 */
export const Ledger:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('ledger');
 const ink=scene.foreground;
 const band=`2.40  0x5f07ff  6.10  0x8e42ac  9.80  0x0ff34b  13.50  0x2ef7cb  17.20  0x41b0ee  `;
 const bandW=band.length*23;
 const off=(frame*6)%bandW;
 return <>
  <div style={{position:'absolute',left:SIDE,top:140,width:1180}}>
   <Words sentence={s[0]} f={frame} size={92} color={ink} maxW={1180} exitAt={s[1].startFrame-8}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:352,width:1180}}>
   <Words sentence={s[1]} f={frame} size={78} color={ink} hot={['balance,','counterparty,','timing.']}
     hotColor={P.verm} maxW={1180}/>
  </div>
  <div style={{position:'absolute',right:SIDE,top:150,textAlign:'right',fontFamily:MONO,fontWeight:700,
    fontSize:21,lineHeight:1.75,opacity:0.55}}>
   {Array.from({length:11}).map((_,i)=>(
    <div key={i}>{`${((frame*3+i*37)%99999999)}`.padStart(8,'0')}</div>
   ))}
  </div>
  <div style={{position:'absolute',left:0,right:0,top:620,borderTop:`5px solid ${ink}`,
    borderBottom:`5px solid ${ink}`,padding:'14px 0',overflow:'hidden',whiteSpace:'nowrap',
    fontFamily:MONO,fontWeight:800,fontSize:46,letterSpacing:2}}>
   <div style={{transform:`translateX(${-off}px)`}}>{band.repeat(6)}</div>
  </div>
  <div style={{position:'absolute',left:SIDE,top:760,display:'flex',gap:64}}>
   {['2.40','6.10','9.80','13.50','17.20','20.90'].map((a,i)=>(
    <div key={a} style={{opacity:clamp(sp(frame,84+i*7,10))}}>
     <div style={{fontFamily:MONO,fontWeight:800,fontSize:58,letterSpacing:-1}}>{a}</div>
     <div style={{fontFamily:MONO,fontSize:20,letterSpacing:2,opacity:0.55}}>{`0x${((frame*7+i*1301)%65535).toString(16)}`}</div>
    </div>
   ))}
  </div>
 </>;
};
