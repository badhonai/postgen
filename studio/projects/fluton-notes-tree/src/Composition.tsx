import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
import {FONT} from './fonts';
import {Film} from './Film';
import {CaptionOverlay} from './CaptionOverlay';
/**
 * The wrapper owns the full-bleed background, the grain, the caption band and the clip
 * that keeps art out of the captions. Scenes only ever draw inside the art area.
 */
export const FlutonNotesComposition:React.FC=()=>{
 const frame=useCurrentFrame();
 const scene=getSceneAtFrame(frame);
 // Slow vignette breathing: a pure function of the frame, no CSS transitions.
 const vignette=0.55+0.06*Math.sin(frame/97);
 return <AbsoluteFill style={{background:scene.background,fontFamily:FONT,color:scene.foreground}}>
  <AbsoluteFill style={{clipPath:`inset(0 0 ${film.captionBand}px 0)`}}><Film/></AbsoluteFill>
  <AbsoluteFill style={{background:`radial-gradient(120% 90% at 50% 30%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,pointerEvents:'none'}}/>
  <CaptionOverlay/>
 </AbsoluteFill>;
};
