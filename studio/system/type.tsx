import React from 'react';
import {DISPLAY, MONO} from './fonts';
import {clamp, lerp, prog} from './motion';

/**
 * Word-level typography. A spoken sentence is on screen for its whole duration and each word
 * lights on the frame it is spoken — that is what keeps picture and voice on one clock.
 */
import type {TypedSentence, TypedWord} from './lines';

const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');

export const Words:React.FC<{
  sentence:TypedSentence; f:number; size:number; color:string;
  hot?:string[]; hotColor?:string; hotStyle?:'color'|'strike'|'block';
  maxW?:number; lineHeight?:number; weight?:number; family?:string; exitAt?:number;
  align?:'left'|'center'; drift?:number; spacing?:number; blockText?:string; dim?:number;
}> = ({sentence,f,size,color,hot=[],hotColor,hotStyle='color',maxW=1728,lineHeight=0.92,
      weight=400,family=DISPLAY,exitAt,align='left',drift=0.4,spacing=-size*0.02,
      blockText='#0B0B0C',dim=0.34}) => {
  const out = exitAt===undefined?1:clamp(1-(f-exitAt)/6);
  return <div style={{display:'flex',flexWrap:'wrap',alignItems:'baseline',justifyContent:align==='center'?'center':'flex-start',
    columnGap:size*0.24,rowGap:size*0.04,maxWidth:maxW,fontFamily:family,fontWeight:weight,
    fontSize:size,lineHeight,letterSpacing:spacing,color,opacity:out}}>
    {sentence.words.map((w:TypedWord,i:number)=>{
      // The sentence is on screen the whole time; the word LIGHTS UP on the frame it is spoken.
      const p=clamp(prog(f,w.startFrame-1,5));
      const isHot=hot.map(norm).includes(norm(w.w));
      const strike=isHot&&hotStyle==='strike';
      const block=isHot&&hotStyle==='block';
      const dft=Math.sin(f*0.05+i*1.6)*drift;
      const base=block?1:dim+ (1-dim)*p;
      if(block){
        return <span key={i} style={{display:'inline-block',position:'relative',
          backgroundColor:p>0.15?hotColor:'transparent',color:p>0.15?blockText:'#00000000',
          padding:`0 ${size*0.05}px`,transform:`translateY(${(1-p)*-14}%)`}}>{w.w.toUpperCase()}</span>;
      }
      return <span key={i} style={{display:'inline-block',position:'relative',
        opacity:base,color:isHot&&p>0.2?hotColor:undefined,
        transform:`translate(${dft*0.5}px, ${(1-p)*size*0.05+dft*0.3}px)`}}>
        {w.w.toUpperCase()}
        {strike&&<span style={{position:'absolute',left:-4,right:-4,top:'54%',height:size*0.09,
          backgroundColor:hotColor,transform:`scaleX(${clamp(prog(f,w.startFrame+3,6))})`,
          transformOrigin:'left center'}}/>}
        {isHot&&!strike&&p>0.2&&<span style={{position:'absolute',left:0,right:0,bottom:-size*0.1,
          height:size*0.055,backgroundColor:hotColor,transform:`scaleX(${clamp(prog(f,w.startFrame,6))})`,
          transformOrigin:'left center'}}/>}
      </span>;
    })}
  </div>;
};

/** Mono line: serials, figures, equations. Ticks until it locks. */
export const Fig:React.FC<{x?:number;y?:number;text:string;size:number;color:string;o?:number;
  family?:string;weight?:number;anchor?:'left'|'right';spacing?:number;style?:React.CSSProperties}> = ({
  text,size,color,o=1,family=MONO,weight=700,anchor='left',spacing=0,style}) => (
  <div style={{fontFamily:family,fontSize:size,fontWeight:weight,color,opacity:o,letterSpacing:spacing,
    textAlign:anchor==='right'?'right':'left',fontVariantNumeric:'tabular-nums',...style}}>{text}</div>
);

export const lerpClamp=(a:number,b:number,t:number)=>lerp(a,b,clamp(t));
