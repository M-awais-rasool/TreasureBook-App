import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type BookMetrics = {
  /** Width of a single page (half the open book). */
  pageWidth: number;
  /** Height of a page, and of the book overall. */
  pageHeight: number;
  /** Full open-book width — two pages plus the binding. */
  bookWidth: number;
  bookHeight: number;
  /** Visual thickness of the paper stack peeking out at the fore-edge. */
  stackDepth: number;
  /** Half-width of the cloth binding that straddles the centre fold. */
  spineHalfWidth: number;
  /** Inner padding of a page — wider on the spine side, like real margins. */
  pagePadding: { outer: number; inner: number; vertical: number };
  /** Spacing between ruled lines. */
  ruleSpacing: number;
  /** True when we have room for a more generous layout. */
  isLarge: boolean;
  screen: { width: number; height: number };
  /** Vertical offset that keeps the book optically centred above the controls. */
  bookCenterY: number;
};

const PAGE_ASPECT = 0.7;
const MIN_SIDE_MARGIN = 14;
const LARGE_BREAKPOINT = 700;

export function useBookMetrics(): BookMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isLarge = Math.min(width, height) >= LARGE_BREAKPOINT;

    const chromeTop = insets.top + 64;
    const chromeBottom = insets.bottom + (isLarge ? 168 : 148);
    const availableHeight = Math.max(240, height - chromeTop - chromeBottom);

    const sideMargin = isLarge ? 48 : MIN_SIDE_MARGIN;
    const availableWidth = width - sideMargin * 2;

    let bookWidth = Math.min(availableWidth, isLarge ? 880 : availableWidth);
    let pageWidth = bookWidth / 2;
    let pageHeight = pageWidth / PAGE_ASPECT;

    if (pageHeight > availableHeight) {
      pageHeight = availableHeight;
      pageWidth = pageHeight * PAGE_ASPECT;
      bookWidth = pageWidth * 2;
    }

    const stackDepth = Math.max(6, Math.round(pageWidth * 0.045));
    const spineHalfWidth = Math.max(9, Math.round(pageWidth * 0.05));

    return {
      pageWidth,
      pageHeight,
      bookWidth,
      bookHeight: pageHeight,
      stackDepth,
      spineHalfWidth,
      pagePadding: {
        outer: Math.round(pageWidth * 0.1),
        inner: Math.round(pageWidth * 0.16),
        vertical: Math.round(pageHeight * 0.075),
      },
      ruleSpacing: Math.max(16, Math.round(pageHeight * 0.062)),
      isLarge,
      screen: { width, height },
      bookCenterY: chromeTop + availableHeight / 2,
    };
  }, [width, height, insets.top, insets.bottom]);
}
