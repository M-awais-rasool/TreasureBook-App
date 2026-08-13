import { create } from 'zustand';

import { deleteCutoutFile } from '../lib/cutout';

export const PAGES_PER_SPREAD = 2;
export const SLOTS_PER_PAGE = 2;
export const BOOK_CAPACITY = SLOTS_PER_PAGE * PAGES_PER_SPREAD;

export type Sticker = {
  id: string;
  uri: string;
  width: number;
  height: number;
  createdAt: number;
  rotation: number;
  scale: number;
  drift: { x: number; y: number };
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
  placement?: Placement;
};

type CollectionState = {
  stickers: Sticker[];
  addSticker: (input: NewSticker) => Sticker | null;
  removeSticker: (id: string) => void;
  clear: () => void;
};

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

  addSticker: ({ uri, width, height, placement }) => {
    const current = get().stickers;
    if (current.length >= BOOK_CAPACITY) return null;

    const { rotation, scale, drift } = placement ?? createPlacement();
    const sticker: Sticker = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri,
      width,
      height,
      createdAt: Date.now(),
      rotation,
      scale,
      drift,
    };

    set({ stickers: [...current, sticker] });
    return sticker;
  },

  removeSticker: (id) => {
    const target = get().stickers.find((sticker) => sticker.id === id);
    if (!target) return;
    set({ stickers: get().stickers.filter((sticker) => sticker.id !== id) });
    deleteCutoutFile(target.uri);
  },

  clear: () => {
    get().stickers.forEach((sticker) => deleteCutoutFile(sticker.uri));
    set({ stickers: [] });
  },
}));

export const selectIsFull = (state: CollectionState) =>
  state.stickers.length >= BOOK_CAPACITY;
