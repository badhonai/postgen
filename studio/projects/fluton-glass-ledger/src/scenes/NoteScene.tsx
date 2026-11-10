import React from 'react';
import {C,W,SIDE,Label,Headline,Row,ex,clamp,hex,sp} from '../visual-system';

/**
 * 2 · Notes, not balances (5.7–13.5s). A balance is struck out; four private fields fold
 * into one commitment. Nothing about the note survives in the clear.
 */
export const NoteScene:React.FC<{f:number;dur:number}>=({f})=>{
 const strike=ex(f,16,24);
 const seal=sp(f,66,44);
 const fp=hex('note-13.37-owner-asset',24);
 const lx=SIDE, rx=W-SIDE-740, rw=740;
 return <svg width={W} height={1080}>
  <Headline x={lx} y={300} title="Notes, not balances" sub="a note is one sealed commitment"
    o={ex(f,0,18)}/>
  {/* what an account model would hold */}
  <g opacity={1-clamp((f-110)/24)*0.55}>
   <Label x={lx} y={436}>ACCOUNT BALANCE</Label>
   <text x={lx} y={604} fontSize="160" fontWeight="800" letterSpacing="-6" fill={C.ink}>13.37</text>
   <line x1={lx} y1={540} x2={lx+430*strike} y2={540} stroke={C.red} strokeWidth={8}/>
   <text x={lx} y={656} fontSize="26" fontWeight="700" letterSpacing="1" fill={C.dim}>not how Fluton holds value</text>
  </g>
  {/* the note */}
  <g opacity={ex(f,24,20)}>
   <Label x={rx} y={436} tone={C.green}>ONE NOTE</Label>
   {[['AMOUNT','13.37 USDC'],['OWNER KEY','0x9f…c41'],['ASSET','USDC'],['BLINDING','r ← random field']].map(([k,v],i)=>(
    <Row key={k} x={rx} y={488+i*78} w={rw} k={k} v={v} o={clamp(1-seal*1.8)}/>
   ))}
  </g>
  {/* the fold: four fields become one commitment */}
  <g opacity={seal}>
   <rect x={rx-24} y={444} width={rw+48} height={330} rx={6} fill="none" stroke={C.green} strokeWidth={2.5}/>
   <text x={rx} y={496} fontSize={20} fontWeight="800" letterSpacing="6" fill={C.green}>COMMITMENT</text>
   <text x={rx} y={588} fontSize="46" fontWeight="800" letterSpacing="3" fill={C.ink}>{fp.slice(0,12)}</text>
   <text x={rx} y={650} fontSize="46" fontWeight="800" letterSpacing="3" fill={C.ink}>{fp.slice(12,24)}</text>
   <line x1={rx} y1={684} x2={rx+rw} y2={684} stroke={C.grid} strokeWidth={1.5}/>
   <text x={rx} y={730} fontSize="26" fontWeight="700" letterSpacing="1" fill={C.dim}>amount · owner · asset — all hidden</text>
  </g>
 </svg>;
};
