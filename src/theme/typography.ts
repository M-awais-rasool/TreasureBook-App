import { Platform } from 'react-native';

export const fonts = {
  /** Loose, childlike handwriting — headings and labels written on the page. */
  hand: Platform.select({
    ios: 'Bradley Hand',
    android: 'casual',
    default: 'System',
  }),

  /** Rounder and friendlier — used where handwriting would hurt legibility. */
  friendly: Platform.select({
    ios: 'Chalkboard SE',
    android: 'casual',
    default: 'System',
  }),

  /** Printed-in-the-book feel for captions and dates. */
  press: Platform.select({
    ios: 'American Typewriter',
    android: 'serif',
    default: 'System',
  }),

  /** UI chrome outside the notebook. */
  ui: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
} as const;

export const text = {
  bookTitle: { fontFamily: fonts.hand, fontSize: 34, letterSpacing: 0.4 },
  pageTitle: { fontFamily: fonts.hand, fontSize: 21, letterSpacing: 0.3 },
  caption: { fontFamily: fonts.press, fontSize: 11, letterSpacing: 0.6 },
  note: { fontFamily: fonts.friendly, fontSize: 13, letterSpacing: 0.2 },
  control: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.2 },
} as const;
