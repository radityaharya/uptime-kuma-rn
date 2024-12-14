import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { type HeartbeatData } from '@/api/status/types';
import { type HeartBeat } from '@/api/types';
import { Text, View } from '@/components/ui';

interface HeartbeatHistoryProps {
  heartbeats?: HeartBeat[] | HeartbeatData[];
  numLastBeats?: number;
  isParent: boolean;
  interval?: number;
  className?: string;
}

const HeartbeatBar = ({
  status,
  ping,
  maxPing,
  isParent
}: {
  status: number;
  ping: number;
  maxPing: number;
  isParent: boolean;
}) => {
  const percentage = isParent ? 100 : (ping / maxPing) * 100;
  return (
    <View className="items-center justify-end">
      <View
        className={`relative h-[20px] w-2 rounded-full ${status === 1 ? 'bg-green-200 dark:bg-green-900' : 'bg-red-200 dark:bg-red-900'}`}
      >
        <View
          className={`w-full rounded-full ${
            status === 1 ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{
            height: `${percentage}%`,
            position: 'absolute',
            bottom: 0
          }}
        />
      </View>
    </View>
  );
};

const PlaceholderBar = () => (
  <View className="items-center justify-end">
    <View className="h-[20px] w-2 rounded-full bg-gray-600/50" />
  </View>
);

function AnimatedPlaceholderBars() {
  const animatedValues = useRef(
    [...Array(30)].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = animatedValues.map((animatedValue, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          })
        ])
      );
    });

    Animated.stagger(100, animations).start();
  }, [animatedValues]);

  return (
    <View className="flex-row justify-between">
      {animatedValues.map((animatedValue, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animatedValue,
            transform: [
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5]
                })
              }
            ]
          }}
        >
          <PlaceholderBar />
        </Animated.View>
      ))}
    </View>
  );
}

export function HeartbeatHistory({
  heartbeats = [],
  numLastBeats = 30,
  isParent = false,
  className = '',
  interval
}: HeartbeatHistoryProps) {
  const filledHeartbeats = React.useMemo(() => {
    return heartbeats?.length
      ? [...heartbeats]
          .filter((hb) => hb.time)
          .sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
          )
          .slice(0, numLastBeats)
      : [];
  }, [heartbeats, numLastBeats]);

  const maxPing = React.useMemo(() => {
    return Math.max(...filledHeartbeats.map((hb) => hb.ping || 0), 100); // minimum 100ms for scale
  }, [filledHeartbeats]);

  const placeholders = React.useMemo(() => {
    return Array(numLastBeats - filledHeartbeats.length).fill(null);
  }, [filledHeartbeats.length, numLastBeats]);

  const bars = React.useMemo(() => {
    return [...filledHeartbeats, ...placeholders];
  }, [filledHeartbeats, placeholders]);

  if (!heartbeats) return null;

  return (
    <View className={`${className}`}>
      <View className="mb-2 flex-row justify-between">
        {bars.length === 0 ? (
          <AnimatedPlaceholderBars />
        ) : (
          bars.map((item, index) => (
            <React.Fragment key={index}>
              {item ? (
                <HeartbeatBar
                  status={item.status}
                  ping={item.ping || 0}
                  maxPing={maxPing}
                  isParent={isParent}
                />
              ) : (
                <PlaceholderBar />
              )}
              {index < bars.length - 1 && <View className="w-1" />}
            </React.Fragment>
          ))
        )}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs opacity-50">
          {filledHeartbeats.length
            ? new Date(heartbeats[0].time).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: 'numeric'
              })
            : 'No data'}
        </Text>
        <Text className="text-xs opacity-50">{interval}s</Text>
        <Text className="text-xs opacity-50">
          {filledHeartbeats.length
            ? new Date(
                heartbeats[heartbeats.length - 1].time
              ).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: 'numeric'
              })
            : 'No data'}
        </Text>
      </View>
    </View>
  );
}
