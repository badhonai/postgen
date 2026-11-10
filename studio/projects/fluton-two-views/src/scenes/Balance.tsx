import React from 'react';
import {P, W, H, SIDE, Words, Stamp, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 07 · Nothing created, nothing revealed. — the conservation equation in figures, then the second
 * stamp, then the redaction bars again on the word "revealed".
 */
export const Balance: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('balance');
  const ink = scene.foreground;
  const tIn = at('balance', 'in', 0, 1252);
  const tOut = at('balance', 'out.', 0, 1279);
  const tCreated = at('balance', 'created,', 1, 1349);
  const tRevealed = at('balance', 'revealed.', 1, 1428);
  const bars = clamp(sp(frame, tRevealed - 26, 14));
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 96, width: 1650}}>
        <Words sentence={s[0]} f={frame} size={60} color={ink} hot={['balances:']} hotColor={P.verm}
          maxW={1650} exitAt={s[1].startFrame - 8} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 210, display: 'flex', alignItems: 'flex-end',
        gap: 34, fontFamily: 'FlutonMono', fontWeight: 800}}>
        <div style={{fontSize: 120, opacity: clamp(sp(frame, tIn, 10))}}>13.37</div>
        <div style={{fontSize: 54, opacity: 0.6 * clamp(sp(frame, tIn + 6, 10))}}>IN</div>
        <div style={{fontSize: 120, opacity: clamp(sp(frame, tOut, 10))}}>=</div>
        <div style={{fontSize: 120, opacity: clamp(sp(frame, tOut, 10))}}>13.37</div>
        <div style={{fontSize: 54, opacity: 0.6 * clamp(sp(frame, tOut, 10))}}>OUT</div>
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 420, width: 1650}}>
        <Words sentence={s[1]} f={frame} size={64} color={ink} hot={['cent', 'revealed.']}
          hotColor={P.verm} maxW={1650} />
      </div>
      {/* the values on the right get covered, again — same device, third use */}
      <div style={{position: 'absolute', left: SIDE, top: 600, display: 'flex', gap: 18}}>
        {['0.0137', '0.0200', '9.36', '3.99'].map((v, i) => (
          <div key={v} style={{position: 'relative', fontFamily: 'FlutonMono', fontSize: 40,
            fontWeight: 800, opacity: 0.7, width: 190}}>
            {v}
            <div style={{position: 'absolute', left: -10, right: -10, top: 8, bottom: 8, background: ink,
              transform: `scaleX(${clamp(bars * 1.2 - i * 0.15)})`, transformOrigin: 'left center'}} />
          </div>
        ))}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Stamp x={W - 340} y={330} text="NOT ONE CENT" f={frame} start={tCreated} size={54}
          color={P.verm} rotate={-6} />
      </svg>
      <div style={{position: 'absolute', left: SIDE, bottom: 74, fontFamily: 'FlutonMono', fontSize: 23,
        letterSpacing: 3, opacity: 0.6 * clamp(sp(frame, tCreated + 8, 12))}}>
        SUM IN + PUBLIC AMOUNT = SUM OUT
      </div>
    </>
  );
};
