import {cubicBezier} from 'framer-motion';
import {film} from './timeline';

/** Palette comes from film-data.json so scene art never drifts from the wrapper. */
export const C=film.palette;
export const SHADE='#27272A';
export type Ease=(t:number)=>number;
export const clamp=(v:number,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
/** 0..1 progress of local frame f through [start, start+dur]. */
export const prog=(f:number,start:number,dur:number)=>clamp((f-start)/dur);
export const EASE={
  out:cubicBezier(0.16,1,0.3,1) as Ease,
  inOut:cubicBezier(0.65,0,0.35,1) as Ease,
  in:cubicBezier(0.55,0,0.9,0.35) as Ease,
  back:cubicBezier(0.34,1.45,0.64,1) as Ease,
  lin:((t:number)=>t) as Ease,
};
/** Eased tween between a and b across a frame window. Pure function of f. */
export const tw=(f:number,start:number,dur:number,ease:Ease=EASE.inOut,a=0,b=1)=>lerp(a,b,ease(prog(f,start,dur)));
/** Deterministic hash in 0..1 (fixed seeds only, no random state). */
export const hash=(n:number)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
export type Pt=[number,number];
export const cubic=(p0:Pt,p1:Pt,p2:Pt,p3:Pt,t:number):Pt=>{
  const u=1-t;
  return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];
};
export const quad=(p0:Pt,p1:Pt,p2:Pt,t:number):Pt=>{
  const u=1-t;
  return [u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]];
};
export const pts=(p:Pt[])=>p.map(q=>q.join(',')).join(' ');
export const lerpPts=(a:Pt[],b:Pt[],t:number):Pt[]=>a.map((p,i)=>[lerp(p[0],b[i][0],t),lerp(p[1],b[i][1],t)] as Pt);

/** Geometry shared by scene 1 (exposure) and the scene 2 match cut. */
export const CARD={w:440,h:250};
export const CARDS=[
  {x:120,y:300,label:'SWAP',glyph:'swap'},
  {x:740,y:400,label:'SEND',glyph:'send'},
  {x:1360,y:300,label:'VOTE',glyph:'vote'},
] as const;
export const TRAIL_D='M340 425 C560 425 740 525 960 525 C1180 525 1360 425 1580 425';
export const trailPoint=(t:number):Pt=>t<0.5
  ?cubic([340,425],[560,425],[740,525],[960,525],t*2)
  :cubic([960,525],[1180,525],[1360,425],[1580,425],t*2-1);
