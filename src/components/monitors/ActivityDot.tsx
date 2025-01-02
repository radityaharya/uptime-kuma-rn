import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { useMonitorsStore } from '@/store/monitorContext';


interface ActivityDotProps {
  className?: string;
}
export function ActivityDot({ className }: ActivityDotProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const monitors = useMonitorsStore();

  const pulse = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.5,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ])
    ]).start();
  };

  useEffect(() => {
    pulse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitors]);

  return (
    <View className={twMerge('flex-row items-center', className)}>
      <View className="relative">
        {/* Outer glow */}
        <Animated.View
          className="absolute size-3 rounded-full bg-green-500/30"
          style={{
            transform: [{ scale: Animated.multiply(scale, 1.5) }],
            opacity
          }}
        />
        {/* Pulse animation */}
        <Animated.View
          className="absolute size-3 rounded-full bg-green-400"
          style={{
            transform: [{ scale }],
            opacity
          }}
        />
        {/* Core dot */}
        <View className="size-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
      </View>
      {/* <Text className="ml-2 text-xs opacity-50">Socket Connected</Text> */}
    </View>
  );
}
