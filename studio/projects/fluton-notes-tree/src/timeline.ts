import film from './film-data.json';
export {film};
/** Scenes carry union-shaped JSON; normalise the optional authoring fields here. */
export type FilmScene=(typeof film.scenes)[number]&{
 authoredFrames?:number;
 captionText?:string|null;
 captionEndFrame?:number;
};
export function getSceneAtFrame(frame:number):FilmScene {
 return film.scenes.find(s=>frame>=s.startFrame&&frame<s.endFrameExclusive)??(frame<0?film.scenes[0]:film.scenes[film.scenes.length-1]);
}
