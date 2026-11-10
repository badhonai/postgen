import React from 'react';
import {Composition, registerRoot} from 'remotion';
import spec from '../project.json';
import {Main} from './Main';
const Root: React.FC = () => <Composition id={spec.compositionId} component={Main}
  width={spec.width} height={spec.height} fps={spec.fps} durationInFrames={spec.durationInFrames}/>;
registerRoot(Root);
