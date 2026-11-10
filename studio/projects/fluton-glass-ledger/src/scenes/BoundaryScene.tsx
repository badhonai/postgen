import React from 'react';
import {C,W,SIDE,Label,Headline,Note,hex,ex,clamp} from '../visual-system';

/**
 * 7 · The boundary (41.8–44.7s). Short movement: one number is public at the pool edge,
 * the notes behind it stay sealed. Nothing crosses but the net amount.
 */
export const BoundaryScene:React.FC<{f:number;dur:number}>=({f})=>{
 const line=ex(f,0,26);
 const mid=880;
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="One public number" sub="only the net amount crossing the pool"
    o={ex(f,0,16)}/>
  <line x1={mid} y1={392} x2={mid} y2={392+404*line} stroke={C.grid} strokeWidth={2} strokeDasharray="8 10"/>
  <g opacity={ex(f,3,16)}>
   <Label x={SIDE} y={462}>PUBLIC</Label>
   <text x={SIDE} y={640} fontSize="170" fontWeight="800" letterSpacing="-8" fill={C.ink}>−4.00</text>
   <text x={SIDE} y={704} fontSize="26" fontWeight="700" letterSpacing="1" fill={C.dim}>amount · token · recipient address</text>
   <text x={SIDE} y={746} fontSize="26" fontWeight="700" letterSpacing="1" fill={C.dim}>visible to everyone on chain</text>
  </g>
  <g opacity={ex(f,8,18)}>
   <Label x={mid+70} y={462} tone={C.green}>SEALED</Label>
   {[0,1,2].map(i=>(
    <Note key={i} x={mid+70} y={490+i*108} w={W-SIDE-(mid+70)} h={92} label="NOTE"
      fp={`${hex(`sealed${i}`,10).toLowerCase()} · amount hidden`} size={26}
      o={ex(f,28+i*8,20)}/>
   ))}
  </g>
  <text x={SIDE} y={792} fontSize="24" fontWeight="800" letterSpacing="5"
    fill={C.dim} opacity={ex(f,40,20)}>AMOUNTS DO NOT CROSS</text>
 </svg>;
};
