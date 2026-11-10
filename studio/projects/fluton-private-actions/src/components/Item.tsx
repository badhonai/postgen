import React from 'react';
import {motion} from 'framer-motion';

/**
 * Frame-derived transform wrapper. Framer Motion receives plain numbers via `style`
 * with initial={false}; there is no animate/exit/layout, so nothing runs on a wall clock.
 * x/y/opacity go through motion.g; rotation/scale are explicit SVG math about (ox,oy).
 */
export const Item:React.FC<{x?:number;y?:number;o?:number;s?:number;sx?:number;sy?:number;r?:number;ox?:number;oy?:number;children?:React.ReactNode}>=
({x=0,y=0,o=1,s=1,sx,sy,r=0,ox=0,oy=0,children})=>{
  if(o<=0.001) return null;
  const kx=sx??s, ky=sy??s;
  return <motion.g initial={false} style={{x,y,opacity:o}}>
    <g transform={`translate(${ox} ${oy}) rotate(${r}) scale(${kx} ${ky}) translate(${-ox} ${-oy})`}>{children}</g>
  </motion.g>;
};
