import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';

import { BOOK } from '../../theme/layout';
import { cornerMetal, ribbonGradient } from '../../theme/palette';

type CornerProps = {
  size: number;
  corner: 'topLeft' | 'bottomRight';
  radius: number;
};

function CornerProtectorImpl({ size, corner, radius }: CornerProps) {
  const path = Skia.Path.Make();

  if (corner === 'topLeft') {
    path.moveTo(radius, 0);
    path.lineTo(size, 0);
    path.lineTo(0, size);
    path.lineTo(0, radius);
    path.quadTo(0, 0, radius, 0);
  } else {
    path.moveTo(size - radius, size);
    path.lineTo(0, size);
    path.lineTo(size, 0);
    path.lineTo(size, size - radius);
    path.quadTo(size, size, size - radius, size);
  }
  path.close();

  const colors = corner === 'topLeft' ? cornerMetal.topLeft : cornerMetal.bottomRight;
  // 135deg for the top-left, 315deg for the bottom-right.
  const start = corner === 'topLeft' ? vec(0, 0) : vec(size, size);
  const end = corner === 'topLeft' ? vec(size, size) : vec(0, 0);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Path path={path}>
        <LinearGradient start={start} end={end} colors={[...colors]} />
      </Path>
    </Canvas>
  );
}

export const CornerProtector = memo(CornerProtectorImpl);

function RibbonImpl({ scale }: { scale: (n: number) => number }) {
  const width = scale(BOOK.ribbon.width);
  const height = scale(BOOK.ribbon.height);
  const notch = height * BOOK.ribbon.notchDepth;

  const path = Skia.Path.Make();
  path.moveTo(0, 0);
  path.lineTo(width, 0);
  path.lineTo(width, height);
  path.lineTo(width / 2, height - notch);
  path.lineTo(0, height);
  path.close();

  return (
    <View
      style={[styles.ribbon, { width, height, top: scale(BOOK.ribbon.top) }]}
      pointerEvents="none"
    >
      <Canvas style={{ width, height }}>
        <Path path={path}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[...ribbonGradient]} />
        </Path>
      </Canvas>
    </View>
  );
}

export const Ribbon = memo(RibbonImpl);

function CoverFrameImpl({
  width,
  height,
  scale,
  children,
}: {
  width: number;
  height: number;
  scale: (n: number) => number;
  children: React.ReactNode;
}) {
  const r = BOOK.coverRadius;

  return (
    <ExpoGradient
      colors={['#BE7742', '#8A4B27']}
      // 150deg in CSS ≈ this diagonal in RN's 0–1 space.
      start={{ x: 0.25, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={[
        styles.cover,
        {
          width,
          height,
          padding: scale(BOOK.coverPadding),
          borderTopLeftRadius: scale(r.tl),
          borderTopRightRadius: scale(r.tr),
          borderBottomRightRadius: scale(r.br),
          borderBottomLeftRadius: scale(r.bl),
        },
      ]}
    >
      {children}
    </ExpoGradient>
  );
}

export const CoverFrame = memo(CoverFrameImpl);

const styles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  cover: {
    shadowColor: 'rgba(50, 34, 16, 1)',
    shadowOpacity: 0.5,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 },
    elevation: 14,
  },
});
