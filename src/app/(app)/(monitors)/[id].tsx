import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  useColorScheme,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { type HeartBeat } from '@/api/types';
import { Text, View } from '@/components/ui';
import { formatDateTime } from '@/lib';
import { useMonitor } from '@/store/monitorContext';

const LoadingSkeleton = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <ActivityIndicator size="large" color="#1DB954" />
    <Text className="mt-4 text-foreground">Loading monitor data...</Text>
  </View>
));

// Chart Components
const ChartDataPoint = React.memo(() => (
  <View
    style={{
      width: 8,
      height: 8,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderRadius: 4,
      borderColor: '#1DB954',
      shadowColor: '#1DB954',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    }}
  />
));

const ChartLabel = React.memo(
  ({ value, isDarkMode }: { value: string; isDarkMode: boolean }) => (
    <View style={{ width: 60, marginLeft: 5 }}>
      <Text
        style={{
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          fontSize: 9,
          fontWeight: '500',
        }}
      >
        {value}
      </Text>
    </View>
  ),
);

const getChartConfig = (isDarkMode: boolean, maxPing: number) => ({
  startFillColor: '#1DB954',
  startOpacity: 0.3,
  endFillColor: '#1DB954',
  endOpacity: 0.05,
  width: Dimensions.get('window').width,
  height: 220,
  curved: true,
  adjustToWidth: true,
  thickness: 2,
  color: '#1DB954',
  maxValue: maxPing,
  noOfSections: 4,
  yAxisTextStyle: {
    color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    fontSize: 10,
    fontWeight: '500',
  },
  spacing: 32,
  backgroundColor: isDarkMode ? '#000000' : '#fff',
  rulesColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
  rulesType: 'dash',
  initialSpacing: 15,
  yAxisColor: 'transparent',
  xAxisColor: 'transparent',
  hideRules: false,
  hideYAxisText: false,
  yAxisOffset: 0,
  rotateLabel: false,
  showDataPointOnPress: true,
  pressEnabled: true,
});

// Memoize HeartbeatCard
const HeartbeatCard = React.memo(({ item }: { item: any }) => {
  return (
    <View className={`mb-2 rounded-lg border border-secondary p-4`}>
      <Text className="text-sm text-gray-500">{formatDateTime(item.time)}</Text>
      <Text className={`text-lg font-bold text-foreground`}>
        {item.status === 1 ? 'Up' : 'Down'}
      </Text>
      <Text className="text-sm">Ping: {item.ping} ms</Text>
      <Text className="text-sm">Message: {item.msg}</Text>
    </View>
  );
});

export default function MonitorDetails() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { id } = useLocalSearchParams() as { id: string };
  const monitor = useMonitor(Number.parseInt(id, 10));

  const transformChartData = React.useMemo(
    () =>
      monitor?.heartBeatList?.map((hb: HeartBeat, index: number) => ({
        value: hb.ping,
        hideDataPoint: index % 4 !== 0,
        customDataPoint: index % 4 === 0 ? () => <ChartDataPoint /> : undefined,
        labelComponent:
          index % 12 === 0
            ? () => (
                <ChartLabel
                  value={formatDateTime(hb.time)}
                  isDarkMode={isDarkMode}
                />
              )
            : undefined,
      })) || [],
    [isDarkMode, monitor?.heartBeatList],
  );

  const chartConfig = React.useMemo(
    () =>
      getChartConfig(
        isDarkMode,
        Math.max(
          ...(monitor?.heartBeatList?.map((hb: HeartBeat) => hb.ping) || [0]),
        ),
      ),
    [isDarkMode, monitor?.heartBeatList],
  );

  if (!monitor) {
    return (
      <View
        className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        style={{
          height: Dimensions.get('window').height,
        }}
      >
        <LoadingSkeleton />
      </View>
    );
  }

  const importantHeartBeatList = monitor.importantHeartBeatList ?? [];

  return (
    <View
      className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
      style={{
        height: Dimensions.get('window').height,
      }}
    >
      <View className="flex-1 px-4 pt-6">
        <View className="mb-4 flex flex-row items-center justify-between">
          <Text className="text-lg font-bold">{monitor.name}</Text>
        </View>
        <LineChart areaChart data={transformChartData} {...chartConfig} />
        <Text className="mb-2 text-lg font-bold">Important Events</Text>
        <FlatList
          data={importantHeartBeatList}
          renderItem={({ item }) => <HeartbeatCard item={item} />}
          keyExtractor={(item) => item.time.toString()}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={5}
          getItemLayout={(data, index) => ({
            length: 100,
            offset: 100 * index,
            index,
          })}
        />
      </View>
    </View>
  );
}
