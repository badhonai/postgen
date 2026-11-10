import React from 'react';
import {C,W,SIDE,Label,Headline,hex,sp,ex,clamp} from '../visual-system';

/**
 * 3 · One tree (13.5–19.4s). Root at the top, leaves at the bottom: a note becomes the
 * newest leaf, one batch writes one root, and the pool keeps the last thirty roots.
 */
export const TreeScene:React.FC<{f:number;dur:number}>=({f})=>{
 const LEVELS=4;
 const topY=372;
 const step=104;
 const cx0=460, cx1=1120;
 const leafFp=hex('note-13.37-owner-asset',12);
 const panelX=W-SIDE-420, panelW=420;
 const nodeXs=(level:number)=>{
  const n=Math.pow(2,level);
  return Array.from({length:n}).map((_,i)=>cx0+((cx1-cx0)*i)/Math.max(1,n-1));
 };
 const yOf=(level:number)=>topY+level*step; // level 0 = root (top)
 return <svg width={W} height={1080}>
  <Headline x={SIDE} y={300} title="One append-only tree" sub="Poseidon · depth 20 · one root per accepted batch"
    o={ex(f,0,18)}/>
  {Array.from({length:LEVELS-1}).map((_,level)=>{
   const ps=nodeXs(level), cs=nodeXs(level+1);
   return <g key={`e${level}`}>
    {ps.map((x,i)=>{
     const l=cs[2*i], r=cs[2*i+1];
     const o=sp(f,16+level*18+i*4,26);
     return <g key={i} opacity={o}>
      <line x1={x} y1={yOf(level)+13} x2={l} y2={yOf(level+1)-13} stroke={C.line} strokeWidth={2}/>
      <line x1={x} y1={yOf(level)+13} x2={r} y2={yOf(level+1)-13} stroke={C.line} strokeWidth={2}/>
     </g>;
    })}
   </g>;
  })}
  {Array.from({length:LEVELS}).map((_,level)=>(
   <g key={`n${level}`}>
    {nodeXs(level).map((x,i)=>{
     const o=sp(f,12+level*18+i*4,24);
     const isRoot=level===0;
     const isNew=level===LEVELS-1&&i===Math.pow(2,LEVELS-1)-1;
     const r=isRoot?15:isNew?14:10;
     return <circle key={i} cx={x} cy={yOf(level)} r={r}
       fill={isRoot?C.blue:isNew?C.green:C.line}
       stroke={isNew?C.green:'none'} strokeWidth={isNew?2:0} opacity={o}/>;
    })}
   </g>
  ))}
  {/* root label above the root node */}
  <g opacity={sp(f,104,26)}>
   <text x={(cx0+cx1)/2} y={topY-64} textAnchor="middle" fontSize="22" fontWeight="800"
     letterSpacing="6" fill={C.blue}>ROOT</text>
   <text x={(cx0+cx1)/2} y={topY-34} textAnchor="middle" fontSize="19" fontWeight="700"
     letterSpacing="2" fill={C.dim}>{hex('root-latest',16).toLowerCase()}</text>
  </g>
  {/* the arriving note, named once */}
  <g opacity={sp(f,78,28)}>
   <rect x={cx1-190} y={yOf(LEVELS-1)+30} width={380} height={88} rx={6} fill="none" stroke={C.green} strokeWidth={2.5}/>
   <text x={cx1} y={yOf(LEVELS-1)+62} textAnchor="middle" fontSize="19" fontWeight="800" letterSpacing="5" fill={C.green}>NEW LEAF</text>
   <text x={cx1} y={yOf(LEVELS-1)+100} textAnchor="middle" fontSize="24" fontWeight="800" letterSpacing="2" fill={C.ink}>{leafFp}</text>
  </g>
  <Label x={SIDE} y={800} o={clamp((f-10)/16)}>LEAVES APPEND · NOTHING REWRITES</Label>
  {/* root history window */}
  <g opacity={ex(f,96,22)}>
   <Label x={panelX} y={396}>ACCEPTED ROOTS</Label>
   {Array.from({length:6}).map((_,i)=>{
    const latest=i===5;
    return <g key={i}>
     <rect x={panelX} y={420+i*60} width={panelW} height={44} rx={4} fill="none"
       stroke={latest?C.blue:C.grid} strokeWidth={latest?2.5:1.5}/>
     <text x={panelX+18} y={449+i*60} fontSize="19" fontWeight="800" letterSpacing="2"
       fill={latest?C.ink:C.dim}>{latest?'latest · accepted':hex(`root${i}`,12).toLowerCase()}</text>
    </g>;
   })}
   <text x={panelX} y={796} fontSize="21" fontWeight="700" letterSpacing="1" fill={C.dim}>older proofs still verify</text>
  </g>
 </svg>;
};
