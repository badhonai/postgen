import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
// The shared Inter container has a variable weight axis. Local and capture-blocking.
loadFont({family:'FlutonInter',url:staticFile('fonts/Inter-600.woff2'),weight:'100 900'});
export const FONT='FlutonInter';
