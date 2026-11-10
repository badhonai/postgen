import React from 'react';
import {P, W, H, SIDE, Words, Mono, Stamp, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 06 · Checked while encrypted. — full-bleed cobalt. Three sealed blocks and an equals sign; the
 * check runs *through* the ciphertext, which is drawn as a rule passing behind the blocks.
 */
export const Fhe: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('fhe');
  const ink = scene.foreground;
  const tChecks = at('fhe', 'checks', 0, 958);
  const tNumbers = at('fhe', 'numbers', 0, 992);
  
  const tEnc = at('fhe', 'encrypted.', 0, 1066);
  const t0 = s[0].startFrame;
 const blocks: [string, number][] = [['ct(a)', t0 + 10], ['ct(b)', t0 + 18], ['ct(c)', tNumbers]];
  const run = clamp(sp(frame, tChecks, 14));
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 110, width: 1600}}>
        <Words sentence={s[0]} f={frame} size={76} color={ink} hot={['encrypted.']} hotColor={P.paper}
          maxW={1600} />
      </div>
      {/* the check runs behind the blocks */}
      <div style={{position: 'absolute', left: SIDE, top: 520, width: 1600 * run, height: 6,
        background: ink, opacity: 0.5}} />
      <div style={{position: 'absolute', left: SIDE, top: 400, display: 'flex', alignItems: 'center',
        gap: 34}}>
        {blocks.map(([label, start], i) => {
          const o = clamp(sp(frame, start, 9));
          const sealed = clamp(sp(frame, tEnc - 30 + i * 6, 9));
          return (
            <React.Fragment key={label}>
              <div style={{opacity: o, transform: `translateY(${(1 - o) * 24}px)`}}>
                <div style={{width: 300, height: 210, border: `8px solid ${ink}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontFamily: 'FlutonMono',
                  fontWeight: 800, fontSize: 48, letterSpacing: 1,
                  background: sealed > 0.5 ? ink : 'transparent',
                  color: sealed > 0.5 ? P.blue : ink}}>{label}</div>
              </div>
              {i < 2 && <div style={{fontFamily: 'FlutonMono', fontWeight: 800, fontSize: 60,
                opacity: o}}>{i === 0 ? '+' : '='}</div>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 660, display: 'flex', gap: 42,
        fontFamily: 'FlutonMono', fontSize: 22, letterSpacing: 4, opacity: 0.75 * clamp(sp(frame, tNumbers, 12))}}>
        <div>PLAINTEXT: NEVER</div>
        <div>DECRYPTED BY THE CHAIN: NEVER</div>
      </div>
      {/* a scan line crossing the ciphertext keeps the frame alive */}
      <div style={{position: 'absolute', top: 388, bottom: 300, left: SIDE + ((frame * 9) % 1500),
        width: 3, background: ink, opacity: 0.35}} />
      <Mono x={SIDE} y={760} text={`ROUND ${((frame * 5) % 99999).toString().padStart(5, '0')} · CIPHERTEXT INTACT`}
        size={24} color={ink} opacity={0.5} spacing={3} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Stamp x={W - 330} y={300} text="STILL VALID" f={frame} start={tEnc + 4} size={50}
          color={P.paper} border={P.paper} rotate={-7} />
      </svg>
    </>
  );
};
