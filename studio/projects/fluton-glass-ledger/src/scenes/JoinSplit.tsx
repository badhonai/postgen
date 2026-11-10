import React from 'react';
import {C,W,SIDE,Label,Headline,Note,sp,ex,clamp} from '../visual-system';

/**
 * 4 · Join-split (19.4–27.9s). Two notes are spent, three are written, and the balance
 * line holds: sum in + public amount = sum out.
 */
export const JoinSplit:React.FC<{f:number;dur:number}>=({f})=>{
 const spent=sp(f,10,34);
 const outs=ex(f,52,28);
 const eq=ex(f,118,24);
 const inX=SIDE, outX=700, panelX=W-SIDE-560, panelW=560;
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="Spend one note, write three" sub="join-split · value is conserved"
    o={ex(f,0,18)}/>
  <Label x={inX} y={430} o={clamp((f-6)/14)}>INPUTS</Label>
  <Label x={outX} y={430} tone={C.green} o={clamp((f-42)/14)}>OUTPUTS</Label>
  {[['9.00','IN · 1'],['4.37','IN · 2']].map(([v,k],i)=>(
   <Note key={k} x={inX} y={462+i*140} w={420} h={120} label={k} fp={v}
     state={spent>0.5?'spent':'sealed'} size={38} o={ex(f,6+i*8,20)}/>
  ))}
  <text x={inX} y={462+2*140+42} fontSize="21" fontWeight="800" letterSpacing="3" fill={C.dim}
    opacity={spent}>SPENT · NULLIFIERS PUBLISHED</text>
  {[['9.36','CHANGE'],['3.99','PAYMENT'],['0.02','RELAYER FEE']].map(([v,k],i)=>(
   <Note key={k} x={outX} y={458+i*118} w={440} h={102} label={k} fp={v} state="sealed" size={36}
     o={clamp((outs-i*0.18)/0.7)}/>
  ))}
  {/* the conservation panel */}
  <g opacity={eq}>
   <text x={panelX} y={470} fontSize="27" fontWeight="800" letterSpacing="1" fill={C.ink}>SUM IN + PUBLIC = SUM OUT</text>
   <text x={panelX} y={534} fontSize="40" fontWeight="800" letterSpacing="1" fill={C.ink}>13.37 + 0 = 13.37</text>
   <line x1={panelX} y1={570} x2={panelX+panelW} y2={570} stroke={C.grid} strokeWidth={2}/>
   <text x={panelX} y={628} fontSize="24" fontWeight="800" letterSpacing="5" fill={C.green}>PRIVATE TRANSFER</text>
   <text x={panelX} y={666} fontSize="21" fontWeight="700" letterSpacing="1" fill={C.dim}>publicAmount = 0 — nothing crosses</text>
   <text x={panelX} y={752} fontSize="21" fontWeight="700" letterSpacing="1" fill={C.dim}>every output carries its own</text>
   <text x={panelX} y={782} fontSize="21" fontWeight="700" letterSpacing="1" fill={C.dim}>commitment</text>
  </g>
 </svg>;
};
