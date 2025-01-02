import debounce from 'lodash/debounce';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { sendNotificationImmediately } from '@/lib/notification';
import { getItem, removeItem, setItem } from '@/lib/storage';
import {
  type HeartBeat,
  type ImportantHeartBeat,
  type Monitor,
  type Tag
} from '@/schemas/monitor';

interface MonitorContextType {
  monitors: Monitor[];
  setMonitors: (monitors: Monitor[]) => void;
}

interface MonitorUpdate {
  heartBeatList?: HeartBeat[];
  importantHeartBeatList?: ImportantHeartBeat[];
  avgPing?: number;
  uptime?: {
    day?: number;
    month?: number;
    year?: number;
  };
}

const MonitorContext = createContext<MonitorContextType | null>(null);

const convertToHeartbeat = (
  importantHeartbeat: ImportantHeartBeat
): HeartBeat => ({
  id: 0,
  monitor_id: importantHeartbeat.monitorID,
  down_count: 0,
  duration: importantHeartbeat.duration,
  important: importantHeartbeat.important,
  status: importantHeartbeat.status,
  msg: importantHeartbeat.msg,
  ping: importantHeartbeat.ping,
  time: importantHeartbeat.time
});

class MonitorStore {
  private static instance: MonitorStore;
  private settersMap: Set<(monitors: Monitor[]) => void> = new Set();
  private currentMonitors: Monitor[] = getItem('monitors') || [];

  private currentTags: Tag[] = getItem('tags') || [];
  private subscribers: Set<(monitors: Monitor[]) => void> = new Set();
  private batchedUpdates: Map<number, Partial<MonitorUpdate>> = new Map();
  private batchUpdateTimeout: NodeJS.Timeout | null = null;
  private monitorStatsCache: {
    monitors: Monitor[];
    stats: MonitorStats;
  } | null = null;

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
      this.notifySubscribers();
    } catch (error) {
      console.error('Error setting monitors:', error);
    }
  }

  getTags() {
    return this.currentTags;
  }

  setTags(tags: Tag[]) {
    try {
      this.currentTags = tags;
      setItem('tags', tags);
    } catch (error) {
      console.error('Error setting tags:', error);
    }
  }

  private notifySubscribers = debounce(() => {
    this.settersMap.forEach((setter) => setter(this.currentMonitors));
    this.subscribers.forEach((sub) => sub(this.currentMonitors));
  }, 500);

  updateMonitor(id: number, update: Partial<MonitorUpdate>): void {
    const existingMonitor = this.currentMonitors.find(
      (m) => Number(m.id) === Number(id)
    );
    if (!existingMonitor) return;

    if (update.uptime) {
      const index = this.currentMonitors.findIndex(
        (m) => Number(m.id) === Number(id)
      );
      const currentUptime = existingMonitor.uptime || {
        day: 0,
        month: 0,
        year: 0
      };

      this.currentMonitors[index] = {
        ...existingMonitor,
        uptime: {
          day: update.uptime.day ?? currentUptime.day,
          month: update.uptime.month ?? currentUptime.month,
          year: update.uptime.year ?? currentUptime.year
        }
      };

      this.notifySubscribers();
      return;
    }

    const existingUpdate = this.batchedUpdates.get(id) || {};
    this.batchedUpdates.set(id, { ...existingUpdate, ...update });

    if (!this.batchUpdateTimeout) {
      this.batchUpdateTimeout = setTimeout(this.processBatchUpdates, 50);
    }
  }

  private processBatchUpdates = () => {
    if (this.batchedUpdates.size === 0) return;

    const monitors = [...this.currentMonitors];
    let hasChanges = false;

    this.batchedUpdates.forEach((update, id) => {
      const index = monitors.findIndex((m) => Number(m.id) === Number(id));
      if (index !== -1) {
        const existingMonitor = monitors[index];
        const currentUptime = existingMonitor.uptime || {
          day: 0,
          month: 0,
          year: 0
        };

        monitors[index] = {
          ...existingMonitor,
          ...update,
          uptime: update.uptime
            ? {
                day: update.uptime.day ?? currentUptime.day,
                month: update.uptime.month ?? currentUptime.month,
                year: update.uptime.year ?? currentUptime.year
              }
            : currentUptime
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.currentMonitors = monitors;
      this.notifySubscribers();
    }

    this.batchedUpdates.clear();
    this.batchUpdateTimeout = null;
  };

  addHeartbeat(heartbeat: ImportantHeartBeat): void {
    const monitors = this.getMonitors();

    const hb = convertToHeartbeat(heartbeat);
    hb.time = heartbeat.time;

    const index = monitors.findIndex(
      (m) => Number(m.id) === Number(hb.monitor_id)
    );
    if (index === -1) {
      console.warn(
        `Monitor ${hb.monitor_id} not found. Current monitors:`,
        monitors.map((m) => m.id)
      );
      return;
    }

    const id = (monitors[index].heartBeatList?.[0]?.id ?? 0) + 1;
    hb.id = id;

    const monitor = monitors[index];
    monitors[index] = {
      ...monitor,
      heartBeatList: [hb, ...(monitor.heartBeatList || [])]
    };

    if (
      monitor.heartBeatList &&
      monitor.heartBeatList[0] &&
      monitor.heartBeatList[0].status !== heartbeat.status
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
        status: heartbeat.status
      });
      hb.important = 1;
    }

    this.updateMonitor(hb.monitor_id, {
      heartBeatList: monitors[index].heartBeatList || undefined
    });
  }

  setMonitorList(data: Record<string, Monitor>): void {
    console.debug('Setting monitor list', Object.keys(data).length, 'monitors');

    Object.values(data).forEach((monitor) => {
      const index = this.currentMonitors.findIndex(
        (m) => Number(m.id) === Number(monitor.id)
      );

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
            day:
              monitor.uptime?.day ??
              this.currentMonitors[index].uptime?.day ??
              0,
            month:
              monitor.uptime?.month ??
              this.currentMonitors[index].uptime?.month ??
              0
          }
        };
      }
    });

    this.setMonitors(this.currentMonitors);
    this.notifySubscribers();
  }

  getMonitorStats(limit: number = 10, offset: number = 0): MonitorStats {
    if (this.monitorStatsCache?.monitors === this.currentMonitors) {
      return this.monitorStatsCache.stats;
    }

    const activeMonitors = this.currentMonitors.filter((m) => m.active);
    const numMonitors = activeMonitors.length;

    const numHeartbeats = activeMonitors.reduce(
      (acc, monitor) => acc + (monitor.heartBeatList?.length || 0),
      0
    );
    const avgHeartbeatsPerMonitor = numMonitors
      ? Number((numHeartbeats / numMonitors).toFixed(1))
      : 0;

    const statusCounts = activeMonitors.reduce(
      (acc, monitor) => {
        acc[monitor.active ? 'active' : 'inactive'] =
          (acc[monitor.active ? 'active' : 'inactive'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgDayUptime =
      activeMonitors.reduce((acc, m) => acc + (m.uptime?.day || 0), 0) /
        numMonitors || 0;
    const avgMonthUptime =
      activeMonitors.reduce((acc, m) => acc + (m.uptime?.month || 0), 0) /
        numMonitors || 0;

    const avgPingTotal = activeMonitors.reduce(
      (acc, m) => acc + (m.avgPing || 0),
      0
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
      (m) => !isMonitorUp(m.heartBeatList || [])
    );

    const upMonitors = activeMonitors.filter((m) =>
      isMonitorUp(m.heartBeatList || [])
    );

    const inactiveMonitors = this.currentMonitors.filter((m) => !m.active);

    const isAllHeartbeatPopulated = activeMonitors.every(
      (m) => m.heartBeatList && m.heartBeatList.length > 0
    );

    const latestImportantEvent = activeMonitors.reduce<{
      heartbeat: HeartBeat | null;
      monitorId: string | null;
      monitorName: string;
    }>(
      (acc, monitor) => {
        if (!monitor.heartBeatList?.length) return acc;

        const importantHeartbeats = monitor.heartBeatList.filter(
          (hb) => hb.important === 1
        );
        if (!importantHeartbeats.length) return acc;

        const monitorLatest = importantHeartbeats.reduce((latest, current) => {
          const currentTime = new Date(current.time).getTime();
          const latestTime = new Date(latest.time).getTime();
          return currentTime > latestTime ? current : latest;
        });

        if (
          !acc.heartbeat ||
          new Date(monitorLatest.time).getTime() >
            new Date(acc.heartbeat.time).getTime()
        ) {
          return {
            heartbeat: monitorLatest,
            monitorId: String(monitor.id),
            monitorName: monitor.name
          };
        }
        return acc;
      },
      { heartbeat: null, monitorId: null, monitorName: '' }
    );

    const importantEvents = this.getLatestImportantEvents(limit, offset);

    const stats = {
      totalMonitors: this.currentMonitors.length,
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
      upMonitors,
      inactiveMonitors,
      isAllHeartbeatPopulated,
      latestImportantEvent,
      importantEvents
    };

    this.monitorStatsCache = {
      monitors: this.currentMonitors,
      stats
    };

    return stats;
  }

  getLatestImportantEvents(limit: number = 10, offset: number = 0) {
    const importantEvents = this.currentMonitors.flatMap(
      (monitor) =>
        monitor.heartBeatList
          ?.filter((hb) => hb.important === 1)
          .map((hb) => ({
            monitorId: monitor.id as number,
            monitorName: monitor.name,
            heartbeat: hb
          })) || []
    );

    importantEvents.sort(
      (a, b) =>
        new Date(b.heartbeat.time).getTime() -
        new Date(a.heartbeat.time).getTime()
    );

    return importantEvents.slice(offset, offset + limit);
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

  cleanup() {
    this.notifySubscribers.cancel();
    this.settersMap.clear();
    this.subscribers.clear();
  }
}

export function useMonitorsStore() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const setMonitorsCallback = useCallback((newMonitors: Monitor[]) => {
    setMonitors(newMonitors);
  }, []);

  useEffect(() => {
    const unsubscribe = monitorStore.subscribe(setMonitorsCallback);
    return () => unsubscribe();
  }, [setMonitorsCallback]);

  return useMemo(() => monitors, [monitors]);
}

export function useMonitor(id: number) {
  const monitors = useMonitorsStore();
  return monitors.find((m) => m.id === id);
}

export const monitorStore = MonitorStore.getInstance();

export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [monitors, setMonitorsState] = useState<Monitor[]>([]);

  const setMonitors = useCallback((newMonitors: Monitor[]) => {
    setMonitorsState(newMonitors);
    monitorStore.setMonitors(newMonitors);
  }, []);

  useEffect(() => {
    const cleanup = monitorStore.registerSetter(setMonitorsState);
    return () => {
      cleanup();
      setMonitorsState([]);
    };
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

export interface MonitorStats {
  totalMonitors: number;
  numMonitors: number;
  numHeartbeats: number;
  avgHeartbeatsPerMonitor: number;
  statusCounts: Record<string, number>;
  uptimeStats: {
    avgDay: string;
    avgMonth: string;
  };
  pingStats: {
    avgOverall: string;
  };
  downMonitors: Monitor[];
  upMonitors: Monitor[];
  inactiveMonitors: Monitor[];
  isAllHeartbeatPopulated: boolean;
  latestImportantEvent: {
    heartbeat: HeartBeat | null;
    monitorId: string | null;
    monitorName: string;
  };
  importantEvents: {
    monitorId: number;
    monitorName: string;
    heartbeat: HeartBeat;
  }[];
}

export function useMonitorStats(): MonitorStats {
  const [stats, setStats] = useState(() => monitorStore.getMonitorStats());

  useEffect(() => {
    const updateStats = debounce(() => {
      setStats(monitorStore.getMonitorStats());
    }, 100);

    const unsubscribe = monitorStore.subscribe(updateStats);
    return () => {
      unsubscribe();
      updateStats.cancel();
    };
  }, []);

  return stats;
}

export function useLatestImportantEvents(
  limit: number = 10,
  offset: number = 0
) {
  const [events, setEvents] = useState(() =>
    monitorStore.getLatestImportantEvents(limit, offset)
  );

  useEffect(() => {
    const updateEvents = debounce(() => {
      setEvents(monitorStore.getLatestImportantEvents(limit, offset));
    }, 100);

    const unsubscribe = monitorStore.subscribe(updateEvents);
    return () => {
      unsubscribe();
      updateEvents.cancel();
    };
  }, [limit, offset]);

  return events;
}
