import * as React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { ErrorMessage } from './ErrorMessage';
import { MonitorSummaryStats } from './MonitorSummary';

export type SortOrder = 'asc' | 'desc';
export type SortField = 'name' | 'status' | 'uptime';
export type FilterStatus = 'none' | 'up' | 'down';

const sortFieldLabels: Record<SortField, string> = {
  name: 'Name',
  status: 'Status',
  uptime: 'Uptime'
};

interface MonitorListHeaderProps {
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  totalMonitors: number;
  filteredCount: number;
  error: string | null;
}

export const MonitorListHeader = ({
  sortOrder,
  setSortOrder,
  sortField,
  setSortField,
  filterStatus,
  setFilterStatus,
  totalMonitors,
  filteredCount,
  error
}: MonitorListHeaderProps) => (
  <>
    <View className="pb-14 pt-40">
      <MonitorSummaryStats />
    </View>

    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-row gap-1">
        <Pressable
          onPress={() => setFilterStatus(filterStatus === 'up' ? 'none' : 'up')}
          className={`rounded-full border p-4 ${
            filterStatus === 'up'
              ? 'border-green-600 bg-green-500'
              : 'border-secondary bg-secondary'
          }`}
        >
          <Text className={filterStatus === 'up' ? 'text-white' : ''}>
            Up Only
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            setFilterStatus(filterStatus === 'down' ? 'none' : 'down')
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
            {(Object.keys(sortFieldLabels) as SortField[]).map((field) => (
              <DropdownMenuItem key={field}>
                <Pressable onPress={() => setSortField(field)}>
                  <Text>{sortFieldLabels[field]}</Text>
                </Pressable>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Pressable
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="rounded-full bg-secondary p-4"
        >
          <Text>{sortOrder === 'asc' ? '↑' : '↓'}</Text>
        </Pressable>
      </View>
    </View>

    <View className="mb-2 text-sm opacity-50">
      <Text>
        {filteredCount} of {totalMonitors} Monitors
      </Text>
    </View>
    {error ? <ErrorMessage error={error} /> : null}
  </>
);
