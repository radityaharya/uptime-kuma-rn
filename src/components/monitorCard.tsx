import * as React from 'react';
import { Pressable } from 'react-native';

import { StatusIndicator } from '@/components/StatusIndicator';
import { Text, View } from '@/components/ui';
import { useMonitorsStore } from '@/store/monitorContext';

import { type HeartBeat, type Monitor, type Tag } from '../api/types';
import { HeartbeatHistory } from './heartBeatHistory';
import { MonitorModal } from './monitorModal';

interface MonitorCardProps {
  id: number;
}

const MonitorContent: React.FC<{ monitor: Monitor }> = ({ monitor }) => {
  switch (monitor.type) {
    case 'http':
      return <Text className="font-medium text-gray-300">{monitor.url}</Text>;
    case 'ping':
      return (
        <Text className="font-medium text-gray-300">{monitor.hostname}</Text>
      );
    default:
      return null;

    // TODO: Add more cases for other monitor types
  }
};

const MonitorTags: React.FC<{ tags: Tag[] }> = ({ tags }) => {
  if (!tags) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <View
          key={tag.id}
          className="rounded-full px-3 py-1.5 text-foreground/80 backdrop-blur-sm"
          style={{ backgroundColor: tag.color ?? 'gray' }}
        >
          <Text className="text-sm font-medium text-gray-200">{tag.name}</Text>
        </View>
      ))}
    </View>
  );
};

function isMonitorUp(heartbeats: HeartBeat[]): boolean {
  if (!heartbeats || heartbeats.length === 0) {
    return false;
  }

  const sortedHeartbeats = [...heartbeats].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  return sortedHeartbeats[0].status === 1;
}

export function MonitorCard({ id }: MonitorCardProps) {
  const [modalVisible, setModalVisible] = React.useState(false);

  const monitor = useMonitorsStore().find((m) => m.id === id);

  if (!monitor) return null;

  const calculateUptime = () => {
    if (!monitor.heartBeatList?.length) return null;

    const upHeartbeats = monitor.heartBeatList.filter((hb) => hb.status === 1);
    const percentage =
      (upHeartbeats.length / monitor.heartBeatList.length) * 100;
    return percentage.toFixed(1);
  };

  const isUp = isMonitorUp(monitor.heartBeatList ?? []);

  const uptime = calculateUptime();

  return (
    <>
      <Pressable onPress={() => setModalVisible(true)}>
        <View
          className="mb-4 overflow-hidden rounded-lg border border-gray-800 
          bg-gradient-to-br from-gray-800/90 to-gray-900/90 
          transition-all duration-200"
        >
          {/* Header */}
          <View className="flex-row justify-between p-4 pb-3">
            <View className="flex-row items-center space-x-3">
              <StatusIndicator active={isUp} />
              <Text className="text-xl font-bold tracking-tight text-foreground">
                {monitor.name}
              </Text>
            </View>
            {uptime && (
              <View className="px-3 py-1.5 backdrop-blur-sm">
                <Text className="font-medium text-foreground">{uptime}%</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex flex-col px-4">
            <MonitorContent monitor={monitor} />

            {monitor.description && (
              <Text
                className="border-t border-gray-700/50 pt-3 
                text-sm leading-relaxed text-gray-400"
              >
                {monitor.description}
              </Text>
            )}
            <HeartbeatHistory
              heartbeats={monitor.heartBeatList}
              className="mt-3"
            />
            <View className="mt-2 w-full flex-row justify-between">
              <Text className="text-xs opacity-40">
                {monitor.interval}s interval
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View className="p-4 pt-2">
            <MonitorTags tags={monitor.tags} />
          </View>
        </View>
      </Pressable>

      <MonitorModal
        monitor={monitor}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}
