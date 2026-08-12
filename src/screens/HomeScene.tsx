import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
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
import { canExtractSubjects, type Cutout } from '../lib/cutout';
import { useBookMetrics } from '../hooks/useBookMetrics';
import {
  SLOTS_PER_PAGE,
  createPlacement,
  useCollectionStore,
  type Placement,
} from '../state/collectionStore';
import { Desk } from '../components/Desk';
import { Notebook, type NotebookHandle } from '../components/notebook/Notebook';
import { buildSheets, locatePage } from '../components/notebook/pages';
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

export function HomeScene() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const metrics = useBookMetrics();

  const stickers = useCollectionStore((s) => s.stickers);
  const hydrate = useCollectionStore((s) => s.hydrate);
  const addSticker = useCollectionStore((s) => s.addSticker);

  const notebookRef = useRef<NotebookHandle>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);

  const flightRef = useRef<Flight | null>(null);
  flightRef.current = flight;

  const controls = useSharedValue(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!bookOpen) return;
    controls.value = withDelay(160, withSpring(1, springs.sheet));
  }, [bookOpen, controls]);

  const layout = useMemo(
    () => captureLayout({ width, height }, { top: insets.top, bottom: insets.bottom }),
    [width, height, insets.top, insets.bottom]
  );

  const bookLeft = (width - metrics.bookWidth) / 2;
  const bookTop = metrics.bookCenterY - metrics.pageHeight / 2;

  const resolveDestination = useCallback(
    (cutout: Cutout, placement: Placement) => {
      const index = stickers.length;
      const pageIndex = Math.floor(index / SLOTS_PER_PAGE);
      const slotIndex = index % SLOTS_PER_PAGE;

      const sheets = buildSheets(stickers);
      const { spreadIndex, side } = locatePage(sheets, pageIndex);
      const slot = slotRects(metrics, side)[slotIndex];
      const size = fitInSlot(slot, cutout.width, cutout.height);

      const pageOriginX = bookLeft + (side === 'right' ? metrics.pageWidth : 0);

      return {
        spreadIndex,
        to: {
          cx: pageOriginX + slot.x + slot.width / 2 + slot.width * placement.drift.x,
          cy: bookTop + slot.y + slot.height / 2 + slot.height * placement.drift.y,
          width: size.width * placement.scale,
          height: size.height * placement.scale,
          rotation: placement.rotation,
        },
      };
    },
    [stickers, metrics, bookLeft, bookTop]
  );

  const handleCaptured = useCallback(
    async (cutout: Cutout) => {
      const placement = createPlacement();
      const { spreadIndex, to } = resolveDestination(cutout, placement);

      setFlight({
        cutout,
        placement,
        from: {
          cx: layout.preview.cx,
          cy: layout.preview.cy,
          width: layout.preview.width,
          height: layout.preview.height,
        },
        to,
        flying: false,
        landedId: null,
      });
      setCameraOpen(false);

      await notebookRef.current?.goToSpread(spreadIndex);
      setFlight((current) => (current ? { ...current, flying: true } : current));
    },
    [resolveDestination, layout.preview]
  );

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

    setFlight({ ...current, landedId: sticker.id });
    setBurst({
      id: Date.now(),
      x: current.to.cx,
      y: current.to.cy,
      size: Math.max(170, current.to.width * 2.2),
    });
    haptics.stamp();

    setTimeout(() => setFlight(null), 160);
  }, [addSticker]);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), 1100);
    return () => clearTimeout(timer);
  }, [burst]);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controls.value,
    transform: [{ translateY: (1 - controls.value) * 34 }],
  }));

  const nativeCutout = useMemo(() => canExtractSubjects(), []);

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
            <Text style={styles.hintPillText}>
              {stickers.length === 0
                ? 'Tap the camera to begin'
                : `${stickers.length} found · swipe to turn the page`}
            </Text>
          </View>
        </Animated.View>
      )}

      <View
        style={[
          styles.bookAnchor,
          {
            left: bookLeft,
            top: bookTop,
            width: metrics.bookWidth,
            height: metrics.pageHeight,
          },
        ]}
      >
        <Notebook
          ref={notebookRef}
          metrics={metrics}
          stickers={stickers}
          hiddenStickerId={flight?.landedId ?? null}
          onOpened={() => setBookOpen(true)}
        />
      </View>

      {burst && (
        <View
          style={[styles.sparkAnchor, { left: burst.x, top: burst.y }]}
          pointerEvents="none"
        >
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
          disabled={!!flight}
          depth={0.08}
          style={styles.captureButton}
          accessibilityRole="button"
          accessibilityLabel="Open the camera to find something new"
        >
          <Glyph name="camera" size={metrics.scale(HOME.capture.iconSize)} color={palette.white} />
          <Text style={styles.captureLabel}>Find something</Text>
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
