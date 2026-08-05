import * as Haptics from 'expo-haptics';

const swallow = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const haptics = {
  /** Page edge passing under the thumb. */
  pageTick: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Page committed to its new position. */
  pageSettle: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Shutter fired. */
  capture: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  /** Sticker landing on the page. */
  stamp: () => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Generic control press. */
  tap: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** Something went wrong. */
  warn: () => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
