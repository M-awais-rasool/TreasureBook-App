import { Directory, File, Paths } from 'expo-file-system';

import {
  extractSubject,
  isSubjectCutoutAvailable,
  type SubjectCutoutResult,
} from '../../modules/subject-cutout';

export type Cutout = {
  uri: string;
  width: number;
  height: number;
};

export class NoSubjectFoundError extends Error {
  constructor() {
    super('I couldn’t find anything in that photo.');
    this.name = 'NoSubjectFoundError';
  }
}

export class CutoutUnavailableError extends Error {
  constructor() {
    super('Subject extraction is not available in this build.');
    this.name = 'CutoutUnavailableError';
  }
}

const CUTOUT_DIR = 'cutouts';

const EXTRACT_OPTIONS = {
  maxDimension: 1600,
  shrink: 0.75,
  feather: 0.9,
  padding: 10,
} as const;


function cutoutDirectory(): Directory {
  const dir = new Directory(Paths.cache, CUTOUT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export function purgeCutouts(): void {
  try {
    const dir = new Directory(Paths.cache, CUTOUT_DIR);
    if (dir.exists) dir.delete();
  } catch (error) {
    if (__DEV__) console.warn('[cutout] could not purge previous cut-outs:', error);
  }
}

export async function makeCutout(photoUri: string): Promise<Cutout> {
  if (!isSubjectCutoutAvailable()) {
    throw new CutoutUnavailableError();
  }

  let result: SubjectCutoutResult;
  try {
    result = await extractSubject(photoUri, EXTRACT_OPTIONS);
  } catch (error) {
    if (isNoSubject(error)) throw new NoSubjectFoundError();
    throw error;
  }

  return {
    uri: await persist(result.uri),
    width: result.width,
    height: result.height,
  };
}

function isNoSubject(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === 'string' && /no_?subject/i.test(code)) return true;
  return error instanceof Error && /no subject/i.test(error.message);
}

/** Move the module's temp PNG into our own directory so we control its life. */
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
