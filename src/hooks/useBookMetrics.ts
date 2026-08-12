import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOOK, DESIGN, PAGE, createScale } from '../theme/layout';

export type BookMetrics = {
  /** Width of a single page (half the page block, excluding cover border). */
  pageWidth: number;
  /** Height of a page. */
  pageHeight: number;
  /** Full open-book width, including the cover border. */
  bookWidth: number;
  bookHeight: number;
  /** Leather cover border visible around the page block. */
  coverPadding: number;
  /** Visual thickness of the paper stack peeking out at the fore-edge. */
  stackDepth: number;
  /** Half-width of the spine band that straddles the centre fold. */
  spineHalfWidth: number;
  /** Inner padding of a page. */
  pagePadding: { outer: number; inner: number; vertical: number };
  /** Spacing between ruled lines. */
  ruleSpacing: number;
  /** True when we have room for a more generous layout. */
  isLarge: boolean;
  screen: { width: number; height: number };
  /** Vertical centre of the book — the design puts it at 45% of the screen. */
  bookCenterY: number;
  /** Design-px → screen-px scaler. Use for every value taken from newDesign/. */
  scale: (designPx: number) => number;
};

const LARGE_BREAKPOINT = 700;

export function useBookMetrics(): BookMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isLarge = Math.min(width, height) >= LARGE_BREAKPOINT;
    const scale = createScale(width, isLarge);

    const bookWidth = scale(BOOK.width);
    const bookHeight = scale(BOOK.height);
    const coverPadding = scale(BOOK.coverPadding);

    const blockWidth = bookWidth - coverPadding * 2;
    const blockHeight = bookHeight - coverPadding * 2;
    const pageWidth = blockWidth / 2;
    const pageHeight = blockHeight;

    const designCenter = height * BOOK.centerYRatio;
    const topLimit = insets.top + scale(DESIGN.height * 0.16) + bookHeight / 2;
    const bottomLimit = height - insets.bottom - scale(140) - bookHeight / 2;
    const bookCenterY = Math.min(Math.max(designCenter, topLimit), Math.max(topLimit, bottomLimit));

    return {
      pageWidth,
      pageHeight,
      bookWidth,
      bookHeight,
      coverPadding,
      stackDepth: Math.max(4, scale(5)),
      spineHalfWidth: scale(BOOK.spineWidth) / 2,
      pagePadding: {
        outer: scale(PAGE.paddingHorizontal),
        inner: scale(PAGE.paddingHorizontal + PAGE.gutterWidth / 2),
        vertical: scale(PAGE.paddingTop),
      },
      ruleSpacing: scale(PAGE.ruleSpacing),
      isLarge,
      screen: { width, height },
      bookCenterY,
      scale,
    };
  }, [width, height, insets.top, insets.bottom]);
}
