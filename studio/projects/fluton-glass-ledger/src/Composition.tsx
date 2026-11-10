import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {getSceneAtFrame} from './timeline';
import {FONT} from './fonts';
import {Film} from './Film';
import {CaptionOverlay} from './CaptionOverlay';
import {C} from './visual-system';

/** Wrapper owns background, the fixed hairline frame and the caption band. */
export const FlutonLedgerComposition:React.FC=()=>{
 const scene=getSceneAtFrame(useCurrentFrame());
 return <AbsoluteFill style={{background:scene.background??C.bg,fontFamily:FONT,color:scene.foreground??C.ink}}>
  <Film/>
  <CaptionOverlay/>
 </AbsoluteFill>;
};
