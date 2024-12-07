import * as React from 'react';

import { type HeartBeat } from '@/api/types';
import { Text, View } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
// import { infoStore } from '@/store/infoStore';

interface HeartbeatHistoryProps {
  heartbeats?: HeartBeat[] | null;
  numLastBeats?: number;
  interval?: number;
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
  interval,
}: HeartbeatHistoryProps) {
  // const { serverTimezone } = infoStore((state) => state.info);

  const filledHeartbeats = heartbeats?.length
    ? [...heartbeats]
        .filter((hb) => hb.time) // Ensure time is defined
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, numLastBeats)
    : [];
  const placeholders = Array(numLastBeats - filledHeartbeats.length).fill(null);
  const dots = [...filledHeartbeats, ...placeholders];

  if (!heartbeats) return null;

  return (
    <View className={`${className}`}>
      <View className="mb-2 flex-row justify-between">
        {dots.map((item, index) => (
          <React.Fragment key={index}>
            {item ? <HeartbeatDot status={item.status} /> : <PlaceholderDot />}
            {index < dots.length - 1 && <View className="w-1" />}
          </React.Fragment>
        ))}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs opacity-50">
          {heartbeats.length ? formatDateTime(heartbeats[0].time) : 'No data'}
        </Text>
        <Text className="text-xs opacity-50">
          {interval ? `${interval}s` : 'No data'}
        </Text>
      </View>
    </View>
  );
}