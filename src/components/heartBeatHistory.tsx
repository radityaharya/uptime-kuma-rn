import * as React from 'react';

import { Text, View } from '@/components/ui';

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

const getLatestHeartbeat = (
  heartbeats: HeartBeat[] | null | undefined,
): HeartBeat | undefined => {
  if (!heartbeats?.length) return undefined;

  return heartbeats.reduce((latest, current) =>
    !latest || current.time > latest.time ? current : latest,
  );
};

export function HeartbeatHistory({
  heartbeats = [],
  numLastBeats = 30,
  className = '',
}: HeartbeatHistoryProps) {
  const dots = React.useMemo(() => {
    const filledHeartbeats = heartbeats?.length
      ? [...heartbeats]
          .sort((a, b) => Number(b.time) - Number(a.time))
          .slice(0, numLastBeats)
      : [];
    const placeholders = Array(numLastBeats - filledHeartbeats.length).fill(
      null,
    );
    return [...filledHeartbeats, ...placeholders];
  }, [heartbeats, numLastBeats]);

  const lastHeartbeat = React.useMemo(
    () => getLatestHeartbeat(heartbeats),
    [heartbeats],
  );

  if (!heartbeats) return null;

  return (
    <View className={`${className}`}>
      <View className="flex-1 flex-row justify-between p-2">
        {dots.map((item, index) => (
          <React.Fragment key={index}>
            {item ? <HeartbeatDot status={item.status} /> : <PlaceholderDot />}
            {index < dots.length - 1 && <View className="w-1" />}
          </React.Fragment>
        ))}
      </View>
      <Text className="text-sm opacity-50">
        {lastHeartbeat?.time
          ? new Date(lastHeartbeat.time).toLocaleTimeString()
          : 'No data'}
      </Text>
    </View>
  );
}
