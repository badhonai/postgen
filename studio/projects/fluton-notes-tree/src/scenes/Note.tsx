import React from 'react';
import {C,W,SIDE,Grid,Kicker,Tile,tw,ease,digest} from '../visual-system';

/**
 * 3 · Anatomy of one note (94–335f ≈ 8s). The longest beat: three fields blur behind a
 * blind, one commitment hash locks in beneath them, and the note becomes a single leaf
 * in an append-only tree.
 */
export const Note:React.FC<{f:number}>=({f})=>{
 const inHash=tw(f,0,10,ease.out);
 const blind=tw(f,26,30,ease.inOut);
 const lock=tw(f,58,40,ease.out);
 const toLeaf=tw(f,158,40,ease.inOut);
 const leafDrop=tw(f,168,36,ease.inOut);
 const treeGrow=tw(f,150,70,ease.out);
 const fields=[['AMOUNT','13.37'],['OWNER','0x9f…c41'],['TOKEN','USDC']] as const;
 const commitment=digest('note-13.37-0x9fc4-USDC',14);
 const cardW=W-SIDE*2,cardX=SIDE,cardY=440,cardH=520;
 return <svg width={W} height={1920}>
  <Grid opacity={0.055}/>
  <Kicker x={SIDE} y={392} opacity={inHash}>ONE NOTE, SEALED</Kicker>
  <g opacity={1-toLeaf*0.9}>
   <rect x={cardX} y={cardY} width={cardW} height={cardH} rx={32} fill="rgba(255,255,255,0.03)" stroke={C.line} strokeWidth={2}/>
   {fields.map(([k,v],i)=>{
    const y=cardY+112+i*112;
    return <g key={k} opacity={inHash}>
     <text x={cardX+48} y={y} fontSize="25" fontWeight="800" letterSpacing="4" fill={C.soft}>{k}</text>
     <text x={cardX+300} y={y} fontSize="44" fontWeight="800" fill={C.ink} opacity={1-blind}>{v}</text>
     <rect x={cardX+288} y={y-38} width={430*blind} height={54} rx={12} fill={C.seal} stroke={C.accent} strokeWidth={blind>0.02?2:0}/>
     {blind>0.55&&<text x={cardX+300} y={y-4} fontSize="24" fontWeight="800" letterSpacing="8" fill={C.accent} opacity={(blind-0.55)/0.45}>SEALED</text>}
    </g>;
   })}
   <line x1={cardX+48} y1={cardY+392} x2={cardX+cardW-48} y2={cardY+392} stroke={C.line} strokeWidth={2} opacity={lock}/>
   <text x={W/2} y={cardY+452} textAnchor="middle" fontSize="26" fontWeight="700" letterSpacing="3"
     fill={C.accent2} opacity={lock}>{commitment.toUpperCase().replace(/(.{4})/g,'$1 ').trim()}</text>
   <text x={W/2} y={cardY+492} textAnchor="middle" fontSize="19" fontWeight="800" letterSpacing="6"
     fill={C.soft} opacity={lock*0.9}>COMMITMENT</text>
  </g>
  <g opacity={treeGrow}>
   {[0,1,2].map(level=>{
    const y=1500+level*0;
    const nodes=Math.pow(2,level);
    return <g key={level}>
     {Array.from({length:nodes}).map((_,i)=>{
      const gap=(W-SIDE*2)/nodes;
      const x=SIDE+gap*(i+0.5);
      const appear=tw(f,150+level*13+i*4,16,ease.out);
      return <g key={i} opacity={appear}>
       <circle cx={x} cy={y} r={level===2&&i===1?16:13} fill={level===2&&i===1?C.accent:C.soft} opacity={level===2&&i===1?1:0.55}/>
       {level<2&&<line x1={x} y1={y+13} x2={SIDE+((W-SIDE*2)/Math.pow(2,level+1))*((i>>1)+0.5)} y2={y-110+13} stroke={C.soft} strokeWidth={2} opacity={0.45}/>}
      </g>;
     })}
    </g>;
   })}
  </g>
  <g opacity={leafDrop} transform={`translate(0 ${(1-leafDrop)*-30})`}>
   <Tile x={W/2-200} y={1240} w={400} h={120} label="NEW LEAF" hash={commitment.slice(0,10)} tone={C.accent} filled/>
  </g>
  <text x={W/2} y={1198} textAnchor="middle" fontSize="21" fontWeight="800" letterSpacing="6" fill={C.soft} opacity={treeGrow*0.9}>
   ONE APPEND-ONLY TREE · DEPTH 20
  </text>
 </svg>;
};
