import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { PERSPECTIVE, springs, timings } from '../../theme/motion';
import { haptics } from '../../lib/haptics';
import type { BookMetrics } from '../../hooks/useBookMetrics';
import type { Sticker } from '../../state/collectionStore';
import { Cover, Endpaper } from './Boards';
import { Page } from './Page';
import { PageLeaf } from './PageLeaf';
import { Spine } from './Spine';
import { CornerProtector, CoverFrame, Ribbon } from './BookChrome';
import { BOOK } from '../../theme/layout';
import { StackEdge } from './StackEdge';
import { buildSheets, spreadAt, type Sheet } from './pages';

export type NotebookHandle = {
  goToSpread: (spreadIndex: number) => Promise<void>;
  currentSpread: () => number;
};

type Props = {
  metrics: BookMetrics;
  stickers: Sticker[];
  hiddenStickerId?: string | null;
  onSpreadChange?: (spreadIndex: number) => void;
  onOpened?: () => void;
};

type Direction = 'forward' | 'backward';
type Turning = { sheetIndex: number; direction: Direction } | null;

const COMMIT_ANGLE = 90;
const FLING_VELOCITY = 550;

function NotebookImpl(
  { metrics, stickers, hiddenStickerId, onSpreadChange, onOpened }: Props,
  ref: React.Ref<NotebookHandle>
) {
  const { pageWidth, pageHeight, bookWidth, bookHeight, stackDepth, spineHalfWidth } = metrics;
  // The page block sits inside the leather cover border.
  const blockWidth = pageWidth * 2;

  const sheets = useMemo(() => buildSheets(stickers), [stickers]);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState<Turning>(null);
  const [isOpen, setIsOpen] = useState(false);

  const angle = useSharedValue(0);
  const coverAngle = useSharedValue(0);
  const float = useSharedValue(0);
  const settle = useSharedValue(0);

  const gestureDirection = useSharedValue(0);
  const canGoForward = useSharedValue(false);
  const canGoBack = useSharedValue(false);
  const isBusy = useSharedValue(false);

  const spreadRef = useRef(0);
  const busyRef = useRef(false);
  const pendingResolve = useRef<(() => void) | null>(null);

  useEffect(() => {
    spreadRef.current = spread;
    canGoForward.value = isOpen && spread < sheets.length;
    canGoBack.value = isOpen && spread > 0;
  }, [spread, sheets.length, isOpen, canGoForward, canGoBack]);


  const handleOpened = useCallback(() => {
    setIsOpen(true);
    haptics.pageSettle();
    onOpened?.();
  }, [onOpened]);

  useEffect(() => {
    coverAngle.value = withDelay(
      420,
      withTiming(-180, timings.ceremonial, (finished) => {
        'worklet';
        if (finished) runOnJS(handleOpened)();
      })
    );
    settle.value = withDelay(360, withTiming(1, timings.ceremonial));
  }, []);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(withTiming(1, { duration: 3800 }), withTiming(0, { duration: 3800 })),
      -1,
      true
    );
    return () => cancelAnimation(float);
  }, [float]);


  const finishTurn = useCallback(
    (completed: boolean, direction: Direction) => {
      if (!busyRef.current) return;

      if (completed) {
        const next = direction === 'forward' ? spreadRef.current + 1 : spreadRef.current - 1;
        spreadRef.current = next;
        setSpread(next);
        onSpreadChange?.(next);
        haptics.pageSettle();
      }

      requestAnimationFrame(() => {
        setTurning(null);
        angle.value = 0;
        busyRef.current = false;
        isBusy.value = false;
        const resolve = pendingResolve.current;
        pendingResolve.current = null;
        resolve?.();
      });
    },
    [angle, isBusy, onSpreadChange]
  );

  const mountLeaf = useCallback(
    (direction: Direction): boolean => {
      if (busyRef.current) return false;
      const current = spreadRef.current;
      if (direction === 'forward' && current >= sheets.length) return false;
      if (direction === 'backward' && current <= 0) return false;

      busyRef.current = true;
      isBusy.value = true;
      setTurning({
        sheetIndex: direction === 'forward' ? current : current - 1,
        direction,
      });
      return true;
    },
    [sheets.length, isBusy]
  );

  const animateTo = useCallback(
    (target: number, direction: Direction, velocity = 0) => {
      const completed = direction === 'forward' ? target === -180 : target === 0;
      angle.value = withSpring(target, { ...springs.pageTurn, velocity }, (finished) => {
        'worklet';
        if (finished) runOnJS(finishTurn)(completed, direction);
      });
    },
    [angle, finishTurn]
  );

  const turnOnce = useCallback(
    (direction: Direction) =>
      new Promise<boolean>((resolve) => {
        if (!mountLeaf(direction)) {
          resolve(false);
          return;
        }

        let settled = false;
        const done = (completed: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(deadline);
          resolve(completed);
        };
        const deadline = setTimeout(() => done(false), 2200);

        angle.value = direction === 'forward' ? 0 : -180;
        pendingResolve.current = () => done(true);
        haptics.pageTick();
        requestAnimationFrame(() => {
          animateTo(direction === 'forward' ? -180 : 0, direction);
        });
      }),
    [angle, animateTo, mountLeaf]
  );

  const beginFromGesture = useCallback(
    (forward: boolean) => {
      const direction: Direction = forward ? 'forward' : 'backward';
      if (!mountLeaf(direction)) {
        gestureDirection.value = 0;
      }
    },
    [mountLeaf, gestureDirection]
  );

  const settleFromGesture = useCallback(
    (target: number, direction: Direction, velocity: number) => {
      animateTo(target, direction, velocity);
    },
    [animateTo]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-30, 30])
        .onUpdate((event) => {
          'worklet';
          if (gestureDirection.value === 0) {
            if (isBusy.value) return;
            const forward = event.translationX < 0;
            if (forward && !canGoForward.value) return;
            if (!forward && !canGoBack.value) return;
            gestureDirection.value = forward ? 1 : -1;
            angle.value = forward ? 0 : -180;
            runOnJS(beginFromGesture)(forward);
          }

          const start = gestureDirection.value === 1 ? 0 : -180;
          const next = start + (event.translationX / pageWidth) * 180;
          angle.value = Math.min(0, Math.max(-180, next));
        })
        .onEnd((event) => {
          'worklet';
          const dir = gestureDirection.value;
          if (dir === 0) return;
          gestureDirection.value = 0;

          const travelled = Math.abs(angle.value);
          const flungForward = event.velocityX < -FLING_VELOCITY;
          const flungBack = event.velocityX > FLING_VELOCITY;

          const complete =
            dir === 1
              ? flungForward || (!flungBack && travelled > COMMIT_ANGLE)
              : flungBack || (!flungForward && travelled < COMMIT_ANGLE);

          const resultDirection: Direction =
            dir === 1 ? (complete ? 'forward' : 'backward') : complete ? 'backward' : 'forward';
          const target = dir === 1 ? (complete ? -180 : 0) : complete ? 0 : -180;

          runOnJS(settleFromGesture)(target, resultDirection, event.velocityX / 12);
        })
        .onFinalize(() => {
          'worklet';
          gestureDirection.value = 0;
        }),
    [
      angle,
      beginFromGesture,
      settleFromGesture,
      pageWidth,
      gestureDirection,
      canGoForward,
      canGoBack,
      isBusy,
    ]
  );

  const handleTap = useCallback(
    (forward: boolean) => {
      void turnOnce(forward ? 'forward' : 'backward');
    },
    [turnOnce]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(280)
        .onEnd((event, success) => {
          'worklet';
          if (!success || isBusy.value) return;
          const forward = event.x > blockWidth / 2;
          if (forward && !canGoForward.value) return;
          if (!forward && !canGoBack.value) return;
          runOnJS(handleTap)(forward);
        }),
    [blockWidth, handleTap, canGoForward, canGoBack, isBusy]
  );

  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  useImperativeHandle(
    ref,
    () => ({
      currentSpread: () => spreadRef.current,
      goToSpread: async (target: number) => {
        let guard = 0;
        while (spreadRef.current !== target && guard < 24) {
          guard += 1;
          const direction: Direction = target > spreadRef.current ? 'forward' : 'backward';
          const turned = await turnOnce(direction);
          if (!turned) break;
        }
      },
    }),
    [turnOnce]
  );

  const view = turning
    ? {
        left: spreadAt(sheets, turning.sheetIndex).left,
        right: spreadAt(sheets, turning.sheetIndex + 1).right,
      }
    : spreadAt(sheets, spread);

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

  const rightCast = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(angle.value),
      [0, 30, 82, 150],
      [0, 0.42, 0.5, 0],
      Extrapolation.CLAMP
    ),
  }));

  const leftCast = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(angle.value),
      [95, 155, 180],
      [0, 0.4, 0.14],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View style={[styles.book, { width: bookWidth, height: bookHeight }, bookStyle]}>
      <View style={[styles.deskShadow, { width: bookWidth, height: bookHeight, top: bookHeight * 0.04 }]} />

      <CoverFrame width={bookWidth} height={bookHeight} scale={metrics.scale}>
        <GestureDetector gesture={gesture}>
          <View style={[styles.pages, styles.pageBlock, { width: blockWidth, height: pageHeight }]}>
            <View
              style={[styles.pageClip, { width: blockWidth, height: pageHeight }]}
              pointerEvents="box-none"
            >
          {isOpen && (
            <View style={[styles.half, { left: 0, width: pageWidth, height: pageHeight }]}>
              <StackEdge side="left" depth={stackDepth} height={pageHeight} />
              {view.left ? (
                <Page
                  page={view.left}
                  side="left"
                  metrics={metrics}
                  hiddenStickerId={hiddenStickerId}
                  totalCollected={stickers.length}
                />
              ) : (
                <Endpaper width={pageWidth} height={pageHeight} side="left" />
              )}
              <Animated.View style={[StyleSheet.absoluteFill, leftCast]} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(20, 10, 4, 0)', 'rgba(20, 10, 4, 0.55)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          )}

          <View style={[styles.half, { left: pageWidth, width: pageWidth, height: pageHeight }]}>
            <StackEdge side="right" depth={stackDepth} height={pageHeight} />
            {view.right ? (
              <Page
                page={view.right}
                side="right"
                metrics={metrics}
                hiddenStickerId={hiddenStickerId}
                totalCollected={stickers.length}
              />
            ) : (
              <Endpaper width={pageWidth} height={pageHeight} side="right" />
            )}
            <Animated.View style={[StyleSheet.absoluteFill, rightCast]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(20, 10, 4, 0.6)', 'rgba(20, 10, 4, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.75, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            </View>
            </View>

          {turning && sheets[turning.sheetIndex] && (
            <PageLeaf
              sheet={sheets[turning.sheetIndex] as Sheet}
              angle={angle}
              metrics={metrics}
              hiddenStickerId={hiddenStickerId}
              totalCollected={stickers.length}
            />
          )}

          {!isOpen && <CoverLeaf angle={coverAngle} width={pageWidth} height={pageHeight} />}

          {isOpen && (
            <Spine
              halfWidth={spineHalfWidth}
              height={pageHeight}
              centerX={bookWidth / 2}
              scale={metrics.scale}
            />
          )}
          </View>
        </GestureDetector>

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

function CoverLeaf({
  angle,
  width,
  height,
}: {
  angle: SharedValue<number>;
  width: number;
  height: number;
}) {
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
      style={[styles.coverLeaf, { width, height, left: width }, leafStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.faceFill, frontFace]}>
        <Cover width={width} height={height} />
      </Animated.View>
      <Animated.View style={[styles.faceFill, styles.flipped, backFace]}>
        <Endpaper width={width} height={height} side="left" />
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
  pageBlock: {
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

export const Notebook = forwardRef(NotebookImpl);
