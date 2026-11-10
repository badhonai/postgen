/**
 * Directions, as tokens. A direction is a palette, a colour script (which chapter is printed on
 * which ground) and a type scale. A film picks a direction; scenes never invent colours inline.
 */
export type Ground = 'paper' | 'ink' | 'verm' | 'blue';
export type Palette = {paper: string; ink: string; verm: string; blue: string};

export type SceneSpec = {
  id: string;
  startFrame: number;
  endFrameExclusive: number;
  ground?: Ground;
  background: string;
  foreground: string;
  captionText?: string;
};

export type Spec = {
  width: number;
  height: number;
  palette: Palette;
  safeAreas: {side: number};
  scenes: SceneSpec[];
  durationInFrames: number;
  durationSeconds: number;
  finalNotice?: string;
};

/** "Mint Security" — paper and ink, printed; colour used as a cut, never as decoration. */
export const MINT_SECURITY: Palette = {paper: '#EDEDE7', ink: '#0B0B0C', verm: '#FF3B1F', blue: '#1B4CFF'};

/** The type scale a film sets once and never changes. */
export const TYPE = {hero: 170, narration: 62, figure: 130, label: 23, mono: 22};

export const inkOn = (p: Palette, g: Ground) => (g === 'paper' ? p.ink : p.paper);
export const groundOf = (p: Palette, g: Ground) => p[g];

/** Chapter grounds. Any film can use any sequence; this is just the one that worked here. */
export const COLOUR_SCRIPTS: {[k: string]: Ground[]} = {
  alternate: ['paper', 'ink', 'paper', 'verm', 'ink', 'blue', 'paper', 'ink'],
  inverse: ['ink', 'paper', 'ink', 'verm', 'paper', 'blue', 'ink', 'ink'],
  single: ['ink'],
};
