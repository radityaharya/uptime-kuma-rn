import debounce from 'lodash/debounce';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { type Monitor } from '@/schemas/monitor';
import { clientStore } from '@/store/clientStore';
import { type MonitorStats, monitorStore } from '@/store/monitorStore';

export const useMonitors = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting] = useState(false);
  const auth = useAuth();

  const [monitors, setMonitors] = useState<Monitor[]>([]);

  const setMonitorsCallback = useCallback((newMonitors: Monitor[]) => {
    setMonitors(newMonitors);
  }, []);

  useEffect(() => {
    const unsubscribe = monitorStore.subscribe(setMonitorsCallback);
    return () => unsubscribe();
  }, [setMonitorsCallback]);

  const refreshMonitors = useCallback(async () => {
    const client = clientStore.getClient();
    if (!client) {
      setError('No client available');
      return;
    }

    try {
      await client.getMonitors();
      await client.getHeartbeats();
      setError(null);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes('Authentication failed')
      ) {
        auth.signOut();
      }
      setError('Failed to fetch monitors: ' + err);
    }
  }, [auth]);

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    if (monitors.length > 0) {
      setIsLoading(false);
      return;
    }
  }, [auth.status, monitors]);

  const reconnectClient = useCallback(() => {
    clientStore.getClient()?.reconnect();
  }, []);

  return {
    monitors,
    error,
    isLoading,
    isReconnecting,
    refreshMonitors,
    reconnectClient
  };
};

export function useMonitor(id: number) {
  const monitors = useMonitors().monitors;
  return monitors.find((m) => m.id === id);
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
