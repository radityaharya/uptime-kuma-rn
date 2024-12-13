import * as React from 'react';

import { type Monitor } from '@/api';
import { View } from '@/components/ui';

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
      <View className={`mb-2 ${monitor.parent ? '' : ''}`}>
        <MemoizedMonitorCard monitor={monitor} />
      </View>
    );
  }
);
