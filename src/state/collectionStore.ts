import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';

import { deleteCutoutFile, type CutoutMode } from '../lib/cutout';

export const SLOTS_PER_PAGE = 3;

export type Sticker = {
  id: string;
  uri: string;
  width: number;
  height: number;
  mode: CutoutMode;
  createdAt: number;
  rotation: number;
  scale: number;
  drift: { x: number; y: number };
};

type PersistedShape = {
  version: 1;
  stickers: Sticker[];
};

type CollectionState = {
  stickers: Sticker[];
  hydrated: boolean;
  hydrate: () => void;
  addSticker: (input: NewSticker) => Sticker;
  removeSticker: (id: string) => void;
  clear: () => void;
};

export type Placement = {
  rotation: number;
  scale: number;
  drift: { x: number; y: number };
};

export type NewSticker = {
  uri: string;
  width: number;
  height: number;
  mode: CutoutMode;
  placement?: Placement;
};

const MANIFEST = 'collection.json';

function manifestFile(): File {
  return new File(Paths.document, MANIFEST);
}

function readManifest(): Sticker[] {
  try {
    const file = manifestFile();
    if (!file.exists) return [];
    const parsed = JSON.parse(file.textSync()) as PersistedShape;
    if (parsed?.version !== 1 || !Array.isArray(parsed.stickers)) return [];
    return parsed.stickers.filter((sticker) => {
      try {
        return new File(sticker.uri).exists;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function writeManifest(stickers: Sticker[]): void {
  try {
    const file = manifestFile();
    file.create({ overwrite: true });
    file.write(JSON.stringify({ version: 1, stickers } satisfies PersistedShape));
  } catch (error) {
    if (__DEV__) console.warn('[collection] could not save manifest:', error);
  }
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export function createPlacement(): Placement {
  return {
    rotation: randomBetween(-7, 7),
    scale: randomBetween(0.94, 1.04),
    drift: { x: randomBetween(-0.12, 0.12), y: randomBetween(-0.08, 0.08) },
  };
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  stickers: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ stickers: readManifest(), hydrated: true });
  },

  addSticker: ({ uri, width, height, mode, placement }) => {
    const { rotation, scale, drift } = placement ?? createPlacement();
    const sticker: Sticker = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri,
      width,
      height,
      mode,
      createdAt: Date.now(),
      rotation,
      scale,
      drift,
    };

    const stickers = [...get().stickers, sticker];
    set({ stickers });
    writeManifest(stickers);
    return sticker;
  },

  removeSticker: (id) => {
    const target = get().stickers.find((sticker) => sticker.id === id);
    const stickers = get().stickers.filter((sticker) => sticker.id !== id);
    set({ stickers });
    writeManifest(stickers);
    if (target) deleteCutoutFile(target.uri);
  },

  clear: () => {
    get().stickers.forEach((sticker) => deleteCutoutFile(sticker.uri));
    set({ stickers: [] });
    writeManifest([]);
  },
}));

export function pageIndexForStickerCount(count: number): number {
  return Math.floor(count / SLOTS_PER_PAGE);
}
