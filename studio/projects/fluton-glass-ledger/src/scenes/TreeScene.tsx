import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../sys';
import {MONO} from '../fonts';
import {Words} from '../type';
import {sentencesOf} from '../lines';
import {ChapterProps} from '../Film';

/** 03 · Each note is one sealed commitment, a leaf in a single append-only tree. */
export const TreeScene:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('tree');
 const ink=scene.foreground;
 const LEVELS=4;
 const topY=520, step=84;
 const cx0=SIDE+10, cx1=SIDE+1120;
 const xs=(lv:number)=>{
  const n=Math.pow(2,lv);
  return Array.from({length:n}).map((_,i)=>cx0+((cx1-cx0)*i)/Math.max(1,n-1));
 };
 const y=(lv:number)=>topY+lv*step;
 const lit=Math.floor(clamp((frame-520)/60)*16);
 const root=`${((frame*5)%1048575).toString(16)}`.padStart(5,'0');
 return <>
  <div style={{position:'absolute',left:SIDE,top:120,width:1300}}>
   <Words sentence={s[0]} f={frame} size={64} color={ink} hot={['commitment,','tree.']} hotColor={P.blue}
     maxW={1300}/>
  </div>
  <svg width={W} height={H} style={{position:'absolute',inset:0}}>
   {Array.from({length:LEVELS}).map((_,lv)=>(
    <g key={lv} opacity={clamp(sp(frame,470+lv*9,11))}>
     {xs(lv).map((x,i)=>{
      const a=xs(lv+1)[2*i], b=xs(lv+1)[2*i+1], mid=y(lv)+step/2;
      return <g key={i} stroke={ink} strokeWidth={2.5} fill="none" opacity={0.68}>
       <polyline points={`${x},${y(lv)+11} ${x},${mid} ${a},${mid} ${a},${y(lv+1)-11}`}/>
       <polyline points={`${x},${mid} ${b},${mid} ${b},${y(lv+1)-11}`}/>
      </g>;
     })}
    </g>
   ))}
   {Array.from({length:LEVELS+1}).map((_,lv)=>(
    <g key={lv} opacity={clamp(sp(frame,470+lv*9,11))}>
     {xs(lv).map((x,i)=>{
      const leaf=lv===LEVELS;
      const on=leaf?i<lit:true;
      const size=leaf?22:28;
      return <rect key={i} x={x-size/2} y={y(lv)-size/2} width={size} height={size}
        fill={lv===0?P.blue:(leaf&&on?P.blue:'none')} stroke={lv===0?'none':ink} strokeWidth={2.5}
        opacity={leaf&&!on?0.32:1}/>;
     })}
    </g>
   ))}
  </svg>
  <div style={{position:'absolute',left:cx1+20,top:topY-16,fontFamily:MONO,fontSize:22,letterSpacing:2,
    lineHeight:1.6,opacity:0.8}}>
   <div>ROOT 0x{root}</div>
   <div style={{opacity:0.6}}>{`LEAVES ${String(lit).padStart(2,'0')} / 16`}</div>
  </div>
 </>;
};
