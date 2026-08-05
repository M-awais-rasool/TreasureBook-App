/**
 * One physical page: paper plus whatever is written on it.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BookMetrics } from '../../hooks/useBookMetrics';
import { PageContent } from './PageContent';
import { PaperTexture } from './PaperTexture';
import type { PageModel } from './pages';

type Props = {
  page: PageModel | null;
  side: 'left' | 'right';
  metrics: BookMetrics;
  hiddenStickerId?: string | null;
  totalCollected?: number;
};

/** Stable per-page grain, so a page's fibres don't change when it re-renders. */
function seedFor(page: PageModel | null): number {
  if (!page) return 0;
  let hash = 0;
  for (let i = 0; i < page.key.length; i += 1) {
    hash = (hash * 31 + page.key.charCodeAt(i)) % 997;
  }
  return hash;
}

function PageImpl({ page, side, metrics, hiddenStickerId, totalCollected }: Props) {
  const { pageWidth, pageHeight, pagePadding, ruleSpacing } = metrics;
  const ruled = page?.kind === 'collection';

  return (
    <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
      <PaperTexture
        width={pageWidth}
        height={pageHeight}
        side={side}
        seed={seedFor(page)}
        ruling={
          ruled
            ? {
                spacing: ruleSpacing,
                outer: pagePadding.outer * 0.6,
                inner: pagePadding.inner * 0.7,
                vertical: pagePadding.vertical * 1.6,
                margin: true,
              }
            : null
        }
      />
      <PageContent
        page={page}
        side={side}
        metrics={metrics}
        hiddenStickerId={hiddenStickerId}
        totalCollected={totalCollected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    overflow: 'hidden',
    backgroundColor: '#F3E7CE',
  },
});

export const Page = memo(PageImpl);
