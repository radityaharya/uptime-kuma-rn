import * as React from 'react';

import { View } from '@/components/ui';

import { MonitorCardSkeleton } from './MonitorCardSekeleton';
export const EmptyState = React.memo(() => (
  <View className="flex-1 items-center justify-center gap-2">
    {[...Array(4)].map((_, i) => (
      <MonitorCardSkeleton key={i} />
    ))}
  </View>
));
