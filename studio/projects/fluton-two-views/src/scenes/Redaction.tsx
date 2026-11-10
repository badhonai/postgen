import React from 'react';
import {P, W, H, SIDE, Words, Mono, Marquee, clamp, sp} from '../system';
import {sentencesOf, at} from '../lines';
import type {ChapterProps} from '../Film';

/**
 * 04 · The redaction. — the film's device at full scale: two printed rows of real values, then ink
 * bars covering them one per spoken beat. The covering IS the chapter, so nothing else competes.
 */
export const Redaction: React.FC<ChapterProps> = ({frame, scene}) => {
  const s = sentencesOf('redaction');
  const ink = scene.foreground;
  const tWhat = at('redaction', 'what', 0, 694);
  const tMoved = at('redaction', 'moved,', 0, 709);
  const tWho = at('redaction', 'who', 0, 744);
  const tRecv = at('redaction', 'received', 0, 755);
  const rowA = ['13.37', '0x7b…1d0', '0.02', 'USDC'];
  const rowB = ['0x8f2a41c9', '0xd87e04b1', '0x2ef7cb41', '0x41b0ee23'];
  const coverA = [tWhat, tMoved, tWho, tRecv];
  const coverB = [tMoved, tWho, tRecv, tRecv + 8];
  const Row = ({vals, covers, size}: {vals: string[]; covers: number[]; size: number}) => (
    <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: 26}}>
      {vals.map((v, i) => {
        const cover = clamp(sp(frame, covers[i], 7));
        return (
          <div key={v} style={{position: 'relative', fontFamily: 'FlutonMono', fontWeight: 800,
            fontSize: size, letterSpacing: -2, opacity: 0.9}}>
            <span style={{opacity: 0.55}}>{v}</span>
            <div style={{position: 'absolute', left: -14, right: -14, top: '12%', bottom: '8%',
              background: ink, transform: `scaleX(${cover})`, transformOrigin: 'left center'}} />
          </div>
        );
      })}
    </div>
  );
  return (
    <>
      <div style={{position: 'absolute', left: SIDE, top: 110, width: 1650}}>
        <Words sentence={s[0]} f={frame} size={80} color={ink} hot={['never']} hotColor={P.verm} maxW={1650} />
      </div>
      <div style={{position: 'absolute', left: SIDE, right: SIDE, top: 330, borderTop: `8px solid ${ink}`,
        borderBottom: `8px solid ${ink}`, paddingBottom: 26}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'FlutonMono',
          fontSize: 19, letterSpacing: 6, opacity: 0.55, paddingTop: 18}}>
          <div>WHAT THE TRANSACTION CONTAINS</div>
          <div>WHAT THE CHAIN RECEIVES</div>
        </div>
        <Row vals={rowA} covers={coverA} size={70} />
        <Row vals={rowB} covers={coverB} size={34} />
      </div>
      <div style={{position: 'absolute', left: SIDE, top: 620, fontFamily: 'FlutonMono', fontSize: 24,
        letterSpacing: 4, opacity: 0.65 * clamp(sp(frame, tMoved, 12))}}>FOUR VALUES · NONE OF THEM CROSS</div>
      <Mono x={SIDE} y={692} text={`BLOCK ${((frame * 3) % 999999).toString().padStart(6, '0')} · SETTLED`}
        size={22} color={ink} opacity={0.45} spacing={4} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <Marquee w={W} y={790} h={60} text="NOT LEARNED  /  NOT STORED  /  NOT LINKED  /  " size={38}
          f={frame} color={ink} speed={4} opacity={0.55} />
      </svg>
    </>
  );
};
