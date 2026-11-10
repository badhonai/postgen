import React from 'react';
import {film} from '../timeline';
import {Item} from '../components/Item';
import {Headline,Kicker} from '../components/Headline';
import {C,EASE,Pt,hash,lerp,prog,quad,tw} from '../visual-system';

const S=film.scenes[3];
const CH:Pt=[470,590], R=190;            // private note chamber
const PORT:Pt=[CH[0]+R,CH[1]];            // output port on the chamber rim
const VX=1300, VY=440, VW=360, VH=300;    // mechanical check
const SLOT:Pt=[VX,590];
const START:Pt=[PORT[0]+36,PORT[1]];
const CTRL:Pt=[(PORT[0]+SLOT[0])/2+20,330];

const hexPts=(cx:number,cy:number,r:number)=>Array.from({length:6},(_,i)=>{const a=Math.PI/3*i+Math.PI/6;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(' ');

/** Scene 3→4 contrast: line-art chamber and gate, one camera push, one small proof crossing the gap. */
export const Zk:React.FC<{f:number}>=({f})=>{
  const ringP=lerp(0.5,1,EASE.out(prog(f,-8,30)));
  const vP=lerp(0.55,1,EASE.out(prog(f,-4,30)));
  const spin=prog(f,56,120)*70+Math.max(0,f-56)*0.35;
  const door=EASE.inOut(prog(f,84,16))*(1-EASE.inOut(prog(f,196,14)));
  const form=EASE.back(prog(f,100,22));
  const travel=EASE.inOut(prog(f,124,58));
  const dock=EASE.inOut(prog(f,184,16));
  const lever=EASE.inOut(prog(f,200,20));
  const lamp=prog(f,204,10);
  const check=EASE.out(prog(f,214,26));
  const cam=EASE.inOut(prog(f,120,66));
  const tp=quad(START,CTRL,[SLOT[0]-34,SLOT[1]],travel);
  const px=f<124?lerp(PORT[0],START[0],Math.min(1,form)):tp[0]+dock*34;
  const py=f<124?PORT[1]:tp[1];
  const ps=f<124?form:lerp(1,0.8,dock);
  const proofShown=f>=100;
  const cells:React.ReactNode[]=[];
  for(let i=0;i<7;i++) for(let j=0;j<7;j++){
    const x=CH[0]-84+i*28, y=CH[1]-84+j*28;
    if(Math.hypot(x+10-CH[0],y+10-CH[1])<108) cells.push(<rect key={`${i}${j}`} x={x} y={y} width={20} height={20} rx={5} fill={C.white} opacity={0.1+0.2*hash(i*9+j)}/>);
  }
  return <svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <Kicker text={S.kicker} x={96} y={170} f={f} start={2} fill="rgba(248,250,252,0.75)" bar={C.green}/>
    <Headline id="s4" lines={[S.headline]} x={96} y={292} size={112} f={f} start={1} fill={C.white}/>

    <g transform={`translate(${-60*cam} ${0}) translate(1100 600) scale(${1+0.06*cam}) translate(-1100 -600)`}>
      {/* chamber: closed ring set, opaque core, a single port */}
      <circle cx={CH[0]} cy={CH[1]} r={R} fill={C.ink} stroke={C.white} strokeWidth={6} opacity={0.35+0.65*ringP} transform={`rotate(-90 ${CH[0]} ${CH[1]})`}/>
      <g transform={`rotate(${spin} ${CH[0]} ${CH[1]})`} opacity={ringP}>
        <circle cx={CH[0]} cy={CH[1]} r={R-30} fill="none" stroke={C.white} strokeWidth={14} pathLength={12} strokeDasharray="0.78 0.22" opacity={0.9}/>
      </g>
      <circle cx={CH[0]} cy={CH[1]} r={118} fill={C.ink} stroke={C.white} strokeWidth={4} opacity={ringP}/>
      <g opacity={EASE.out(prog(f,30,24))}>{cells}</g>
      {/* port door slides along the rim; the chamber itself never opens */}
      <g>
        <rect x={PORT[0]-34} y={PORT[1]-40} width={52} height={80} rx={14} fill={C.ink} stroke={C.white} strokeWidth={5}/>
        <rect x={PORT[0]-30} y={PORT[1]-36-0} width={44} height={72*(1-door)} rx={10} fill={C.white}/>
      </g>
      <text x={CH[0]} y={832} fontSize={30} fontWeight={900} textAnchor="middle" fill="rgba(248,250,252,0.85)" style={{letterSpacing:'0.12em'}}>PRIVATE NOTE</text>

      {/* the check: housing with a hex-shaped slot, a lever and a lamp */}
      <g opacity={vP}>
        <rect x={VX} y={VY} width={VW} height={VH} rx={30} fill={C.ink} stroke={C.white} strokeWidth={6}/>
        <polygon points={hexPts(VX,SLOT[1],46)} fill={C.ink} stroke={C.green} strokeWidth={6} strokeLinejoin="round"/>
        <g transform={`rotate(${lerp(-38,34,lever)} ${VX+VW-70} ${VY+62})`}>
          <line x1={VX+VW-70} y1={VY+62} x2={VX+VW-70} y2={VY+168} stroke={C.white} strokeWidth={12} strokeLinecap="round"/>
          <circle cx={VX+VW-70} cy={VY+170} r={16} fill={C.white}/>
        </g>
        <circle cx={VX+VW-70} cy={VY+62} r={12} fill={C.ink} stroke={C.white} strokeWidth={5}/>
        <circle cx={VX+80} cy={VY+58} r={24} fill={lamp>0?C.green:C.ink} stroke={C.white} strokeWidth={5}/>
        {check>0&&<path d={`M${VX+130} ${VY+200}L${VX+175} ${VY+244}L${VX+262} ${VY+150}`} pathLength={1} fill="none" stroke={C.green} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1-check}/>}
        <text x={VX+VW/2} y={VY+VH+56} fontSize={30} fontWeight={900} textAnchor="middle" fill="rgba(248,250,252,0.85)" style={{letterSpacing:'0.12em'}}>VERIFY</text>
      </g>

      {/* proof token: crosses the gap alone; the housing hides it as it docks */}
      {proofShown&&<g>
        <Item s={ps} ox={px} oy={py}>
          <polygon points={hexPts(px,py,44)} fill={C.green} stroke={C.ink} strokeWidth={5} strokeLinejoin="round"/>
          <path d={`M${px-17} ${py-10}h34M${px-17} ${py+2}h34M${px-17} ${py+14}h20`} stroke={C.ink} strokeWidth={5} strokeLinecap="round"/>
        </Item>
        {travel>0.05&&travel<0.97&&<text x={px} y={py-66} fontSize={30} fontWeight={900} textAnchor="middle" fill={C.green} style={{letterSpacing:'0.12em'}}>PROOF</text>}
      </g>}
    </g>
  </svg>;
};
