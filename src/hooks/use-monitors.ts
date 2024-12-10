import { useCallback, useEffect, useRef, useState } from 'react';

import { UptimeKumaClient } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { getToken } from '@/lib/auth/utils';
import { log } from '@/lib/log';
import { clientStore } from '@/store/clientStore';
import { useMonitorsStore } from '@/store/monitorContext';

export const useMonitors = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const clientRef = useRef<UptimeKumaClient | null>(null);

  const monitors = useMonitorsStore();

  const auth = useAuth();

  const refreshMonitors = useCallback(async () => {
    log.debug('refreshMonitors called');
    setError(null);
    if (!clientRef.current) return;
    try {
      await clientRef.current.getMonitors();
      await clientRef.current.getHeartbeats();
      setError(null);
    } catch (err) {
      setError('Failed to fetch monitors.' + err);
    }
  }, []);

  const initializeClient = useCallback(async () => {
    if (auth.status === 'unauthenticated') {
      setIsLoading(false);
      setError(null);
      return;
    }

    if (clientStore.hasActiveClient()) {
      clientRef.current = clientStore.getClient();
      setIsLoading(false);

      if (clientRef.current && !clientRef.current.isSocketConnected()) {
        log.warn('Socket not connected, attempting to reinitialize...');
        try {
          await clientRef.current.reinitializeSocket();
        } catch (err: any) {
          setError(`Failed to reinitialize socket: ${err.message}`);
        }
      }
      return;
    }

    log.info('Initializing new client');
    const token = getToken();
    if (!token) {
      log.error('Authentication token not found');
      setError('Authentication token not found');
      setIsLoading(false);
      return;
    }

    const client = new UptimeKumaClient(token.host);

    try {
      await client.authenticate(token.username, token.password);
      clientRef.current = client;
      clientStore.setClient(client);
      await client.getMonitors();
      await client.getHeartbeats();
    } catch (error: any) {
      const errorMessage = error.message.includes('timeout') 
        ? 'Connection timed out. Please check your network connection.'
        : `Connection failed: ${error.message}`;
      setError(errorMessage);
      clientRef.current = null;
      clientStore.setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth.status]);

  const reconnectClient = useCallback(async () => {
    setError(null);
    log.info('Reconnecting client...');
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

    const intervalId = setInterval(async () => {
      const client = clientRef.current;
      if (!client) return;

      try {
        if (!client.isSocketConnected()) {
          log.warn('Socket disconnected, attempting to reconnect...');
          await client.reinitializeSocket();
        }
      } catch (err) {
        console.error('Failed to reconnect:', err);
        setError('Connection lost. Attempting to reconnect...');
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      setError(null); // Clear error on unmount
      if (process.env.NODE_ENV === 'production') {
        const client = clientStore.getClient();
        if (client) {
          client.disconnect();
          clientStore.setClient(null);
        }
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
