/**
 * The fore-edge of the paper stack.
 *
 * A stack of thin slivers stepping outward from the page gives the book real
 * thickness at its outer edges — without it, an open notebook reads as two
 * rectangles rather than a few hundred sheets.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '../../theme/palette';

type Props = {
  side: 'left' | 'right';
  depth: number;
  height: number;
};

const LAYERS = 7;

function StackEdgeImpl({ side, depth, height }: Props) {
  return (
    <View
      style={[
        styles.container,
        // Offset in points rather than percentages: percentage insets resolve
        // against the parent and have to wait for it to be measured, which
        // leaves the stack briefly mis-placed on first layout.
        side === 'left' ? { left: -depth } : { right: -depth },
        { width: depth, height },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: LAYERS }, (_, i) => {
        const t = i / (LAYERS - 1);
        // Each sheet steps out and shortens slightly, so the stack tapers the
        // way a spread book's edges actually do.
        const inset = depth * t;
        const shrink = height * 0.006 * i;
        return (
          <View
            key={i}
            style={[
              styles.layer,
              side === 'left'
                ? { right: 0, left: inset, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }
                : { left: 0, right: inset, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
              {
                top: shrink,
                bottom: shrink,
                backgroundColor: i % 2 === 0 ? palette.paper.edge : palette.paper.deepShade,
                opacity: 1 - t * 0.35,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
  },
  layer: {
    position: 'absolute',
  },
});

export const StackEdge = memo(StackEdgeImpl);
