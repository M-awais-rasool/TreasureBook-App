/**
 * Turning a flat list of stickers into a book.
 *
 * A physical notebook is made of *sheets*, and each sheet carries two pages —
 * that distinction is what makes the page-turn work, because a turn rotates one
 * sheet and reveals the page behind it. Modelling sheets explicitly here keeps
 * that logic out of the animation code.
 */

import { SLOTS_PER_PAGE, type Sticker } from '../../state/collectionStore';

export type PageModel =
  | { kind: 'title'; key: string }
  | { kind: 'collection'; key: string; pageIndex: number; slots: (Sticker | null)[] }
  | { kind: 'blank'; key: string };

export type Sheet = {
  key: string;
  front: PageModel;
  back: PageModel;
};

export type Spread = {
  /** Sheet index this spread sits at. 0 is the book fully open at the start. */
  index: number;
  left: PageModel | null;
  right: PageModel | null;
};

/**
 * Build the sheets for a collection.
 *
 * There is always one empty collection page beyond the last sticker, so a child
 * always has somewhere for the next thing they find — the book is never full.
 */
export function buildSheets(stickers: Sticker[]): Sheet[] {
  const filledPages = Math.ceil(stickers.length / SLOTS_PER_PAGE);
  const collectionPages = Math.max(2, filledPages + 1);

  const pages: PageModel[] = [{ kind: 'title', key: 'title' }];

  for (let pageIndex = 0; pageIndex < collectionPages; pageIndex += 1) {
    const start = pageIndex * SLOTS_PER_PAGE;
    const slots: (Sticker | null)[] = [];
    for (let slot = 0; slot < SLOTS_PER_PAGE; slot += 1) {
      slots.push(stickers[start + slot] ?? null);
    }
    pages.push({ kind: 'collection', key: `page-${pageIndex}`, pageIndex, slots });
  }

  // Sheets need pages in pairs.
  if (pages.length % 2 !== 0) {
    pages.push({ kind: 'blank', key: `blank-${pages.length}` });
  }

  const sheets: Sheet[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    sheets.push({ key: `sheet-${i / 2}`, front: pages[i], back: pages[i + 1] });
  }
  return sheets;
}

/**
 * The two pages visible when the book rests at `index`.
 *
 * `null` means the inside of a cover rather than a page.
 */
export function spreadAt(sheets: Sheet[], index: number): Spread {
  return {
    index,
    left: index > 0 ? sheets[index - 1].back : null,
    right: index < sheets.length ? sheets[index].front : null,
  };
}

export type PageLocation = {
  /** Spread you must be on to see this page. */
  spreadIndex: number;
  /** Which half of that spread it occupies. */
  side: 'left' | 'right';
};

/**
 * Where a collection page lives in the book.
 *
 * A page printed on the front of a sheet shows on the right of its spread; one
 * printed on the back shows on the left of the *next* spread. The sticker
 * flight animation needs this to aim at the right half of the screen.
 */
export function locatePage(sheets: Sheet[], pageIndex: number): PageLocation {
  for (let i = 0; i < sheets.length; i += 1) {
    const { front, back } = sheets[i];
    if (front.kind === 'collection' && front.pageIndex === pageIndex) {
      return { spreadIndex: i, side: 'right' };
    }
    if (back.kind === 'collection' && back.pageIndex === pageIndex) {
      return { spreadIndex: i + 1, side: 'left' };
    }
  }
  return { spreadIndex: 0, side: 'right' };
}
