import React from 'react';
import {P, W, H, SIDE, Words, Mono, Stamp, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 02 · What you see. — a printed payment slip. Each line of the slip lands on the word that names
 * it: "amount", "receiver", "fee". The seam sits at the right edge, so the other viewer is always
 * just out of frame.
 */
export const YourSide: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('yourside');
  const ink = scene.foreground;
  const tAmount = at('yourside', 'amount,', 0, 232);
  const tRecv = at('yourside', 'receiver,', 0, 274);
  const tFee = at('yourside', 'fee', 0, 334);
  const rows: [string, string, number][] = [
    ['AMOUNT', '13.37 USDC', tAmount],
    ['RECEIVER', '0x7b…1d0', tRecv],
    ['FEE', '0.02 USDC', tFee],
    ['NOTE', 'one sealed commitment', tFee + 10],
  ];
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 110, width: 1240}}>
        <Words sentence={s[0]} f={frame} size={72} color={ink} hot={['amount,', 'receiver,', 'fee']}
          hotColor={P.verm} maxW={1240} />
      </div>
      {/* the slip: heavy rule top and bottom, mono rows, no card */}
      <div style={{position: 'absolute', left: SIDE, top: 380, width: 1240,
        borderTop: `8px solid ${ink}`, borderBottom: `8px solid ${ink}`, paddingTop: 22, paddingBottom: 26}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'FlutonMono',
          fontSize: 20, letterSpacing: 5, opacity: 0.6, paddingBottom: 18}}>
          <div>YOUR COPY</div><div>PRIVATE</div>
        </div>
        {rows.map(([k, v, start]) => {
          const o = clamp(sp(frame, start, 9));
          return (
            <div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              paddingTop: 16, opacity: o, transform: `translateX(${(1 - o) * -26}px)`}}>
              <div style={{fontFamily: 'FlutonMono', fontSize: 26, letterSpacing: 4, opacity: 0.7}}>{k}</div>
              <div style={{fontFamily: 'FlutonMono', fontWeight: 800, fontSize: 46, letterSpacing: -1}}>{v}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 810, fontFamily: 'FlutonMono', fontSize: 22,
        letterSpacing: 3, opacity: 0.6 * clamp(sp(frame, tRecv, 14))}}>
        ONLY THIS DEVICE HOLDS THE NOTE AND THE KEY
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Stamp x={W - 360} y={300} text="ALL OF IT" f={frame} start={tFee + 4} size={52}
          color={P.verm} rotate={-7} />
      </svg>
    </>
  );
};
