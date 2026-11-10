import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../sys';
import {MONO} from '../fonts';
import {Words} from '../type';
import {sentencesOf,at} from '../lines';
import {ChapterProps} from '../Film';

/** 06 · Recipient, amount, fee and ciphertexts are bound into one hash. */
export const ExtData:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('extdata');
 const ink=scene.foreground;
 const fRec=at('extdata','recipient,',0,1042);
 const fAmt=at('extdata','amount,',0,1067);
 const fFee=at('extdata','fee',0,1089);
 const fCip=at('extdata','ciphertexts',0,1116);
 const fHash=at('extdata','hash,',0,1173);
 const fBad=at('extdata','retarget',0,1215);
 const fields:[string,string,number][]=[
  ['RECIPIENT','0x7b…1d0',fRec],['AMOUNT','−4.00',fAmt],['FEE','0.02',fFee],['CIPHERTEXT','3 notes',fCip]];
 const bad=frame>=fBad;
 return <>
  <div style={{position:'absolute',left:SIDE,top:100,width:1500}}>
   <Words sentence={s[0]} f={frame} size={55} color={ink} hot={['hash,','retarget']} hotColor={P.verm}
     maxW={1500}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:400,display:'flex',gap:18}}>
   {fields.map(([k,v,start],i)=>{
    const o=clamp(sp(frame,start,8));
    const hi=bad&&i===0;
    return <div key={k} style={{width:220,opacity:o,transform:`translateY(${(1-o)*18}px)`}}>
     <div style={{background:hi?P.verm:ink,color:P.blue,padding:'9px 12px',fontFamily:MONO,
       fontWeight:800,fontSize:17,letterSpacing:1}}>{hi?'RETARGET':k}</div>
     <div style={{fontFamily:MONO,fontWeight:800,fontSize:28,marginTop:10,
       textDecoration:hi?'line-through':'none'}}>{hi?'0x99…ffe':v}</div>
    </div>;
   })}
  </div>
  <div style={{position:'absolute',left:SIDE,top:540,fontFamily:'FlutonDisplay',fontSize:96,
    letterSpacing:-3}}>ONE HASH</div>
  <div style={{position:'absolute',left:SIDE,top:668,fontFamily:MONO,fontWeight:800,fontSize:38,
    letterSpacing:1,opacity:clamp(sp(frame,fHash-4,10))}}>
   {`0x${frame>fHash?'6e08 1ce3 4101 c2fc':'0000 0000 0000 0000'}`}
  </div>
  <div style={{position:'absolute',left:SIDE,top:730,fontFamily:MONO,fontSize:22,letterSpacing:3,
    opacity:0.7*clamp(sp(frame,fHash+6,10))}}>EVERYTHING ELSE STAYS ENCRYPTED</div>
  {bad&&<div style={{position:'absolute',right:SIDE,top:120,transform:'rotate(-8deg)',
    border:`6px solid ${P.verm}`,color:P.verm,padding:'6px 16px',fontFamily:'FlutonDisplay',fontSize:52,
    letterSpacing:2,opacity:clamp(sp(frame,fBad,7))}}>REFUSED</div>}
 </>;
};
