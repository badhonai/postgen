import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {film,getSceneAtFrame} from './timeline';
import {FILM,FilmChrome} from './system';
import {Ledger} from './scenes/Ledger';
import {NoteScene} from './scenes/NoteScene';
import {TreeScene} from './scenes/TreeScene';
import {JoinSplit} from './scenes/JoinSplit';
import {NullifierScene} from './scenes/NullifierScene';
import {ExtData} from './scenes/ExtData';
import {BoundaryScene} from './scenes/BoundaryScene';
import {Close} from './scenes/Close';

export type ChapterProps={frame:number;f:number;scene:ReturnType<typeof getSceneAtFrame>};

/** The chapter registry. A film is: this map + one file per chapter. */
const CHAPTERS:{[id:string]:React.FC<ChapterProps>}={
 ledger:Ledger,note:NoteScene,tree:TreeScene,joinsplit:JoinSplit,
 nullifier:NullifierScene,extdata:ExtData,boundary:BoundaryScene,close:Close,
};

export const Film:React.FC=()=>{
 const frame=useCurrentFrame();
 const scene=getSceneAtFrame(frame);
 const f=Math.max(0,frame-scene.startFrame);
 const Chapter=CHAPTERS[scene.id]??CHAPTERS.ledger;
 const idx=film.scenes.findIndex(s=>s.id===scene.id);
 return <AbsoluteFill>
  <FilmChrome spec={FILM} frame={frame} f={f} index={idx} count={film.scenes.length}
    background={scene.background} ink={scene.foreground}
    notice={scene.id==='close'?film.finalNotice:undefined} noticeAt={scene.startFrame+140}>
   <Chapter frame={frame} f={f} scene={scene}/>
  </FilmChrome>
 </AbsoluteFill>;
};
