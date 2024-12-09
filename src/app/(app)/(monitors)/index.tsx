/* eslint-disable unused-imports/no-unused-vars */
import { Redirect } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import {
  RefreshControl,
  SectionList,
  ToastAndroid,
  TouchableOpacity,
} from 'react-native';

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
import { Text, View } from '@/components/ui';
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

const groupMonitorsByParent = (monitors: Monitor[]) => {
  // First, identify all monitors that are parents
  const parentIds = new Set(
    monitors.filter((m) => m.parent).map((m) => m.parent),
  );

  const grouped = monitors.reduce(
    (acc, monitor) => {
      const parent = monitor.parent || 'No Parent';
      if (!acc[parent]) {
        acc[parent] = {
          parentMonitor: monitors.find((m) => m.id === parent),
          children: [],
        };
      }
      // Only add to children if it's not a parent monitor
      if (
        monitor.id !== parent &&
        (!parentIds.has(monitor.id) || parent !== 'No Parent')
      ) {
        acc[parent].children.push(monitor);
      }
      return acc;
    },
    {} as Record<
      string,
      { parentMonitor: Monitor | undefined; children: Monitor[] }
    >,
  );

  return Object.entries(grouped).map(
    ([parent, { parentMonitor, children }]) => ({
      title: parent,
      parentMonitor,
      data: children,
    }),
  );
};

export default function Index() {
  const [refreshing, setRefreshing] = React.useState(false);
  const { error, isLoading, refreshMonitors, reconnectClient } = useMonitors();
  const monitors = useMonitorsStore();
  const stats = useMonitorStats();
  const hasMonitors = monitors && monitors.length > 0;

  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('none');
  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >({});

  const auth = useAuth();

  React.useEffect(() => {
    if (error?.includes('Authentication failed')) {
      ToastAndroid.show(
        'Authentication failed. Please check your credentials.',
        3000,
      );
      auth.signOut();
    }
    if (error) {
      reconnectClient();
    }
  }, [error, auth, reconnectClient]);

  const filteredMonitors = filterAndSortMonitors(
    monitors,
    sortField,
    sortOrder,
    filterStatus,
  );

  const groupedMonitors = groupMonitorsByParent(filteredMonitors);

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

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const authStatus = auth.status;

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <View className="bg-background flex-1">
      <SectionList
        sections={groupedMonitors}
        renderItem={({ item: monitor, section }) =>
          section.title === 'No Parent' || expandedSections[section.title] ? (
            <View className={`mb-2 ${monitor.parent ? '' : ''}`}>
              <MonitorCard monitor={monitor} />
            </View>
          ) : (
            <View className="h-0" />
          )
        }
        renderSectionHeader={({ section: { title, parentMonitor, data } }) => (
          <View>
            {parentMonitor ? (
              <View className="mb-2">
                <MonitorCard
                  monitor={parentMonitor}
                  className="rounded-b-none border-b-0"
                />
                <TouchableOpacity
                  onPress={() => toggleSection(title)}
                  className="bg-background items-center justify-center rounded-lg rounded-t-none border border-t-0 border-secondary pb-2"
                >
                  <Text className="text-xs text-foreground opacity-80">
                    {data.length} monitors
                  </Text>
                  {expandedSections[title] ? (
                    <View className="">
                      <ChevronUp size={24} className="text-foreground" />
                    </View>
                  ) : (
                    <ChevronDown size={24} className="text-foreground" />
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        keyExtractor={(monitor) => {
          const latestHeartbeat = monitor.heartBeatList?.[0];
          return `${monitor.id}-${latestHeartbeat?.status}-${latestHeartbeat?.time}-${monitor.active}-${monitor.name}`;
        }}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
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
            totalMonitors={stats.totalMonitors}
            filteredCount={filteredMonitors.length}
            error={error ?? undefined}
          />
        }
      />
    </View>
  );
}
