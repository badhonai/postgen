import React from 'react';
import {C,W,SIDE,Label,Headline,hex,ex,clamp} from '../visual-system';

/**
 * 1 · Glass ledger (0–5.7s). A public chain is a glass book: every address, amount and
 * time is legible to anyone, forever. This chapter shows the exposure and nothing else.
 */
export const Ledger:React.FC<{f:number;dur:number}>=({f})=>{
 const rows=6;
 const step=71;
 const first=420;
 const colAmt=1290, colAge=1800;
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="Everything readable" sub="a public ledger · permanent · for everyone"
    o={ex(f,0,20)}/>
  <Label x={SIDE} y={first-40} o={clamp((f-18)/16)}>ADDRESS · AMOUNT · TIME</Label>
  <g opacity={ex(f,86,24)}>
   <Label x={W-SIDE} y={first-40} tone={C.red} anchor="end">NO PRIVACY BY DEFAULT</Label>
  </g>
  {Array.from({length:rows}).map((_,i)=>{
   const o=clamp((f-14-i*6)/18);
   const y=first+i*step;
   return <g key={i} opacity={o}>
    <text x={SIDE} y={y} fontSize="28" fontWeight="700" letterSpacing="0.5" fill={C.ink}>
     {`0x${hex(`addr${i}`,40)}`.toLowerCase()}
    </text>
    <text x={colAmt} y={y} textAnchor="end" fontSize="28" fontWeight="700" fill={C.ink}>{`${(2.4+i*3.7).toFixed(2)} ETH`}</text>
    <text x={colAge} y={y} textAnchor="end" fontSize="28" fontWeight="700" fill={C.dim}>{`${i+1}h ago`}</text>
    <line x1={SIDE} y1={y+22} x2={W-SIDE} y2={y+22} stroke={C.grid} strokeWidth={1.5}/>
   </g>;
  })}
 </svg>;
};
