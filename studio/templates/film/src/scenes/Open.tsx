import React from 'react';
import {P, W, H, SIDE, Words, Marquee, Mono, Stamp, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * WORKED EXAMPLE CHAPTER — copy this file for each new chapter.
 *
 * The pattern every chapter follows:
 *   1. the spoken sentence is set with <Words>, so each word lights on the frame it is spoken;
 *   2. one element is keyed to a spoken word with at('scene-id', 'word');
 *   3. something moves continuously for the whole chapter (marquee, rolling serial, tree, rosette);
 *   4. exactly one idea is given the display size.
 */
export const Open: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('open');
  const ink = scene.foreground;
  const accent = at('open', 'here.', 0, 84);
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 140, width: 1400}}>
        <Words sentence={s[0]} f={frame} size={92} color={ink} hot={['first']} hotColor={P.verm} maxW={1400} />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Marquee w={W} y={760} h={64} text="REPLACE THIS WITH YOUR FILM'S OWN BAND  /  " size={40}
          f={frame} color={ink} speed={5} opacity={0.8} />
        <Mono x={SIDE} y={640} text={`SERIAL ${((frame * 7) % 16777215).toString(16).padStart(6, '0')}`}
          size={26} color={ink} opacity={0.6} spacing={2} />
        <Stamp x={W - 320} y={260} text="FIRST TAKE" f={frame} start={accent} size={48}
          color={P.verm} rotate={-6} />
      </svg>
      <div style={{position: 'absolute', left: SIDE, top: 834, display: 'flex', gap: 40, color: ink,
        fontFamily: 'FlutonMono', fontSize: 22, opacity: clamp(sp(frame, 30, 12))}}>
        <div>ONE IDEA</div>
        <div>ONE MOTION</div>
        <div>ONE COLOUR CUT</div>
      </div>
    </>
  );
};
