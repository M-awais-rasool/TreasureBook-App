/**
 * The cloth binding straddling the centre fold, plus the stitching that holds
 * the sheets in. Drawn above the pages so it reads as the topmost layer of the
 * physical object.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../../theme/palette';

type Props = {
  halfWidth: number;
  height: number;
  /** Centre of the book, in book-local coordinates. */
  centerX: number;
};

const STITCH_COUNT = 9;

function SpineImpl({ halfWidth, height, centerX }: Props) {
  const width = halfWidth * 2;

  return (
    <View
      style={[styles.container, { left: centerX - halfWidth, width, height }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[
          palette.binding.clothDark,
          palette.binding.cloth,
          palette.binding.clothLight,
          palette.binding.cloth,
          palette.binding.clothDark,
        ]}
        locations={[0, 0.24, 0.5, 0.76, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* The deep crease where both pages disappear into the binding. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.stitches, { paddingVertical: height * 0.06 }]}>
        {Array.from({ length: STITCH_COUNT }, (_, i) => (
          <View
            key={i}
            style={[
              styles.stitch,
              { width: Math.max(1.5, halfWidth * 0.62), height: Math.max(4, height * 0.014) },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  stitches: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  stitch: {
    borderRadius: 2,
    backgroundColor: palette.binding.thread,
    opacity: 0.5,
  },
});

export const Spine = memo(SpineImpl);
