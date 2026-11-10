import React from 'react';
import {Item} from './Item';
import {EASE,prog,tw} from '../visual-system';

/** Masked line-by-line headline rise. Each line has its own clip so nothing leaks above the baseline. */
export const Headline:React.FC<{id:string;lines:string[];x:number;y:number;size:number;f:number;start?:number;fills?:string[];fill:string;anchor?:'start'|'middle'|'end';lh?:number}>=
({id,lines,x,y,size,f,start=4,fills,fill,anchor='start',lh})=>{
  const step=lh??size*1.08;
  return <g>{lines.map((t,j)=>{
    const p=EASE.out(prog(f,start+j*7,24));
    const yy=y+j*step;
    return <g key={j} clipPath={`url(#hl-${id}-${j})`}>
      <defs><clipPath id={`hl-${id}-${j}`}><rect x={0} y={yy-size*0.92} width={1920} height={size*1.12}/></clipPath></defs>
      <Item y={(1-p)*size*1.2}>
        <text x={x} y={yy} fontSize={size} fontWeight={900} textAnchor={anchor} fill={fills?.[j]??fill} style={{letterSpacing:'-0.02em'}}>{t}</text>
      </Item>
    </g>;
  })}</g>;
};

export const Kicker:React.FC<{text:string;x:number;y:number;f:number;start?:number;fill:string;bar:string;anchor?:'start'|'middle'}>=
({text,x,y,f,start=0,fill,bar,anchor='start'})=>{
  const p=tw(f,start,16,EASE.out);
  return <Item x={(1-p)*-24} o={p}>
    <rect x={anchor==='middle'?x-210:x} y={y-26} width={8} height={32} rx={2} fill={bar}/>
    <text x={(anchor==='middle'?x-210:x)+24} y={y} fontSize={30} fontWeight={600} fill={fill} style={{letterSpacing:'0.14em'}}>{text}</text>
  </Item>;
};
