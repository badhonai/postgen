import React from 'react';
import {staticFile} from 'remotion';
import {C,W,sp,ex} from '../visual-system';

/**
 * 8 · Close (44.7–51.6s). No headline here: one intent only. The system settles, the
 * supplied lockup lands, and the testnet notice stays in the caption band.
 */
export const Close:React.FC<{f:number;dur:number}>=({f})=>{
 const mark=sp(f,4,28);
 const word=ex(f,26,26);
 const tag=ex(f,74,24);
 const c=W/2;
 const wordW=720, wordH=wordW*(512/1997);
 return <svg width={W} height={1080}>
  <g opacity={mark} transform={`translate(${c} 424) scale(${0.9+0.1*mark}) translate(${-c} ${-424})`}>
   <image href={staticFile('brand/fluton-mark-white.png')} x={c-72} y={352} width={144} height={144}/>
  </g>
  <image href={staticFile('brand/fluton-wordmark-white.png')} x={c-wordW/2} y={540} width={wordW} height={wordH} opacity={word}/>
  <text x={c} y={540+wordH+56} textAnchor="middle" fontSize="26" fontWeight="800" letterSpacing="9"
    fill={C.dim} opacity={tag}>FHE + ZK · NOTES IN ONE TREE</text>
  <g opacity={ex(f,96,24)}>
   <line x1={c-280} y1={792} x2={c+280} y2={792} stroke={C.grid} strokeWidth={2}/>
  </g>
 </svg>;
};
