import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette, spineGradient } from '../../theme/palette';
import { BOOK } from '../../theme/layout';

type Props = {
  halfWidth: number;
  height: number;
  centerX: number;
  scale: (n: number) => number;
};

function StitchLine({
  height,
  scale,
  side,
}: {
  height: number;
  scale: (n: number) => number;
  side: 'left' | 'right';
}) {
  const dash = scale(BOOK.stitch.dash);
  const count = Math.max(1, Math.floor(height / (dash * 2)));

  return (
    <View
      style={[
        styles.stitchLine,
        {
          width: scale(BOOK.stitch.width),
          top: scale(BOOK.stitch.verticalInset),
          bottom: scale(BOOK.stitch.verticalInset),
          [side]: scale(BOOK.stitch.inset),
        },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: dash, marginBottom: dash, backgroundColor: palette.binding.thread, borderRadius: scale(1) }} />
      ))}
    </View>
  );
}

function SpineImpl({ halfWidth, height, centerX, scale }: Props) {
  const width = halfWidth * 2;
  const stitchHeight = height - scale(BOOK.stitch.verticalInset) * 2;

  return (
    <View
      style={[styles.container, { left: centerX - halfWidth, width, height }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[...spineGradient.colors]}
        locations={[...spineGradient.locations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <StitchLine height={stitchHeight} scale={scale} side="left" />
      <StitchLine height={stitchHeight} scale={scale} side="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    shadowColor: 'rgba(35, 18, 4, 1)',
    shadowOpacity: 0.6,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  stitchLine: {
    position: 'absolute',
    overflow: 'hidden',
  },
});

export const Spine = memo(SpineImpl);
