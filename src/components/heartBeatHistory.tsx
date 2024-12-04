import * as React from 'react';

import { View } from '@/components/ui';

import { type HeartBeat } from '../api/types';

interface HeartbeatHistoryProps {
  heartbeats?: HeartBeat[] | null;
  numLastBeats?: number;
  className?: string;
}

const HeartbeatDot = ({ status }: { status: number }) => (
  <View
    className={`h-4 w-2 rounded-full ${
      status === 1 ? 'bg-green-500' : 'bg-red-500'
    }`}
  />
);

const PlaceholderDot = () => (
  <View className="h-4 w-2 rounded-full bg-gray-600/50" />
);

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
      <View className="flex-1 flex-row justify-center px-2">
        {dots.map((item, index) => (
          <React.Fragment key={index}>
            {item ? <HeartbeatDot status={item.status} /> : <PlaceholderDot />}
            {index < dots.length - 1 && <View className="w-1" />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}