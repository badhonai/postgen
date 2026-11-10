import React from 'react';
import {P,W,H,SIDE,clamp,sp} from '../system';
import {MONO} from '../system';
import {Words} from '../system';
import {sentencesOf,at} from '../lines';
import {ChapterProps} from '../Film';

/** 07 · Only the net amount crossing the pool is public. */
export const BoundaryScene:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('boundary');
 const ink=scene.foreground;
 const end=at('boundary','public.',0,1328);
 const v=(-4*clamp((frame-s[0].startFrame)/(end-s[0].startFrame))).toFixed(2);
 return <>
  <div style={{position:'absolute',left:SIDE,top:100,width:1000}}>
   <Words sentence={s[0]} f={frame} size={62} color={ink} hot={['net','amount']} hotColor={P.verm} maxW={1000}/>
  </div>
  <div style={{position:'absolute',left:SIDE-10,top:330,fontFamily:MONO,fontWeight:800,fontSize:230,
    letterSpacing:-6,fontVariantNumeric:'tabular-nums'}}>{v}</div>
  <div style={{position:'absolute',left:SIDE,top:620,fontFamily:MONO,fontSize:24,letterSpacing:4,
    opacity:0.7}}>CROSSES THE POOL · PUBLIC</div>
  <div style={{position:'absolute',right:SIDE,top:330,width:600,height:360,background:ink,
    opacity:clamp(sp(frame,1288,9)),transform:`translateX(${(1-clamp(sp(frame,1288,9)))*80}px)`}}>
   <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
     fontFamily:'FlutonDisplay',fontSize:104,color:P.paper,letterSpacing:-2}}>SEALED</div>
  </div>
 </>;
};
