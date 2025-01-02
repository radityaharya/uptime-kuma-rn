import { useRouter } from 'expo-router';
import * as React from 'react';
import { Dimensions, Pressable } from 'react-native';
import Swipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import { cn } from '@/lib';
import { type HeartBeat, type Monitor, type Tag } from '@/schemas/monitor';

import { HeartbeatHistory } from './HeartBeatHistory';
// import { StatusIndicator } from './StatusIndicator';

interface MonitorCardProps {
  monitor: Monitor;
  onClick?: () => void;
  className?: string;
}

const MonitorTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  return (
    <View className="items-center justify-center rounded-md border border-black/20 px-3 backdrop-blur-sm dark:border-white/20">
      <Text className="text-sm font-medium text-foreground">{type}</Text>
    </View>
  );
};

const MonitorContent: React.FC<{ monitor: Monitor }> = ({ monitor }) => {
  switch (monitor.type) {
    case 'http':
      return (
        <View className="flex-row items-center gap-2">
          <MonitorTypeBadge type={monitor.type} />
          <Text className="text-foreground">{monitor.url}</Text>
        </View>
      );
    case 'ping':
      return (
        <View className="flex-row items-center gap-2">
          <MonitorTypeBadge type={monitor.type} />
          <Text className="text-foreground">{monitor.hostname}</Text>
        </View>
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
          className="rounded-full px-3 py-0.5 text-foreground/80 backdrop-blur-sm"
          style={{ backgroundColor: tag.color ?? 'gray' }}
        >
          <Text className="text-sm font-medium text-white">{tag.name}</Text>
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

function UptimeBadge({
  uptime,
  className
}: {
  uptime: number;
  className?: string;
}) {
  return (
    <View className={cn('rounded-full px-3 backdrop-blur-sm', className)}>
      <Text className="text-sm font-medium text-white">
        {uptime.toFixed(2)}%
      </Text>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -SCREEN_WIDTH * 0.25;

const SwipeActions: React.FC<{
  monitor: Monitor;
  height: number;
  progress: SharedValue<number>;
}> = ({ monitor, height, progress }) => {
  const router = useRouter();

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = progress.value;
    return {
      opacity,
      height
    };
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="border-transparen flex w-1/5 flex-col overflow-hidden rounded-none rounded-tr-md border-y border-r border-black/20 dark:border-white/20"
    >
      <Pressable
        onPress={() => {
          router.push({
            pathname: '/(app)/(monitors)/edit/[id]',
            params: { id: monitor.id!.toString() }
          });
        }}
        className="flex-1 items-center justify-center bg-green-500/90 backdrop-blur-sm"
      >
        <Text className="font-medium text-white">Edit</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          // Handle delete action
        }}
        className="flex-1 items-center justify-center bg-red-500/90 backdrop-blur-sm"
      >
        <Text className="font-medium text-white">Delete</Text>
      </Pressable>
    </Animated.View>
  );
};

export function MonitorCard({ monitor, onClick, className }: MonitorCardProps) {
  const router = useRouter();
  const swipeableRef = React.useRef<SwipeableMethods>(null);
  const [cardHeight, setCardHeight] = React.useState(0);

  if (!monitor) return null;

  const isUp = isMonitorUp(monitor.heartBeatList ?? []);

  return (
    <View className="overflow-hidden rounded-lg">
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress) => (
          <SwipeActions
            monitor={monitor}
            height={cardHeight}
            progress={progress}
          />
        )}
        overshootRight={false}
        rightThreshold={SWIPE_THRESHOLD}
      >
        <Pressable
          onPress={() => {
            if (onClick) {
              onClick();
            } else {
              router.push({
                pathname: '/(app)/(monitors)/[id]',
                params: { id: monitor.id!.toString() }
              });
            }
          }}
        >
          <View
            onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
            className={cn(
              'bg-card flex flex-col overflow-hidden rounded-lg border border-black/20 dark:border-white/20 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4 transition-all duration-200',
              !monitor.active && 'opacity-50',
              className
            )}
          >
            {/* Header */}
            <View className="mb-2 flex-row justify-between">
              <View className="flex-row items-center gap-2">
                <View className="backdrop-blur-sm">
                  <UptimeBadge
                    uptime={(monitor.uptime?.month || 0) * 100}
                    className={isUp ? 'bg-green-500' : 'bg-red-500'}
                  />
                </View>
                <Text className="text-xl font-bold tracking-tight text-foreground">
                  {monitor.pathName || monitor.name}
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
                  className="border-t border-gray-700/20 
                text-sm leading-relaxed text-gray-400"
                >
                  {monitor.description}
                </Text>
              )}
              <HeartbeatHistory
                heartbeats={monitor.heartBeatList}
                interval={monitor.interval}
                isParent={monitor.childrenIDs.length > 0}
              />
            </View>

            {/* Footer */}
            <View>
              <MonitorTags tags={monitor.tags} />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
}

export function MonitorCardSkeleton() {
  return (
    <View className="animate-pulse">
      <View className="bg-background flex flex-col overflow-hidden rounded-lg border border-gray-800 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4">
        {/* Header */}
        <View className="mb-2 flex-row justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-4 rounded-full bg-slate-700" />
            <View className="h-4 w-16 rounded-full bg-slate-700" />
          </View>
        </View>

        {/* Content */}
        <View className="mb-4 flex flex-col">
          <View className="mb-2">
            <View className="h-4 w-16 rounded-full bg-slate-700" />
          </View>
          <View className="h-4 w-16 rounded-full bg-slate-700" />
        </View>

        {/* Footer */}
        <View>
          <View className="flex-row flex-wrap gap-2">
            <View className="h-4 w-16 rounded-full bg-slate-700" />
            <View className="h-4 w-16 rounded-full bg-slate-700" />
          </View>
        </View>
      </View>
    </View>
  );
}
