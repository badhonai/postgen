import React from 'react';
import {film} from './timeline';
import {DISPLAY,MONO} from './fonts';

/**
 * "Mint Security" — the film is a printed instrument, not a dashboard.
 * Flat ink on paper, full-bleed colour flips, monumental fitted type, engraved line-work.
 * No gradients, no glow, no blur, no particles.
 */
export const P = film.palette;
export const W = film.width;
export const H = film.height;
export const SIDE = film.safeAreas.side;
export const CAP = film.safeAreas.captionTop;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, start: number, dur: number) => clamp((f - start) / Math.max(1, dur));
/** Critically damped settle: no overshoot, lands in ~2 frames after the ramp. */
export const settle = (t: number) => {
  const x = clamp(t);
  return 1 - Math.exp(-6.4 * x) * (1 + 6.4 * x);
};
export const sp = (f: number, start: number, dur: number) => settle(prog(f, start, dur));
/** Quint ease-out: fast, and still moving on its last frame (no dead expo tail). */
export const ex = (f: number, start: number, dur: number) => 1 - Math.pow(1 - prog(f, start, dur), 5);
/** Frames per beat at the score's 120 BPM / 30 fps. */
export const BEAT = 15;

/** Fitted size: display type fills the frame edge instead of sitting in the middle of it. */
export const fit = (text: string, maxW: number, max = 300, factor = 0.66) =>
  Math.min(max, maxW / Math.max(1, text.length * factor));

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

/** A ticking serial that locks on a given frame — the note's identity settling into place. */
export const serial = (seed: string, f: number, lock: number, step = 3, len = 16) => {
  if (f >= lock) return hex(seed, len).toLowerCase();
  const tick = Math.floor(f / step);
  return hex(`${seed}:${tick}`, len).toLowerCase();
};

type Ids = {id: string};

/** Display lines that rise out of a mask, one after another. */
export const MaskLines: React.FC<Ids & {
  x: number; y: number; lines: string[]; size: number; color: string;
  f: number; start?: number; stagger?: number; dur?: number; lineHeight?: number; anchor?: 'start' | 'end';
  maxW?: number;
}> = ({id, x, y, lines, size, color, f, start = 0, stagger = 2, dur = 9, lineHeight = 0.94, anchor = 'start', maxW = 1728}) => (
  <g>
    {lines.map((line, i) => {
      const s = Math.min(size, fit(line, maxW, size));
      const o = sp(f, start + i * stagger, dur);
      const drop = (1 - o) * s * 1.02;
      const clip = `${id}-c${i}`;
      return (
        <g key={i}>
          <defs>
            <clipPath id={clip}>
              <rect x={x - 40} y={y + i * size * lineHeight - s * 0.92} width={maxW + 80} height={s * 1.18} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <text x={x} y={y + i * size * lineHeight + drop} textAnchor={anchor} fontFamily={DISPLAY}
              fontSize={s} letterSpacing={-s * 0.02} fill={color}>{line}</text>
          </g>
        </g>
      );
    })}
  </g>
);

/** A stamp: lands with squash, sits at a few degrees off true. */
export const Stamp: React.FC<{
  x: number; y: number; text: string; f: number; start: number;
  size?: number; color: string; border?: string; rotate?: number; fill?: string;
}> = ({x, y, text, f, start, size = 56, color, border, rotate = -6, fill}) => {
  const t = prog(f, start, 8);
  if (f < start) return null;
  const sq = settle(t);
  const w = text.length * size * 0.62 + size * 1.1;
  const h = size * 1.7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) translate(${-w / 2} ${-h / 2})`}>
      <g transform={`translate(${w / 2} ${h / 2}) scale(${1 + (1 - sq) * 0.16}, ${1 - (1 - sq) * 0.14}) translate(${-w / 2} ${-h / 2})`}
        opacity={clamp(t * 4)}>
        {fill && <rect x={0} y={0} width={w} height={h} fill={fill} />}
        {border !== 'none' && <rect x={size * 0.16} y={size * 0.16} width={w - size * 0.32} height={h - size * 0.32}
          fill="none" stroke={border ?? color} strokeWidth={Math.max(3, size * 0.08)} />}
        <text x={w / 2} y={h / 2 + size * 0.34} textAnchor="middle" fontFamily={DISPLAY} fontSize={size}
          letterSpacing={size * 0.03} fill={color}>{text}</text>
      </g>
    </g>
  );
};

/** One scrolling band of data; velocity is constant and never eases. */
export const Marquee: React.FC<{
  y: number; h: number; text: string; size: number; f: number; color: string;
  speed?: number; opacity?: number; mono?: boolean; dir?: 1 | -1;
}> = ({y, h, text, size, f, color, speed = 5, opacity = 0.9, mono = true, dir = -1}) => {
  const unit = text.length * size * (mono ? 0.62 : 0.6);
  const reps = Math.ceil((W + unit) / unit) + 1;
  const off = (((f * speed) % unit) + unit) % unit;
  return (
    <g>
      <defs>
        <clipPath id={`mq-${y}-${size}`}><rect x={0} y={y - size} width={W} height={h} /></clipPath>
      </defs>
      <g clipPath={`url(#mq-${y}-${size})`} opacity={opacity}>
        {Array.from({length: reps}).map((_, i) => (
          <text key={i} x={(dir < 0 ? -off : off) + i * unit - (dir < 0 ? 0 : unit)} y={y}
            fontFamily={mono ? MONO : DISPLAY} fontSize={size} fill={color}
            letterSpacing={size * 0.02}>{text}</text>
        ))}
      </g>
    </g>
  );
};

/** Engraved rosette. Slow rotation keeps the frame alive without decorating it. */
export const Rosette: React.FC<{
  cx: number; cy: number; r: number; f: number; color: string; opacity?: number;
  k?: number; squash?: number; spin?: number; lines?: number; thick?: number;
}> = ({cx, cy, r, f, color, opacity = 0.5, k = 9, squash = 0.62, spin = 0.004, lines = 3, thick = 2}) => (
  <g opacity={opacity} stroke={color} fill="none" strokeWidth={thick}>
    {Array.from({length: lines}).map((_, li) => {
      const kk = k + li * 3;
      const ph = f * spin * (li % 2 ? -1 : 1) + li * 0.7;
      const pts: string[] = [];
      for (let i = 0; i <= 240; i++) {
        const t = (i / 240) * Math.PI * 2;
        const rr = r * (1 + 0.16 * Math.sin(kk * t + ph)) * (1 - li * 0.09);
        pts.push(`${(cx + rr * Math.cos(t + ph)).toFixed(1)},${(cy + rr * Math.sin(t + ph) * squash).toFixed(1)}`);
      }
      return <polyline key={li} points={pts.join(' ')} />;
    })}
  </g>
);

/** Serials and denominations: mono, large, not a caption. */
export const Mono: React.FC<{
  x: number; y: number; text: string; size: number; color: string; opacity?: number;
  anchor?: 'start' | 'end' | 'middle'; weight?: number; spacing?: number;
}> = ({x, y, text, size, color, opacity = 1, anchor = 'start', weight = 700, spacing = 0}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontWeight={weight} fontSize={size}
    letterSpacing={spacing} fill={color} opacity={opacity}>{text}</text>
);
