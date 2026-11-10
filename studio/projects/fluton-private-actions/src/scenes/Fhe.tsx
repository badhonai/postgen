import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {SealedTile} from '../components/Sealed';
import {C,EASE,lerp,prog,tw} from '../visual-system';

const S=film.scenes[2];
const RAIL=600, T=120, TOP=RAIL-T/2;
const ADD={x:600,w:240}, CMP={x:1240,w:240}, HY=450, HH=300;

/** Machine housing: opaque, so sealed tiles are genuinely hidden while inside it. */
const Housing:React.FC<{m:{x:number;w:number};icon:'plus'|'gte';spin:number;squeeze:number;label:string}>=({m,icon,spin,squeeze,label})=>{
  const cx=m.x+m.w/2;
  return <g>
    <Item sy={squeeze} ox={cx} oy={HY+HH}>
      <rect x={m.x} y={HY} width={m.w} height={HH} rx={26} fill={C.white}/>
      {/* ink mouths: tiles visibly enter and leave through these */}
      <rect x={m.x} y={TOP-6} width={26} height={T+12} rx={8} fill={C.ink}/>
      <rect x={m.x+m.w-26} y={TOP-6} width={26} height={T+12} rx={8} fill={C.ink}/>
      <g transform={`translate(${cx} ${HY+48}) rotate(${spin})`}>
        {icon==='plus'
          ? <path d="M-30 0H30M0 -30V30" stroke={C.ink} strokeWidth={14} strokeLinecap="round"/>
          : <path d="M-26 -30L26 -8L-26 14M-26 38H26" fill="none" stroke={C.ink} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"/>}
      </g>
      <text x={cx} y={HY+HH-26} fontSize={30} fontWeight={900} textAnchor="middle" fill={C.ink} style={{letterSpacing:'0.12em'}}>{label}</text>
    </Item>
  </g>;
};

const Tile:React.FC<{cx:number;cy:number;seed:number;size?:number;strong?:boolean}>=({cx,cy,seed,size=T,strong})=>
  <SealedTile x={cx-size/2} y={cy-size/2} size={size} seed={seed} bg={C.ink} fg={C.white} stroke={strong?C.white:undefined} sw={6}/>;

/** Scene 3: sealed encrypted tiles are added and compared without ever being opened. */
export const Fhe:React.FC<{f:number}>=({f})=>{
  // A and B ride into ADD; the sum S leaves; threshold Th drops into CMP; result R leaves.
  const aX=tw(f,10,52,EASE.out,-90,730);
  const bX=tw(f,30,52,EASE.out,-90,730);
  const addWork=EASE.inOut(prog(f,84,30));
  const sX=tw(f,112,52,EASE.inOut,730,1150);          // sum travels to compare
  const sIn=tw(f,166,26,EASE.inOut,1150,1370);        // ...and enters its mouth
  const sCx=f<166?sX:sIn;
  const thY=tw(f,150,36,EASE.in,150,TOP+T/2);
  const thPop=EASE.back(prog(f,134,14));         // threshold falls through the roof
  const cmpWork=EASE.inOut(prog(f,196,28));
  const rX=tw(f,226,36,EASE.out,1370,1700);
  const sumVisible=f>=112&&f<200, thVisible=f>=134&&f<200, rVisible=f>=226;
  const sw=prog(f,106,10); // sum tile pops out of ADD
  const pop=(w:number)=>1+0.08*Math.sin(Math.PI*w);
  // conveyor ties
  const ties:React.ReactNode[]=[];
  for(let x=72;x<1860;x+=48) ties.push(<rect key={x} x={x} y={RAIL+T/2+8} width={10} height={16} rx={3} fill={C.white} opacity={0.35}/>);
  const railP=lerp(0.55,1,EASE.out(prog(f,-6,18))); // machinery pre-set at the cut, then settles
  const seat=EASE.out(prog(f,-4,16));
  const labelP=tw(f,120,18,EASE.out);
  // ADD hides everything between its mouths; CMP likewise. Two clip regions keep occlusion explicit.
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs>
      <clipPath id="fheOutside"><path d={`M0 0H${ADD.x+14}V1080H0ZM${ADD.x+ADD.w-14} 0H${CMP.x+14}V1080H${ADD.x+ADD.w-14}ZM${CMP.x+CMP.w-14} 0H1920V1080H${CMP.x+CMP.w-14}Z`}/></clipPath>
      <clipPath id="fheRoof"><rect x={0} y={0} width={1920} height={HY+6}/></clipPath>
    </defs>
    <Kicker text={S.kicker} x={96} y={170} f={f} start={2} fill="rgba(248,250,252,0.8)" bar={C.white}/>
    <Headline id="s3" lines={['COMPUTE ON','ENCRYPTED VALUES.']} x={96} y={268} size={92} f={f} start={2} fill={C.white}/>

    <g opacity={railP}>
      <rect x={96} y={RAIL+T/2+2} width={1728*railP} height={6} rx={3} fill={C.white}/>
      {ties}
    </g>

    {/* sealed tiles travel behind the housing faces */}
    <g clipPath="url(#fheOutside)">
      <Item o={f<90?1:0}><Tile cx={aX} cy={RAIL} seed={3}/></Item>
      <Item o={f<90?1:0}><Tile cx={bX} cy={RAIL} seed={8}/></Item>
      {sumVisible&&<Item s={pop(sw)} ox={sCx} oy={RAIL}><Tile cx={sCx} cy={RAIL} seed={21} size={T*1.12}/></Item>}
      {rVisible&&<Item o={1}><Tile cx={rX} cy={RAIL} seed={34} size={T} strong/></Item>}
    </g>
    {thVisible&&<line x1={1360} x2={1360} y1={thY+50} y2={HY} stroke={C.white} strokeWidth={4} strokeDasharray="4 14" strokeLinecap="round" opacity={0.65}/>}
    <g clipPath="url(#fheRoof)">{thVisible&&<Item s={thPop} ox={1360} oy={thY}><Tile cx={1360} cy={thY} seed={55} size={88}/></Item>}</g>

    <Housing m={ADD} icon="plus" spin={addWork*90} squeeze={(1-0.07*Math.sin(Math.PI*addWork))*(0.94+0.06*seat)} label="ADD"/>
    <Housing m={CMP} icon="gte" spin={0} squeeze={(1-0.07*Math.sin(Math.PI*cmpWork))*(0.94+0.06*seat)} label="COMPARE"/>

    <Item o={labelP} y={(1-labelP)*16}>
      <text x={96} y={800} fontSize={38} fontWeight={900} fill={C.white} style={{letterSpacing:'0.04em'}}>SEALED IN / SEALED OUT</text>
    </Item>
  </svg>;
};
