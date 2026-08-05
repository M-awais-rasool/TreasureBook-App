/**
 * A single sticker sitting on the page.
 *
 * The drop shadow is the same PNG drawn again underneath, tinted black and
 * blurred. Because it reuses the cutout's own alpha it follows the subject's
 * silhouette exactly, which a rectangular `shadowOffset` never could — and it
 * is what sells the sticker as a physical thing lying on paper.
 */

import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

type Props = {
  uri: string;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  /** Scales the shadow's offset and softness with the sticker's size. */
  elevation?: number;
};

function StickerViewImpl({ uri, width, height, style, elevation = 1 }: Props) {
  const offset = 3 * elevation;
  const blur = 5 * elevation;

  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Image
        source={{ uri }}
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: offset * 0.6 }, { translateY: offset }] },
        ]}
        contentFit="contain"
        tintColor="rgba(38, 22, 12, 0.34)"
        blurRadius={blur}
        cachePolicy="memory-disk"
        transition={0}
      />
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
      />
    </View>
  );
}

export const StickerView = memo(StickerViewImpl);
