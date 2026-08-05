/**
 * The desk the notebook rests on.
 *
 * A warm pool of light centred on the book, falling off into near-black at the
 * edges. The vignette is doing real work here: it stops the eye wandering to
 * the corners and makes a modestly-sized book feel like the subject of the
 * screen rather than a widget floating on a background.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  ColorMatrix,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  Turbulence,
  vec,
} from '@shopify/react-native-skia';

import { palette } from '../theme/palette';

type Props = {
  width: number;
  height: number;
  /** Vertical centre of the light pool — follows the notebook. */
  focusY: number;
};

const DESATURATE = [
  0.33, 0.33, 0.33, 0, 0,
  0.33, 0.33, 0.33, 0, 0,
  0.33, 0.33, 0.33, 0, 0,
  0, 0, 0, 1, 0,
];

function DeskImpl({ width, height, focusY }: Props) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width * 0.6, height)}
          colors={[palette.desk.mid, palette.desk.deep]}
        />
      </Rect>

      {/* Lamp pool. */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, focusY)}
          r={Math.max(width, height) * 0.62}
          colors={[
            'rgba(158, 106, 62, 0.55)',
            'rgba(112, 72, 42, 0.22)',
            'rgba(20, 12, 8, 0)',
          ]}
          positions={[0, 0.45, 1]}
        />
      </Rect>

      {/* Wood grain, barely there. */}
      <Group opacity={0.055} blendMode="multiply">
        <Rect x={0} y={0} width={width} height={height}>
          <Turbulence freqX={0.002} freqY={0.05} octaves={3} seed={7} />
          <ColorMatrix matrix={DESATURATE} />
        </Rect>
      </Group>

      {/* Corners fall away. */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, focusY)}
          r={Math.max(width, height) * 0.78}
          colors={['rgba(8, 4, 2, 0)', 'rgba(8, 4, 2, 0.35)', 'rgba(8, 4, 2, 0.82)']}
          positions={[0, 0.6, 1]}
        />
      </Rect>
    </Canvas>
  );
}

export const Desk = memo(DeskImpl);
