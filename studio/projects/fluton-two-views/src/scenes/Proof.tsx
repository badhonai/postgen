import React from 'react';
import {P, W, H, SIDE, Words, Rosette, Stamp, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 05 · So how does it know? — full-bleed vermillion, the question in display size, and the answer
 * arriving as a printed stamp on the word "real". A rosette turns behind it the whole chapter.
 */
export const Proof: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('proof');
  const ink = scene.foreground;
  const tReal = at('proof', 'real?', 0, 908);
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 130, width: 1500}}>
        <Words sentence={s[0]} f={frame} size={92} color={ink} hot={['how', 'know']} hotColor={P.paper}
          maxW={1500} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 360}}>
        <div style={{fontFamily: 'FlutonDisplay', fontSize: 168, letterSpacing: -6, lineHeight: 0.9}}>
          THE PROOF<br />STILL HOLDS.
        </div>
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Rosette cx={1470} cy={760} r={330} f={frame} color={P.paper} opacity={0.5} k={6}
          spin={0.006} lines={2} thick={4} />
        <Stamp x={1470} y={760} text="VERIFIED" f={frame} start={tReal - 10} size={64} color={P.paper}
          border={P.paper} rotate={-9} />
      </svg>
      <div style={{position: 'absolute', right: SIDE, bottom: 74, textAlign: 'right',
        fontFamily: 'FlutonMono', fontSize: 22, letterSpacing: 4, opacity: 0.75 * clamp(sp(frame, tReal + 6, 12))}}>
        NO DISCLOSURE REQUIRED
      </div>
    </>
  );
};
