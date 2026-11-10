import React from 'react';
import {useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
import {C,W,H,ART,SIDE,GX,TOP,clamp,prog,ex} from './visual-system';
import {Ledger} from './scenes/Ledger';
import {NoteScene} from './scenes/NoteScene';
import {TreeScene} from './scenes/TreeScene';
import {JoinSplit} from './scenes/JoinSplit';
import {NullifierScene} from './scenes/NullifierScene';
import {ExtData} from './scenes/ExtData';
import {BoundaryScene} from './scenes/BoundaryScene';
import {Close} from './scenes/Close';

const SCENES:{[id:string]:React.FC<{f:number;dur:number}>}={
 ledger:Ledger,note:NoteScene,tree:TreeScene,joinsplit:JoinSplit,
 nullifier:NullifierScene,extdata:ExtData,boundary:BoundaryScene,close:Close,
};

/**
 * One persistent system. The frame, the grid and the progress rule are owned here, so they
 * never cut: chapters are movements inside the same drawing, not slides.
 */
export const Film:React.FC=()=>{
 const frame=useCurrentFrame();
 const scene=getSceneAtFrame(frame);
 const dur=scene.endFrameExclusive-scene.startFrame;
 const f=Math.max(0,frame-scene.startFrame);
 const Scene=SCENES[scene.id]??SCENES.ledger;
 const total=film.durationInFrames;
 const p=clamp(frame/(total-1));
 const ruleY=ART-40;
 return <svg width={W} height={H}>
  {/* structural grid — fixed for the whole film */}
  <g opacity={ex(frame,0,26)*0.85}>
   {Array.from({length:9}).map((_,i)=>(
    <line key={i} x1={GX(i)} y1={104} x2={GX(i)} y2={ruleY} stroke={C.line} strokeWidth={1.5}/>
   ))}
  </g>
  <Scene f={f} dur={dur}/>
  {/* fixed frame */}
  <line x1={SIDE} y1={88} x2={W-SIDE} y2={88} stroke={C.grid} strokeWidth={2}/>
  <text x={SIDE} y={66} fontSize="19" fontWeight="800" letterSpacing="7" fill={C.dim}>FLUTON</text>
  <text x={W-SIDE} y={66} textAnchor="end" fontSize="19" fontWeight="800" letterSpacing="7" fill={C.dim}>
   NOTES · NOT BALANCES
  </text>
  {/* the one continuous line: chapter marks on the frame rule, whole-film progress in green */}
  <line x1={SIDE} y1={ruleY} x2={W-SIDE} y2={ruleY} stroke={C.grid} strokeWidth={2}/>
  <line x1={SIDE} y1={ruleY} x2={SIDE+(W-SIDE*2)*p} y2={ruleY} stroke={C.green} strokeWidth={3}/>
  {film.scenes.map(s=>{
   const x=SIDE+((W-SIDE*2)*s.startFrame)/(total-1);
   const active=s.id===scene.id;
   return <rect key={s.id} x={x-2} y={ruleY-10} width={5} height={20} rx={1}
     fill={active?C.green:C.grid} opacity={active?1:0.9}/>;
  })}
  <text x={SIDE+150} y={66} fontSize="17" fontWeight="800" letterSpacing="5" fill={C.grid}
   opacity={prog(frame,40,20)*0.9}>
   {`${String(film.scenes.findIndex(s=>s.id===scene.id)+1).padStart(2,'0')} / ${String(film.scenes.length).padStart(2,'0')}`}
  </text>
  <text x={SIDE} y={TOP-42} fontSize="17" fontWeight="800" letterSpacing="5" fill={C.dim} opacity={prog(frame,40,20)*0.9}>
   CONFIDENTIAL EXECUTION · TESTNET
  </text>
 </svg>;
};
