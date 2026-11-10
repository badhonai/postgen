import raw from './lines.json';
export type LineWord={w:string;startFrame:number;endFrame:number};
export type LineSentence={text:string;startFrame:number;endFrame:number;words:LineWord[]};
export type LineScene={id:string;startFrame:number;endFrame:number;sentences:LineSentence[]};
export const LEAD=raw.leadSeconds;
export const LINES=raw.scenes as LineScene[];
/** Word onsets for one chapter, so a scene can key its drawing to what is being said. */
export const wordsOf=(id:string,si=0):LineWord[]=>LINES.find(s=>s.id===id)?.sentences[si]?.words??[];
/** Frame on which a given word is spoken (first match), or a fallback. */
export const at=(id:string,needle:string,si=0,fallback=0):number=>{
 const w=wordsOf(id,si).find(x=>x.w.toLowerCase().replace(/[^a-z0-9]/g,'')===needle.toLowerCase().replace(/[^a-z0-9]/g,''));
 return w?w.startFrame:fallback;
};
export const sentencesOf=(id:string):LineSentence[]=>LINES.find(s=>s.id===id)?.sentences??[];
