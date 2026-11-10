import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {getSceneAtFrame} from './timeline';
import {FONT} from './fonts';
import {Film} from './Film';
import {CaptionOverlay} from './CaptionOverlay';
// Background and captions deliberately remain outside the visual-content clip.
export const FlutonComposition:React.FC=()=>{
 const scene=getSceneAtFrame(useCurrentFrame());
 return <AbsoluteFill style={{background:scene.background,fontFamily:FONT,color:scene.foreground}}>
  <AbsoluteFill style={{clipPath:'inset(0 0 200px 0)'}}><Film/></AbsoluteFill>
  <CaptionOverlay/>
 </AbsoluteFill>;
};
