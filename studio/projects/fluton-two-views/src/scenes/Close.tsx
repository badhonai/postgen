import React from 'react';
import {staticFile} from 'remotion';
import {P, W, H, SIDE, Words, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 09 · Privacy is not the absence of proof. — the film ends on paper, not black: the line is the
 * hero, "PROOF" is stamped in vermillion, and the lockup sits in a vermillion panel so the white
 * mark stays legible on paper.
 */
export const Close: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('close');
  const ink = scene.foreground;
  const tProof = at('close', 'proof.', 0, 1712);
  const panel = clamp(sp(frame, tProof + 12, 14));
  const wordW = 620;
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 150, width: 1700}}>
        <Words sentence={s[0]} f={frame} size={132} color={ink} hot={['proof.']} hotColor={P.verm}
          hotStyle="block" blockText={P.paper} maxW={1700} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 560, fontFamily: 'FlutonMono', fontSize: 26,
        letterSpacing: 5, opacity: 0.65 * clamp(sp(frame, tProof + 18, 14))}}>
        FLUTON · CONFIDENTIAL EXECUTION · TESTNET
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 640, width: wordW + 96, height: 260,
        background: P.verm, opacity: panel, transform: `translateY(${(1 - panel) * 24}px)`}}>
        <img src={staticFile('brand/fluton-wordmark-white.png')}
          style={{position: 'absolute', left: 48, top: 74, width: wordW, height: wordW * (512 / 1997)}} />
      </div>
    </>
  );
};
