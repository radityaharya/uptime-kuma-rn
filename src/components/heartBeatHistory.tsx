// HeartbeatHistory.tsx
import { FlashList } from '@shopify/flash-list';
import * as React from 'react';

import { View } from '@/components/ui';

import { type HeartBeat } from '../api/types';

interface HeartbeatHistoryProps {
  heartbeats?: HeartBeat[] | null;
  numLastBeats?: number;
  className?: string;
}

const HeartbeatDot = React.memo(({ status }: { status: number }) => (
  <View
    className={`h-4 w-2 rounded-full ${
      status === 1 ? 'bg-green-500' : 'bg-red-500'
    }`}
  />
));

const PlaceholderDot = React.memo(() => (
  <View className="h-4 w-2 rounded-full bg-gray-600/50" />
));

export function HeartbeatHistory({
  heartbeats = [],
  numLastBeats = 30,
  className = '',
}: HeartbeatHistoryProps) {
  const dots = React.useMemo(() => {
    const filledHeartbeats = heartbeats?.length
      ? [...heartbeats].slice(-numLastBeats).reverse()
      : [];
    const placeholders = Array(numLastBeats - filledHeartbeats.length).fill(
      null,
    );
    return [...filledHeartbeats, ...placeholders];
  }, [heartbeats, numLastBeats]);

  return (
    <View className={`${className}`}>
      <View className="flex-1 justify-center">
        <FlashList
          data={dots}
          renderItem={({ item }) =>
            item ? <HeartbeatDot status={item.status} /> : <PlaceholderDot />
          }
          estimatedItemSize={12}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="w-1" />}
          contentContainerStyle={{ paddingHorizontal: 2 }}
        />
      </View>
    </View>
  );
}
