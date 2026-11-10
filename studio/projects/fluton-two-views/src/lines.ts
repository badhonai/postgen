import raw from './lines.json';
import {makeLines} from '../../../system';
/** This film's word timings, produced by `node tools/film.mjs lines <slug>`. */
export const {LINES, LEAD, sentencesOf, wordsOf, at, sentenceStart} = makeLines(raw as never);
