/**
 * Word timings. `tools/word-lines.py` writes src/lines.json for each film; this turns that file
 * into lookups a chapter can key its drawing to.
 *
 *   const {LINES, wordsOf, at, sentencesOf} = makeLines(raw);
 *   at('joinsplit', 'equal')   // the frame on which that word is spoken
 */
export type TypedWord = {w: string; startFrame: number; endFrame: number};
export type TypedSentence = {text: string; startFrame: number; endFrame: number; words: TypedWord[]};
export type TypedScene = {id: string; startFrame: number; endFrame: number; sentences: TypedSentence[]};
export type LinesFile = {
  leadSeconds: number;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
  scenes: TypedScene[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function makeLines(raw: LinesFile) {
  const LINES = raw.scenes;
  const sentencesOf = (id: string): TypedSentence[] => LINES.find(s => s.id === id)?.sentences ?? [];
  const wordsOf = (id: string, si = 0): TypedWord[] => sentencesOf(id)[si]?.words ?? [];

  /** Frame on which a word is spoken (first match in that sentence), or a fallback. */
  const at = (id: string, needle: string, si = 0, fallback = 0): number => {
    const w = wordsOf(id, si).find(x => norm(x.w) === norm(needle));
    return w ? w.startFrame : fallback;
  };

  /** Frame on which the first word of a sentence is spoken. */
  const sentenceStart = (id: string, si = 0): number =>
    sentencesOf(id)[si]?.startFrame ?? 0;

  return {LINES, LEAD: raw.leadSeconds, sentencesOf, wordsOf, at, sentenceStart};
}
