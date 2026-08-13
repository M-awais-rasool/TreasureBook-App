import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BookMetrics } from '../../hooks/useBookMetrics';
import { PageContent } from './PageContent';
import { PaperTexture } from './PaperTexture';
import type { PageModel } from './pages';

type Props = {
  page: PageModel;
  metrics: BookMetrics;
  hiddenStickerId?: string | null;
};

function seedFor(page: PageModel): number {
  let hash = 0;
  for (let i = 0; i < page.key.length; i += 1) {
    hash = (hash * 31 + page.key.charCodeAt(i)) % 997;
  }
  return hash;
}

function PageImpl({ page, metrics, hiddenStickerId }: Props) {
  const { pageWidth, pageHeight, pagePadding, ruleSpacing } = metrics;

  return (
    <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
      <PaperTexture
        width={pageWidth}
        height={pageHeight}
        side={page.side}
        seed={seedFor(page)}
        ruling={{
          spacing: ruleSpacing,
          outer: pagePadding.outer * 0.6,
          inner: pagePadding.inner * 0.7,
          vertical: pagePadding.vertical * 1.6,
          margin: true,
        }}
      />
      <PageContent page={page} metrics={metrics} hiddenStickerId={hiddenStickerId} />
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
