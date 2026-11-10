import React from 'react';
import {P, W, H, SIDE, Words, Mono, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 03 · What the chain sees. — three objects only, each named on its word, and on "nothing else"
 * the rest of the receipt is covered by redaction bars. The bars are the film's second device.
 */
export const ChainSide: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('chainside');
  const ink = scene.foreground;
  const tHash = at('chainside', 'hash,', 0, 434);
  const tNull = at('chainside', 'nullifier,', 0, 462);
  const tGas = at('chainside', 'gas.', 0, 526);
  const tNothing = at('chainside', 'nothing', 1, 550);
  const items: [string, string, number][] = [
    ['HASH', '0x6e08 1ce3 4101 c2fc', tHash],
    ['NULLIFIER', '0x8f2a 41c9 d87e 04b1', tNull],
    ['GAS', '0.00041', tGas],
  ];
  const bar = clamp(sp(frame, tNothing + 4, 16));
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 100, width: 1450}}>
        <Words sentence={s[0]} f={frame} size={70} color={ink} hot={['hash,', 'nullifier,', 'gas.']}
          hotColor={P.blue} maxW={1450} exitAt={tNothing - 8} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 250, width: 1450}}>
        <Words sentence={s[1]} f={frame} size={86} color={ink} hot={['nothing']} hotColor={P.verm}
          maxW={1450} />
      </div>
      {items.map(([k, v, start], i) => {
        const o = clamp(sp(frame, start, 9));
        return (
          <div key={k} style={{position: 'absolute', left: SIDE, top: 420 + i * 138, width: 1300,
            opacity: o, transform: `translateY(${(1 - o) * 20}px)`}}>
            <div style={{fontFamily: 'FlutonMono', fontSize: 20, letterSpacing: 6, opacity: 0.55}}>{k}</div>
            <div style={{fontFamily: 'FlutonMono', fontWeight: 800, fontSize: 54, letterSpacing: -1,
              marginTop: 6}}>{v}</div>
            {/* everything the chain does NOT get, drawn as the bars that will cover it */}
            <div style={{display: 'flex', gap: 10, marginTop: 10, opacity: bar * 0.95}}>
              {Array.from({length: Math.max(2, 7 - i * 2)}).map((_, j) => (
                <div key={j} style={{width: 46 + (j % 3) * 22, height: 12, background: ink}} />
              ))}
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', right: SIDE, top: 470, width: 330, textAlign: 'right',
        fontFamily: 'FlutonMono', fontSize: 22, letterSpacing: 3, lineHeight: 2,
        opacity: 0.7 * clamp(sp(frame, tNothing, 12))}}>
        <div>NO AMOUNT</div>
        <div>NO RECEIVER</div>
        <div>NO LINK BACK</div>
      </div>
    </>
  );
};
