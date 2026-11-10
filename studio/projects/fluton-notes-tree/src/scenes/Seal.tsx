import React from 'react';
import {staticFile} from 'remotion';
import {C,W,SIDE,Grid,Kicker,tw,ease} from '../visual-system';

/**
 * 7 · Close (729–844f ≈ 3.8s). The sealed block lands, the lockup follows, and the
 * testnet notice sits in the caption band (outside the art).
 */
export const Seal:React.FC<{f:number}>=({f})=>{
 const land=tw(f,0,22,ease.inOut);
 const mark=tw(f,18,18,ease.out);
 const word=tw(f,30,22,ease.out);
 const sub=tw(f,48,20,ease.out);
 const blockW=520,blockH=300;
 const scale=0.86+0.14*land;
 return <svg width={W} height={1920}>
  <Grid opacity={0.045}/>
  <Kicker x={SIDE} y={392} opacity={0.45}>FLUTON</Kicker>
  <g opacity={land} transform={`translate(${W/2} 620) scale(${scale}) translate(${-W/2} ${-620})`}>
   <rect x={W/2-blockW/2} y={620-blockH/2} width={blockW} height={blockH} rx={30}
     fill={C.seal} stroke={C.accent} strokeWidth={2.5}/>
   <text x={W/2} y={640} textAnchor="middle" fontSize="34" fontWeight="800" letterSpacing="9" fill={C.accent}>SEALED</text>
  </g>
  <g opacity={mark}>
   <image href={staticFile('brand/fluton-mark-white.png')} x={W/2-70} y={860} width={140} height={140}/>
  </g>
  <image href={staticFile('brand/fluton-wordmark-white.png')} x={W/2-(700*word)/2} y={1120}
    width={700*word} height={700*word*0.27} opacity={word}/>
  <text x={W/2} y={1436} textAnchor="middle" fontSize="26" fontWeight="700" letterSpacing="6"
    fill={C.soft} opacity={sub}>CONFIDENTIAL EXECUTION LAYER</text>
 </svg>;
};
