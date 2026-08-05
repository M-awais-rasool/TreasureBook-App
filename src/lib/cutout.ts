import { Skia, BlendMode, TileMode, ImageFormat } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';

import {
  extractSubject,
  isSubjectCutoutAvailable,
  type SubjectCutoutResult,
} from '../../modules/subject-cutout';

export type CutoutMode = 'subject' | 'soft';

export type Cutout = {
  uri: string;
  width: number;
  height: number;
  mode: CutoutMode;
};

export class NoSubjectFoundError extends Error {
  constructor() {
    super('No subject found');
    this.name = 'NoSubjectFoundError';
  }
}

const CUTOUT_DIR = 'cutouts';

function cutoutDirectory(): Directory {
  const dir = new Directory(Paths.document, CUTOUT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export function canExtractSubjects(): boolean {
  return isSubjectCutoutAvailable();
}

export async function makeCutout(photoUri: string): Promise<Cutout> {
  if (isSubjectCutoutAvailable()) {
    try {
      const result: SubjectCutoutResult = await extractSubject(photoUri, {
        maxDimension: 1600,
        shrink: 0.75,
        feather: 0.9,
        padding: 10,
      });
      const persisted = await persist(result.uri);
      return { uri: persisted, width: result.width, height: result.height, mode: 'subject' };
    } catch (error) {
      if (__DEV__) {
        console.warn('[cutout] subject extraction failed, using soft fallback:', error);
      }
    }
  }

  return softCutout(photoUri);
}

async function softCutout(photoUri: string): Promise<Cutout> {
  const data = await Skia.Data.fromURI(photoUri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode the captured photo.');
  }

  const srcWidth = image.width();
  const srcHeight = image.height();

  const side = Math.min(srcWidth, srcHeight) * 0.82;
  const scale = Math.min(1, 900 / side);
  const size = Math.round(side * scale);

  const surface = Skia.Surface.Make(size, size);
  if (!surface) {
    throw new Error('Could not allocate a drawing surface.');
  }

  const canvas = surface.getCanvas();
  const left = (srcWidth - side) / 2;
  const top = (srcHeight - side) / 2;

  canvas.saveLayer();

  canvas.save();
  canvas.scale(scale, scale);
  canvas.drawImageRect(
    image,
    { x: left, y: top, width: side, height: side },
    { x: 0, y: 0, width: side, height: side },
    Skia.Paint()
  );
  canvas.restore();

  const half = size / 2;
  const mask = Skia.Paint();
  mask.setBlendMode(BlendMode.DstIn);
  mask.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: half, y: half },
      half,
      [Skia.Color('black'), Skia.Color('black'), Skia.Color('transparent')],
      [0, 0.74, 1],
      TileMode.Clamp
    )
  );
  canvas.drawRect({ x: 0, y: 0, width: size, height: size }, mask);

  canvas.restore();

  const snapshot = surface.makeImageSnapshot();
  const bytes = snapshot.encodeToBytes(ImageFormat.PNG);
  if (!bytes) {
    throw new Error('Could not encode the sticker.');
  }

  const file = new File(cutoutDirectory(), `cutout-${Date.now()}-${randomId()}.png`);
  file.create({ overwrite: true });
  file.write(bytes);

  return { uri: file.uri, width: size, height: size, mode: 'soft' };
}

async function persist(sourceUri: string): Promise<string> {
  try {
    const source = new File(sourceUri);
    const target = new File(cutoutDirectory(), `cutout-${Date.now()}-${randomId()}.png`);
    await source.move(target);
    return source.uri;
  } catch {
    return sourceUri;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function deleteCutoutFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
  }
}
