import { formatDistance } from 'date-fns';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';
import { useMonitorStats } from '@/store/monitorContext';

export const LatestImportantEvent = () => {
  const router = useRouter();
  const stats = useMonitorStats();

  if (!stats.latestImportantEvent || !stats.latestImportantEvent.heartbeat) {
    return null;
  }

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/(monitors)/[id]',
          params: { id: Number(stats.latestImportantEvent.monitorId) }
        })
      }
    >
      <View
        className={`w-full flex-row items-center justify-between rounded-md px-4 py-3 ${stats.latestImportantEvent.heartbeat.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}
      >
        <View className="">
          <Text className="text-xs">
            {formatDistance(
              stats.latestImportantEvent.heartbeat.time,
              new Date(),
              { addSuffix: true }
            )}
          </Text>
          <Text className="mb-1 text-sm font-medium text-foreground">
            {stats.latestImportantEvent.monitorName} -{' '}
            {stats.latestImportantEvent.heartbeat.msg.slice(0, 50)}
          </Text>
        </View>
        <Text className="ml-3 text-xs text-foreground/60"></Text>
      </View>
    </Pressable>
  );
};
