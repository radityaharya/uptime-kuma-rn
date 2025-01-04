import BackgroundService, {
  type BackgroundTaskOptions
} from 'react-native-bg-actions';

import { UptimeKumaClient } from '@/api/client';
import { getToken } from '@/lib/auth/utils';
import { log } from '@/lib/log';
import { clientStore } from '@/store/clientStore';
import { notificationStore } from '@/store/notificationStore';

const sleep = (time: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const backgroundOptions: BackgroundTaskOptions = {
  taskName: 'UptimeKumaMonitor',
  taskTitle: 'Uptime Kuma Monitor',
  taskDesc: 'Monitoring your services in background',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap'
  },
  color: '#FF231F7C',
  linkingURI: 'uptimekuma://' // Deep linking URI
};

const KEEPALIVE_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 5000; // 5 seconds
const DEFAULT_DELAY = 60000; // 1 minute
// const NOTIFICATION_COOLDOWN = 1 * 60 * 1000; // 5 minutes
// let lastNotificationTime = 0;

// const canSendNotification = () => {
//   const now = Date.now();
//   if (now - lastNotificationTime >= NOTIFICATION_COOLDOWN) {
//     lastNotificationTime = now;
//     return true;
//   }
//   return false;
// };

const backgroundTask = async (taskData?: { delay: number }) => {
  const delay = taskData?.delay ?? DEFAULT_DELAY;
  let keepAliveInterval: NodeJS.Timeout | null = null;
  let isRunning = true;

  const cleanup = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  };

  try {
    while (isRunning && BackgroundService.isRunning()) {
      console.log('Background task iteration');
      try {
        const client = clientStore.getClient();

        if (!client || !client.isSocketConnected()) {
          log.debug('Socket disconnected, attempting to reconnect...');
          await initializeBackgroundClient();
          continue;
        }

        // Setup keep-alive
        if (!keepAliveInterval) {
          keepAliveInterval = setInterval(() => {
            if (client.socket?.connected) {
              client.socket.emit('ping');
            }
          }, KEEPALIVE_INTERVAL);
        }

        await client.getMonitors();
        await client.getHeartbeats();

        updateBackgroundNotification(
          `Monitoring ${client.monitors.length} services`
        );

        await sleep(delay);
      } catch (iterationError) {
        log.error('Background task iteration error:', iterationError);
        cleanup();
        await sleep(RECONNECT_DELAY);
      }
    }
  } catch (error) {
    log.error('Background task fatal error:', error);
  } finally {
    cleanup();
    isRunning = false;
  }
};

const initializeBackgroundClient = async (): Promise<void> => {
  try {
    let client = clientStore.getClient();
    const token = getToken();

    if (!token) {
      log.error('No authentication token found');
      await stopBackgroundService();
      return;
    }

    if (!client) {
      client = new UptimeKumaClient(token.host, {
        timeout: 5000,
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000
      });
      clientStore.setClient(client);
    }

    if (!client.isSocketConnected()) {
      await client.authenticate(token.username, token.password);
      await Promise.all([
        client.getMonitors(),
        client.getHeartbeats(),
        client.getTags()
      ]);
    }
  } catch (error) {
    log.error('Failed to initialize background client:', error);
    throw error;
  }
};

export const startBackgroundService = async (delay?: number): Promise<void> => {
  log.info('Starting background service...');

  const token = getToken();
  if (!token) {
    log.error('Cannot start background service: No auth token');
    return;
  }

  if (await BackgroundService.isRunning()) {
    log.warn('Background service is already running');
    return;
  }

  const options = {
    ...backgroundOptions,
    parameters: {
      delay: delay || DEFAULT_DELAY
    }
  };

  try {
    await BackgroundService.start(backgroundTask, options);
    log.info('Background service started');
  } catch (error) {
    log.error('Failed to start background service:', error);
  }
};

export const stopBackgroundService = async (): Promise<void> => {
  try {
    const client = clientStore.getClient();
    if (client) {
      client.disconnect();
      clientStore.setClient(null);
    }
    await notificationStore.clear();
    await BackgroundService.stop();
    log.info('Background service stopped');
  } catch (error) {
    log.error('Failed to stop background service:', error);
  }
};

export const updateBackgroundNotification = async (
  description: string
): Promise<void> => {
  try {
    await BackgroundService.updateNotification({
      ...backgroundOptions,
      taskDesc: description
    });
  } catch (error) {
    log.error('Failed to update background notification:', error);
  }
};
