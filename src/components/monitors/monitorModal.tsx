import * as React from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  useColorScheme,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { type Monitor } from '@/api/types';
import { StatusBar, Text, View } from '@/components/ui';

interface MonitorModalProps {
  monitor: Monitor;
  visible: boolean;
  onClose: () => void;
}

interface HeartBeat {
  time: string;
  ping: number;
  status: number;
  msg: string;
}

// Chart Components
const ChartDataPoint: React.FC = () => (
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
);

const ChartLabel: React.FC<{ value: string; isDarkMode: boolean }> = ({
  value,
  isDarkMode,
}) => (
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
);

const HeartbeatCard: React.FC<{ item: any }> = ({ item }) => {
  return (
    <View className={`mb-2 rounded-lg border border-secondary p-4`}>
      <Text className="text-sm text-gray-500">
        {new Date(item.time).toLocaleTimeString()}
      </Text>
      <Text className={`text-lg font-bold text-foreground`}>
        {item.status === 1 ? 'Up' : 'Down'}
      </Text>
      <Text className="text-sm">Ping: {item.ping} ms</Text>
      <Text className="text-sm">Message: {item.msg}</Text>
    </View>
  );
};

export const MonitorModal: React.FC<MonitorModalProps> = ({
  monitor,
  visible,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const latestHeartbeats = React.useMemo(
    () => monitor.heartBeatList?.slice(-100) ?? [],
    [monitor.heartBeatList],
  );
  const importantHeartBeatList = monitor.importantHeartBeatList ?? [];

  const transformChartData = React.useMemo(
    () =>
      latestHeartbeats.map((hb: HeartBeat, index: number) => ({
        value: hb.ping,
        hideDataPoint: index % 4 !== 0,
        customDataPoint: index % 4 === 0 ? ChartDataPoint : undefined,
        labelComponent:
          index % 12 === 0
            ? () => (
                <ChartLabel
                  value={new Date(hb.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  isDarkMode={isDarkMode}
                />
              )
            : undefined,
      })),
    [latestHeartbeats, isDarkMode],
  );

  const chartConfig = React.useMemo(
    () => ({
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
      maxValue: Math.max(...latestHeartbeats.map((hb: HeartBeat) => hb.ping)),
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
    }),
    [isDarkMode, latestHeartbeats],
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StatusBar opacity={1} />
      <View
        className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        style={{
          height: Dimensions.get('window').height,
        }}
      >
        <View className="flex-1 px-4 pt-12">
          <View className="mb-4 flex flex-row items-center justify-between">
            <Text className="text-lg font-bold">{monitor.name}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-foreground">Close</Text>
            </Pressable>
          </View>
          <LineChart areaChart data={transformChartData} {...chartConfig} />
          <Text className="mb-2 text-lg font-bold">Important Events</Text>
          <FlatList
            data={importantHeartBeatList}
            renderItem={({ item }) => <HeartbeatCard item={item} />}
            keyExtractor={(item) => item.time}
          />
        </View>
      </View>
    </Modal>
  );
};
