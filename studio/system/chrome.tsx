import React from 'react';
import {MONO} from './fonts';
import {clamp, sp} from './motion';
import type {Spec} from './tokens';

/**
 * The printed chrome every film shares: the ground, the 7-frame shutter that makes a chapter
 * change a cut, a register hairline that keeps travelling, a live frame counter and a progress
 * rule. Chapters supply their own content as children; the chrome never cuts.
 */
export const FilmChrome: React.FC<{
  spec: Spec;
  frame: number;
  f: number;
  index: number;
  count: number;
  background: string;
  ink: string;
  label?: string;
  notice?: string;
  noticeAt?: number;
  shutter?: boolean;
  fps?: number;
  children?: React.ReactNode;
}> = ({spec, frame, f, index, count, background, ink, label = 'FLUTON', notice, noticeAt = 0,
      shutter = true, fps = 30, children}) => {
  const {width: W, height: H, safeAreas} = spec;
  const SIDE = safeAreas.side;
  const p = clamp(frame / Math.max(1, spec.durationInFrames - 1));
  const pop = 1 + 0.025 * (1 - sp(f, 0, 9));
  const wipe = shutter ? 1 - sp(f, 0, 7) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background, color: ink}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${pop})`}}>{children}</div>
      {wipe > 0.002 && (
        <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: `${100 * wipe}%`, background: ink}} />
      )}
      <div style={{position: 'absolute', left: SIDE, top: 44, fontFamily: MONO, fontWeight: 700,
        fontSize: 21, letterSpacing: 7, opacity: 0.8}}>{label}</div>
      <div style={{position: 'absolute', right: SIDE, top: 44, fontFamily: MONO, fontWeight: 700,
        fontSize: 21, letterSpacing: 5, opacity: 0.8}}>
        {`${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: `${((f * 1.6) % (H + 80)) - 40}px`,
        height: 2, background: ink, opacity: 0.16}} />
      <div style={{position: 'absolute', left: SIDE, bottom: 34, fontFamily: MONO, fontWeight: 700,
        fontSize: 18, letterSpacing: 4, opacity: 0.5}}>
        {`${String(frame).padStart(4, '0')} · ${((frame * 37) % 997).toString().padStart(3, '0')}`}
      </div>
      <div style={{position: 'absolute', right: SIDE, bottom: 34, fontFamily: MONO, fontWeight: 700,
        fontSize: 18, letterSpacing: 4, opacity: 0.5}}>{`${(frame / fps).toFixed(2)}S`}</div>
      {notice && (
        <div style={{position: 'absolute', right: SIDE, bottom: 68, fontFamily: MONO, fontWeight: 800,
          fontSize: 20, letterSpacing: 3, opacity: clamp((frame - noticeAt) / 16)}}>{notice}</div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: ink, opacity: 0.16}} />
      <div style={{position: 'absolute', left: 0, bottom: 0, height: 10, width: `${p * 100}%`, background: ink}} />
    </div>
  );
};

/** A chapter's viewport helpers, so scenes never hard-code 1920x1080. */
export const frameGeom = (spec: Spec) => ({
  W: spec.width,
  H: spec.height,
  SIDE: spec.safeAreas.side,
  full: spec.width - spec.safeAreas.side * 2,
});
