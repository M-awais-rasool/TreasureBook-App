/**
 * The cover boards.
 *
 * `Cover` is the front of the closed notebook — the first thing the child sees
 * and the surface that swings open on launch. `Endpaper` is what is glued to
 * the inside of a board, visible on whichever side has no page.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../../theme/palette';
import { text } from '../../theme/typography';

type BoardProps = {
  width: number;
  height: number;
};

// MARK: - Front cover

function CoverImpl({ width, height }: BoardProps) {
  const labelWidth = width * 0.66;

  return (
    <View style={[styles.board, { width, height }]}>
      <LinearGradient
        colors={['#6B3F2C', '#54301F', '#3D2117']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Light raking across the cloth from the top-left. */}
      <LinearGradient
        colors={['rgba(255, 226, 190, 0.16)', 'rgba(255, 226, 190, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Blind-stamped border, the way a school exercise book is finished. */}
      <View style={[styles.coverRule, { margin: width * 0.055 }]} />

      <View style={styles.coverBody}>
        <View style={[styles.label, { width: labelWidth }]}>
          <Text style={styles.labelEyebrow}>NAME</Text>
          <View style={styles.labelLine} />
          <Text style={styles.labelTitle}>Treasure Book</Text>
          <View style={styles.labelLine} />
          <Text style={styles.labelEyebrow}>VOLUME ONE</Text>
        </View>
      </View>

      {/* The board falls away toward the hinge. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.16, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// MARK: - Inside of a board

function EndpaperImpl({ width, height, side }: BoardProps & { side: 'left' | 'right' }) {
  const spineIsLeft = side === 'right';

  return (
    <View style={[styles.board, { width, height }]}>
      <LinearGradient
        colors={['#7A5236', '#5F3D28', '#4A2E1E']}
        locations={[0, 0.5, 1]}
        start={{ x: spineIsLeft ? 0 : 1, y: 0 }}
        end={{ x: spineIsLeft ? 1 : 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Deep shadow in the gutter. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0)']}
        start={{ x: spineIsLeft ? 0 : 1, y: 0 }}
        end={{ x: spineIsLeft ? 0.35 : 0.65, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.endpaperNote}>
        <Text style={styles.endpaperText}>
          {side === 'left' ? 'If found, please return\nto its owner.' : 'The end — for now.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    overflow: 'hidden',
    backgroundColor: '#4A2E1E',
  },
  coverRule: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 180, 0.18)',
    borderRadius: 2,
  },
  coverBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    backgroundColor: 'rgba(244, 233, 212, 0.94)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 3,
    alignItems: 'center',
    transform: [{ rotate: '-1.2deg' }],
  },
  labelEyebrow: {
    ...text.caption,
    fontSize: 9,
    color: palette.ink.faint,
  },
  labelTitle: {
    ...text.pageTitle,
    color: palette.ink.primary,
    marginVertical: 6,
    textAlign: 'center',
  },
  labelLine: {
    height: 1,
    alignSelf: 'stretch',
    marginVertical: 6,
    backgroundColor: 'rgba(59, 44, 36, 0.2)',
  },
  endpaperNote: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  endpaperText: {
    ...text.caption,
    color: 'rgba(255, 236, 208, 0.32)',
    textAlign: 'center',
    lineHeight: 17,
  },
});

export const Cover = memo(CoverImpl);
export const Endpaper = memo(EndpaperImpl);
