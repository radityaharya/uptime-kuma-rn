import { Ionicons } from '@expo/vector-icons';
import { Check } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Animated, StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';
import { type MonitorStats, useMonitorStats } from '@/store/monitorContext';

import { LatestImportantEvent } from './LatestImportantEvent';

function _MonitorNumbers({ stats }: { stats: MonitorStats }) {
  return (
    <View className="w-full flex-row justify-between rounded-xl bg-secondary p-2">
      <View className="flex flex-col items-center justify-center rounded-lg p-4">
        <Text className="text-2xl font-bold text-foreground">
          {stats.totalMonitors}
        </Text>
        <Text className="text-sm text-foreground/90">Total</Text>
      </View>
      <View className="flex flex-col items-center justify-center rounded-lg p-4">
        <Text className="text-2xl font-bold text-foreground">
          {stats.downMonitors.length}
        </Text>
        <Text className="text-sm text-foreground/90">Down</Text>
      </View>
      <View className="flex flex-col items-center justify-center rounded-lg p-4">
        <Text className="text-2xl font-bold text-foreground">
          {stats.inactiveMonitors.length}
        </Text>
        <Text className="text-sm text-foreground/90">Inactive</Text>
      </View>
    </View>
  );
}

export function MonitorSummaryStats() {
  const stats = useMonitorStats();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    const pulse = Animated.parallel([
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    Animated.loop(pulse).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDownMonitors = stats.downMonitors.filter((m) => m.active);
  const isAllUp = activeDownMonitors.length === 0;
  const numOfDownMonitors = activeDownMonitors.length;
  const isAllHeartbeatPopulated = stats.isAllHeartbeatPopulated;

  return (
    <View className="flex-1 items-center justify-center">
      <View className="relative">
        <Animated.View
          style={[
            styles.outerCircle,
            {
              backgroundColor: isAllUp ? '#22c55e20' : '#ef444420',
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.innerCircle,
            {
              backgroundColor: isAllUp ? '#22c55e' : '#ef4444',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <View style={styles.iconContainer}>
          {isAllHeartbeatPopulated ? (
            isAllUp ? (
              <Check size={48} color="white" />
            ) : (
              <Ionicons name="alert" size={48} color="white" />
            )
          ) : (
            <ActivityIndicator size="large" color="white" />
          )}
        </View>
      </View>
      <View className="mb-10 mt-14 items-center">
        <Text className="text-2xl font-bold text-foreground">
          {isAllUp ? 'All Systems Up' : `${numOfDownMonitors} Monitors Down`}
        </Text>
        <Text className="mt-2 text-sm text-foreground/90">
          {isAllUp ? 'Everything is running smoothly' : 'Attention required'}
        </Text>
      </View>
      <LatestImportantEvent />
    </View>
  );
}

const styles = StyleSheet.create({
  outerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    position: 'absolute',
    left: -20, // Center relative to inner circle
    top: -20,
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
