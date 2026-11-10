import React from 'react';
import {useCurrentFrame} from 'remotion';
import {getSceneAtFrame} from './timeline';
import {Hook} from './scenes/Hook';
import {Notes} from './scenes/Notes';
import {Note} from './scenes/Note';
import {Split} from './scenes/Split';
import {Nullifier} from './scenes/Nullifier';
import {Boundary} from './scenes/Boundary';
import {Seal} from './scenes/Seal';

const SCENES:{[id:string]:React.FC<{f:number}>}={hook:Hook,notes:Notes,note:Note,split:Split,nullifier:Nullifier,boundary:Boundary,seal:Seal};

/**
 * Only the active scene renders, so nothing off-stage can leak into the frame.
 * Local time is the global frame minus the scene start; every value in a scene is a
 * pure function of it. The wrapper owns background, captions and the caption clip.
 */
export const Film:React.FC=()=>{
 const frame=useCurrentFrame();
 const scene=getSceneAtFrame(frame);
 const actual=scene.endFrameExclusive-scene.startFrame;
 const authored=scene.authoredFrames??actual;
 // Authored choreography plays at most at real speed; a shorter window compresses it,
 // a longer one just holds. Speech is never stretched.
 const speed=Math.min(1,authored/Math.max(1,actual));
 const f=Math.max(0,Math.round((frame-scene.startFrame)*speed));
 const Scene=SCENES[scene.id]??SCENES.hook;
 return <>{Scene?<Scene f={f}/>:null}</>;
};
