import React from 'react';
import {C,W,SIDE,Label,Headline,hex,sp,ex,clamp} from '../visual-system';

/**
 * 5 · What the chain learns (27.9–33.6s). One nullifier is published per spent note.
 * Spent is provable. Which note was spent is not.
 */
export const NullifierScene:React.FC<{f:number;dur:number}>=({f})=>{
 const stamp=sp(f,3,26);
 const panelX=W-SIDE-520, panelW=520;
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="Spent, never which" sub="one nullifier per note, revealed once"
    o={ex(f,0,18)}/>
  <Label x={SIDE} y={430} o={clamp((f-4)/14)}>PUBLISHED</Label>
  <g opacity={stamp} transform={`translate(${(1-stamp)*-60} 0)`}>
   <rect x={SIDE} y={462} width={840} height={150} rx={6} fill="none" stroke={C.blue} strokeWidth={2.5}/>
   <text x={SIDE+24} y={504} fontSize={20} fontWeight="800" letterSpacing="6" fill={C.blue}>NULLIFIER</text>
   <text x={SIDE+24} y={566} fontSize="38" fontWeight="800" letterSpacing="2" fill={C.ink}>
    {hex('nullifier-8421',24).toLowerCase()}
   </text>
  </g>
  <Label x={SIDE} y={692} o={ex(f,34,18)}>LEAVES IN THE TREE · NONE MARKED</Label>
  {Array.from({length:4}).map((_,i)=>{
   const x=SIDE+i*270, y=716;
   return <g key={i} opacity={ex(f,40+i*6,20)}>
    <rect x={x} y={y} width={240} height={66} rx={5} fill="none" stroke={C.line} strokeWidth={2}/>
    <text x={x+120} y={y+42} textAnchor="middle" fontSize="20" fontWeight="700" letterSpacing="1.5" fill={C.dim}>
     {hex(`leaf${i}`,10).toLowerCase()}
    </text>
   </g>;
  })}
  {/* what a watcher can derive */}
  <g opacity={ex(f,66,24)}>
   <Label x={panelX} y={430}>WHAT A WATCHER SEES</Label>
   {[['nullifier exists','yes',true],['note selection','—',false],['amount','—',false],['owner','—',false],['recipient','—',false]].map(([k,v,ok],i)=>(
    <g key={k as string}>
     <text x={panelX} y={488+i*58} fontSize="24" fontWeight="700" letterSpacing="0.5" fill={C.ink}>{k as string}</text>
     <text x={panelX+panelW} y={488+i*58} textAnchor="end" fontSize="24" fontWeight="800" letterSpacing="1"
       fill={ok?C.green:C.dim}>{v as string}</text>
     <line x1={panelX} y1={506+i*58} x2={panelX+panelW} y2={506+i*58} stroke={C.grid} strokeWidth={1.5}/>
    </g>
   ))}
  </g>
  <g opacity={ex(f,96,20)}>
   <line x1={panelX} y1={742} x2={panelX+panelW} y2={742} stroke={C.line} strokeWidth={2}/>
   <text x={panelX} y={790} fontSize="26" fontWeight="800" letterSpacing="2" fill={C.green}>SPENT: PROVABLE</text>
   <text x={panelX+panelW} y={790} textAnchor="end" fontSize="26" fontWeight="800" letterSpacing="2" fill={C.dim}>WHICH: NOT</text>
  </g>
 </svg>;
};
