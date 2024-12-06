import { useCallback, useEffect, useRef, useState } from 'react';

import { globalClient,UptimeKumaClient } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { getToken } from '@/lib/auth/utils';
import { useMonitorsStore } from '@/store/monitorContext';
export const useMonitors = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const clientRef = useRef<UptimeKumaClient | null>(null);

  const monitors = useMonitorsStore();

  const auth = useAuth();

  const refreshMonitors = useCallback(async () => {
    console.log('refreshMonitors called');
    setError(null);
    if (!clientRef.current) return;
    try {
      await clientRef.current.getMonitors();
      await clientRef.current.getHeartbeats();
    } catch (err) {
      setError('Failed to fetch monitors.' + err);
    }
  }, []);

  const initializeClient = useCallback(async () => {
    if (auth.status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    if (clientRef.current || globalClient) {
      clientRef.current = globalClient;
      setIsLoading(false);
      return;
    }

    console.log('Initializing new client');
    const token = getToken();
    if (!token) {
      setError('Token not found.');
      return;
    }

    const client = new UptimeKumaClient(token.host, {
      autoReconnect: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    clientRef.current = client;

    try {
      await client.authenticate(token.username, token.password);
      client.socket && refreshMonitors();
      await clientRef.current.getMonitors();
      await clientRef.current.getHeartbeats();
    } catch {
      setError('Authentication failed. Please check your credentials.');
      clientRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshMonitors]);

  const reconnectClient = useCallback(async () => {
    setError(null);
    console.log('reconnectClient called');
    if (!clientRef.current) return;
    setIsReconnecting(true);

    try {
      await clientRef.current.reconnect();
    } catch (err) {
      setError('Reconnection failed. Please try again.' + err);
    } finally {
      setIsReconnecting(false);
    }
  }, []);

  useEffect(() => {
    initializeClient();
    return () => {
      if (process.env.NODE_ENV === 'production') {
        globalClient?.disconnect();
      }
    };
  }, [initializeClient]);

  return {
    monitors,
    error,
    isLoading,
    isReconnecting,
    refreshMonitors,
    reconnectClient,
  };
};
