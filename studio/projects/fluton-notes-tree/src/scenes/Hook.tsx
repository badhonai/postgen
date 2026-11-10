import React from 'react';
import {C,W,SIDE,Grid,Kicker,clamp,tw,ease,sealing,digest} from '../visual-system';

/**
 * 1 · Hook (0–54f ≈ 1.8s). A balance card is struck out and its number breaks into
 * sealed tiles. One idea: what a chain usually shows you is not what this one has.
 */
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const hay=(n:number)=>{const s=Math.sin(n*91.3+17.7)*43758.5453;return s-Math.floor(s);};

export const Hook:React.FC<{f:number}>=({f})=>{
 const strike=tw(f,6,16,ease.inOut);
 const shatter=tw(f,22,26,ease.out);
 const label=tw(f,0,10,ease.out);
 const cardW=W-SIDE*2,cardH=400,cardX=SIDE,cardY=452;
 const shown=sealing('0000000000',clamp(f/26)*0.7);
 return <svg width={W} height={1920}>
  <Grid opacity={0.05}/>
  <Kicker x={SIDE} y={392} opacity={label}>ACCOUNT BALANCE</Kicker>
  <g opacity={1-shatter*0.95}>
   <rect x={cardX} y={cardY} width={cardW} height={cardH} rx={32} fill="rgba(255,255,255,0.035)" stroke={C.line} strokeWidth={2}/>
   <text x={cardX+56} y={cardY+104} fontSize="26" fontWeight="800" letterSpacing="5" fill={C.soft}>BALANCE</text>
   <text x={cardX+56} y={cardY+300} fontSize="76" fontWeight="800" letterSpacing="-2" fill={C.ink}>
    {shown.replace(/(.{4})/g,'$1 ').trim()}
   </text>
   <line x1={cardX+46} y1={cardY+272} x2={cardX+46+(cardW-92)*strike} y2={cardY+272}
     stroke={C.warn} strokeWidth={10} strokeLinecap="round"/>
  </g>
  {[0,1,2,3,4,5].map(i=>{
   const p=clamp((f-20-i*2)/22);
   const x=lerp(cardX+90+(i%3)*270, SIDE+30+(i%2)*482, ease.out(p));
   const y=lerp(cardY+cardH-40, 986+Math.floor(i/2)*250, ease.out(p));
   return <g key={i} opacity={p*0.96} transform={`rotate(${(hay(i)-0.5)*14} ${x+110} ${y+70})`}>
    <rect x={x} y={y} width={220} height={140} rx={20} fill={C.seal} stroke={C.accent} strokeWidth={2.2}/>
    <text x={x+110} y={y+84} textAnchor="middle" fontSize="24" fontWeight="700" fill={C.accent} letterSpacing="1.5">{digest(`n${i}`,8)}</text>
   </g>;
  })}
 </svg>;
};
