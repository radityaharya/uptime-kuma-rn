import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { type Monitor } from '@/api/types';
import { Text, View } from '@/components/ui';
import { cn } from '@/lib';

import { MonitorCard } from './MonitorCard';

export interface SectionHeaderProps {
  title: string;
  parentMonitor?: Monitor;
  data: Monitor[];
  isExpanded: boolean;
  onToggle: () => void;
}

const MemoizedMonitorCard = React.memo(MonitorCard);

export const SectionHeader = React.memo(
  ({ parentMonitor, data, isExpanded, onToggle }: SectionHeaderProps) => {
    if (!parentMonitor) return null;

    return (
      <View>
        <View className="mb-2">
          <MemoizedMonitorCard
            monitor={parentMonitor}
            className="rounded-b-none border-b-0"
          />
          <TouchableOpacity
            onPress={onToggle}
            className={cn(
              'bg-background items-center justify-center rounded-lg rounded-t-none border border-t-0 border-gray-800 bg-gradient-to-br from-gray-800/90 to-gray-900/90 pb-2',
              parentMonitor.active ? 'opacity-100' : 'opacity-50'
            )}
          >
            <Text className="text-xs text-foreground opacity-80">
              {data.length} monitors
            </Text>
            {isExpanded ? (
              <View className="">
                <ChevronUp size={24} className="text-foreground" />
              </View>
            ) : (
              <ChevronDown size={24} className="text-foreground" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);
