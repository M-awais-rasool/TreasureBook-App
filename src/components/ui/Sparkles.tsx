/**
 * A burst of light when something lands.
 *
 * Each particle's angle, distance and delay are randomised once and then held,
 * so the burst looks scattered but every frame of a single burst is consistent.
 * All of the per-particle motion is derived from one shared progress value, so
 * fourteen particles cost one animation rather than fourteen.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { accentAt } from '../../theme/palette';
import { durations } from '../../theme/motion';

type Props = {
  /** Increment to fire a burst. */
  trigger: number;
  size?: number;
  count?: number;
};

type Particle = {
  angle: number;
  distance: number;
  delay: number;
  scale: number;
  color: string;
  spin: number;
};

function SparklesImpl({ trigger, size = 220, count = 14 }: Props) {
  const progress = useSharedValue(0);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Spread evenly, then jitter, so there are no bald patches.
        const base = (i / count) * Math.PI * 2;
        return {
          angle: base + (Math.random() - 0.5) * 0.7,
          distance: size * (0.28 + Math.random() * 0.24),
          delay: Math.random() * 0.22,
          scale: 0.5 + Math.random() * 0.8,
          color: accentAt(i),
          spin: (Math.random() - 0.5) * 360,
        };
      }),
    // Re-rolled for each burst so repeat captures don't look identical.
    [count, size, trigger]
  );

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: durations.sparkle,
      easing: Easing.out(Easing.cubic),
    });
  }, [trigger, progress]);

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {particles.map((particle, index) => (
        <Particle key={index} particle={particle} progress={progress} />
      ))}
    </View>
  );
}

function Particle({
  particle,
  progress,
}: {
  particle: Particle;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Each particle runs its own slice of the shared timeline.
    const local = interpolate(
      progress.value,
      [particle.delay, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const travel = interpolate(local, [0, 1], [0, particle.distance]);
    return {
      opacity: interpolate(local, [0, 0.12, 0.6, 1], [0, 1, 0.9, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: Math.cos(particle.angle) * travel },
        { translateY: Math.sin(particle.angle) * travel },
        { scale: interpolate(local, [0, 0.25, 1], [0, particle.scale, 0.1], Extrapolation.CLAMP) },
        { rotate: `${particle.spin * local}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      <View style={[styles.spark, { backgroundColor: particle.color }]} />
      <View
        style={[
          styles.spark,
          styles.sparkCross,
          { backgroundColor: particle.color },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  sparkCross: {
    width: 3,
    height: 16,
  },
});

export const Sparkles = memo(SparklesImpl);
