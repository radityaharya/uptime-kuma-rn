/* eslint-disable unused-imports/no-unused-vars */
import { Redirect } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { MonitorCard } from '@/components/monitorCard';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useMonitors } from '@/hooks/use-monitors';
import { useAuth } from '@/lib';

const EmptyState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <Text className="text-white">No monitors available</Text>
  </View>
));

const LoadingState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <Text className="text-white">Loading...</Text>
  </View>
));

const ErrorMessage = React.memo(({ error }: { error: string }) => (
  <View className="p-4">
    <Text className="text-red-500">{error}</Text>
  </View>
));

const MonitorList = ({ monitors }: { monitors: Record<string, any> }) => (
  <View className="w-full p-4">
    {Object.entries(monitors).map(([id, monitor]) => (
      <MonitorCard key={id} monitor={monitor} />
    ))}
  </View>
);

export default function Index() {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const {
    monitors,
    error,
    isLoading,
    reconnectClient,
    refreshMonitors
  } = useMonitors();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // await reconnectClient();
      await refreshMonitors();
    } catch (err) {
      // Handle error if needed
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

  const hasMonitors = Object.keys(monitors ?? {}).length > 0;

  return (
    <View className="bg-background flex-1 pt-24">
      <FocusAwareStatusBar />
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && <ErrorMessage error={error} />}
        {!hasMonitors ? (
          <EmptyState />
        ) : (
          <MonitorList monitors={monitors ?? {}} />
        )}
      </ScrollView>
    </View>
  );
}
