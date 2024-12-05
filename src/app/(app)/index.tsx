/* eslint-disable unused-imports/no-unused-vars */
import { FlashList } from '@shopify/flash-list';
import { Redirect } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl } from 'react-native';

import { type Monitor } from '@/api/types';
import { MonitorCard } from '@/components/monitorCard';
import { MonitorSummaryStats } from '@/components/monitorSummary';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const MemoizedMonitorCard = React.memo(MonitorCard);

type SortOrder = 'asc' | 'desc';
type SortField = 'name' | 'status' | 'uptime';
type FilterStatus = 'none' | 'up' | 'down';

const sortFieldLabels: Record<SortField, string> = {
  name: 'Name',
  status: 'Status',
  uptime: 'Uptime',
};

export default function Index() {
  const [refreshing, setRefreshing] = React.useState(false);
  const { error, isLoading, reconnectClient, refreshMonitors } = useMonitors();

  const monitors = useMonitorsStore();
  const stats = useMonitorStats();

  const hasMonitors = monitors && monitors.length > 0;

  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('none');
  const [menuVisible, setMenuVisible] = React.useState(false);

  const getMonitorStatus = React.useCallback((monitor: Monitor) => {
    if (!monitor.importantHeartBeatList?.length) return false;

    const latestHeartbeat = [...monitor.importantHeartBeatList].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    )[0];

    return latestHeartbeat.status === 1;
  }, []);

  const sortedAndFilteredMonitors = React.useMemo(() => {
    if (!monitors) return [];

    let filtered = [...monitors];

    if (filterStatus !== 'none') {
      filtered = filtered.filter((m) =>
        filterStatus === 'up' ? getMonitorStatus(m) : !getMonitorStatus(m),
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison =
            Number(getMonitorStatus(a)) - Number(getMonitorStatus(b));
          break;
        case 'uptime':
          const uptimeA = a.uptime?.day ?? 0;
          const uptimeB = b.uptime?.day ?? 0;
          comparison = uptimeA - uptimeB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [monitors, sortField, sortOrder, filterStatus, getMonitorStatus]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMonitors();
    } catch (err) {
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <FlashList
        data={hasMonitors ? sortedAndFilteredMonitors : []}
        renderItem={({ item: monitor }) => (
          <MemoizedMonitorCard key={monitor.id} monitor={monitor} />
        )}
        estimatedItemSize={100}
        drawDistance={100}
        estimatedFirstItemOffset={40}
        ItemSeparatorComponent={() => <View className="h-0.5" />}
        keyExtractor={(monitor) => String(monitor.id)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!hasMonitors && !isLoading ? <EmptyState /> : null}
        ListHeaderComponent={
          <>
            <View className="pb-20 pt-40">
              <MonitorSummaryStats />
            </View>

            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() =>
                    setFilterStatus((current) =>
                      current === 'up' ? 'none' : 'up',
                    )
                  }
                  className={`rounded-full border p-4 ${
                    filterStatus === 'up'
                      ? 'border-green-600 bg-green-500'
                      : 'border-secondary bg-secondary'
                  }`}
                >
                  <Text
                    className={`${filterStatus === 'up' ? 'text-white' : ''}`}
                  >
                    Up Only
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setFilterStatus((current) =>
                      current === 'down' ? 'none' : 'down',
                    )
                  }
                  className={`rounded-full border p-4 ${
                    filterStatus === 'down'
                      ? 'border-red-600 bg-red-500'
                      : 'border-secondary bg-secondary'
                  }`}
                >
                  <Text className={filterStatus === 'down' ? 'text-white' : ''}>
                    Down Only
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="rounded-full">
                      <Text>Sort by: {sortFieldLabels[sortField]}</Text>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(Object.keys(sortFieldLabels) as SortField[]).map(
                      (field) => (
                        <DropdownMenuItem key={field}>
                          <Pressable onPress={() => setSortField(field)}>
                            <Text>{sortFieldLabels[field]}</Text>
                          </Pressable>
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Pressable
                  onPress={() =>
                    setSortOrder((current) =>
                      current === 'asc' ? 'desc' : 'asc',
                    )
                  }
                  className="rounded-full bg-secondary p-4"
                >
                  <Text>{sortOrder === 'asc' ? '↑' : '↓'}</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-2 text-sm opacity-50">
              <Text>
                {sortedAndFilteredMonitors.length} of {stats.numMonitors}{' '}
                Monitors
              </Text>
            </View>
            {error ? <ErrorMessage error={error} /> : null}
          </>
        }
      />
    </View>
  );
}
