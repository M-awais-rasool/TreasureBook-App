/**
 * The sticker travelling from the camera onto the page.
 *
 * Motion is a quadratic Bézier rather than a straight line — things thrown onto
 * a table arc, and the curve also keeps the sticker clear of the notebook until
 * the last moment so you can watch it the whole way.
 *
 * The landing is where the weight comes from: a short squash on impact, a
 * spring back, and a dark copy of the silhouette blooming outward and fading,
 * which reads as the shape being pressed into the paper.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from '../theme/motion';

export type FlightPoint = {
  /** Centre, in screen coordinates. */
  cx: number;
  cy: number;
  width: number;
  height: number;
};

type Props = {
  uri: string;
  from: FlightPoint;
  to: FlightPoint & { rotation: number };
  /** Flip to true to launch. Stays parked at `from` until then. */
  flying: boolean;
  onLanded: () => void;
};

const FLIGHT_MS = 820;

function StickerFlightImpl({ uri, from, to, flying, onLanded }: Props) {
  const progress = useSharedValue(0);
  const land = useSharedValue(0);
  const bloom = useSharedValue(0);

  // Control point for the arc: midway across, lifted by a quarter of the
  // distance travelled, so longer journeys arc higher.
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const distance = Math.hypot(dx, dy);
  const controlX = from.cx + dx * 0.45;
  const controlY = from.cy + dy * 0.28 - distance * 0.26;

  const startScale = to.width > 0 ? from.width / to.width : 1;

  useEffect(() => {
    if (!flying) return;
    progress.value = withTiming(
      1,
      { duration: FLIGHT_MS, easing: Easing.bezier(0.36, 0, 0.18, 1) },
      (finished) => {
        'worklet';
        if (!finished) return;
        land.value = withSequence(
          withTiming(1, { duration: 90 }),
          withSpring(0, springs.stamp)
        );
        bloom.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
        runOnJS(onLanded)();
      }
    );
  }, [flying, progress, land, bloom, onLanded]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const mt = 1 - t;
    const x = mt * mt * from.cx + 2 * mt * t * controlX + t * t * to.cx;
    const y = mt * mt * from.cy + 2 * mt * t * controlY + t * t * to.cy;

    const squash = land.value;
    return {
      transform: [
        { translateX: x - to.cx },
        { translateY: y - to.cy },
        { scale: interpolate(t, [0, 1], [startScale, 1]) },
        // Overshoot the angle slightly, then settle — paper flutters as it drops.
        { rotate: `${interpolate(t, [0, 0.72, 1], [0, to.rotation * 1.5, to.rotation])}deg` },
        { scaleX: 1 + squash * 0.14 },
        { scaleY: 1 - squash * 0.18 },
      ],
    };
  });

  // The shadow tightens and darkens as the sticker nears the page.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0.18, 0.4], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [26, 3]) },
      { translateY: interpolate(progress.value, [0, 1], [34, 5]) },
      { scale: interpolate(progress.value, [0, 1], [1.06, 1]) },
    ],
  }));

  // Ink pressing into the paper.
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bloom.value, [0, 0.15, 1], [0, 0.55, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(bloom.value, [0, 1], [1, 1.14]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: to.cx - to.width / 2,
          top: to.cy - to.height / 2,
          width: to.width,
          height: to.height,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          tintColor="rgba(24, 12, 6, 1)"
          blurRadius={7}
          transition={0}
        />
      </Animated.View>

      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={0}
        />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, bloomStyle]} pointerEvents="none">
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          tintColor="rgba(59, 44, 36, 1)"
          transition={0}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});

export const StickerFlight = memo(StickerFlightImpl);
