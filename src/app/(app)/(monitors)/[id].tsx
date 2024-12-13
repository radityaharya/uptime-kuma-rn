import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  useColorScheme
} from 'react-native';
import { LineChart, type LineChartPropsType } from 'react-native-gifted-charts';

import { type HeartBeat } from '@/api/types';
import { DetailStatCard } from '@/components/monitors/DetailStatCard';
import { MonitorCard } from '@/components/monitors/MonitorCard';
import { Text, View } from '@/components/ui';
import { clientStore } from '@/store/clientStore';
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
      shadowRadius: 4
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
          fontWeight: '500'
        }}
      >
        {value}
      </Text>
    </View>
  )
);

const MonitorChart = React.memo(
  ({
    heartBeatList,
    isDarkMode
  }: {
    heartBeatList: HeartBeat[];
    isDarkMode: boolean;
  }) => {
    const transformChartData = React.useMemo(
      () =>
        heartBeatList?.map((hb: HeartBeat, index: number) => ({
          value: hb.ping,
          hideDataPoint: index % 4 !== 0,
          customDataPoint:
            index % 4 === 0 ? () => <ChartDataPoint /> : undefined,
          labelComponent:
            index % 12 === 0
              ? () => (
                  <ChartLabel
                    value={hb.time.toLocaleTimeString()}
                    isDarkMode={isDarkMode}
                  />
                )
              : undefined
        })) || [],
      [isDarkMode, heartBeatList]
    );

    const chartConfig = React.useMemo(
      (): LineChartPropsType => ({
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
        maxValue: Math.max(
          ...(heartBeatList?.map((hb: HeartBeat) => hb.ping) || [0])
        ),
        noOfSections: 4,
        yAxisTextStyle: {
          color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          fontSize: 10,
          fontWeight: '500'
        },
        spacing: 10,
        backgroundColor: isDarkMode ? '#000000' : '#fff',
        rulesColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        rulesType: 'dash',
        initialSpacing: 15,
        yAxisColor: 'transparent',
        xAxisColor: 'transparent',
        hideRules: false,
        hideYAxisText: false,
        yAxisOffset: 0,
        rotateLabel: false
      }),
      [isDarkMode, heartBeatList]
    );

    return <LineChart areaChart data={transformChartData} {...chartConfig} />;
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary rerenders
    return (
      prevProps.isDarkMode === nextProps.isDarkMode &&
      prevProps.heartBeatList === nextProps.heartBeatList
    );
  }
);

// Memoize HeartbeatCard
const HeartbeatCard = React.memo(({ item }: { item: any }) => {
  return (
    <View className={`mb-2 rounded-lg border border-secondary p-4`}>
      <Text className="text-sm text-gray-500">
        {item.time
          ? new Date(item.time).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              timeZoneName: 'short'
            })
          : ''}
      </Text>
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
  const client = clientStore.getClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [_lastUpdate, setLastUpdate] = React.useState(Date.now());

  // V2_compat
  const fetchImportantHeartbeats = React.useCallback(async () => {
    if (client) {
      try {
        await client.getMonitorImportantHeartbeatListPaged(
          Number.parseInt(id, 10),
          0,
          25
        );
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Failed to fetch important heartbeats:', error);
      }
    }
  }, [client, id]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchImportantHeartbeats();
    setRefreshing(false);
  }, [fetchImportantHeartbeats]);

  // V2_compat
  React.useEffect(() => {
    fetchImportantHeartbeats();
    const interval = setInterval(fetchImportantHeartbeats, 30000);
    return () => clearInterval(interval);
  }, [fetchImportantHeartbeats]);

  if (!monitor?.importantHeartBeatList) {
    return (
      <View
        className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        style={{
          height: Dimensions.get('window').height
        }}
      >
        <LoadingSkeleton />
      </View>
    );
  }

  const importantHeartBeatList = monitor.importantHeartBeatList ?? [];

  const uptime = monitor.uptime ?? { day: 0, month: 0, year: 0 };
  const current_ping = monitor.heartBeatList?.[0]?.ping;
  const average_ping = monitor.avgPing;

  const beatsHasPings = monitor.heartBeatList?.some((hb) => hb.ping > 0);

  return (
    <View
      className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
      style={{
        height: Dimensions.get('window').height
      }}
    >
      <View className="px-4 pt-2">
        <View className="pb-4">
          <MonitorCard monitor={monitor} />
        </View>
        <FlatList
          data={importantHeartBeatList}
          renderItem={({ item }) => <HeartbeatCard item={item} />}
          keyExtractor={(item) => item.time.toString()}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          ListHeaderComponent={() => (
            <View className="mb-4 flex gap-2">
              <DetailStatCard
                current_ping={current_ping}
                average_ping={average_ping}
                uptime={uptime}
              />
              {beatsHasPings && (
                <MonitorChart
                  heartBeatList={monitor.heartBeatList || []}
                  isDarkMode={isDarkMode}
                />
              )}
              <Text className="mt-4 text-lg font-bold">Important Events</Text>
            </View>
          )}
          windowSize={5}
          initialNumToRender={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          getItemLayout={(data, index) => ({
            length: 100,
            offset: 100 * index,
            index
          })}
        />
      </View>
    </View>
  );
}
