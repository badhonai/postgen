/**
 * Timing and maths. Pure functions of the frame — no state, no clock, no CSS transitions, so a
 * render is deterministic and any frame can be rendered in isolation.
 */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, start: number, dur: number) => clamp((f - start) / Math.max(1, dur));

/** Critically damped settle: no overshoot, and finished two frames after it starts. */
export const settle = (t: number) => {
  const x = clamp(t);
  return 1 - Math.exp(-6.4 * x) * (1 + 6.4 * x);
};
export const sp = (f: number, start: number, dur: number) => settle(prog(f, start, dur));

/** Quint ease-out. Still moving on its last frame, so no dead expo tail. */
export const ex = (f: number, start: number, dur: number) => 1 - Math.pow(1 - prog(f, start, dur), 5);

/** Frames per musical beat for the score's tempo. */
export const beatFrames = (fps: number, bpm: number) => Math.round((60 / bpm) * fps);

/** Fit display type to a width instead of guessing a font size. */
export const fit = (text: string, maxW: number, max = 300, factor = 0.66) =>
  Math.min(max, maxW / Math.max(1, text.length * factor));

/** Deterministic stand-in for a commitment, nullifier, root or serial. */
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

/** A serial that ticks and then locks on a given frame. */
export const serial = (seed: string, f: number, lock: number, step = 3, len = 16) =>
  f >= lock ? hex(seed, len).toLowerCase() : hex(`${seed}:${Math.floor(f / step)}`, len).toLowerCase();
