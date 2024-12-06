import * as React from 'react';

import { type HeartBeat } from '@/api/types';
import { Text, View } from '@/components/ui';

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

const getLatestHeartbeat = (
  heartbeats: HeartBeat[] | null | undefined,
): HeartBeat | undefined => {
  if (!heartbeats?.length) return undefined;

  // time is in datetime string format
  return heartbeats.reduce((latest, current) =>
    new Date(current.time) > new Date(latest.time) ? current : latest,
  );
};

export function HeartbeatHistory({
  heartbeats = [],
  numLastBeats = 30,
  className = '',
  interval,
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
          {lastHeartbeat?.time
            ? new Date(lastHeartbeat.time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZoneName: 'short'
              })
            : 'No data'}
        </Text>
        <Text className="text-xs opacity-50">
          {interval ? `${interval}s` : 'No data'}
        </Text>
      </View>
    </View>
  );
}
