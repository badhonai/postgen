import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {SealedTile} from '../components/Sealed';
import {C,EASE,lerp,prog,tw} from '../visual-system';

const S=film.scenes[4];
const N=100;                                  // sealed note size
const GX=1060, GW=640, GY=400, GH=100;        // join-split gadget
const IN_X=[GX+150,GX+GW-150];                // two input slots (centres)
const OUT_SLOT=[GX+150,GX+GW/2,GX+GW-150];    // three output slots
const OUT_END=[1150,1380,1610];               // where the outputs settle on the lower ledger
const TOP_Y=130, TOP_H=200, BOT_Y=580, BOT_H=220;
const ROW_IN=255, ROW_OUT=650;                // note centre lines on each ledger

const Ledger:React.FC<{x:number;y:number;w:number;h:number;fill:string;line:string;stroke:string}>=({x,y,w,h,fill,line,stroke})=>
  <g>
    <rect x={x} y={y} width={w} height={h} rx={22} fill={fill} stroke={stroke} strokeWidth={5}/>
    {[1,2,3,4].map(i=><line key={i} x1={x+22} x2={x+w-22} y1={y+(h/5)*i} y2={y+(h/5)*i} stroke={line} strokeWidth={2}/>)}
  </g>;

const Note:React.FC<{cx:number;cy:number;seed:number}>=({cx,cy,seed})=>
  <SealedTile x={cx-N/2} y={cy-N/2} size={N} seed={seed} bg={C.ink} fg={C.white}/>;

/** Scene 5: a vertical join-split. Two input notes enter slots; three outputs leave different slots. */
export const Notes:React.FC<{f:number}>=({f})=>{
  const topP=EASE.out(prog(f,-9,30)), botP=EASE.out(prog(f,-2,30)), gP=EASE.out(prog(f,8,26));
  const pop=(a:number)=>EASE.back(prog(f,a,18));
  // inputs: slide down their guide lines into the slots (hidden once fully inside the gadget)
  const i1=tw(f,80,48,EASE.in,ROW_IN,GY+GH/2);
  const i2=tw(f,100,48,EASE.in,ROW_IN,GY+GH/2);
  // outputs: leave the lower slots, then fan out along the lower ledger
  const oc=[190,200,210].map(a=>({y:tw(f,a,50,EASE.out,GY+GH/2,ROW_OUT),k:EASE.inOut(prog(f,a+14,40))}));
  const flow=prog(f,128,64);
  const labelIn=tw(f,44,16,EASE.out), labelOut=tw(f,206,16,EASE.out);
  // flow lines inside the gadget: 2 in → centre → 3 out, traced analytically
  const lines:{d:string;a:number}[]=[
    {d:`M${IN_X[0]} ${GY+14}V${GY+GH/2}H${GX+GW/2}`,a:0},
    {d:`M${IN_X[1]} ${GY+14}V${GY+GH/2}H${GX+GW/2}`,a:0.08},
    {d:`M${GX+GW/2} ${GY+GH/2}H${OUT_SLOT[0]}V${GY+GH-14}`,a:0.5},
    {d:`M${GX+GW/2} ${GY+GH/2}V${GY+GH-14}`,a:0.56},
    {d:`M${GX+GW/2} ${GY+GH/2}H${OUT_SLOT[2]}V${GY+GH-14}`,a:0.62},
  ];
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs>
      <clipPath id="notesAbove"><rect x={0} y={0} width={1920} height={GY}/></clipPath>
      <clipPath id="notesBelow"><rect x={0} y={GY+GH} width={1920} height={400}/></clipPath>
    </defs>
    <Kicker text={S.kicker} x={96} y={430} f={f} start={2} fill={C.ink} bar={C.ink}/>
    <Headline id="s5" lines={['VALUE MOVES AS','PRIVATE NOTES.']} x={96} y={532} size={88} f={f} start={6} fill={C.ink}/>

    {/* upper ledger: inputs */}
    <Item y={(1-topP)*-120} o={topP}><Ledger x={GX-40} y={TOP_Y} w={GW+80} h={TOP_H} fill={C.white} line="rgba(9,9,11,0.14)" stroke={C.ink}/></Item>
    {/* lower ledger: outputs (different plane, different colour) */}
    <Item y={(1-botP)*120} o={botP}><Ledger x={GX-40} y={BOT_Y} w={GW+80} h={BOT_H} fill={C.green} line="rgba(9,9,11,0.22)" stroke={C.ink}/></Item>

    {/* guide rails from ledger to gadget slots */}
    <g stroke={C.ink} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={gP}>
      {IN_X.map(x=><line key={x} x1={x} x2={x} y1={TOP_Y+TOP_H} y2={GY}/>)}
      {OUT_SLOT.map(x=><line key={x} x1={x} x2={x} y1={GY+GH} y2={BOT_Y}/>)}
    </g>

    {/* spent inputs leave dashed footprints on the upper ledger */}
    {IN_X.map((x,i)=>f>=(i?116:96)&&<rect key={x} x={x-N/2} y={ROW_IN-N/2} width={N} height={N} rx={16} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="10 10" opacity={0.5}/>)}

    {/* inputs: visible only above the gadget; its opaque face is their occluder */}
    <g clipPath="url(#notesAbove)">
      <Item s={pop(46)} ox={IN_X[0]} oy={ROW_IN}><Note cx={IN_X[0]} cy={f<80?ROW_IN:i1} seed={5}/></Item>
      <Item s={pop(52)} ox={IN_X[1]} oy={ROW_IN}><Note cx={IN_X[1]} cy={f<100?ROW_IN:i2} seed={9}/></Item>
    </g>

    {/* outputs: visible only below the gadget */}
    <g clipPath="url(#notesBelow)">
      {f>=190&&oc.map((o,i)=>{
        const cx=lerp(OUT_SLOT[i],OUT_END[i],o.k);
        return <Note key={i} cx={cx} cy={o.y} seed={14+i*7}/>;
      })}
    </g>

    <Item sy={gP} ox={GX+GW/2} oy={GY+GH/2} o={gP}>
      <rect x={GX} y={GY} width={GW} height={GH} rx={24} fill={C.ink}/>
      {[...IN_X,...OUT_SLOT].map((x,i)=><rect key={i} x={x-N/2-10} y={i<2?GY-4:GY+GH-16} width={N+20} height={20} rx={8} fill={C.green}/>)}
      {lines.map((l,i)=>EASE.inOut(Math.min(1,Math.max(0,(flow-l.a)/0.4)))>0.001&&<path key={i} d={l.d} pathLength={1} fill="none" stroke={C.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1-EASE.inOut(Math.min(1,Math.max(0,(flow-l.a)/0.4)))}/>)}
    </Item>

    <Item o={labelIn} y={(1-labelIn)*10}><text x={GX-10} y={TOP_Y+50} fontSize={36} fontWeight={900} fill={C.ink} style={{letterSpacing:'0.04em'}}>2 SEALED NOTES IN</text></Item>
    <Item o={labelOut} y={(1-labelOut)*10}><text x={GX-10} y={BOT_Y+BOT_H-28} fontSize={36} fontWeight={900} fill={C.ink} style={{letterSpacing:'0.04em'}}>3 SEALED NOTES OUT</text></Item>
  </svg>;
};
