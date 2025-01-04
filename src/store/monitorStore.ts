import debounce from 'lodash/debounce';

import { getItem, removeItem, setItem } from '@/lib/storage';
import { convertToHeartbeat } from '@/lib/utils';
import {
  type HeartBeat,
  type ImportantHeartBeat,
  type Monitor,
  type Tag
} from '@/schemas/monitor';

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
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    try {
      this.currentMonitors = getItem<Monitor[]>('monitors') || [];
    } catch (error) {
      console.error('Error initializing MonitorStore:', error);
      this.currentMonitors = [];
    }
    this.startFlushInterval();
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
      this.notifySubscribers();
      this.flushToStorage();
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
      this.flushToStorage();
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

    this.updateMonitor(hb.monitor_id, {
      heartBeatList: monitors[index].heartBeatList || undefined
    });
  }

  setMonitorList(data: Record<string, Monitor>): void {
    console.debug('Setting monitor list', Object.keys(data).length, 'monitors');

    Object.values(data).forEach((monitor) => {
      const existingMonitor = this.currentMonitors.find(
        (m) => Number(m.id) === Number(monitor.id)
      );

      if (!existingMonitor) {
        this.currentMonitors.push({
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: [],
          avgPing: 0,
          uptime: {
            day: monitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? 0,
            year: monitor.uptime?.year ?? 0
          }
        });
      } else {
        this.currentMonitors[this.currentMonitors.indexOf(existingMonitor)] = {
          ...existingMonitor,
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: existingMonitor.heartBeatList,
          avgPing: existingMonitor.avgPing,
          uptime: {
            day: monitor.uptime?.day ?? existingMonitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? existingMonitor.uptime?.month ?? 0,
            year: monitor.uptime?.year ?? existingMonitor.uptime?.year ?? 0
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

  getMonitor(id: number): Monitor | undefined {
    return this.currentMonitors.find((m) => Number(m.id) === Number(id));
  }

  reset() {
    try {
      this.currentMonitors = [];
      this.settersMap.clear();
      this.subscribers.clear();
      removeItem('monitors');
      removeItem('tags');
    } catch (error) {
      console.error('Error resetting MonitorStore:', error);
    }
  }

  cleanup() {
    this.notifySubscribers.cancel();
    this.settersMap.clear();
    this.subscribers.clear();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushToStorage();
    }, 60000);
  }

  private flushToStorage() {
    try {
      setItem('monitors', this.currentMonitors);
      setItem('tags', this.currentTags);
    } catch (error) {
      console.error('Error flushing to storage:', error);
    }
  }
}
export const monitorStore = MonitorStore.getInstance();
