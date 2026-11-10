import React from 'react';
import {Composition,registerRoot} from 'remotion';
import spec from '../project.json';
import {FlutonNotesComposition} from './Composition';
const Root:React.FC=()=> <Composition id={spec.compositionId} component={FlutonNotesComposition}
  width={spec.width} height={spec.height} fps={spec.fps} durationInFrames={spec.durationInFrames}/>;
registerRoot(Root);
