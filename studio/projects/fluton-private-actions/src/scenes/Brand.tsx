import React from 'react';
import {AbsoluteFill,Img} from 'remotion';
import {motion} from 'framer-motion';
import {film} from '../timeline';
import {BRAND,WORDMARK_ASPECT} from '../brand';
import {Item} from '../components/Item';
import {Headline} from '../components/Headline';
import {SealedTile} from '../components/Sealed';
import {C,EASE,lerp,prog,tw} from '../visual-system';

const S=film.scenes[6];
const RAIL_Y=706, FINAL=[240,600,960,1320,1680], TILE=48;
const WM_W=720, WM_H=WM_W/WORDMARK_ASPECT;

/** Scene 7: private actions ride public rails; the exact wordmark and CTA settle by local frame 180 and hold. */
export const Brand:React.FC<{f:number}>=({f})=>{
  const rails=lerp(0.7,1,EASE.out(prog(f,-18,20)));
  const wm=EASE.out(prog(f,-10,34));
  const cta=EASE.out(prog(f,96,22));
  const ties:React.ReactNode[]=[]; // rails sit clear of the second headline baseline
  for(let x=96;x<1824;x+=48) ties.push(<rect key={x} x={x} y={RAIL_Y+40} width={8} height={14} rx={3} fill={C.white} opacity={0.28}/>);
  return <AbsoluteFill>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position:'absolute',left:0,top:0}}>
      <Headline id="s7" lines={['PUBLIC RAILS.','PRIVATE ACTIONS.']} x={960} y={452} size={96} f={f} start={22} fill={C.white} fills={[C.white,C.green]} anchor="middle" lh={118}/>

      {/* two public rails */}
      <g opacity={rails}>
        <rect x={96} y={RAIL_Y-3} width={1728} height={6} rx={3} fill={C.white}/>
        <rect x={96} y={RAIL_Y+30} width={1728} height={6} rx={3} fill={C.white} opacity={0.6}/>
        {ties}
      </g>
      {/* sealed private actions ride the rails, decelerating to rest by frame 172 */}
      {FINAL.map((fx,i)=>{
        const x=fx-900*(1-EASE.out(prog(f,-24+i*8,146)));
        return <SealedTile key={i} x={x-TILE/2} y={RAIL_Y-3-TILE} size={TILE} seed={40+i*3} bg={C.ink} fg={C.white} stroke={C.white} sw={3}/>;
      })}

      <Item x={(1-cta)*16} o={cta}>
        <text x={872} y={806} fontSize={48} fontWeight={900} fill={C.white} style={{letterSpacing:'0.02em'}}>{S.kicker}</text>
        <rect x={872} y={820} width={206*cta} height={6} rx={3} fill={C.green}/>
      </Item>
    </svg>
    {/* exact bundled marks: HTML Img so Remotion waits for the assets; transforms are frame-derived */}
    <motion.div initial={false} style={{position:'absolute',left:960-WM_W/2,top:140,width:WM_W,height:WM_H,y:(1-wm)*40,opacity:Math.min(1,wm*2),clipPath:`inset(0 0 ${(1-wm)*100}% 0)`}}>
      <Img src={BRAND.wordmark} style={{width:'100%',height:'100%',display:'block'}}/>
    </motion.div>
    <motion.div initial={false} style={{position:'absolute',left:800,top:766,width:56,height:56,opacity:cta,x:(1-cta)*16}}>
      <Img src={BRAND.mark} style={{width:'100%',height:'100%',display:'block'}}/>
    </motion.div>
  </AbsoluteFill>;
};
