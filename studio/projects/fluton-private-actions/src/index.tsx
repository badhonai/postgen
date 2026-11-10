import React from 'react';
import {Composition, registerRoot} from 'remotion';
import spec from '../project.json';
import {FlutonComposition} from './Composition';
const Root: React.FC = () => <Composition id={spec.compositionId} component={FlutonComposition}
  width={spec.width} height={spec.height} fps={spec.fps} durationInFrames={spec.durationInFrames}/>;
registerRoot(Root);
