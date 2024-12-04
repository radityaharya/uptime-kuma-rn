import React, { createContext, useCallback, useContext, useState } from 'react';

import { HeartBeat, type Monitor } from '@/api/types';

interface MonitorContextType {
  monitors: Monitor[];
  setMonitors: (monitors: Monitor[]) => void;
}

interface MonitorUpdate {
  heartBeatList?: HeartBeat[];
  avgPing?: number;
  uptime: {
    day: number;
    month: number;
  };
}

const MonitorContext = createContext<MonitorContextType | null>(null);

// External store manager
class MonitorStore {
  private static instance: MonitorStore;
  private settersMap: Set<(monitors: Monitor[]) => void> = new Set();
  private currentMonitors: Monitor[] = [];
  private subscribers: Set<(monitors: Monitor[]) => void> = new Set();

  private constructor() {}

  static getInstance() {
    if (!MonitorStore.instance) {
      MonitorStore.instance = new MonitorStore();
    }
    return MonitorStore.instance;
  }

  registerSetter(setter: (monitors: Monitor[]) => void) {
    this.settersMap.add(setter);
    return () => {
      this.settersMap.delete(setter);
    };
  }

  subscribe(callback: (monitors: Monitor[]) => void) {
    this.subscribers.add(callback);
    callback(this.currentMonitors);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getMonitors() {
    return this.currentMonitors;
  }

  setMonitors(monitors: Monitor[]) {
    this.currentMonitors = monitors;
    this.settersMap.forEach(setter => setter(monitors));
    this.subscribers.forEach(sub => sub(monitors));
  }

  updateMonitor(id: number, update: Partial<MonitorUpdate>): void {
    const monitors = this.getMonitors();
    const index = monitors.findIndex(m => Number(m.id) === Number(id));
    if (index === -1) {
      console.warn(`Monitor ${id} not found. Current monitors:`, monitors.map(m => m.id));
      return;
    }

    const currentUptime = monitors[index].uptime || { day: 0, month: 0 };
    const updatedUptime = update.uptime 
      ? { 
          day: update.uptime.day ?? currentUptime.day ?? 0,
          month: update.uptime.month ?? currentUptime.month ?? 0
        }
      : currentUptime;

    monitors[index] = {
      ...monitors[index],
      ...update,
      uptime: updatedUptime
    };

    monitorStore.setMonitors(monitors);
  }

  setMonitorList(data: Record<string, Monitor>): void {
    console.debug('Setting monitor list', Object.keys(data).length, 'monitors');

    Object.values(data).forEach(monitor => {
      const index = this.currentMonitors.findIndex(m => Number(m.id) === Number(monitor.id));
      if (index === -1) {
        this.currentMonitors.push({
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: [],
          avgPing: 0,
          uptime: {
            day: monitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? 0
          }
        });
      } else {
        this.currentMonitors[index] = {
          ...this.currentMonitors[index],
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: this.currentMonitors[index].heartBeatList,
          avgPing: this.currentMonitors[index].avgPing,
          uptime: {
            day: monitor.uptime?.day ?? this.currentMonitors[index].uptime?.day ?? 0,
            month: monitor.uptime?.month ?? this.currentMonitors[index].uptime?.month ?? 0
          }
        };
      }
    });
  }

  getMonitorStats() {
    const monitors = this.currentMonitors;
    const numMonitors = monitors.length;
    const numHeartbeats = monitors.reduce((acc, monitor) => acc + (monitor.heartBeatList?.length || 0), 0);
    const avgHeartbeatsPerMonitor = numMonitors ? (numHeartbeats / numMonitors).toFixed(1) : 0;
    
    const statusCounts = monitors.reduce((acc, monitor) => {
      acc[monitor.active ? 'active' : 'inactive'] = (acc[monitor.active ? 'active' : 'inactive'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
    const avgDayUptime = monitors.reduce((acc, m) => acc + (m.uptime?.day || 0), 0) / numMonitors || 0;
    const avgMonthUptime = monitors.reduce((acc, m) => acc + (m.uptime?.month || 0), 0) / numMonitors || 0;
  
    const avgPingTotal = monitors.reduce((acc, m) => acc + (m.avgPing || 0), 0);
    const avgPingOverall = numMonitors ? avgPingTotal / numMonitors : 0;
  

    function isMonitorUp(heartbeats: HeartBeat[]): boolean {
      if (!heartbeats || heartbeats.length === 0) {
        return false;
      }
      
      const sortedHeartbeats = [...heartbeats].sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      
      return sortedHeartbeats[0].status === 1;
    }

    const downMonitors = monitors.filter(m => !isMonitorUp(m.heartBeatList || []));

    const upMonitors = monitors.filter(m => isMonitorUp(m.heartBeatList || []));
    

    return {
      numMonitors,
      numHeartbeats,
      avgHeartbeatsPerMonitor,
      statusCounts,
      uptimeStats: {
        avgDay: avgDayUptime.toFixed(2) + '%',
        avgMonth: avgMonthUptime.toFixed(2) + '%'
      },
      pingStats: {
        avgOverall: Math.round(avgPingOverall) + 'ms'
      },
      downMonitors,
      upMonitors
    };
  }
}

export function useMonitorsStore() {
  const [monitors, setMonitors] = React.useState<Monitor[]>([]);

  React.useEffect(() => {
    const unsubscribe = monitorStore.subscribe(setMonitors);
    return () => unsubscribe();
  }, []);

  return monitors;
}

export const monitorStore = MonitorStore.getInstance();

export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [monitors, setMonitorsState] = useState<Monitor[]>([]);
  
  const setMonitors = useCallback((newMonitors: Monitor[]) => {
    setMonitorsState(newMonitors);
    monitorStore.setMonitors(newMonitors);
  }, []);

  React.useEffect(() => {
    const cleanup = monitorStore.registerSetter(setMonitorsState);
    return cleanup;
  }, []);

  return (
    <MonitorContext.Provider value={{ monitors, setMonitors }}>
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitorContext() {
  const context = useContext(MonitorContext);
  if (!context) {
    throw new Error('useMonitorContext must be used within a MonitorProvider');
  }
  return context;
}

export function useMonitorStats() {
  const [stats, setStats] = React.useState(() => monitorStore.getMonitorStats());

  React.useEffect(() => {
    return monitorStore.subscribe(() => {
      setStats(monitorStore.getMonitorStats());
    });
  }, []);

  return stats;
}