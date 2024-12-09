import React from 'react';

import { Text, View } from '@/components/ui';

interface StatItemProps {
  title: string;
  value: string;
  timeRange: string;
}

function StatItem({ title, value, timeRange }: StatItemProps) {
  return (
    <View className="flex flex-col items-center justify-center">
      <Text className="text-sm text-foreground opacity-75">{title}</Text>
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-foreground opacity-75">{timeRange}</Text>
    </View>
  );
}

interface DetailStatCardProps {
  current_ping: number;
  average_ping: number;
  uptime: {
    day: number;
    month: number;
  };
}
export function DetailStatCard({
  current_ping,
  average_ping,
  uptime,
}: DetailStatCardProps) {
  return (
    <View className="bg-background mb-2 flex flex-row justify-between rounded-lg border border-secondary p-4">
      <StatItem
        title="Current Ping"
        value={`${current_ping}ms`}
        timeRange="current"
      />
      <StatItem
        title="Average Ping"
        value={`${average_ping}ms`}
        timeRange="24h avg"
      />
      <StatItem
        title="Uptime"
        value={`${((uptime.day / 1) * 100).toFixed(1)}%`}
        timeRange="24h"
      />
      <StatItem
        title="Uptime"
        value={`${((uptime.month / 1) * 100).toFixed(1)}%`}
        timeRange="30d"
      />
    </View>
  );
}

DetailStatCard.displayName = 'DetailStatCard';
