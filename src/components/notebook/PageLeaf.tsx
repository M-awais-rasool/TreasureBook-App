/**
 * A sheet caught mid-turn.
 *
 * The leaf is anchored at the spine and rotated about its Y axis. Both faces
 * are drawn at once with `backfaceVisibility: 'hidden'`, so the front is
 * visible for the first ninety degrees and the back for the rest — exactly how
 * a real sheet behaves.
 *
 * The rotation alone is not what sells the effect. Almost all of the realism
 * comes from the shading that rides on top of it: the face darkening as it
 * turns away from the light, and a sheen that sweeps across the paper as it
 * passes through vertical.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { PERSPECTIVE } from '../../theme/motion';
import type { BookMetrics } from '../../hooks/useBookMetrics';
import { Page } from './Page';
import type { Sheet } from './pages';

type Props = {
  sheet: Sheet;
  /** Rotation in degrees, 0 (lying right) to -180 (lying left). */
  angle: SharedValue<number>;
  metrics: BookMetrics;
  hiddenStickerId?: string | null;
  totalCollected?: number;
};

function PageLeafImpl({ sheet, angle, metrics, hiddenStickerId, totalCollected }: Props) {
  const { pageWidth, pageHeight } = metrics;

  const leafStyle = useAnimatedStyle(() => {
    const a = angle.value;
    const abs = Math.abs(a);
    const bow = Math.sin((abs / 180) * Math.PI);
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { rotateY: `${a}deg` },
        { rotateZ: `${bow * -3.2}deg` },
        { rotateX: `${bow * 5}deg` },
        { scaleX: 1 - bow * 0.05 },
        { scaleY: 1 + bow * 0.035 },
      ],
    };
  });

  const curl = useAnimatedStyle(() => {
    const bow = Math.sin((Math.abs(angle.value) / 180) * Math.PI);
    return { opacity: bow * 0.55 };
  });

  const frontFace = useAnimatedStyle(() => ({
    opacity: Math.abs(angle.value) <= 90 ? 1 : 0,
  }));

  const backFace = useAnimatedStyle(() => ({
    opacity: Math.abs(angle.value) > 90 ? 1 : 0,
  }));

  const frontShade = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(angle.value), [0, 90], [0, 0.6], Extrapolation.CLAMP),
  }));

  const backShade = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(angle.value), [90, 180], [0.62, 0], Extrapolation.CLAMP),
  }));

  // A band of reflected light crossing the sheet as it passes vertical.
  const sheen = useAnimatedStyle(() => {
    const abs = Math.abs(angle.value);
    return {
      opacity: interpolate(abs, [20, 78, 96, 160], [0, 0.5, 0.5, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(abs, [0, 180], [-pageWidth * 0.5, pageWidth * 0.5]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.leaf,
        { width: pageWidth, height: pageHeight, left: pageWidth },
        leafStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.face, frontFace]}>
        <Page
          page={sheet.front}
          side="right"
          metrics={metrics}
          hiddenStickerId={hiddenStickerId}
          totalCollected={totalCollected}
        />
        <Animated.View style={[StyleSheet.absoluteFill, frontShade]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(28, 16, 8, 0.72)', 'rgba(28, 16, 8, 0.34)', 'rgba(28, 16, 8, 0.12)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.face, styles.backFace, backFace]}>
        <Page
          page={sheet.back}
          side="left"
          metrics={metrics}
          hiddenStickerId={hiddenStickerId}
          totalCollected={totalCollected}
        />
        <Animated.View style={[StyleSheet.absoluteFill, backShade]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(28, 16, 8, 0.14)', 'rgba(28, 16, 8, 0.38)', 'rgba(28, 16, 8, 0.74)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, curl]} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(40, 24, 12, 0.42)',
            'rgba(40, 24, 12, 0.06)',
            'rgba(255, 248, 232, 0.20)',
            'rgba(40, 24, 12, 0.16)',
          ]}
          locations={[0, 0.28, 0.62, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Sheen sits above both faces so it travels across whichever is showing. */}
      <View style={styles.sheenClip} pointerEvents="none">
        <Animated.View
          style={[
            styles.sheenBand,
            { width: pageWidth * 0.55, height: pageHeight * 1.2 },
            sheen,
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255, 246, 226, 0)',
              'rgba(255, 246, 226, 0.5)',
              'rgba(255, 246, 226, 0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    top: 0,
    transformOrigin: 'left center',
  },
  face: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    transform: [{ rotateY: '180deg' }],
  },
  sheenClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  sheenBand: {
    position: 'absolute',
    top: '-10%',
    left: '22%',
  },
});

export const PageLeaf = memo(PageLeafImpl);
