import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { clientStore } from '@/store/clientStore';
import { useMonitorsStore } from '@/store/monitorContext';

export const useMonitors = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting] = useState(false);
  const monitors = useMonitorsStore();
  const auth = useAuth();

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
    if (auth.status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    refreshMonitors().finally(() => setIsLoading(false));
  }, [auth.status, refreshMonitors]);

  return {
    monitors,
    error,
    isLoading,
    isReconnecting,
    refreshMonitors
  };
};
