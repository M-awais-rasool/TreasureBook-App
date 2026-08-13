import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../../theme/palette';
import { text } from '../../theme/typography';

type BoardProps = {
  width: number;
  height: number;
};

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
});

export const Cover = memo(CoverImpl);
