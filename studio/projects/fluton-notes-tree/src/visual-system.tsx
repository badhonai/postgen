import React from 'react';
import {film} from './timeline';

/**
 * Visual system: "sealed ledger".
 * A dark slate field, one hairline grid, mint = sealed / correct, periwinkle = proof,
 * amber = the one public fact. Everything is drawn from frames, never from CSS time.
 */
export const C = film.palette;
export const W = film.width;
export const H = film.height;
/** Art area: everything above the caption band. */
export const ART = H - film.captionBand;
export const SIDE = film.safeAreas.side;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, start: number, dur: number) => clamp((f - start) / Math.max(1, dur));

/** Penner-style easings; pure functions so a still frame is reproducible. */
export const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  lin: (t: number) => t,
};
export type Ease = (t: number) => number;
/** Eased 0..1 across a frame window. */
export const tw = (f: number, start: number, dur: number, fn: Ease = ease.out) =>
  fn(prog(f, start, dur));
/** Eased interpolation between two numbers. */
export const twn = (f: number, start: number, dur: number, a: number, b: number, fn: Ease = ease.out) =>
  lerp(a, b, tw(f, start, dur, fn));

/** Deterministic pseudo-random in 0..1 (fixed seed, no state). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** FNV-1a style digest of a string, rendered as hex — stands in for a commitment hash. */
export const digest = (input: string, len = 12): string => {
  let h = 0x811c9dc5;
  const out: string[] = [];
  for (let round = 0; round < len; round++) {
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + round * 31;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push(h.toString(16).padStart(8, '0'));
  }
  return out.join('').slice(0, len);
};

/** A hex string that "locks in" character by character — the sealing gesture. */
export const sealing = (target: string, t: number): string => {
  const shown = Math.floor(clamp(t) * target.length);
  return target
    .split('')
    .map((ch, i) => (i < shown ? ch : '0123456789abcdef'[Math.floor(hash(i + 7) * 16)]))
    .join('');
};

/** Hairline grid, drawn behind the art. */
export const Grid: React.FC<{opacity?: number; step?: number}> = ({opacity = 0.055, step = 72}) => (
  <svg width={W} height={ART} style={{position: 'absolute', left: 0, top: 0}}>
    {Array.from({length: Math.ceil(W / step) + 1}).map((_, i) => (
      <line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={ART} stroke={C.ink} strokeWidth={1} opacity={opacity} />
    ))}
    {Array.from({length: Math.ceil(ART / step) + 1}).map((_, i) => (
      <line key={`h${i}`} x1={0} y1={i * step} x2={W} y2={i * step} stroke={C.ink} strokeWidth={1} opacity={opacity} />
    ))}
  </svg>
);

/** A sealed note tile: rounded slab with a hairline and a commitment fingerprint. */
export const Tile: React.FC<{
  x: number; y: number; w: number; h: number;
  label?: string; hash?: string; opacity?: number; scale?: number;
  tone?: string; filled?: boolean; dashed?: boolean;
}> = ({x, y, w, h, label, hash: fingerprint, opacity = 1, scale = 1, tone = C.accent, filled = false, dashed = false}) => (
  <g opacity={opacity} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${scale}) translate(${-(x + w / 2)} ${-(y + h / 2)})`}>
    <rect x={x} y={y} width={w} height={h} rx={22}
      fill={filled ? C.seal : 'rgba(255,255,255,0.03)'}
      stroke={tone} strokeWidth={dashed ? 2 : 2.2} strokeDasharray={dashed ? '10 10' : undefined} opacity={0.9} />
    {label && (
      <text x={x + w / 2} y={y + h / 2 + (fingerprint ? -8 : 8)} textAnchor="middle"
        fontSize="26" fontWeight="800" letterSpacing="3" fill={C.ink} opacity={0.92}>{label}</text>
    )}
    {fingerprint && (
      <text x={x + w / 2} y={y + h / 2 + 28} textAnchor="middle" fontSize="21" fontWeight="600"
        letterSpacing="1.5" fill={tone} opacity={0.95}>{fingerprint}</text>
    )}
  </g>
);

/** Small caps label used for stage labels ("NOTE", "NULLIFIER", "PUBLIC"). */
export const Kicker: React.FC<{x: number; y: number; children: string; tone?: string; opacity?: number}> = ({
  x, y, children, tone = C.soft, opacity = 1,
}) => (
  <text x={x} y={y} fontSize="22" fontWeight="800" letterSpacing="6" fill={tone} opacity={opacity}>{children}</text>
);
