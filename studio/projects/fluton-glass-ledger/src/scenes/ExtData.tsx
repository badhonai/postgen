import React from 'react';
import {C,W,SIDE,Label,Headline,Row,hex,sp,ex,clamp} from '../visual-system';

/**
 * 6 · Bound in one hash (33.6–41.8s). Recipient, amount, fee and ciphertexts are public,
 * but they are hashed into one public input — retarget the note and the proof fails.
 */
export const ExtData:React.FC<{f:number;dur:number}>=({f})=>{
 const fold=sp(f,24,42);
 const attack=ex(f,120,20);
 const refused=ex(f,150,18);
 const hx=SIDE, hw=700;
 const bx=W-SIDE-680, bw=680;
 const hash=hex('extdata-bundle',24);
 const fields:[string,string][]=[['RECIPIENT','0x7b…1d0'],['EXT AMOUNT','−4.00'],['FEE','0.02'],['CIPHERTEXTS','3 × encrypted note'],['ASSET','USDC']];
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="Bound to one hash" sub="change anything and the proof no longer matches"
    o={ex(f,0,18)}/>
  <Label x={hx} y={430} o={clamp((f-10)/14)}>PUBLIC SIDE EFFECTS</Label>
  {fields.map(([k,v],i)=>{
   const target=attack>0.5&&i===0;
   return <Row key={k} x={hx} y={470+i*64} w={hw} k={k} v={target?'0x99…ffe':v}
     tone={target?(refused>0.3?C.red:C.blue):C.ink} o={clamp((ex(f,6+i*4,16)-fold*0.55)/0.45)}/>;
  })}
  {/* the fold */}
  <g opacity={clamp((fold-0.15)/0.85)}>
   <line x1={hx+hw+40} y1={492} x2={bx-40} y2={540} stroke={C.grid} strokeWidth={2}/>
   <rect x={bx} y={462} width={bw} height={300} rx={6} fill="none"
     stroke={attack>0.5?(refused>0.3?C.red:C.blue):C.blue} strokeWidth={2.5}/>
   <text x={bx+26} y={508} fontSize={20} fontWeight="800" letterSpacing="6" fill={C.blue}>EXT DATA HASH</text>
   <text x={bx+26} y={586} fontSize="36" fontWeight="800" letterSpacing="2" fill={C.ink}>{hash.slice(0,12)}</text>
   <text x={bx+26} y={636} fontSize="36" fontWeight="800" letterSpacing="2" fill={C.ink}>{hash.slice(12,24)}</text>
   <line x1={bx+26} y1={664} x2={bx+bw-26} y2={664} stroke={C.grid} strokeWidth={1.5}/>
   <text x={bx+26} y={706} fontSize="22" fontWeight="700" letterSpacing="1" fill={C.dim}>one opaque public input to the proof</text>
   <text x={bx+26} y={740} fontSize="22" fontWeight="700" letterSpacing="1" fill={C.dim}>everything else stays encrypted</text>
  </g>
  <g opacity={refused}>
   <text x={bx} y={800} fontSize="26" fontWeight="800" letterSpacing="3" fill={C.red}>PROOF MISMATCH · REFUSED</text>
  </g>
  <g opacity={ex(f,170,20)}>
   <text x={hx} y={792} fontSize="24" fontWeight="700" letterSpacing="1" fill={C.dim}>
    whoever submits it can withhold it — not retarget it
   </text>
  </g>
 </svg>;
};
