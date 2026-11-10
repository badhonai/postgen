import React from 'react';
import {hash} from '../visual-system';

/** An unreadable sealed value/note. The cell pattern is a fixed-seed texture, never content. */
export const SealedTile:React.FC<{x:number;y:number;size:number;seed:number;bg:string;fg:string;stroke?:string;sw?:number}>=
({x,y,size,seed,bg,fg,stroke,sw=4})=>{
  const cell=size*0.17, gap=size*0.08, pad=(size-(4*cell+3*gap))/2;
  const cells:React.ReactNode[]=[];
  for(let i=0;i<4;i++) for(let j=0;j<4;j++){
    const h=hash(seed*13.7+i*5.1+j*1.9);
    if(h>0.42) cells.push(<rect key={`${i}-${j}`} x={x+pad+i*(cell+gap)} y={y+pad+j*(cell+gap)} width={cell} height={cell} rx={cell*0.2} fill={fg} opacity={0.55+0.45*hash(seed+i*3+j)}/>);
  }
  return <g>
    <rect x={x} y={y} width={size} height={size} rx={size*0.16} fill={bg} stroke={stroke} strokeWidth={stroke?sw:0}/>
    {cells}
  </g>;
};
