import * as React from 'react';

import { View } from '@/components/ui';
import { type Monitor } from '@/schemas/monitor';

import { MonitorCard } from './MonitorCard';

export interface MonitorItemProps {
  monitor: Monitor;
  isExpanded: boolean;
}

const MemoizedMonitorCard = React.memo(MonitorCard);

export const MonitorItem = React.memo(
  ({ monitor, isExpanded }: MonitorItemProps) => {
    if (!isExpanded && monitor.parent) {
      return <View className="h-0" />;
    }

    return (
      <View className="mb-2">
        <MemoizedMonitorCard monitor={monitor} />
      </View>
    );
  }
);
