import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {LitCard} from '../components/ActionCard';
import {C,CARD,CARDS,EASE,TRAIL_D,clamp,lerp,prog,trailPoint,tw} from '../visual-system';

const S=film.scenes[0];
const dim='rgba(248,250,252,';

/** Scene 1: an observer scan lights three public actions and the trail that joins them. */
export const Exposure:React.FC<{f:number}>=({f})=>{
  const beamX=lerp(-30,1990,EASE.inOut(prog(f,0,104)));
  const trailP=clamp((beamX-340)/(1580-340));
  const pulseT=EASE.inOut(prog(f,112,50));
  const pulse=f>=112&&f<=166?trailPoint(pulseT):null;
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="scanGrad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={C.white} stopOpacity={0}/>
        <stop offset="1" stopColor={C.white} stopOpacity={0.18}/>
      </linearGradient>
    </defs>
    <Kicker text={S.kicker} x={96} y={170} f={f} start={2} fill={`${dim}0.75)`} bar={C.green}/>

    {/* trail sits under the cards; it is drawn only behind the scan beam */}
    <path d={TRAIL_D} fill="none" stroke={`${dim}0.14)`} strokeWidth={10} strokeLinecap="round" strokeDasharray="2 22"/>
    {trailP>0.002&&<path d={TRAIL_D} pathLength={1} fill="none" stroke={C.green} strokeWidth={10} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1-trailP}/>}

    {CARDS.map((c,i)=>{
      const cx=c.x+CARD.w/2;
      const lit=clamp((beamX-(cx-CARD.w/2))/170);
      const ti=i/2;
      const flash=pulse?clamp(1-Math.abs(pulseT-ti)/0.1):0;
      const lock=EASE.out(lit);
      return <g key={i}>
        <rect x={c.x} y={c.y} width={CARD.w} height={CARD.h} rx={28} fill={`${dim}0.05)`} stroke={`${dim}0.28)`} strokeWidth={4}/>
        <Item o={lit}><LitCard x={c.x} y={c.y} label={c.label} glyph={c.glyph}/></Item>
        {/* observer lock-on brackets */}
        <Item o={lit} s={lerp(1.1,1,lock)} ox={cx} oy={c.y+CARD.h/2}>
          {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy],k)=>{
            const px=cx+sx*(CARD.w/2+22), py=c.y+CARD.h/2+sy*(CARD.h/2+22);
            return <path key={k} d={`M${px-sx*44} ${py}H${px}V${py-sy*44}`} fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"/>;
          })}
        </Item>
        {flash>0&&<rect x={c.x-6} y={c.y-6} width={CARD.w+12} height={CARD.h+12} rx={34} fill="none" stroke={C.green} strokeWidth={8} opacity={flash}/>}
      </g>;
    })}

    {pulse&&<g><circle cx={pulse[0]} cy={pulse[1]} r={26} fill={C.green} opacity={0.28}/><circle cx={pulse[0]} cy={pulse[1]} r={13} fill={C.green}/></g>}

    {/* the scan itself */}
    {f<108&&<g>
      <rect x={beamX-220} y={120} width={220} height={720} fill="url(#scanGrad)"/>
      <rect x={beamX-3} y={120} width={6} height={720} fill={C.white}/>
    </g>}

    <Headline id="s1" lines={[S.headline]} x={96} y={800} size={96} f={f} start={6} fill={C.white}/>
  </svg>;
};
