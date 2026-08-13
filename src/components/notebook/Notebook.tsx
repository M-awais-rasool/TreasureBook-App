import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { PERSPECTIVE, timings } from '../../theme/motion';
import { haptics } from '../../lib/haptics';
import type { BookMetrics } from '../../hooks/useBookMetrics';
import type { Sticker } from '../../state/collectionStore';
import { Cover } from './Boards';
import { Page } from './Page';
import { Spine } from './Spine';
import { CornerProtector, CoverFrame, Ribbon } from './BookChrome';
import { BOOK } from '../../theme/layout';
import { StackEdge } from './StackEdge';
import { buildSpread, type PageModel } from './pages';

type Props = {
  metrics: BookMetrics;
  stickers: Sticker[];
  hiddenStickerId?: string | null;
  onOpened?: () => void;
};

const COVER_DELAY = 420;
const SETTLE_DELAY = 360;
const FLOAT_MS = 3800;

function NotebookImpl({ metrics, stickers, hiddenStickerId, onOpened }: Props) {
  const { pageWidth, pageHeight, bookWidth, bookHeight, stackDepth, spineHalfWidth } = metrics;
  // The page block sits inside the leather cover border.
  const blockWidth = pageWidth * 2;

  const spread = useMemo(() => buildSpread(stickers), [stickers]);
  const [isOpen, setIsOpen] = useState(false);

  const coverAngle = useSharedValue(0);
  const float = useSharedValue(0);
  const settle = useSharedValue(0);

  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  const handleOpened = useCallback(() => {
    setIsOpen(true);
    haptics.pageSettle();
    onOpenedRef.current?.();
  }, []);

  useEffect(() => {
    coverAngle.value = withDelay(
      COVER_DELAY,
      withTiming(-180, timings.ceremonial, (finished) => {
        'worklet';
        if (finished) runOnJS(handleOpened)();
      })
    );
    settle.value = withDelay(SETTLE_DELAY, withTiming(1, timings.ceremonial));

    return () => {
      cancelAnimation(coverAngle);
      cancelAnimation(settle);
    };
  }, [coverAngle, settle, handleOpened]);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(withTiming(1, { duration: FLOAT_MS }), withTiming(0, { duration: FLOAT_MS })),
      -1,
      true
    );
    return () => cancelAnimation(float);
  }, [float]);

  const bookStyle = useAnimatedStyle(() => ({
    opacity: interpolate(settle.value, [0, 0.3], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY:
          interpolate(settle.value, [0, 1], [26, 0]) + interpolate(float.value, [0, 1], [-2, 2]),
      },
      { rotateZ: `${interpolate(float.value, [0, 1], [-0.16, 0.16])}deg` },
      { scale: interpolate(settle.value, [0, 1], [0.94, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.book, { width: bookWidth, height: bookHeight }, bookStyle]}>
      <View
        style={[styles.deskShadow, { width: bookWidth, height: bookHeight, top: bookHeight * 0.04 }]}
      />

      <CoverFrame width={bookWidth} height={bookHeight} scale={metrics.scale}>
        <View
          style={[styles.pages, { width: blockWidth, height: pageHeight }]}
          pointerEvents="none"
        >
          <View style={[styles.pageClip, { width: blockWidth, height: pageHeight }]}>
            {isOpen && (
              <View style={[styles.half, { left: 0, width: pageWidth, height: pageHeight }]}>
                <StackEdge side="left" depth={stackDepth} height={pageHeight} />
                <Page page={spread.left} metrics={metrics} hiddenStickerId={hiddenStickerId} />
              </View>
            )}

            <View style={[styles.half, { left: pageWidth, width: pageWidth, height: pageHeight }]}>
              <StackEdge side="right" depth={stackDepth} height={pageHeight} />
              <Page page={spread.right} metrics={metrics} hiddenStickerId={hiddenStickerId} />
            </View>
          </View>

          {!isOpen && (
            <CoverLeaf
              angle={coverAngle}
              inside={spread.left}
              metrics={metrics}
              hiddenStickerId={hiddenStickerId}
            />
          )}

          {isOpen && (
            <Spine
              halfWidth={spineHalfWidth}
              height={pageHeight}
              centerX={bookWidth / 2}
              scale={metrics.scale}
            />
          )}
        </View>

        <View style={styles.cornerTopLeft} pointerEvents="none">
          <CornerProtector
            size={metrics.scale(BOOK.cornerTopLeft)}
            corner="topLeft"
            radius={metrics.scale(BOOK.coverRadius.tl)}
          />
        </View>
        <View style={styles.cornerBottomRight} pointerEvents="none">
          <CornerProtector
            size={metrics.scale(BOOK.cornerBottomRight)}
            corner="bottomRight"
            radius={metrics.scale(BOOK.coverRadius.br)}
          />
        </View>
      </CoverFrame>

      <Ribbon scale={metrics.scale} />
    </Animated.View>
  );
}

/**
 * The front cover, hinged at the spine.
 *
 * Both faces are drawn at once with `backfaceVisibility: 'hidden'`, so the
 * cloth shows for the first ninety degrees and the page it reveals for the
 * rest — exactly how a real board behaves.
 */
function CoverLeaf({
  angle,
  inside,
  metrics,
  hiddenStickerId,
}: {
  angle: SharedValue<number>;
  inside: PageModel;
  metrics: BookMetrics;
  hiddenStickerId?: string | null;
}) {
  const { pageWidth, pageHeight } = metrics;

  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${angle.value}deg` }],
  }));
  const frontFace = useAnimatedStyle(() => ({
    opacity: Math.abs(angle.value) <= 90 ? 1 : 0,
  }));
  const backFace = useAnimatedStyle(() => ({
    opacity: Math.abs(angle.value) > 90 ? 1 : 0,
  }));
  const shade = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(angle.value), [0, 90, 180], [0, 0.5, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      style={[styles.coverLeaf, { width: pageWidth, height: pageHeight, left: pageWidth }, leafStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.faceFill, frontFace]}>
        <Cover width={pageWidth} height={pageHeight} />
      </Animated.View>
      <Animated.View style={[styles.faceFill, styles.flipped, backFace]}>
        <Page page={inside} metrics={metrics} hiddenStickerId={hiddenStickerId} />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.coverShade, shade]}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  book: {},
  deskShadow: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.75,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 22 },
    elevation: 24,
  },
  pages: {
    position: 'relative',
  },
  pageClip: {
    overflow: 'hidden',
    borderTopLeftRadius: BOOK.pageRadius.tl,
    borderTopRightRadius: BOOK.pageRadius.tr,
    borderBottomRightRadius: BOOK.pageRadius.br,
    borderBottomLeftRadius: BOOK.pageRadius.bl,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 8,
  },
  half: {
    position: 'absolute',
    top: 0,
  },
  coverLeaf: {
    position: 'absolute',
    top: 0,
    transformOrigin: 'left center',
  },
  faceFill: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  flipped: {
    transform: [{ rotateY: '180deg' }],
  },
  coverShade: {
    backgroundColor: 'rgb(12, 6, 2)',
  },
});

export const Notebook = memo(NotebookImpl);
