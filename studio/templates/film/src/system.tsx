import filmData from './film-data.json';
import type {Spec} from '../../../system';
/** Bind this film's spec to the shared motion system. Scenes import from '../system' only. */
export * from '../../../system';
export const FILM = filmData as unknown as Spec;
export const P = FILM.palette;
export const W = FILM.width;
export const H = FILM.height;
export const SIDE = FILM.safeAreas.side;
export const FONT = 'FlutonInter';
