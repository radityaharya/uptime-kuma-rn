import React, { createContext, useCallback, useContext, useState } from 'react';

import {
  type HeartBeat,
  type ImportantHeartBeat,
  type Monitor,
} from '@/api/types';
import { sendNotificationImmediately } from '@/lib/notification';
import { getItem, removeItem, setItem } from '@/lib/storage';

// import { infoStore } from './infoStore';

interface MonitorContextType {
  monitors: Monitor[];
  setMonitors: (monitors: Monitor[]) => void;
}

interface MonitorUpdate {
  heartBeatList?: HeartBeat[];
  importantHeartBeatList?: ImportantHeartBeat[];
  avgPing?: number;
  uptime: {
    day: number;
    month: number;
  };
}

const MonitorContext = createContext<MonitorContextType | null>(null);

const convertToHeartbeat = (
  importantHeartbeat: ImportantHeartBeat,
): HeartBeat => ({
  id: 0,
  monitor_id: importantHeartbeat.monitorID,
  down_count: 0,
  duration: importantHeartbeat.duration,
  important: importantHeartbeat.important,
  status: importantHeartbeat.status,
  msg: importantHeartbeat.msg,
  ping: importantHeartbeat.ping,
  time: new Date(),
});

class MonitorStore {
  private static instance: MonitorStore;
  private settersMap: Set<(monitors: Monitor[]) => void> = new Set();
  private currentMonitors: Monitor[] = getItem('monitors') || [];
  private subscribers: Set<(monitors: Monitor[]) => void> = new Set();

  constructor() {
    try {
      this.currentMonitors = getItem<Monitor[]>('monitors') || [];
    } catch (error) {
      console.error('Error initializing MonitorStore:', error);
      this.currentMonitors = [];
    }
  }

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
    try {
      this.currentMonitors = monitors;
      setItem('monitors', monitors);
      this.settersMap.forEach((setter) => setter(monitors));
      this.subscribers.forEach((sub) => sub(monitors));
    } catch (error) {
      console.error('Error setting monitors:', error);
    }
  }

  updateMonitor(id: number, update: Partial<MonitorUpdate>): void {
    const monitors = this.getMonitors();
    const index = monitors.findIndex((m) => Number(m.id) === Number(id));
    if (index === -1) {
      console.warn(
        `Monitor ${id} not found. Current monitors:`,
        monitors.map((m) => m.id),
      );
      return;
    }

    const currentUptime = monitors[index].uptime || { day: 0, month: 0 };
    const updatedUptime = update.uptime
      ? {
          day: update.uptime.day ?? currentUptime.day ?? 0,
          month: update.uptime.month ?? currentUptime.month ?? 0,
        }
      : currentUptime;

    monitors[index] = {
      ...monitors[index],
      ...update,
      uptime: updatedUptime,
    };

    // const { serverTimezone } = infoStore.getState().info;

    const processHeartbeats = <T extends { time: string | Date }>(
      heartbeats: T[],
    ): T[] => {
      return heartbeats
        .map((hb) => ({
          ...hb,
          time: new Date(String(hb.time)),
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());
    };

    if (update.heartBeatList) {
      monitors[index].heartBeatList = processHeartbeats(update.heartBeatList);
      monitors[index].isUp = monitors[index].heartBeatList[-1].status === 1;
    }

    if (update.importantHeartBeatList) {
      monitors[index].importantHeartBeatList = processHeartbeats(
        update.importantHeartBeatList,
      );
    }

    this.setMonitors(monitors);
  }

  addHeartbeat(heartbeat: ImportantHeartBeat): void {
    const monitors = this.getMonitors();

    const hb = convertToHeartbeat(heartbeat);
    const index = monitors.findIndex(
      (m) => Number(m.id) === Number(hb.monitor_id),
    );
    if (index === -1) {
      console.warn(
        `Monitor ${hb.monitor_id} not found. Current monitors:`,
        monitors.map((m) => m.id),
      );
      return;
    }

    const id = (monitors[index].heartBeatList?.[0]?.id ?? 0) + 1;
    hb.id = id;
    console.log('addHeartbeat', hb.monitor_id, heartbeat);

    const monitor = monitors[index];
    monitors[index] = {
      ...monitor,
      heartBeatList: [hb, ...(monitor.heartBeatList || [])],
    };

    if (
      monitor.heartBeatList &&
      monitor.heartBeatList[0] &&
      monitor.heartBeatList[0].status !== monitor.heartBeatList[0].status
    ) {
      const title = `${monitor.name} is ${
        heartbeat.status === 1 ? 'up' : 'down'
      }!`;
      const body = `Your monitor ${monitor.name} is ${
        heartbeat.status === 1 ? 'up' : 'down'
      }!`;
      sendNotificationImmediately(title, body, {
        monitorID: monitor.id,
        monitorName: monitor.name,
        status: heartbeat.status,
      });
    }

    this.updateMonitor(hb.monitor_id, {
      heartBeatList: monitors[index].heartBeatList,
    });
  }

  setMonitorList(data: Record<string, Monitor>): void {
    console.debug('Setting monitor list', Object.keys(data).length, 'monitors');

    Object.values(data).forEach((monitor) => {
      const index = this.currentMonitors.findIndex(
        (m) => Number(m.id) === Number(monitor.id),
      );

      if (index === -1) {
        this.currentMonitors.push({
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: [],
          avgPing: 0,
          uptime: {
            day: monitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? 0,
          },
        });
      } else {
        this.currentMonitors[index] = {
          ...this.currentMonitors[index],
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: this.currentMonitors[index].heartBeatList,
          avgPing: this.currentMonitors[index].avgPing,
          uptime: {
            day:
              monitor.uptime?.day ??
              this.currentMonitors[index].uptime?.day ??
              0,
            month:
              monitor.uptime?.month ??
              this.currentMonitors[index].uptime?.month ??
              0,
          },
        };
      }
    });

    this.setMonitors(this.currentMonitors);
  }

  getMonitorStats() {
    const activeMonitors = this.currentMonitors.filter((m) => m.active);
    const numMonitors = activeMonitors.length;
    const numHeartbeats = activeMonitors.reduce(
      (acc, monitor) => acc + (monitor.heartBeatList?.length || 0),
      0,
    );
    const avgHeartbeatsPerMonitor = numMonitors
      ? (numHeartbeats / numMonitors).toFixed(1)
      : 0;

    const statusCounts = activeMonitors.reduce(
      (acc, monitor) => {
        acc[monitor.active ? 'active' : 'inactive'] =
          (acc[monitor.active ? 'active' : 'inactive'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgDayUptime =
      activeMonitors.reduce((acc, m) => acc + (m.uptime?.day || 0), 0) /
        numMonitors || 0;
    const avgMonthUptime =
      activeMonitors.reduce((acc, m) => acc + (m.uptime?.month || 0), 0) /
        numMonitors || 0;

    const avgPingTotal = activeMonitors.reduce(
      (acc, m) => acc + (m.avgPing || 0),
      0,
    );
    const avgPingOverall = numMonitors ? avgPingTotal / numMonitors : 0;

    function isMonitorUp(heartbeats: HeartBeat[]): boolean {
      if (!heartbeats || heartbeats.length === 0) {
        return false;
      }

      const sortedHeartbeats = [...heartbeats].sort((a, b) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      });

      return sortedHeartbeats[0].status === 1;
    }

    const downMonitors = activeMonitors.filter(
      (m) => !isMonitorUp(m.heartBeatList || []),
    );

    const upMonitors = activeMonitors.filter((m) =>
      isMonitorUp(m.heartBeatList || []),
    );

    const inactiveMonitors = this.currentMonitors.filter((m) => !m.active);

    return {
      numMonitors,
      numHeartbeats,
      avgHeartbeatsPerMonitor,
      statusCounts,
      uptimeStats: {
        avgDay: avgDayUptime.toFixed(2) + '%',
        avgMonth: avgMonthUptime.toFixed(2) + '%',
      },
      pingStats: {
        avgOverall: Math.round(avgPingOverall) + 'ms',
      },
      downMonitors,
      upMonitors,
      inactiveMonitors,
    };
  }

  reset() {
    try {
      this.currentMonitors = [];
      this.settersMap.clear();
      this.subscribers.clear();
      removeItem('monitors');
    } catch (error) {
      console.error('Error resetting MonitorStore:', error);
    }
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
  const [stats, setStats] = React.useState(() =>
    monitorStore.getMonitorStats(),
  );

  React.useEffect(() => {
    return monitorStore.subscribe(() => {
      setStats(monitorStore.getMonitorStats());
    });
  }, []);

  return stats;
}
