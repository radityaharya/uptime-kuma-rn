/* eslint-disable unused-imports/no-unused-vars */
import { Redirect } from 'expo-router';
import * as React from 'react';
import {
  RefreshControl,
  SectionList,
  type SectionListData,
  ToastAndroid
} from 'react-native';

import { type Monitor } from '@/api/types';
import { EmptyState } from '@/components/monitors/EmptyState';
import { LoadingState } from '@/components/monitors/LoadingState';
import { MonitorItem } from '@/components/monitors/MonitorItem';
import {
  type FilterStatus,
  MonitorListHeader,
  type SortField,
  type SortOrder
} from '@/components/monitors/MonitorListHeader';
import { SectionHeader } from '@/components/monitors/SectionHeader';
import { View } from '@/components/ui';
import { useMonitors } from '@/hooks/use-monitors';
import { useAuth } from '@/lib';
import { useMonitorsStore, useMonitorStats } from '@/store/monitorContext';

export interface MonitorSection extends SectionListData<Monitor> {
  title: string;
  parentMonitor?: Monitor;
  data: Monitor[];
}

const filterAndSortMonitors = (
  monitors: Monitor[] | null,
  sortField: SortField,
  sortOrder: SortOrder,
  filterStatus: FilterStatus
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
  const monitorMap = new Map<number, Monitor>();
  monitors.forEach((monitor) => monitorMap.set(monitor.id, monitor));

  const grouped = monitors.reduce((acc, monitor) => {
    if (monitor.childrenIDs && monitor.childrenIDs.length > 0) {
      acc.push({
        title: monitor.name,
        parentMonitor: monitor,
        data: monitor.childrenIDs
          .map((id) => monitorMap.get(id))
          .filter(Boolean) as Monitor[]
      });
    } else if (!monitor.parent) {
      acc.push({
        title: 'No Parent',
        parentMonitor: undefined,
        data: [monitor]
      });
    }
    return acc;
  }, [] as MonitorSection[]);

  return grouped;
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
        3000
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
    filterStatus
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

  const toggleSection = React.useCallback((title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const authStatus = auth.status;

  const renderItem = React.useCallback(
    ({
      item: monitor,
      section
    }: {
      item: Monitor;
      section: MonitorSection;
    }) => (
      <MonitorItem
        monitor={monitor}
        isExpanded={
          section.title === 'No Parent' || expandedSections[section.title]
        }
      />
    ),
    [expandedSections]
  );

  const renderSectionHeader = React.useCallback(
    ({
      section: { title, parentMonitor, data }
    }: {
      section: MonitorSection;
    }) => (
      <SectionHeader
        title={title}
        parentMonitor={parentMonitor}
        data={data}
        isExpanded={expandedSections[title]}
        onToggle={() => toggleSection(title)}
      />
    ),
    [expandedSections, toggleSection]
  );

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return (
      <LoadingState
        message={error ? 'Error loading monitors' : 'Loading monitors...'}
      />
    );
  }

  return (
    <View className="bg-background flex-1">
      <SectionList<Monitor, MonitorSection>
        sections={groupedMonitors}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
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
