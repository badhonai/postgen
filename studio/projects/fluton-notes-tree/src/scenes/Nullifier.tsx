import React from 'react';
import {C,W,SIDE,Grid,Kicker,tw,ease,digest,hash} from '../visual-system';

/**
 * 5 · What the chain learns (451–637f ≈ 6.2s). A nullifier is published; six candidate
 * notes are shown and the film refuses to point at any of them. "Spent" is provable,
 * "which one" is not.
 */
export const Nullifier:React.FC<{f:number}>=({f})=>{
 const stamp=tw(f,2,14,ease.out);
 const candidates=tw(f,26,20,ease.out);
 const blind=tw(f,76,28,ease.inOut);
 const verdict=tw(f,108,22,ease.out);
 const nul=digest('nullifier-leaf-8421',16).toUpperCase();
 const rows=[0,1], cols=[0,1,2];
 return <svg width={W} height={1920}>
  <Grid opacity={0.05}/>
  <Kicker x={SIDE} y={392} opacity={tw(f,0,8,ease.out)}>PUBLISHED ON CHAIN</Kicker>
  <g opacity={stamp} transform={`translate(0 ${(1-stamp)*-24})`}>
   <rect x={SIDE} y={430} width={W-SIDE*2} height={214} rx={28} fill={C.seal} stroke={C.warn} strokeWidth={2.5}/>
   <text x={W/2} y={496} textAnchor="middle" fontSize="20" fontWeight="800" letterSpacing="7" fill={C.warn}>NULLIFIER</text>
   <text x={W/2} y={580} textAnchor="middle" fontSize="32" fontWeight="800" letterSpacing="2.5" fill={C.ink}>
    {nul.replace(/(.{8})/g,'$1 ').trim()}
   </text>
  </g>
  <text x={W/2} y={720} textAnchor="middle" fontSize="25" fontWeight="800" letterSpacing="5" fill={C.soft} opacity={candidates}>
   WHICH NOTE WAS SPENT?
  </text>
  {rows.map(r=>cols.map(c=>{
   const i=r*3+c;
   const x=SIDE+c*320, y=780+r*250;
   const wobble=1+0.02*Math.sin((f+i*11)/9);
   return <g key={i} opacity={candidates*(1-blind*0.5)*0.95}
     transform={`translate(${x+150} ${y+105}) scale(${wobble}) translate(${-(x+150)} ${-(y+105)})`}>
    <rect x={x} y={y} width={300} height={210} rx={22} fill="rgba(255,255,255,0.03)"
      stroke={C.line} strokeWidth={2}/>
    <text x={x+150} y={y+118} textAnchor="middle" fontSize="20" fontWeight="700" letterSpacing="2" fill={C.soft}>
     {digest(`cand${i}`,8)}
    </text>
   </g>;
  }))}
  <g opacity={blind}>
   <rect x={SIDE} y={780} width={W-SIDE*2} height={460} rx={26} fill={C.bg} opacity={0.86}/>
   <text x={W/2} y={1046} textAnchor="middle" fontSize="120" fontWeight="800" fill={C.ink} opacity={0.85}>?</text>
  </g>
  <g opacity={verdict}>
   <text x={SIDE} y={1300} fontSize="36" fontWeight="800" letterSpacing="1" fill={C.accent}>SPENT: PROVABLE</text>
   <text x={SIDE} y={1364} fontSize="36" fontWeight="800" letterSpacing="1" fill={C.soft}>WHICH NOTE: NOT</text>
  </g>
 </svg>;
};
