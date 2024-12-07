/* eslint-disable unused-imports/no-unused-vars */
import { Redirect } from 'expo-router';
import * as React from 'react';
import { FlatList, RefreshControl, ToastAndroid } from 'react-native';

import { type Monitor } from '@/api/types';
import { EmptyState } from '@/components/monitors/EmptyState';
import { LoadingState } from '@/components/monitors/LoadingState';
import { MonitorCard } from '@/components/monitors/MonitorCard';
import {
  type FilterStatus,
  MonitorListHeader,
  type SortField,
  type SortOrder,
} from '@/components/monitors/MonitorListHeader';
import { View } from '@/components/ui';
import { useMonitors } from '@/hooks/use-monitors';
import { useAuth } from '@/lib';
import { useMonitorsStore, useMonitorStats } from '@/store/monitorContext';

const filterAndSortMonitors = (
  monitors: Monitor[] | null,
  sortField: SortField,
  sortOrder: SortOrder,
  filterStatus: FilterStatus,
) => {
  if (!monitors) return [];

  let filtered = [...monitors];

  if (filterStatus !== 'none') {
    filtered = filtered.filter((m) => {
      const latestHeartbeat = m.importantHeartBeatList?.[0];
      const isUp = latestHeartbeat?.status === 1;
      return filterStatus === 'up' ? isUp : !isUp;
    });
  }

  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'status': {
        const statusA = a.importantHeartBeatList?.[0]?.status === 1;
        const statusB = b.importantHeartBeatList?.[0]?.status === 1;
        comparison = Number(statusA) - Number(statusB);
        break;
      }
      case 'uptime':
        comparison = (a.uptime?.day ?? 0) - (b.uptime?.day ?? 0);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  return filtered;
};

export default function Index() {
  const [refreshing, setRefreshing] = React.useState(false);
  const { error, isLoading, refreshMonitors } = useMonitors();
  const monitors = useMonitorsStore();
  const stats = useMonitorStats();
  const hasMonitors = monitors && monitors.length > 0;

  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('none');

  const auth = useAuth();

  React.useEffect(() => {
    if (error?.includes('Authentication failed')) {
      ToastAndroid.show(
        'Authentication failed. Please check your credentials.',
        3000,
      );
      auth.signOut();
    }
  }, [error, auth]);

  const filteredMonitors = filterAndSortMonitors(
    monitors,
    sortField,
    sortOrder,
    filterStatus,
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMonitors();
    } catch (err) {
      console.error('Error refreshing monitors:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshMonitors]);

  const authStatus = auth.status;

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <View className="bg-background flex-1">
      <FlatList
        data={hasMonitors ? filteredMonitors : []}
        renderItem={({ item: monitor }) => <MonitorCard monitor={monitor} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        keyExtractor={(monitor) => {
          const latestHeartbeat = monitor.heartBeatList?.[0];
          return `${monitor.id}-${latestHeartbeat?.status}-${latestHeartbeat?.time}`;
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={true}
        ListEmptyComponent={!hasMonitors && !isLoading ? <EmptyState /> : null}
        ListHeaderComponent={
          <MonitorListHeader
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            sortField={sortField}
            setSortField={setSortField}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            totalMonitors={stats.numMonitors}
            filteredCount={filteredMonitors.length}
            error={error ?? undefined}
          />
        }
      />
    </View>
  );
}
