import React from 'react';
import {C,W,SIDE,Grid,Kicker,Tile,tw,ease,digest} from '../visual-system';

/**
 * 4 · Join-split (335–451f ≈ 3.9s). One note is spent, three are created, and the batch
 * lands as a single root. Value conservation stays on screen as an equation.
 */
export const Split:React.FC<{f:number}>=({f})=>{
 const spend=tw(f,0,16,ease.inOut);
 const outs=tw(f,26,30,ease.out);
 const root=tw(f,72,22,ease.out);
 const eq=tw(f,86,20,ease.out);
 return <svg width={W} height={1920}>
  <Grid opacity={0.055}/>
  <Kicker x={SIDE} y={392} opacity={tw(f,0,8,ease.out)}>JOIN-SPLIT</Kicker>
  <g opacity={1-spend*0.5}>
   <Tile x={SIDE+40} y={440} w={W-SIDE*2-80} h={210} label="1 NOTE IN" hash={digest('in',12)} tone={C.accent} filled/>
  </g>
  <line x1={W/2} y1={666} x2={W/2} y2={740} stroke={C.warn} strokeWidth={2.5} opacity={spend*0.85}/>
  <text x={W/2} y={784} textAnchor="middle" fontSize="22" fontWeight="800" letterSpacing="5" fill={C.warn} opacity={spend}>
   NULLIFIER REVEALED
  </text>
  {[0,1,2].map(i=>{
   const p=Math.max(0,Math.min(1,(outs-i*0.16)/0.62));
   return <g key={i} opacity={p} transform={`translate(${(1-p)*70} 0)`}>
    <Tile x={SIDE+40} y={824+i*196} w={W-SIDE*2-80} h={168} label={`OUT ${i}`}
      hash={digest(`out${i}`,12)} tone={i===2?C.accent2:C.accent} filled/>
   </g>;
  })}
  <g opacity={eq}>
   <text x={W/2} y={1408} textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="3" fill={C.ink}>
    SUM IN + PUBLIC = SUM OUT
   </text>
  </g>
  <g opacity={root}>
   <circle cx={W/2-96} cy={1452} r={10} fill={C.accent}/>
   <text x={W/2-72} y={1461} fontSize="22" fontWeight="800" letterSpacing="5" fill={C.accent}>ONE ROOT</text>
  </g>
 </svg>;
};
