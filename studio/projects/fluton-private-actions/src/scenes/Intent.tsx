import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {Glyph,LitCard} from '../components/ActionCard';
import {C,CARD,CARDS,EASE,Pt,TRAIL_D,clamp,lerp,lerpPts,pts,prog} from '../visual-system';

const S=film.scenes[1];
const DX=120, DY=64, SW=520, SH=60, X0=1180;

/** Oblique ("cabinet") slab: front, top and side faces. */
const Slab:React.FC<{x:number;y:number;w?:number;h?:number;front:string;top:string;side:string;stroke?:string}>=
({x,y,w=SW,h=SH,front,top,side,stroke})=>{
  const T:Pt[]=[[x,y],[x+w,y],[x+w+DX,y-DY],[x+DX,y-DY]];
  const R:Pt[]=[[x+w,y],[x+w+DX,y-DY],[x+w+DX,y+h-DY],[x+w,y+h]];
  return <g stroke={stroke} strokeWidth={stroke?4:0} strokeLinejoin="round">
    <polygon points={pts(T)} fill={top}/><polygon points={pts(R)} fill={side}/>
    <rect x={x} y={y} width={w} height={h} fill={front}/>
  </g>;
};

/** Scene 2: the trail collapses into one intention, which becomes the top of a cutaway stack. */
export const Intent:React.FC<{f:number}>=({f})=>{
  // 1) match cut: scene 1's cards and trail, inverted for the green field
  const merge=EASE.inOut(prog(f,8,32));
  const trailGone=EASE.inOut(prog(f,6,26));
  const toInk=prog(f,28,12);
  const swapLabel=prog(f,26,10);
  // 2) the card flattens into the top face of the intent slab, the stack rises under it
  const morph=EASE.inOut(prog(f,40,34));
  const open=EASE.inOut(prog(f,70,32)); // explode layers apart
  const yI=lerp(520,420,open), yE=lerp(590,570,open), yB=lerp(640,724,open);
  const riseB=EASE.out(prog(f,48,26)), riseE=EASE.out(prog(f,58,26));
  const flat:Pt[]=[[960-260,440-150],[960+260,440-150],[960+260,440+150],[960-260,440+150]];
  // top face of the intent slab (floats above the stack)
  const topI:Pt[]=[[X0,yI],[X0+SW,yI],[X0+SW+DX,yI-DY],[X0+DX,yI-DY]];
  const face=lerpPts(flat,topI,morph);
  const fcx=face.reduce((a,p)=>a+p[0],0)/4, fcy=face.reduce((a,p)=>a+p[1],0)/4;
  const slabIn=EASE.out(prog(f,70,16));
  // 3) intent descends: hidden behind the opaque execution layer, lands on the public base
  const dp=prog(f,104,40), dpe=EASE.inOut(dp);
  const dotX=X0+SW/2+DX/2, dotY=lerp(yI-DY/2,724-DY/2-6,dpe);
  const ripple=prog(f,144,22);
  const labels=[['INTENT',yI+SH/2-DY/2+8,0],['CONFIDENTIAL EXECUTION',yE+SH/2-DY/2+8,1],['PUBLIC CHAIN',yB+SH/2-DY/2+8,2]] as const;
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <Kicker text={S.kicker} x={96} y={170} f={f} start={44} fill={C.ink} bar={C.ink}/>

    {/* match-cut cards + trail (ink on green) */}
    {f<40&&<g>
      {trailGone<0.98&&<path d={TRAIL_D} pathLength={1} fill="none" stroke={C.ink} strokeWidth={10} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={trailGone}/>}
      {CARDS.map((c,i)=>{
        const tx=960-CARD.w/2, ty=400;
        const k=i===1?0:merge;
        const x=lerp(c.x,tx,k), y=lerp(c.y,ty,k);
        const o=i===1?1:1-prog(f,24,16);
        const s=i===1?lerp(1,520/CARD.w,merge):lerp(1,0.86,merge);
        // card contents dissolve before the faces stack, so labels/icons never collide mid-merge
        const faceOnly=clamp(1-merge*2.4);
        return <Item key={i} o={o} s={s} ox={x+CARD.w/2} oy={y+CARD.h/2}>
          {i===1
            ? <LitCard x={x} y={y} label={swapLabel>0.5?'INTENT':c.label} glyph={c.glyph} face={toInk>0.5?C.ink:C.white} ink={toInk>0.5?C.white:C.ink}/>
            : <><rect x={x} y={y} width={CARD.w} height={CARD.h} rx={28} fill={C.white}/><Item o={faceOnly}><Glyph kind={c.glyph} cx={x+CARD.w/2} cy={y+98} color={C.ink}/><text x={x+CARD.w/2} y={y+216} fontSize={40} fontWeight={900} textAnchor="middle" fill={C.ink} style={{letterSpacing:'0.06em'}}>{c.label}</text></Item></>}
        </Item>;
      })}
    </g>}
    {f>=40&&<polygon points={pts(face)} fill={C.ink}/>}
    {f>=40&&f<78&&<Item o={clamp(1-morph*1.6)}>
      <Glyph kind="send" cx={fcx} cy={fcy-32} color={C.white}/>
      <text x={fcx} y={fcy+107} fontSize={47} fontWeight={900} textAnchor="middle" fill={C.white} style={{letterSpacing:'0.06em'}}>INTENT</text>
    </Item>}

    {/* layered cutaway, bottom to top */}
    <Item y={(1-riseB)*260} o={riseB}><Slab x={X0} y={yB} front={C.ink} top="#3F3F46" side={C.ink}/></Item>
    {dp>0&&dp<1&&<g>
      <line x1={dotX} x2={dotX} y1={yI-DY/2} y2={yB-DY/2} stroke={C.ink} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round"/>
      <circle cx={dotX} cy={dotY} r={16} fill={C.green} stroke={C.ink} strokeWidth={6}/>
    </g>}
    {ripple>0&&ripple<1&&<ellipse cx={dotX} cy={yB-DY/2} rx={lerp(14,110,EASE.out(ripple))} ry={lerp(6,40,EASE.out(ripple))} fill="none" stroke={C.ink} strokeWidth={6} opacity={1-ripple}/>}
    <Item y={(1-riseE)*240} o={riseE}><Slab x={X0} y={yE} front={C.white} top="#E4E4E7" side="#D4D4D8" stroke={C.ink}/></Item>
    {slabIn>0&&<Item o={slabIn}>
      <polygon points={pts([[X0+SW,yI],[X0+SW+DX,yI-DY],[X0+SW+DX,yI+SH*slabIn-DY],[X0+SW,yI+SH*slabIn]])} fill={SHADE_INK}/>
      <rect x={X0} y={yI} width={SW} height={SH*slabIn} fill={C.ink}/>
    </Item>}

    {/* leader labels */}
    {labels.map(([t,y,i])=>{
      const p=EASE.out(prog(f,86+i*8,18));
      return <Item key={t} x={(1-p)*-30} o={p}>
        <text x={96} y={y} fontSize={36} fontWeight={900} fill={C.ink} style={{letterSpacing:'0.04em'}}>{t}</text>
        <line x1={96+(t.length*27)+16} x2={X0-18} y1={y-12} y2={y-12} stroke={C.ink} strokeWidth={3} strokeDasharray="3 10" strokeLinecap="round"/>
      </Item>;
    })}

    <Headline id="s2" lines={['A DIFFERENT','EXECUTION LAYER.']} x={96} y={268} size={88} f={f} start={64} fill={C.ink}/>
  </svg>;
};
const SHADE_INK='#18181B';
