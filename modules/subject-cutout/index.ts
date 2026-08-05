import { requireOptionalNativeModule } from 'expo-modules-core';

export type SubjectCutoutOptions = {
  /** Longest edge the photo is scaled to before segmentation. Default 1600. */
  maxDimension?: number;
  /** Pixels of alpha erosion, pulling the matte inside the true edge. Default 0.75. */
  shrink?: number;
  /** Gaussian softening of the matte, in pixels. Default 0.9. */
  feather?: number;
  /** Transparent padding kept around the subject. Default 8. */
  padding?: number;
};

export type SubjectCutoutResult = {
  /** `file://` URI of a tightly cropped transparent PNG. */
  uri: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  instanceCount: number;
};

type SubjectCutoutNativeModule = {
  isSupported(): boolean;
  extractSubject(uri: string, options: SubjectCutoutOptions): Promise<SubjectCutoutResult>;
};

/**
 * Optional on purpose: the module only exists in a native build, so anything
 * running under Expo Go gets `null` here and falls back to the JS path.
 */
const native = requireOptionalNativeModule<SubjectCutoutNativeModule>('SubjectCutout');

/** True when on-device subject extraction can actually run on this build. */
export function isSubjectCutoutAvailable(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/**
 * Lift the primary subject out of a photo and return a transparent PNG.
 *
 * Uses the Vision framework on iOS 17+ and ML Kit subject segmentation on
 * Android. Rejects when no subject is found or the module is unavailable.
 */
export async function extractSubject(
  uri: string,
  options: SubjectCutoutOptions = {}
): Promise<SubjectCutoutResult> {
  if (!native) {
    throw new Error('SubjectCutout native module is unavailable in this build.');
  }
  return native.extractSubject(uri, options);
}
