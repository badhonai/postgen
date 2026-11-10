import React from 'react';
import {P, W, H, SIDE, Words, Mono, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 08 · The size of the crossing. — one public figure, counted up until its word lands, and a
 * single redaction bar over the address beside it.
 */
export const Public: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('public');
  const ink = scene.foreground;
  const tSize = at('public', 'size', 0, 1545);
  const tCross = at('public', 'crossing.', 0, 1580);
  const v = (-4 * clamp((frame - s[0].startFrame) / Math.max(1, tCross - s[0].startFrame))).toFixed(2);
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 110, width: 1300}}>
        <Words sentence={s[0]} f={frame} size={72} color={ink} hot={['public', 'size']} hotColor={P.verm}
          maxW={1300} />
      </div>
      <div style={{position: 'absolute', left: SIDE - 8, top: 330, fontFamily: 'FlutonMono',
        fontWeight: 800, fontSize: 250, letterSpacing: -8, fontVariantNumeric: 'tabular-nums'}}>{v}</div>
      <div style={{position: 'absolute', left: SIDE, top: 620, fontFamily: 'FlutonMono', fontSize: 24,
        letterSpacing: 4, opacity: 0.7}}>PUBLIC: THE NET AMOUNT, THE TOKEN, THE GAS</div>
      <div style={{position: 'absolute', right: SIDE, top: 350, width: 480, textAlign: 'right'}}>
        <div style={{fontFamily: 'FlutonMono', fontSize: 22, letterSpacing: 5, opacity: 0.55}}>
          WHO WAS PAID
        </div>
        <div style={{position: 'relative', marginTop: 14, height: 54}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: ink}} />
        </div>
        <div style={{fontFamily: 'FlutonMono', fontSize: 22, letterSpacing: 5, opacity: 0.55,
          marginTop: 40}}>WHAT FOR</div>
        <div style={{position: 'relative', marginTop: 14, height: 54}}>
          <div style={{position: 'absolute', left: 120, right: 0, top: 0, bottom: 0, background: ink}} />
        </div>
      </div>
      <Mono x={W - SIDE} y={700} text={`${((frame * 11) % 9999999).toString().padStart(7, '0')} · SETTLED`}
        size={22} color={ink} opacity={0.45} spacing={3} anchor="end" />
      <div style={{position: 'absolute', left: SIDE, bottom: 74, fontFamily: 'FlutonMono', fontSize: 22,
        letterSpacing: 3, opacity: 0.6 * clamp(sp(frame, tSize + 6, 12))}}>
        ONE NUMBER OUT OF MANY
      </div>
    </>
  );
};
