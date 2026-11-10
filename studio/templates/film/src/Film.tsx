import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {getSceneAtFrame} from './timeline';
import {FILM, FilmChrome} from './system';
import {Open} from './scenes/Open';

/**
 * THE CHAPTER REGISTRY. A film is this map plus one file per chapter in src/scenes/.
 * Add a chapter: write the file, add one line here, add it to production/scenes.json, re-run
 * `node tools/film.mjs lines <slug>`.
 */
export type ChapterProps = {frame: number; f: number; scene: ReturnType<typeof getSceneAtFrame>};

const CHAPTERS: {[id: string]: React.FC<ChapterProps>} = {
  open: Open,
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = getSceneAtFrame(frame);
  const f = Math.max(0, frame - scene.startFrame);
  const Chapter = CHAPTERS[scene.id] ?? CHAPTERS[Object.keys(CHAPTERS)[0]];
  const index = FILM.scenes.findIndex(s => s.id === scene.id);
  return (
    <AbsoluteFill>
      <FilmChrome spec={FILM} frame={frame} f={f} index={index} count={FILM.scenes.length}
        background={scene.background} ink={scene.foreground}
        notice={scene.id === FILM.scenes[FILM.scenes.length - 1].id ? FILM.finalNotice : undefined}
        noticeAt={scene.startFrame + 140}>
        <Chapter frame={frame} f={f} scene={scene} />
      </FilmChrome>
    </AbsoluteFill>
  );
};
