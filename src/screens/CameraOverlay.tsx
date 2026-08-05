import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { durations, springs, timings } from '../theme/motion';
import { palette } from '../theme/palette';
import { text } from '../theme/typography';
import { haptics } from '../lib/haptics';
import { boxStyle, type CaptureLayout } from '../lib/captureLayout';
import { makeCutout, type Cutout } from '../lib/cutout';
import { devSamplePhotoUri, frameLooksBlank } from '../lib/devSamplePhoto';
import { Glyph } from '../components/ui/Glyph';
import { PressableScale } from '../components/ui/PressableScale';

type Props = {
  visible: boolean;
  layout: CaptureLayout;
  onClose: () => void;
  onCaptured: (cutout: Cutout) => void;
};

type Phase = 'framing' | 'shutter' | 'processing' | 'ready' | 'failed';

const PROCESSING_COPY = [
  'Looking closely…',
  'Tracing the edges…',
  'Lifting it off the background…',
];

const ADMIRE_MS = 640;

export function CameraOverlay({ visible, layout, onClose, onCaptured }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const handoff = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('framing');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [copyIndex, setCopyIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const enter = useSharedValue(0);
  const flash = useSharedValue(0);
  const scan = useSharedValue(0);
  const pop = useSharedValue(0);


  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPhase('framing');
      setPhotoUri(null);
      setCutout(null);
      setError(null);
      pop.value = 0;
      enter.value = withSpring(1, springs.sheet);
    } else {
      enter.value = withTiming(0, timings.quick, (finished) => {
        'worklet';
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (handoff.current) clearTimeout(handoff.current);
    },
    []
  );

  useEffect(() => {
    if (phase !== 'processing') return;
    setCopyIndex(0);
    const timer = setInterval(() => {
      setCopyIndex((i) => Math.min(i + 1, PROCESSING_COPY.length - 1));
    }, 900);
    scan.value = withRepeat(
      withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
    return () => clearInterval(timer);
  }, [phase, scan]);

  // MARK: - Capture

  const capture = useCallback(async () => {
    if (phase !== 'framing') return;
    setPhase('shutter');
    haptics.capture();

    flash.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: durations.shutter })
    );

    try {
      let uri: string | undefined;
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.9,
          shutterSound: false,
        });
        uri = photo?.uri;
      } catch (cameraError) {
        if (!__DEV__) throw cameraError;
      }

      if (!uri) {
        if (!__DEV__) throw new Error('The camera did not return a photo.');
        uri = devSamplePhotoUri();
      } else if (__DEV__ && (await frameLooksBlank(uri))) {
        uri = devSamplePhotoUri();
      }

      setPhotoUri(uri);
      setPhase('processing');

      const result = await makeCutout(uri);
      setCutout(result);
      setPhase('ready');
      haptics.stamp();
      pop.value = withSpring(1, springs.stamp);

      handoff.current = setTimeout(() => onCaptured(result), ADMIRE_MS);
    } catch (e) {
      haptics.warn();
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('failed');
    }
  }, [phase, flash, pop, onCaptured]);

  const retry = useCallback(() => {
    setPhase('framing');
    setPhotoUri(null);
    setCutout(null);
    setError(null);
    pop.value = 0;
  }, [pop]);

  // MARK: - Animated styles

  const rootStyle = useAnimatedStyle(() => ({ opacity: enter.value }));

  const viewportStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.86, 1]) },
      { translateY: interpolate(enter.value, [0, 1], [70, 0]) },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.2, 0.8, 1], [0, 0.85, 0.85, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scan.value, [0, 1], [-40, layout.viewport.height + 40]) },
    ],
  }));

  const cutoutStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { scale: interpolate(pop.value, [0, 1], [0.55, 1]) },
      { rotate: `${interpolate(pop.value, [0, 1], [-9, 0])}deg` },
    ],
  }));

  if (!mounted) return null;

  const granted = permission?.granted ?? false;
  const caption =
    !granted
      ? 'The camera needs your permission'
      : phase === 'framing'
        ? 'Point at something wonderful'
        : phase === 'shutter'
          ? 'Got it!'
          : phase === 'processing'
            ? PROCESSING_COPY[copyIndex]
            : phase === 'ready'
              ? 'Into the book it goes'
              : (error ?? 'Let’s try that again');

  return (
    <Animated.View style={[StyleSheet.absoluteFill, rootStyle]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.scrim} />

      <Animated.View style={[boxStyle(layout.viewport), styles.viewport, viewportStyle]}>
        {granted && phase === 'framing' ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : null}

        {photoUri && phase !== 'framing' && (
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        )}

        {!granted && <PermissionPrompt onGrant={requestPermission} />}
        {phase === 'framing' && granted && <FramingMarks />}

        {phase === 'processing' && (
          <>
            <View style={styles.processingScrim} />
            <Animated.View style={[styles.scanLine, scanStyle]}>
              <LinearGradient
                colors={[
                  'rgba(255, 194, 75, 0)',
                  'rgba(255, 194, 75, 0.9)',
                  'rgba(255, 194, 75, 0)',
                ]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </>
        )}

        {(phase === 'ready' || phase === 'failed') && <View style={styles.readyScrim} />}

        <Animated.View
          style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
          pointerEvents="none"
        />
      </Animated.View>

      {phase === 'ready' && cutout && (
        <Animated.View style={[boxStyle(layout.preview), cutoutStyle]} pointerEvents="none">
          <Image
            source={{ uri: cutout.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>
      )}

      <View style={[styles.caption, { top: layout.captionY }]} pointerEvents="none">
        <Text style={styles.captionText}>{caption}</Text>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <PressableScale
          onPress={onClose}
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Close the camera"
        >
          <Glyph name="close" size={20} color="rgba(255,255,255,0.9)" />
        </PressableScale>

        {phase === 'failed' ? (
          <PressableScale
            onPress={retry}
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <View style={styles.shutterRing} />
            <View style={styles.shutterInner}>
              <Glyph name="retry" size={26} color={palette.desk.deep} />
            </View>
          </PressableScale>
        ) : (
          <PressableScale
            onPress={capture}
            disabled={phase !== 'framing' || !granted}
            depth={0.09}
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel="Take a photo"
          >
            <View style={styles.shutterRing} />
            <View style={styles.shutterInner}>
              {phase === 'processing' || phase === 'shutter' ? (
                <ActivityIndicator color={palette.desk.deep} />
              ) : (
                <Glyph name="camera" size={26} color={palette.desk.deep} />
              )}
            </View>
          </PressableScale>
        )}

        <View style={styles.secondaryButton} />
      </View>
    </Animated.View>
  );
}

function FramingMarks() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      200,
      withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.985, 1]) }],
  }));

  return (
    <Animated.View style={[styles.marks, style]} pointerEvents="none">
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
        <View key={corner} style={[styles.mark, styles[corner]]} />
      ))}
    </Animated.View>
  );
}

function PermissionPrompt({ onGrant }: { onGrant: () => void }) {
  return (
    <View style={styles.permission}>
      <Text style={styles.permissionTitle}>Let’s open the camera</Text>
      <Text style={styles.permissionBody}>
        Treasure Book needs the camera to photograph the things you find.
      </Text>
      <PressableScale onPress={onGrant} style={styles.permissionButton}>
        <Text style={styles.permissionButtonText}>Allow camera</Text>
      </PressableScale>
    </View>
  );
}

const MARK = 30;
const MARK_THICKNESS = 3;
const MARK_COLOR = 'rgba(255, 236, 200, 0.9)';

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 8, 5, 0.6)',
  },
  viewport: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#0D0906',
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 190, 0.16)',
  },
  flash: {
    backgroundColor: '#FFFFFF',
  },
  processingScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 6, 3, 0.42)',
  },
  readyScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 6, 3, 0.74)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 46,
  },
  marks: {
    ...StyleSheet.absoluteFill,
    margin: 18,
  },
  mark: {
    position: 'absolute',
    width: MARK,
    height: MARK,
    borderColor: MARK_COLOR,
  },
  tl: { top: 0, left: 0, borderTopWidth: MARK_THICKNESS, borderLeftWidth: MARK_THICKNESS, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: MARK_THICKNESS, borderRightWidth: MARK_THICKNESS, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: MARK_THICKNESS, borderLeftWidth: MARK_THICKNESS, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: MARK_THICKNESS, borderRightWidth: MARK_THICKNESS, borderBottomRightRadius: 10 },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 30,
  },
  captionText: {
    ...text.note,
    fontSize: 15,
    color: 'rgba(255, 238, 214, 0.88)',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 34,
  },
  secondaryButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: 'rgba(255, 236, 200, 0.55)',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paper.highlight,
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  permissionTitle: {
    ...text.pageTitle,
    fontSize: 22,
    color: palette.paper.highlight,
    textAlign: 'center',
  },
  permissionBody: {
    ...text.note,
    color: 'rgba(255, 238, 214, 0.7)',
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: palette.accent.marigold,
  },
  permissionButtonText: {
    ...text.control,
    color: palette.desk.deep,
  },
});
