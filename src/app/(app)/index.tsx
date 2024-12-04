/* eslint-disable unused-imports/no-unused-vars */
import { Redirect } from 'expo-router';
import * as React from 'react';
import { FlatList } from 'react-native';
import { RefreshControl } from 'react-native';

import { MonitorCard } from '@/components/monitorCard';
import { MonitorSummaryStats } from '@/components/monitorSummary';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useMonitors } from '@/hooks/use-monitors';
import { useAuth } from '@/lib';
import { useMonitorsStore, useMonitorStats } from '@/store/monitorContext';

const EmptyState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <FocusAwareStatusBar />
    <Text className="text-white">No monitors available</Text>
  </View>
));

const LoadingState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <FocusAwareStatusBar />
    <Text className="text-white">Loading...</Text>
  </View>
));

const ErrorMessage = React.memo(({ error }: { error: string }) => (
  <View className="p-4">
    <Text className="text-red-500">{error}</Text>
  </View>
));

export default function Index() {
  const [refreshing, setRefreshing] = React.useState(false);
  const { error, isLoading, reconnectClient, refreshMonitors } = useMonitors();

  const monitors = useMonitorsStore();
  const stats = useMonitorStats();

  const hasMonitors = monitors && monitors.length > 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMonitors();
    } catch (err) {
    } finally {
      setRefreshing(false);
    }
  }, []);

  const authStatus = useAuth.use.status();

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <View className="bg-background flex-1">
      <FocusAwareStatusBar />
      <FlatList
        data={hasMonitors ? monitors : []}
        renderItem={({ item: monitor }) => (
          <MonitorCard key={monitor.id} monitor={monitor} />
        )}
        keyExtractor={(monitor) => String(monitor.id)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View className="h-0.5" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!hasMonitors && !isLoading ? <EmptyState /> : null}
        ListHeaderComponent={
          <>
            <View className="pb-20 pt-40">
              <MonitorSummaryStats />
            </View>
            <View className="mb-2 text-sm opacity-50">
              <Text>{stats.numMonitors} Monitors</Text>
            </View>
            {error ? <ErrorMessage error={error} /> : null}
          </>
        }
      />
    </View>
  );
}
