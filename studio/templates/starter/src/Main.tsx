import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {motion, cubicBezier} from 'framer-motion';

loadFont({family: 'StudioInter', url: staticFile('fonts/Inter-600.woff2'), weight: '600'});
const ease = cubicBezier(.16, 1, .3, 1);
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** A clock/font/integration fixture, NOT an art-direction template to repeat for clients. */
export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const entry = ease(clamp(frame / 40));
  const progress = clamp(frame / Math.max(1, durationInFrames - 1));
  return <AbsoluteFill style={{background: '#181421', fontFamily: 'StudioInter', color: '#fff4e5'}}>
    <svg width={width} height={height} viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
      <motion.g initial={false} style={{x: -140 * (1 - entry), opacity: entry}}>
        <text x="120" y="230" fontSize="36" fill="#42e8de">SCAFFOLD / NOT FINAL ART DIRECTION</text>
        <text x="120" y="410" fontSize="110">Start with an idea.</text>
        <text x="120" y="500" fontSize="32">Build the story before the effects.</text>
      </motion.g>
      <motion.g initial={false} style={{x: 1120 * progress, rotate: 90 * progress, originX: '180px', originY: '730px'}}>
        <rect x="120" y="670" width="120" height="120" rx="12" fill="#42e8de"/>
      </motion.g>
      <path d="M 120 900 H 1800" stroke="#fff4e5" strokeWidth="2" opacity=".25"/>
      <path d={`M 120 900 H ${120 + 1680 * progress}`} stroke="#ce006f" strokeWidth="10"/>
    </svg>
  </AbsoluteFill>;
};
