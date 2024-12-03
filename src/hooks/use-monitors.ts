import { useCallback, useEffect, useRef, useState } from 'react';

import { UptimeKumaClient } from '@/api/client';
import { getToken } from '@/lib/auth/utils';
import { monitorStore } from '@/store/monitorStore';

export const useMonitors = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const clientRef = useRef<UptimeKumaClient | null>(null);

  const token = getToken();
  if (!token) {
    throw new Error('Token not found.');
  }

  const { monitors } = monitorStore();

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
    console.log('initializeClient called');
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
    } finally {
      setIsLoading(false);
    }
  }, [token.host, token.password, token.username]);

  const reconnectClient = useCallback(async () => {
    console.log('reconnectClient called');
    if (!clientRef.current) return;
    setIsReconnecting(true);
    setError(null);

    try {
      await clientRef.current.reconnect();
    } catch {
      setError('Reconnection failed. Please try again.');
    } finally {
      setIsReconnecting(false);
    }
  }, []);

  useEffect(() => {
    initializeClient();
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