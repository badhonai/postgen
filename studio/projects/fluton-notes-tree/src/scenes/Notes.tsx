import React from 'react';
import {C,W,SIDE,Grid,Kicker,Tile,tw,twn,ease,digest} from '../visual-system';

/**
 * 2 · Notes (54–94f ≈ 1.3s). Three sealed tiles snap in; the word NOTES sits behind them.
 */
export const Notes:React.FC<{f:number}>=({f})=>{
 const title=tw(f,2,14,ease.out);
 return <svg width={W} height={1920}>
  <Grid opacity={0.05}/>
  <Kicker x={SIDE} y={392} opacity={tw(f,0,8,ease.out)}>LEDGER</Kicker>
  <text x={W/2} y={560} textAnchor="middle" fontSize="220" fontWeight="800" letterSpacing="-8"
    fill={C.ink} opacity={title*0.14}>NOTES</text>
  {[0,1,2].map(i=>{
   const p=twn(f,1+i*4,14,0,1);
   return <Tile key={i} x={SIDE+40} y={640+i*270} w={W-SIDE*2-80} h={220} scale={0.9+0.1*p} opacity={p}
     label={`NOTE ${i+1}`} hash={digest(`note-${i}`,12)} tone={i===1?C.accent2:C.accent} filled/>;
  })}
 </svg>;
};
