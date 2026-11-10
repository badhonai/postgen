import React from 'react';
import {CARD,C} from '../visual-system';

export const Glyph:React.FC<{kind:'swap'|'send'|'vote';cx:number;cy:number;color:string}>=({kind,cx,cy,color})=>{
  const p={stroke:color,strokeWidth:10,fill:'none',strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  return <g transform={`translate(${cx} ${cy})`}>
    {kind==='swap'&&<g {...p}><path d="M-60 -18H60M38 -40L62 -18L38 4"/><path d="M60 24H-60M-38 2L-62 24L-38 46"/></g>}
    {kind==='send'&&<g {...p}><path d="M-70 0H70M28 -42L72 0L28 42"/></g>}
    {kind==='vote'&&<g {...p}><rect x={-46} y={-46} width={92} height={92} rx={18}/><path d="M-22 2L-5 20L26 -18"/></g>}
  </g>;
};

/** A lit public action card: white face, ink glyph and verb. Used by scene 1 and the scene 2 match cut. */
export const LitCard:React.FC<{x:number;y:number;label:string;glyph:'swap'|'send'|'vote';face?:string;ink?:string}>=
({x,y,label,glyph,face=C.white,ink=C.ink})=>{
  return <g>
    <rect x={x} y={y} width={CARD.w} height={CARD.h} rx={28} fill={face}/>
    <Glyph kind={glyph} cx={x+CARD.w/2} cy={y+98} color={ink}/>
    <text x={x+CARD.w/2} y={y+216} fontSize={40} fontWeight={900} textAnchor="middle" fill={ink} style={{letterSpacing:'0.06em'}}>{label}</text>
  </g>;
};
