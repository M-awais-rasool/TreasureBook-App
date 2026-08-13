import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { springs } from '../theme/motion';
import { HOME } from '../theme/layout';
import { palette } from '../theme/palette';
import { text } from '../theme/typography';
import { haptics } from '../lib/haptics';
import { captureLayout } from '../lib/captureLayout';
import { type Cutout } from '../lib/cutout';
import { useBookMetrics } from '../hooks/useBookMetrics';
import {
  BOOK_CAPACITY,
  createPlacement,
  selectIsFull,
  useCollectionStore,
  type Placement,
} from '../state/collectionStore';
import { Desk } from '../components/Desk';
import { Notebook } from '../components/notebook/Notebook';
import { slotAt } from '../components/notebook/pages';
import { fitInSlot, slotRects } from '../components/notebook/pageLayout';
import { StickerFlight, type FlightPoint } from '../components/StickerFlight';
import { Glyph } from '../components/ui/Glyph';
import { PressableScale } from '../components/ui/PressableScale';
import { Sparkles } from '../components/ui/Sparkles';
import { CameraOverlay } from './CameraOverlay';

type Flight = {
  cutout: Cutout;
  placement: Placement;
  from: FlightPoint;
  to: FlightPoint & { rotation: number };
  flying: boolean;
  landedId: string | null;
};

type Burst = { id: number; x: number; y: number; size: number };

/** How long the landed sticker stays in the overlay before the page takes over. */
const HANDOFF_MS = 160;
const BURST_MS = 1100;

export function HomeScene() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const metrics = useBookMetrics();

  const stickers = useCollectionStore((s) => s.stickers);
  const isFull = useCollectionStore(selectIsFull);
  const addSticker = useCollectionStore((s) => s.addSticker);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);

  const flightRef = useRef<Flight | null>(null);
  flightRef.current = flight;

  const controls = useSharedValue(0);

  useEffect(() => {
    if (!bookOpen) return;
    controls.value = withDelay(160, withSpring(1, springs.sheet));
  }, [bookOpen, controls]);

  const layout = useMemo(
    () => captureLayout({ width, height }, { top: insets.top, bottom: insets.bottom }),
    [width, height, insets.top, insets.bottom]
  );

  const blockLeft = (width - metrics.bookWidth) / 2 + metrics.coverPadding;
  const blockTop = metrics.bookCenterY - metrics.pageHeight / 2 + metrics.coverPadding;

  const resolveDestination = useCallback(
    (cutout: Cutout, placement: Placement) => {
      const { side, slotIndex } = slotAt(stickers.length);
      const slot = slotRects(metrics, side)[slotIndex];
      const size = fitInSlot(slot, cutout.width, cutout.height);
      const pageOriginX = blockLeft + (side === 'right' ? metrics.pageWidth : 0);

      return {
        cx: pageOriginX + slot.x + slot.width / 2 + slot.width * placement.drift.x,
        cy: blockTop + slot.y + slot.height / 2 + slot.height * placement.drift.y,
        width: size.width * placement.scale,
        height: size.height * placement.scale,
        rotation: placement.rotation,
      };
    },
    [stickers.length, metrics, blockLeft, blockTop]
  );

  const handleCaptured = useCallback(
    (cutout: Cutout) => {
      const placement = createPlacement();

      setFlight({
        cutout,
        placement,
        from: {
          cx: layout.preview.cx,
          cy: layout.preview.cy,
          width: layout.preview.width,
          height: layout.preview.height,
        },
        to: resolveDestination(cutout, placement),
        flying: false,
        landedId: null,
      });
      setCameraOpen(false);
    },
    [resolveDestination, layout.preview]
  );

  useEffect(() => {
    if (!flight || flight.flying) return;
    const frame = requestAnimationFrame(() => {
      setFlight((current) => (current && !current.flying ? { ...current, flying: true } : current));
    });
    return () => cancelAnimationFrame(frame);
  }, [flight]);

  const handleLanded = useCallback(() => {
    const current = flightRef.current;
    if (!current || current.landedId) return;

    const sticker = addSticker({
      uri: current.cutout.uri,
      width: current.cutout.width,
      height: current.cutout.height,
      mode: current.cutout.mode,
      placement: current.placement,
    });

    if (!sticker) {
      setFlight(null);
      return;
    }

    setFlight({ ...current, landedId: sticker.id });
    setBurst({
      id: Date.now(),
      x: current.to.cx,
      y: current.to.cy,
      size: Math.max(170, current.to.width * 2.2),
    });
    haptics.stamp();

    setTimeout(() => setFlight(null), HANDOFF_MS);
  }, [addSticker]);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), BURST_MS);
    return () => clearTimeout(timer);
  }, [burst]);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controls.value,
    transform: [{ translateY: (1 - controls.value) * 34 }],
  }));

  const hint =
    stickers.length === 0
      ? 'Tap the camera to begin'
      : isFull
        ? `All ${BOOK_CAPACITY} found — your book is full!`
        : `${stickers.length} of ${BOOK_CAPACITY} found`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Desk width={width} height={height} focusY={metrics.bookCenterY} />

      {bookOpen && (
        <Animated.View
          entering={FadeIn.duration(600)}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
          pointerEvents="none"
        >
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerStar}>✦</Text>
            <Text style={styles.headerTitle}>Treasure Book</Text>
            <Text style={styles.headerStar}>✦</Text>
          </View>
          <View style={styles.hintPill}>
            <Text style={styles.hintPillText}>{hint}</Text>
          </View>
        </Animated.View>
      )}

      <View
        style={[
          styles.bookAnchor,
          {
            left: (width - metrics.bookWidth) / 2,
            top: metrics.bookCenterY - metrics.pageHeight / 2,
            width: metrics.bookWidth,
            height: metrics.pageHeight,
          },
        ]}
      >
        <Notebook
          metrics={metrics}
          stickers={stickers}
          hiddenStickerId={flight?.landedId ?? null}
          onOpened={() => setBookOpen(true)}
        />
      </View>

      {burst && (
        <View style={[styles.sparkAnchor, { left: burst.x, top: burst.y }]} pointerEvents="none">
          <Sparkles trigger={burst.id} size={burst.size} />
        </View>
      )}

      {flight && (
        <StickerFlight
          uri={flight.cutout.uri}
          from={flight.from}
          to={flight.to}
          flying={flight.flying}
          onLanded={handleLanded}
        />
      )}

      <Animated.View
        style={[styles.controls, { paddingBottom: insets.bottom + 18 }, controlsStyle]}
        pointerEvents={bookOpen ? 'auto' : 'none'}
      >
        <PressableScale
          onPress={() => {
            haptics.tap();
            setCameraOpen(true);
          }}
          disabled={!!flight || isFull}
          depth={0.08}
          style={styles.captureButton}
          accessibilityRole="button"
          accessibilityLabel={
            isFull ? 'The book is full' : 'Open the camera to find something new'
          }
        >
          <Glyph name="camera" size={metrics.scale(HOME.capture.iconSize)} color={palette.white} />
          <Text style={styles.captureLabel}>{isFull ? 'Book is full' : 'Find something'}</Text>
        </PressableScale>
      </Animated.View>

      <CameraOverlay
        visible={cameraOpen}
        layout={layout}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCaptured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.desk.deep,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: HOME.header.gap,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerStar: {
    fontSize: 12,
    color: palette.accent.gold,
  },
  headerTitle: {
    ...text.appTitle,
    color: palette.ink.primary,
  },
  hintPill: {
    paddingVertical: HOME.hintPill.paddingV,
    paddingHorizontal: HOME.hintPill.paddingH,
    borderRadius: HOME.hintPill.radius,
    backgroundColor: 'rgba(240, 147, 122, 0.15)',
  },
  hintPillText: {
    ...text.hint,
    color: palette.accent.coralDeep,
  },

  bookAnchor: {
    position: 'absolute',
  },
  sparkAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HOME.capture.gap,
    paddingVertical: HOME.capture.paddingV,
    paddingHorizontal: HOME.capture.paddingH,
    borderRadius: HOME.capture.radius,
    backgroundColor: palette.accent.coral,
    shadowColor: palette.accent.coralDeep,
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  captureLabel: {
    ...text.button,
    color: palette.white,
  },
});
