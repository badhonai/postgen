import React from 'react';
import {film} from './timeline';

/**
 * System: "glass ledger, sealed".
 * From the v1/v2 direction notes: one persistent structure that never cuts away, a fixed
 * orthographic frame, springs and exponentials only, and a strict palette — green =
 * sealed/valid, blue = proof/hash, red = refused. No gradients, glows, particles or shake.
 */
export const C = film.palette;
export const W = film.width;
export const H = film.height;
export const ART = H - film.captionBand;
export const SIDE = film.safeAreas.side;

/** One 8-column structural grid the whole film shares. */
export const GX = (i: number) => SIDE + (i * (W - SIDE * 2)) / 8;
export const TOP = 200;
export const BOT = ART - 88;

/** Type scale, fixed for the whole film. */
export const T = {title: 76, sub: 28, label: 20, data: 30, big: 42, num: 150};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, start: number, dur: number) => clamp((f - start) / Math.max(1, dur));

/** Critically damped spring response (no overshoot) — the v1 motion law. */
export const spring = (t: number) => {
  const x = clamp(t);
  return 1 - Math.exp(-6.2 * x) * (1 + 6.2 * x);
};
/** Exponential ease-out, the other motion law in the reference notes. */
export const expo = (t: number) => 1 - Math.pow(2, -10 * clamp(t));
export const sp = (f: number, start: number, dur: number) => spring(prog(f, start, dur));
export const ex = (f: number, start: number, dur: number) => expo(prog(f, start, dur));

/** Deterministic stand-in for commitments / nullifiers / roots. */
export const hex = (seed: string, len = 16): string => {
  let h = 0x811c9dc5;
  const out: string[] = [];
  for (let r = 0; r < Math.ceil(len / 8); r++) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i) + r * 31;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push(h.toString(16).padStart(8, '0'));
  }
  return out.join('').slice(0, len).toUpperCase();
};

export const Label: React.FC<{x: number; y: number; children: string; tone?: string; o?: number; anchor?: 'start' | 'end'}> = ({
  x, y, children, tone = C.dim, o = 1, anchor = 'start',
}) => <text x={x} y={y} textAnchor={anchor} fontSize={T.label} fontWeight="800" letterSpacing="6" fill={tone} opacity={o}>{children}</text>;

/** Headline block: one fixed mask at a fixed y for every chapter. */
export const Headline: React.FC<{x: number; y: number; title: string; sub?: string; o?: number}> = ({
  x, y, title, sub, o = 1,
}) => (
  <g opacity={o}>
    <text x={x} y={y} fontSize={T.title} fontWeight="800" letterSpacing="-2" fill={C.ink}>{title}</text>
    {sub && <text x={x} y={y + 48} fontSize={T.sub} fontWeight="600" letterSpacing="0.5" fill={C.dim}>{sub}</text>}
  </g>
);

/** Data row: label left, value right, hairline under. */
export const Row: React.FC<{
  x: number; y: number; w: number; k: string; v: string; tone?: string; o?: number; strike?: number;
}> = ({x, y, w, k, v, tone = C.ink, o = 1, strike = 0}) => (
  <g opacity={o}>
    <text x={x} y={y} fontSize="22" fontWeight="800" letterSpacing="3.5" fill={C.dim}>{k}</text>
    <text x={x + w} y={y} textAnchor="end" fontSize={T.data} fontWeight="800" letterSpacing="1" fill={tone}>{v}</text>
    <line x1={x} y1={y + 26} x2={x + w} y2={y + 26} stroke={C.grid} strokeWidth={1.5} />
    {strike > 0 && <line x1={x + w * (1 - strike)} y1={y - 10} x2={x + w} y2={y - 10} stroke={C.red} strokeWidth={4} />}
  </g>
);

/** A sealed note: rectangle + fingerprint. `state` colours the edge. */
export const Note: React.FC<{
  x: number; y: number; w: number; h: number; label: string; fp?: string;
  state?: 'sealed' | 'spent' | 'open'; o?: number; scale?: number; size?: number;
}> = ({x, y, w, h, label, fp, state = 'sealed', o = 1, scale = 1, size = 30}) => {
  const tone = state === 'spent' ? C.dim : state === 'open' ? C.blue : C.green;
  return (
    <g opacity={o} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${scale}) translate(${-(x + w / 2)} ${-(y + h / 2)})`}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={tone} strokeWidth={2}
        strokeDasharray={state === 'spent' ? '8 8' : undefined} />
      <text x={x + 22} y={y + 32} fontSize={T.label} fontWeight="800" letterSpacing="4" fill={tone} opacity={0.9}>{label}</text>
      {fp && <text x={x + 22} y={y + h - 26} fontSize={size} fontWeight="800" letterSpacing="1" fill={C.ink} opacity={state === 'spent' ? 0.45 : 1}>{fp}</text>}
    </g>
  );
};
