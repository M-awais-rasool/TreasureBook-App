import { SLOTS_PER_PAGE, type Sticker } from '../../state/collectionStore';

export type PageSide = 'left' | 'right';

export type PageModel = {
  key: string;
  side: PageSide;
  index: number;
  slots: (Sticker | null)[];
};

export type Spread = { left: PageModel; right: PageModel };

const SIDES: readonly PageSide[] = ['left', 'right'];

function buildPage(stickers: Sticker[], index: number): PageModel {
  const side = SIDES[index];
  const start = index * SLOTS_PER_PAGE;

  return {
    key: `page-${side}`,
    side,
    index,
    slots: Array.from({ length: SLOTS_PER_PAGE }, (_, slot) => stickers[start + slot] ?? null),
  };
}

export function buildSpread(stickers: Sticker[]): Spread {
  return {
    left: buildPage(stickers, 0),
    right: buildPage(stickers, 1),
  };
}

export function slotAt(index: number): { side: PageSide; slotIndex: number } {
  const pageIndex = Math.min(Math.floor(index / SLOTS_PER_PAGE), SIDES.length - 1);
  return { side: SIDES[pageIndex], slotIndex: index % SLOTS_PER_PAGE };
}
