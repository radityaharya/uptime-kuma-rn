import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable } from 'react-native';

import { type HeartBeat, type Monitor, type Tag } from '@/api/types';
import { Text, View } from '@/components/ui';
import { cn } from '@/lib';

import { HeartbeatHistory } from './HeartBeatHistory';
import { StatusIndicator } from './StatusIndicator';

interface MonitorCardProps {
  monitor: Monitor;
  onClick?: () => void;
  className?: string;
}

const MonitorContent: React.FC<{ monitor: Monitor }> = ({ monitor }) => {
  switch (monitor.type) {
    case 'http':
      return <Text className="font-medium text-foreground">{monitor.url}</Text>;
    case 'ping':
      return (
        <Text className="font-medium text-foreground">{monitor.hostname}</Text>
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
          key={tag.id || tag.tag_id}
          className="rounded-full px-3 text-foreground/80 backdrop-blur-sm"
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

  return heartbeats[0].status === 1;
}

export function MonitorCard({ monitor, onClick, className }: MonitorCardProps) {
  const router = useRouter();

  if (!monitor) return null;

  const calculateUptime = () => {
    if (!monitor.heartBeatList?.length) return null;

    const upHeartbeats = monitor.heartBeatList.filter((hb) => hb.status === 1);
    const percentage =
      (upHeartbeats.length / monitor.heartBeatList.length) * 100;
    return percentage.toFixed(1);
  };

  const isUp = isMonitorUp(monitor.heartBeatList ?? []);

  return (
    <>
      <Pressable
        onPress={() =>
          onClick
            ? onClick()
            : router.push({
                pathname: '/(app)/(monitors)/[id]',
                params: { id: monitor.id.toString() },
              })
        }
      >
        <View
          className={cn(
            'bg-background flex flex-col overflow-hidden rounded-lg border border-gray-800 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4 transition-all duration-200',
            !monitor.active && 'opacity-50',
            className,
          )}
        >
          {/* Header */}
          <View className="mb-2 flex-row justify-between">
            <View className="flex-row items-center space-x-3">
              <StatusIndicator active={isUp} />
              <Text className="text-xl font-bold tracking-tight text-foreground">
                {monitor.pathName || monitor.name}
              </Text>
            </View>
            <View className="backdrop-blur-sm">
              <Text className="font-medium text-foreground">
                {calculateUptime()}%
              </Text>
            </View>
          </View>

          {/* Content */}
          <View className="mb-4 flex flex-col">
            <View className="mb-2">
              <MonitorContent monitor={monitor} />
            </View>
            {monitor.description && (
              <Text
                className="border-t border-gray-700/50 
                text-sm leading-relaxed text-gray-400"
              >
                {monitor.description}
              </Text>
            )}
            <HeartbeatHistory
              heartbeats={monitor.heartBeatList}
              interval={monitor.interval}
            />
          </View>

          {/* Footer */}
          <View>
            <MonitorTags tags={monitor.tags} />
          </View>
        </View>
      </Pressable>
    </>
  );
}
