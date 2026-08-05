/**
 * A pressable that responds physically.
 *
 * The scale runs on a spring rather than a timing curve so a quick tap and a
 * long press feel different — release mid-compression and it springs back from
 * wherever it got to, the way a real button would.
 */

import React, { memo, useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { springs } from '../../theme/motion';
import { haptics } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it compresses. Larger controls want a subtler press. */
  depth?: number;
  haptic?: boolean;
};

function PressableScaleImpl({
  children,
  style,
  depth = 0.06,
  haptic = true,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * depth }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      pressed.value = withSpring(1, springs.control);
      if (haptic) haptics.tap();
      onPressIn?.(event);
    },
    [haptic, onPressIn, pressed]
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      pressed.value = withSpring(0, springs.control);
      onPressOut?.(event);
    },
    [onPressOut, pressed]
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

export const PressableScale = memo(PressableScaleImpl);
