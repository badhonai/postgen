import React from 'react';
import {P, W, H, SIDE, Words, Mono, clamp, sp, ex} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 01 · One payment, two viewers. — the film's mechanism is introduced here: a vertical WITNESS
 * SEAM. Everything left of it is what you see; everything right of it is what the chain sees. The
 * seam stays for the whole film and never becomes decoration.
 */
export const TwoViews: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('twoviews');
  const ink = scene.foreground;
  const seamIn = at('twoviews', 'two', 1, 77);
  const split = sp(frame, seamIn, 12);
  const x = W / 2 + (1 - split) * W * 0.5;
  const serial = `0x${((frame * 7) % 16777215).toString(16).padStart(6, '0')}`;
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 120, width: 1200}}>
        <Words sentence={s[0]} f={frame} size={92} color={ink} hot={['payment.']} hotColor={P.verm}
          maxW={1200} exitAt={seamIn - 20} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 250, width: 1200}}>
        <Words sentence={s[1]} f={frame} size={64} color={ink} hot={['two', 'different']}
          hotColor={P.verm} maxW={1200} />
      </div>
      {/* the seam */}
      <div style={{position: 'absolute', top: 0, bottom: 0, left: x - 2, width: 4, background: ink,
        opacity: 0.9}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, left: x, right: 0,
        background: ink, opacity: 0.06}} />
      <div style={{position: 'absolute', top: 470, left: x + 26, opacity: clamp(split * 1.4),
        fontFamily: 'FlutonMono', fontWeight: 700, fontSize: 20, letterSpacing: 5, lineHeight: 2}}>
        <div>CHAIN SEES</div>
      </div>
      <div style={{position: 'absolute', top: 470, right: W - x + 26, opacity: clamp(split * 1.4),
        textAlign: 'right', fontFamily: 'FlutonMono', fontWeight: 700, fontSize: 20,
        letterSpacing: 5, lineHeight: 2}}>
        <div>YOU SEE</div>
      </div>
      {/* one payment, drawn twice: complete on the left of the seam, redacted on the right */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g opacity={clamp(split * 1.2)}>
          <Mono x={SIDE} y={640} text="PAYMENT" size={22} color={ink} opacity={0.55} spacing={5} />
          <Mono x={SIDE} y={716} text="13.37" size={104} color={ink} weight={800} />
          <Mono x={SIDE} y={776} text="0x7b…1d0 · FEE 0.02" size={26} color={ink} opacity={0.65} />
          <Mono x={x + 40} y={640} text="SAME PAYMENT" size={22} color={ink} opacity={0.55} spacing={5} />
          <rect x={x + 40} y={676} width={300} height={40} fill={ink} opacity={0.85} />
          <rect x={x + 40} y={726} width={190} height={20} fill={ink} opacity={0.5} />
          <Mono x={x + 40} y={800} text={`SERIAL ${serial}`} size={24} color={ink} opacity={0.5} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: SIDE, bottom: 78, fontFamily: 'FlutonMono', fontSize: 22,
        letterSpacing: 3, opacity: 0.55 * ex(frame, 120, 20)}}>
        SAME TRANSACTION · DIFFERENT PICTURES
      </div>
    </>
  );
};
