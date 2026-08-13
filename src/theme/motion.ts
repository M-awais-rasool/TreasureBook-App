import { Easing } from 'react-native-reanimated';
import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const springs = {
  paper: {
    damping: 22,
    stiffness: 120,
    mass: 1.1,
    overshootClamping: false,
  } satisfies WithSpringConfig,

  control: {
    damping: 16,
    stiffness: 320,
    mass: 0.7,
  } satisfies WithSpringConfig,

  stamp: {
    damping: 11,
    stiffness: 210,
    mass: 0.9,
  } satisfies WithSpringConfig,

  sheet: {
    damping: 26,
    stiffness: 180,
    mass: 1,
  } satisfies WithSpringConfig,
} as const;

export const timings = {
  instant: { duration: 120, easing: Easing.out(Easing.quad) } satisfies WithTimingConfig,
  quick: { duration: 220, easing: Easing.out(Easing.cubic) } satisfies WithTimingConfig,
  base: { duration: 360, easing: Easing.bezier(0.22, 1, 0.36, 1) } satisfies WithTimingConfig,
  slow: { duration: 620, easing: Easing.bezier(0.22, 1, 0.36, 1) } satisfies WithTimingConfig,
  ceremonial: { duration: 1150, easing: Easing.bezier(0.16, 1, 0.3, 1) } satisfies WithTimingConfig,
} as const;

export const PERSPECTIVE = 1400;

export const durations = {
  sparkle: 900,
  traceOutline: 1100,
  shutter: 260,
} as const;
