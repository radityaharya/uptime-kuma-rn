import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, Switch, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogs } from '@/hooks/use-logs';
import { type LogEntry } from '@/lib/log';
import { exportLogs } from '@/lib/log';

const levelColorMap = {
  debug: 'blue',
  info: 'green',
  warn: 'yellow',
  error: 'red',
};

const LogsScreen = () => {
  const { logs, refresh } = useLogs();
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isStreaming) {
      interval = setInterval(refresh, 2000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, refresh]);

  const filteredLogs = logs.filter((log) =>
    selectedLevel ? log.level.text === selectedLevel : true
  );

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View className="">
      <View
        className="flex-row items-center justify-between bg-secondary"
        style={{
          backgroundColor:
            levelColorMap[item.level.text as keyof typeof levelColorMap],
        }}
      >
        <Text
          className="text-lg text-foreground"
          style={{ fontFamily: 'monospace' }}
        >
          {item.level.text.toUpperCase()}
        </Text>
        <Text
          className="text-sm text-foreground"
          style={{ fontFamily: 'monospace' }}
        >
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <Text
        className="font-mono text-sm text-foreground"
        style={{ fontFamily: 'monospace' }}
      >
        {JSON.stringify(item.rawMsg, null, 2)}
      </Text>
    </View>
  );

  if (!logs.length) {
    return (
      <View className="bg-background flex-1 p-4">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1 p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center">
            <Switch value={isStreaming} onValueChange={setIsStreaming} />
            <Text className="text-lg text-foreground">Stream Logs</Text>
          </View>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable className="rounded-lg bg-secondary p-2">
                <Text className="text-foreground">
                  {selectedLevel ? `Level: ${selectedLevel}` : 'All Levels'}
                </Text>
              </Pressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onPress={() => setSelectedLevel(null)}>
                <Text>All Levels</Text>
              </DropdownMenuItem>
              {Object.keys(levelColorMap).map((level) => (
                <DropdownMenuItem
                  key={level}
                  onPress={() => setSelectedLevel(level)}
                >
                  <Text>{level}</Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
        <Pressable
          onPress={exportLogs}
          className="flex-row items-center rounded-lg bg-secondary p-2"
        >
          <Text className="text-lg text-foreground">Export Logs</Text>
        </Pressable>
      </View>
      <FlashList
        data={filteredLogs}
        keyExtractor={(item, index) => item.timestamp + index.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} />
        }
        estimatedItemSize={50}
      />
    </View>
  );
};

export default LogsScreen;
