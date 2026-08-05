/**
 * What is written and stuck on a page.
 *
 * Purely presentational and fully derived from props — a page can be rendered
 * flat in the spread or mid-flight on a turning sheet with no difference in
 * behaviour.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../theme/palette';
import { text } from '../../theme/typography';
import type { BookMetrics } from '../../hooks/useBookMetrics';
import type { PageModel } from './pages';
import { fitInSlot, slotRects } from './pageLayout';
import { StickerView } from './StickerView';

type Props = {
  page: PageModel | null;
  side: 'left' | 'right';
  metrics: BookMetrics;
  /**
   * A sticker mid-flight is drawn by the overlay in screen space, so the page
   * leaves its slot empty until the landing completes. Without this the sticker
   * would appear twice for the length of the animation.
   */
  hiddenStickerId?: string | null;
  /** Total collected, shown on the title page. */
  totalCollected?: number;
};

function PageContentImpl({ page, side, metrics, hiddenStickerId, totalCollected = 0 }: Props) {
  if (!page) return null;

  const { pagePadding, pageWidth } = metrics;
  const spineIsLeft = side === 'right';
  const horizontal = {
    paddingLeft: spineIsLeft ? pagePadding.inner : pagePadding.outer,
    paddingRight: spineIsLeft ? pagePadding.outer : pagePadding.inner,
  };

  if (page.kind === 'blank') {
    return null;
  }

  if (page.kind === 'title') {
    return (
      <View style={[styles.fill, horizontal, { paddingVertical: pagePadding.vertical }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>MY VERY OWN</Text>
          <Text style={[styles.title, { fontSize: Math.max(24, pageWidth * 0.17) }]}>
            Treasure{'\n'}Book
          </Text>
          <View style={styles.flourish}>
            <View style={styles.flourishLine} />
            <View style={styles.flourishDot} />
            <View style={styles.flourishLine} />
          </View>
          <Text style={styles.subtitle}>
            Point the camera at anything wonderful{'\n'}and it will appear inside.
          </Text>
        </View>

        <View style={styles.titleFooter}>
          <Text style={styles.counter}>
            {totalCollected === 0
              ? 'Nothing found yet'
              : `${totalCollected} treasure${totalCollected === 1 ? '' : 's'} found`}
          </Text>
        </View>
      </View>
    );
  }

  const slots = slotRects(metrics, side);

  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.header, horizontal, { paddingTop: pagePadding.vertical }]}>
        <Text style={styles.pageHeading}>
          {page.pageIndex === 0 ? 'Things I found' : 'More discoveries'}
        </Text>
        <Text style={styles.pageNumber}>{page.pageIndex + 1}</Text>
      </View>

      {slots.map((slot, index) => {
        const sticker = page.slots[index];
        const key = `${page.key}-slot-${index}`;

        if (!sticker || sticker.id === hiddenStickerId) {
          return (
            <View
              key={key}
              style={[
                styles.emptySlot,
                {
                  left: slot.x,
                  top: slot.y,
                  width: slot.width,
                  height: slot.height,
                  borderRadius: Math.min(slot.width, slot.height) * 0.12,
                },
              ]}
            />
          );
        }

        const size = fitInSlot(slot, sticker.width, sticker.height);
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: slot.x + (slot.width - size.width) / 2 + slot.width * sticker.drift.x,
              top: slot.y + (slot.height - size.height) / 2 + slot.height * sticker.drift.y,
              transform: [{ rotate: `${sticker.rotation}deg` }, { scale: sticker.scale }],
            }}
          >
            <StickerView
              uri={sticker.uri}
              width={size.width}
              height={size.height}
              elevation={Math.max(0.7, size.width / 120)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  pageHeading: {
    ...text.pageTitle,
    color: palette.ink.soft,
  },
  pageNumber: {
    ...text.caption,
    color: palette.ink.faint,
  },
  emptySlot: {
    position: 'absolute',
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: 'rgba(59, 44, 36, 0.16)',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    ...text.caption,
    color: palette.ink.faint,
    marginBottom: 6,
  },
  title: {
    ...text.bookTitle,
    color: palette.ink.primary,
    lineHeight: undefined,
  },
  flourish: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 14,
    opacity: 0.5,
  },
  flourishLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.ink.soft,
  },
  flourishDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 7,
    backgroundColor: palette.ink.soft,
  },
  subtitle: {
    ...text.note,
    color: palette.ink.soft,
    lineHeight: 19,
  },
  titleFooter: {
    alignItems: 'flex-start',
  },
  counter: {
    ...text.caption,
    color: palette.ink.faint,
  },
});

export const PageContent = memo(PageContentImpl);
