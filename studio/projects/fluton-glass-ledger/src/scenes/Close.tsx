import React from 'react';
import {staticFile} from 'remotion';
import {P,W,H,SIDE,clamp,sp} from '../system';
import {MONO} from '../system';
import {Words} from '../system';
import {sentencesOf,at} from '../lines';
import {ChapterProps} from '../Film';

/** 08 · Deposits and withdrawals show their size. Everything inside stays sealed. */
export const Close:React.FC<ChapterProps>=({frame,scene})=>{
 const s=sentencesOf('close');
 const ink=scene.foreground;
 const tSealed=at('close','sealed.',1,1420);
 const tWord=at('close','everything',1,1400);
 return <>
  <div style={{position:'absolute',left:SIDE,top:96,width:1500}}>
   <Words sentence={s[0]} f={frame} size={44} color={ink} maxW={1500}/>
  </div>
  <div style={{position:'absolute',left:SIDE,top:262,width:1728}}>
   <Words sentence={s[1]} f={frame} size={132} color={ink} hot={['sealed.']} hotColor={P.paper}
     hotStyle="block" blockText={P.ink} maxW={1728}/>
  </div>
  <div style={{position:'absolute',right:SIDE,top:96,background:P.verm,color:P.ink,padding:'8px 16px',
    fontFamily:'FlutonDisplay',fontSize:48,letterSpacing:1,opacity:clamp(sp(frame,tSealed,9)),
    transform:'rotate(-6deg)'}}>SEALED</div>
  <div style={{position:'absolute',left:0,right:0,top:556,display:'flex',justifyContent:'center',
    opacity:clamp(sp(frame,tWord+22,13))}}>
   <img src={staticFile('brand/fluton-wordmark-white.png')} style={{width:620,height:620*(512/1997)}}/>
  </div>
  <div style={{position:'absolute',left:0,right:0,top:742,textAlign:'center',fontFamily:MONO,
    fontSize:23,letterSpacing:8,opacity:0.6*clamp(sp(frame,tWord+38,13))}}>FHE + ZK · NOTES IN ONE TREE</div>
 </>;
};
