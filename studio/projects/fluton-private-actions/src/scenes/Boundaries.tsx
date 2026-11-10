import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {SealedTile} from '../components/Sealed';
import {C,EASE,lerp,prog,tw} from '../visual-system';

const S=film.scenes[5];
const GROUND=780, INT={x:680,w:560,y:330}, WALL_L=INT.x, WALL_R=INT.x+INT.w;
const TOK=60, TY=GROUND-70;                    // token footprint and centre line
const RW=240, RH=250, RY=395;                 // receipt
const ROWS=['AMOUNT','TOKEN','ADDRESS'];

const Eye:React.FC<{x:number;y:number;open?:boolean;color:string}>=({x,y,open=true,color})=>
  open
  ? <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"><path d="M-28 0Q0 -24 28 0Q0 24 -28 0Z"/><circle r={7} fill={color}/></g>
  : <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"><path d="M-28 -4Q0 18 28 -4"/><path d="M-16 8L-22 20M0 12V26M16 8L22 20"/></g>;

const receiptPath=(x:number)=>{
  const n=8, w=RW/n; let d=`M${x} ${RY}H${x+RW}V${RY+RH}`;
  for(let i=0;i<n;i++) d+=`L${x+RW-i*w-w/2} ${RY+RH+12}L${x+RW-(i+1)*w} ${RY+RH}`;
  return d+'Z';
};

const Receipt:React.FC<{x:number;rows:number[]}>=({x,rows})=>
  <g>
    <path d={receiptPath(x)} fill={C.white}/>
    {ROWS.map((t,i)=>{
      const p=rows[i];
      const by=RY+56+i*66;
      return <g key={t} opacity={p}>
        <text x={x+24} y={by} fontSize={30} fontWeight={900} fill={C.ink} style={{letterSpacing:'0.1em'}}>{t}</text>
        <rect x={x+24} y={by+14} width={(RW-48)*(0.45+0.5*[0.8,0.55,1][i])*p} height={14} rx={7} fill={C.blue}/>
      </g>;
    })}
  </g>;

/** Scene 6: a side section. Values are visible at the public entry/exit, sealed only between them. */
export const Boundaries:React.FC<{f:number}>=({f})=>{
  const ground=EASE.out(prog(f,-26,30));
  const grow=EASE.out(prog(f,-18,34));
  const tags=EASE.out(prog(f,52,16));
  // token path: approach, pause at the entry wall, cross the interior, pause, leave
  const tx=f<122?tw(f,70,52,EASE.inOut,170,WALL_L+12):f<206?tw(f,134,72,EASE.inOut,WALL_L+12,WALL_R-12):tw(f,214,48,EASE.out,WALL_R-12,1700);
  const showTok=f>=62;
  const born=EASE.back(prog(f,62,14));
  const rIn=EASE.out(prog(f,122,28)), rOut=EASE.out(prog(f,208,28));
  const rowIn=[0,1,2].map(i=>EASE.out(prog(f,150+i*10,14)));
  const rowOut=[0,1,2].map(i=>EASE.out(prog(f,234+i*10,14)));
  const xEntry=410, xExit=1270;
  const tokenPlain=<g><rect x={tx-TOK/2} y={TY-TOK/2} width={TOK} height={TOK} rx={14} fill={C.white}/><circle cx={tx} cy={TY} r={11} fill={C.blue}/></g>;
  const tokenSealed=<SealedTile x={tx-TOK/2} y={TY-TOK/2} size={TOK} seed={7} bg={C.ink} fg={C.white} stroke={C.white} sw={4}/>;
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs>
      <clipPath id="bdLeft"><rect x={0} y={0} width={WALL_L+16} height={1080}/></clipPath>
      <clipPath id="bdMid"><rect x={WALL_L+16} y={0} width={INT.w-32} height={1080}/></clipPath>
      <clipPath id="bdRight"><rect x={WALL_R-16} y={0} width={1080} height={1080}/></clipPath>
    </defs>
    <Kicker text={S.kicker} x={96} y={170} f={f} start={2} fill="rgba(248,250,252,0.8)" bar={C.white}/>
    <Headline id="s6" lines={[S.headline]} x={96} y={268} size={96} f={f} start={6} fill={C.white}/>

    {/* public bays */}
    <Item o={grow}>
      <rect x={96} y={INT.y} width={WALL_L-96} height={GROUND-INT.y} fill="rgba(248,250,252,0.08)"/>
      <rect x={WALL_R} y={INT.y} width={1824-WALL_R} height={GROUND-INT.y} fill="rgba(248,250,252,0.08)"/>
    </Item>

    {/* receipts print out from behind the interior wall */}
    <g>
      <Item x={(1-rIn)*250} o={f>=122?1:0}><Receipt x={xEntry} rows={rowIn}/></Item>
      <Item x={-(1-rOut)*250} o={f>=208?1:0}><Receipt x={xExit} rows={rowOut}/></Item>
    </g>

    {/* private interior: opaque, so sealed things inside stay unreadable */}
    <Item sy={grow} ox={960} oy={GROUND} o={grow}>
      <rect x={INT.x} y={INT.y} width={INT.w} height={GROUND-INT.y} fill={C.ink} stroke={C.white} strokeWidth={6}/>
      {[[790,440,3],[950,505,11],[1110,430,17]].map(([x,y,s])=><g key={s} opacity={0.6}><SealedTile x={x} y={y} size={64} seed={s} bg={C.ink} fg={C.white} stroke={C.white} sw={3}/></g>)}
    </Item>
    {/* door frames at both walls */}
    <Item o={grow}>
      <path d={`M${WALL_L-2} ${GROUND}V${TY-TOK/2-14}H${WALL_L+24}`} fill="none" stroke={C.white} strokeWidth={6} strokeLinejoin="round"/>
      <path d={`M${WALL_R+2} ${GROUND}V${TY-TOK/2-14}H${WALL_R-24}`} fill="none" stroke={C.white} strokeWidth={6} strokeLinejoin="round"/>
    </Item>
    <rect x={96} y={GROUND-3} width={1728*ground} height={6} rx={3} fill={C.white}/>

    {/* token: plain in public, sealed note-look between the two boundary planes */}
    {showTok&&<Item s={born} ox={tx} oy={TY}>
      <g clipPath="url(#bdLeft)">{tokenPlain}</g>
      <g clipPath="url(#bdMid)">{tokenSealed}</g>
      <g clipPath="url(#bdRight)">{tokenPlain}</g>
    </Item>}

    {/* bay tags */}
    <Item o={tags} y={(1-tags)*10}>
      <Eye x={xEntry+28} y={369} color={C.white}/><text x={xEntry+66} y={380} fontSize={30} fontWeight={900} fill={C.white} style={{letterSpacing:'0.14em'}}>PUBLIC</text>
      <Eye x={xExit+28} y={369} color={C.white}/><text x={xExit+66} y={380} fontSize={30} fontWeight={900} fill={C.white} style={{letterSpacing:'0.14em'}}>PUBLIC</text>
      <Eye x={INT.x+46} y={374} open={false} color={C.white}/><text x={INT.x+86} y={385} fontSize={30} fontWeight={900} fill={C.white} style={{letterSpacing:'0.14em'}}>PRIVATE</text>
    </Item>
  </svg>;
};
