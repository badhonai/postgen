import React from 'react';
import {C,W,SIDE,Grid,Kicker,Tile,tw,ease,digest} from '../visual-system';

/**
 * 6 · The boundary (637–729f ≈ 3.1s). Left of the line: the net amount, public. Right of
 * it: sealed notes with no amounts. One public fact, everything else hidden.
 */
export const Boundary:React.FC<{f:number}>=({f})=>{
 const line=tw(f,0,14,ease.out);
 const pub=tw(f,8,16,ease.out);
 const inside=tw(f,22,26,ease.out);
 return <svg width={W} height={1920}>
  <Grid opacity={0.05}/>
  <Kicker x={SIDE} y={392} opacity={pub}>CROSSING THE POOL</Kicker>
  <line x1={W/2} y1={470} x2={W/2} y2={470+900*line} stroke={C.line} strokeWidth={3} strokeDasharray="16 14"/>
  <g opacity={pub}>
   <text x={SIDE} y={560} fontSize="20" fontWeight="800" letterSpacing="7" fill={C.warn}>PUBLIC</text>
   <text x={SIDE} y={740} fontSize="104" fontWeight="800" fill={C.ink} letterSpacing="-3">−4.00</text>
   <text x={SIDE} y={806} fontSize="24" fontWeight="700" letterSpacing="1" fill={C.soft}>NET AMOUNT</text>
   <text x={SIDE} y={848} fontSize="24" fontWeight="700" letterSpacing="1" fill={C.soft}>TOKEN · ADDRESS</text>
  </g>
  <g opacity={inside}>
   <text x={W/2+40} y={560} fontSize="20" fontWeight="800" letterSpacing="7" fill={C.accent}>INSIDE</text>
   {[0,1,2].map(i=>(
    <Tile key={i} x={W/2+40} y={600+i*220} w={W/2-SIDE-80} h={186} label="SEALED"
      hash={digest(`in${i}`,8)} tone={C.accent} filled/>
   ))}
  </g>
  <text x={W/2} y={1430} textAnchor="middle" fontSize="25" fontWeight="800" letterSpacing="5"
    fill={C.soft} opacity={inside*0.9}>AMOUNTS DO NOT CROSS</text>
 </svg>;
};
