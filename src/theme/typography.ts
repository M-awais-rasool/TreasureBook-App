import { Platform } from 'react-native';

export const fonts = {
  display: Platform.select({
    ios: 'Avenir Next Rounded',
    android: 'sans-serif-medium',
    default: 'System',
  }),

  ui: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  }),

  hand: Platform.select({
    ios: 'Bradley Hand',
    android: 'casual',
    default: 'System',
  }),
} as const;

export const text = {
  appTitle: { fontFamily: fonts.display, fontSize: 23, fontWeight: '600' as const },
  hint: { fontFamily: fonts.ui, fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.22 },
  button: { fontFamily: fonts.ui, fontSize: 16, fontWeight: '700' as const },
  bookTitle: { fontFamily: fonts.display, fontSize: 21, fontWeight: '700' as const, lineHeight: 22 },
  eyebrow: { fontFamily: fonts.ui, fontSize: 7, fontWeight: '700' as const, letterSpacing: 1.26 },
  pageTitle: { fontFamily: fonts.display, fontSize: 11, fontWeight: '600' as const },
  pageNumber: { fontFamily: fonts.ui, fontSize: 9, fontWeight: '700' as const },
  note: { fontFamily: fonts.ui, fontSize: 8, fontWeight: '400' as const, lineHeight: 11.6 },
  caption: { fontFamily: fonts.hand, fontSize: 14, fontWeight: '600' as const },
  endpaper: { fontFamily: fonts.hand, fontSize: 13, fontWeight: '600' as const },
  cameraCaption: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700' as const },
  cameraTitle: { fontFamily: fonts.display, fontSize: 17, fontWeight: '600' as const },
  control: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.2 },
} as const;
