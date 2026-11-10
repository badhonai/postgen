import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
// Three families, three jobs: display (Archivo Black), figures/serials (JetBrains Mono),
// narration captions (Inter). All SIL OFL, bundled locally so a render never waits on a CDN.
loadFont({family:'FlutonDisplay',url:staticFile('fonts/ArchivoBlack-400.woff2'),weight:'400'});
loadFont({family:'FlutonMono',url:staticFile('fonts/JetBrainsMono-var.woff2'),weight:'400 800'});
loadFont({family:'FlutonInter',url:staticFile('fonts/Inter-600.woff2'),weight:'100 900'});
export const DISPLAY='FlutonDisplay';
export const MONO='FlutonMono';
export const FONT='FlutonInter';
