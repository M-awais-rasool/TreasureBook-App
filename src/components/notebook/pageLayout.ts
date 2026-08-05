/**
 * Where things sit on a page.
 *
 * Shared by the page renderer and the flight animation: the sticker has to land
 * exactly where the page will draw it, so both read their geometry from here
 * rather than each doing their own arithmetic.
 */

import { SLOTS_PER_PAGE } from '../../state/collectionStore';
import type { BookMetrics } from '../../hooks/useBookMetrics';

export type Rect = { x: number; y: number; width: number; height: number };

/** Space left for the page heading. */
const HEADER = 0.13;
/** Gap between slots, as a fraction of a slot's height. */
const GUTTER = 0.09;

/** Content box of a page, in page-local coordinates. */
export function contentRect(metrics: BookMetrics, side: 'left' | 'right'): Rect {
  const { pageWidth, pageHeight, pagePadding } = metrics;
  const spineIsLeft = side === 'right';

  const x = spineIsLeft ? pagePadding.inner : pagePadding.outer;
  const width = pageWidth - pagePadding.inner - pagePadding.outer;
  const y = pagePadding.vertical + pageHeight * HEADER;
  const height = pageHeight - y - pagePadding.vertical;

  return { x, y, width, height };
}

/**
 * The slots on a collection page, in page-local coordinates.
 *
 * Slots alternate their horizontal bias so a filled page reads as a scrapbook
 * someone arranged rather than a grid a computer laid out.
 */
export function slotRects(metrics: BookMetrics, side: 'left' | 'right'): Rect[] {
  const content = contentRect(metrics, side);
  const slotHeight = content.height / SLOTS_PER_PAGE;
  const gutter = slotHeight * GUTTER;
  const usableHeight = slotHeight - gutter;
  const usableWidth = content.width * 0.86;

  return Array.from({ length: SLOTS_PER_PAGE }, (_, index) => {
    const bias = index % 2 === 0 ? 0 : content.width - usableWidth;
    return {
      x: content.x + bias,
      y: content.y + index * slotHeight + gutter / 2,
      width: usableWidth,
      height: usableHeight,
    };
  });
}

/** Fit a sticker's natural size inside a slot without distorting it. */
export function fitInSlot(
  slot: Rect,
  naturalWidth: number,
  naturalHeight: number,
  fill = 0.92
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: slot.width * fill, height: slot.height * fill };
  }
  const scale = Math.min(
    (slot.width * fill) / naturalWidth,
    (slot.height * fill) / naturalHeight
  );
  return { width: naturalWidth * scale, height: naturalHeight * scale };
}

/** Centre of a slot, in page-local coordinates. */
export function slotCenter(slot: Rect): { x: number; y: number } {
  return { x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 };
}
