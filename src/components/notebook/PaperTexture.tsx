/**
 * The paper itself.
 *
 * Everything that makes the page look like a physical object is rendered in a
 * single Skia canvas: the base stock, the gutter shadow where the sheet curves
 * into the binding, aged edges, and two layers of procedural grain. Keeping it
 * all in one canvas matters — blend modes only compose within a canvas, so a
 * noise layer painted over React Native views would have nothing to multiply
 * against.
 *
 * Nothing here animates, so Skia rasterises it once and leaves it alone.
 */

import React, { memo } from 'react';
import {
  Canvas,
  ColorMatrix,
  FractalNoise,
  Group,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Turbulence,
  vec,
} from '@shopify/react-native-skia';

import { palette } from '../../theme/palette';

export type PaperSide = 'left' | 'right';

export type Ruling = {
  /** Gap between ruled lines. */
  spacing: number;
  /** Inset from the outer (fore-edge) side. */
  outer: number;
  /** Inset from the inner (binding) side. */
  inner: number;
  /** Inset from the top and bottom. */
  vertical: number;
  /** Draw the red margin rule. */
  margin: boolean;
};

type Props = {
  width: number;
  height: number;
  side: PaperSide;
  /** Varies the grain so no two pages look stamped from the same mould. */
  seed?: number;
  /** Printed ruling, drawn under the grain so the ageing sits on top of it. */
  ruling?: Ruling | null;
};

/** Collapses RGB to luminance so the noise reads as fibre, not colour static. */
const DESATURATE = [
  0.33, 0.33, 0.33, 0, 0,
  0.33, 0.33, 0.33, 0, 0,
  0.33, 0.33, 0.33, 0, 0,
  0, 0, 0, 1, 0,
];

function PaperTextureImpl({ width, height, side, seed = 0, ruling = null }: Props) {
  if (width <= 0 || height <= 0) return null;

  const spineIsLeft = side === 'right';
  // How far the gutter shading reaches in from the binding.
  const gutterSpan = Math.max(18, width * 0.3);

  const lines: number[] = [];
  let marginX: number | null = null;
  if (ruling) {
    for (let y = ruling.vertical; y <= height - ruling.vertical; y += ruling.spacing) {
      lines.push(Math.round(y) + 0.5);
    }
    if (ruling.margin) {
      const gap = ruling.inner * 0.62;
      marginX = Math.round(spineIsLeft ? gap : width - gap) + 0.5;
    }
  }
  const ruleLeft = ruling ? (spineIsLeft ? ruling.inner : ruling.outer) : 0;
  const ruleRight = ruling ? width - (spineIsLeft ? ruling.outer : ruling.inner) : width;

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {/* Base stock, warmer toward the outer edge where light falls on it. */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(spineIsLeft ? 0 : width, 0)}
          end={vec(spineIsLeft ? width : 0, height)}
          colors={[palette.paper.shade, palette.paper.base, palette.paper.highlight]}
          positions={[0, 0.42, 1]}
        />
      </Rect>

      {/* Gutter: the sheet curving down into the binding. */}
      <Rect
        x={spineIsLeft ? 0 : width - gutterSpan}
        y={0}
        width={gutterSpan}
        height={height}
      >
        <LinearGradient
          start={vec(spineIsLeft ? 0 : width, 0)}
          end={vec(spineIsLeft ? gutterSpan : width - gutterSpan, 0)}
          colors={[
            'rgba(76, 52, 32, 0.42)',
            'rgba(76, 52, 32, 0.14)',
            'rgba(76, 52, 32, 0)',
          ]}
          positions={[0, 0.45, 1]}
        />
      </Rect>

      {/* Age: the middle stays clean, the edges have yellowed. */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, height / 2)}
          r={Math.max(width, height) * 0.72}
          colors={[
            'rgba(150, 110, 62, 0)',
            'rgba(150, 110, 62, 0.05)',
            'rgba(122, 84, 44, 0.22)',
          ]}
          positions={[0, 0.62, 1]}
        />
      </Rect>

      {/* Printed ruling. Drawn before the grain so the ageing settles over it,
          the way real ink sits under decades of handling. */}
      {ruling && (
        <Group opacity={0.85}>
          {lines.map((y) => (
            <Line
              key={y}
              p1={vec(ruleLeft, y)}
              p2={vec(ruleRight, y)}
              color={palette.ink.rule}
              strokeWidth={1}
            />
          ))}
          {marginX !== null && (
            <Line
              p1={vec(marginX, ruling.vertical * 0.4)}
              p2={vec(marginX, height - ruling.vertical * 0.4)}
              color={palette.ink.margin}
              strokeWidth={1.2}
            />
          )}
        </Group>
      )}

      {/* Broad mottling — the uneven pulp of cheap old paper. */}
      <Group opacity={0.055} blendMode="multiply">
        <Rect x={0} y={0} width={width} height={height}>
          <Turbulence freqX={0.008} freqY={0.012} octaves={2} seed={seed + 11} />
          <ColorMatrix matrix={DESATURATE} />
        </Rect>
      </Group>

      {/* Fine grain — individual fibres. */}
      <Group opacity={0.1} blendMode="multiply">
        <Rect x={0} y={0} width={width} height={height}>
          <FractalNoise freqX={0.7} freqY={0.7} octaves={3} seed={seed} />
          <ColorMatrix matrix={DESATURATE} />
        </Rect>
      </Group>

      {/* A few brighter fibres catching the light. */}
      <Group opacity={0.07} blendMode="screen">
        <Rect x={0} y={0} width={width} height={height}>
          <FractalNoise freqX={1.4} freqY={1.4} octaves={2} seed={seed + 37} />
          <ColorMatrix matrix={DESATURATE} />
        </Rect>
      </Group>

      {/* Darkened fore-edge — the side that has been thumbed for decades. */}
      <Rect
        x={spineIsLeft ? width - 14 : 0}
        y={0}
        width={14}
        height={height}
      >
        <LinearGradient
          start={vec(spineIsLeft ? width : 0, 0)}
          end={vec(spineIsLeft ? width - 14 : 14, 0)}
          colors={['rgba(128, 96, 58, 0.3)', 'rgba(128, 96, 58, 0)']}
        />
      </Rect>
    </Canvas>
  );
}

export const PaperTexture = memo(PaperTextureImpl);
