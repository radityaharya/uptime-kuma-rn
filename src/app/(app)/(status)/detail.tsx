import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';

import { StatusPageClient } from '@/api/status/client';
import { type StatusPageMonitor } from '@/api/status/types';
import { StatusMonitorCard } from '@/components/status/StatusCard';
import { Text, View } from '@/components/ui';
import statusStore from '@/store/statusStore';
export default function StatusDetailPage() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = new StatusPageClient(url);

    const initialize = async () => {
      try {
        await client.initialize();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize status page:', error);
      }
    };

    initialize();
    return () => client.dispose();
  }, [url]);

  const status = statusStore.statusList.find((s) => s.url === url);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <View className="border-border p-4">
        <Text className="text-2xl font-bold">
          {status?.url.split('/').pop()}
        </Text>
        <View className="mb-2 flex-col items-start gap-2">
          <Text className="text-xs text-muted-foreground">{status?.url}</Text>
        </View>
      </View>
      <FlatList
        data={status?.monitors}
        keyExtractor={(item) => item.id?.toString() ?? ''}
        renderItem={({ item }: { item: StatusPageMonitor }) => (
          <StatusMonitorCard monitor={item} />
        )}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View className="p-4">
            <Text className="text-center text-muted-foreground">
              No monitors found
            </Text>
          </View>
        }
      />
    </View>
  );
}
