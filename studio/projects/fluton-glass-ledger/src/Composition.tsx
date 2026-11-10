import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {getSceneAtFrame} from './timeline';
import {FONT} from './fonts';
import {Film} from './Film';

/**
 * The words carry the narration, so there is no separate caption band: what is spoken is what
 * is set on screen, word by word, at the frame it is spoken.
 */
export const FlutonLedgerComposition:React.FC=()=>{
 const scene=getSceneAtFrame(useCurrentFrame());
 return <AbsoluteFill style={{background:scene.background,fontFamily:FONT,overflow:'hidden'}}>
  <Film/>
 </AbsoluteFill>;
};
