/**
 * Icons.
 *
 * Built from plain views rather than an icon font or SVG library: there are
 * only four of them, they stay crisp at any size, and it keeps another
 * dependency and a font-loading step out of the launch path.
 */

import React, { memo } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

export type GlyphName = 'camera' | 'close' | 'chevronLeft' | 'chevronRight' | 'retry';

type Props = {
  name: GlyphName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

function GlyphImpl({ name, size = 24, color = '#fff', strokeWidth }: Props) {
  const stroke = strokeWidth ?? Math.max(1.6, size * 0.085);
  const box = { width: size, height: size };

  if (name === 'camera') {
    // Outlined rather than solid: an outline needs no knowledge of what is
    // behind it, so the lens reads as a hole on any background.
    const bodyTop = size * 0.28;
    const bodyBottom = size * 0.18;
    const lens = size * 0.28;
    return (
      <View style={[box, styles.center]}>
        <View
          style={{
            position: 'absolute',
            top: size * 0.14,
            left: size * 0.3,
            width: size * 0.24,
            height: size * 0.16,
            borderTopLeftRadius: size * 0.05,
            borderTopRightRadius: size * 0.05,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: bodyTop,
            left: size * 0.05,
            right: size * 0.05,
            bottom: bodyBottom,
            borderRadius: size * 0.15,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: bodyTop + (size - bodyTop - bodyBottom - lens) / 2,
            width: lens,
            height: lens,
            borderRadius: lens / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
    );
  }

  if (name === 'close') {
    return (
      <View style={[box, styles.center]}>
        <View
          style={[
            styles.bar,
            { width: size * 0.72, height: stroke, backgroundColor: color, transform: [{ rotate: '45deg' }] },
          ]}
        />
        <View
          style={[
            styles.bar,
            { width: size * 0.72, height: stroke, backgroundColor: color, transform: [{ rotate: '-45deg' }] },
          ]}
        />
      </View>
    );
  }

  if (name === 'retry') {
    return (
      <View style={[box, styles.center]}>
        <View
          style={{
            width: size * 0.66,
            height: size * 0.66,
            borderRadius: size * 0.33,
            borderWidth: stroke,
            borderColor: color,
            borderTopColor: 'transparent',
            transform: [{ rotate: '-35deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.12,
            right: size * 0.2,
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.13,
            borderRightWidth: size * 0.13,
            borderBottomWidth: size * 0.18,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            transform: [{ rotate: '52deg' }],
          }}
        />
      </View>
    );
  }

  // Chevrons
  const rotate = name === 'chevronLeft' ? '45deg' : '-135deg';
  return (
    <View style={[box, styles.center]}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderLeftWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          transform: [{ rotate }],
          marginLeft: name === 'chevronLeft' ? size * 0.08 : -size * 0.08,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    borderRadius: 2,
  },
});

export const Glyph = memo(GlyphImpl);
