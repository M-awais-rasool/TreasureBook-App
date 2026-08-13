import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../theme/palette';
import { text } from '../../theme/typography';
import type { BookMetrics } from '../../hooks/useBookMetrics';
import type { PageModel } from './pages';
import { fitInSlot, slotRects } from './pageLayout';
import { StickerView } from './StickerView';

type Props = {
  page: PageModel;
  metrics: BookMetrics;
  hiddenStickerId?: string | null;
};

const HEADINGS = ['Things I found', 'More discoveries'] as const;

function PageContentImpl({ page, metrics, hiddenStickerId }: Props) {
  const { pagePadding } = metrics;
  const spineIsLeft = page.side === 'right';

  const horizontal = {
    paddingLeft: spineIsLeft ? pagePadding.inner : pagePadding.outer,
    paddingRight: spineIsLeft ? pagePadding.outer : pagePadding.inner,
  };

  const slots = slotRects(metrics, page.side);

  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.header, horizontal, { paddingTop: pagePadding.vertical }]}>
        <Text style={styles.pageHeading}>{HEADINGS[page.index] ?? HEADINGS[0]}</Text>
        <Text style={styles.pageNumber}>{page.index + 1}</Text>
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
});

export const PageContent = memo(PageContentImpl);
