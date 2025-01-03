import { log } from '@/lib/log';
import { getItem, removeItem, setItem } from '@/lib/storage';

interface NotificationTime {
  monitorId: number;
  lastNotificationTime: number;
}

class NotificationStore {
  private static readonly STORE_KEY = '@notification_cooldown';
  private cooldowns: Map<number, number> = new Map();
  private initialized = false;
  private static readonly COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

  async init() {
    if (this.initialized) return;
    try {
      const stored = getItem<NotificationTime[]>(NotificationStore.STORE_KEY);
      if (stored) {
        this.cooldowns = new Map(
          stored.map((item) => [item.monitorId, item.lastNotificationTime])
        );
      }
      this.initialized = true;
    } catch (error) {
      log.error('Failed to initialize notification store:', error);
    }
  }

  async canNotify(monitorId: number): Promise<boolean> {
    await this.init();
    const lastNotification = this.cooldowns.get(monitorId);
    if (!lastNotification) return true;

    const now = Date.now();
    return now - lastNotification >= NotificationStore.COOLDOWN_PERIOD;
  }

  async recordNotification(monitorId: number): Promise<void> {
    await this.init();
    const now = Date.now();
    this.cooldowns.set(monitorId, now);

    try {
      const data = Array.from(this.cooldowns.entries()).map(
        ([monitorId, time]) => ({
          monitorId,
          lastNotificationTime: time
        })
      );
      setItem(NotificationStore.STORE_KEY, data);
    } catch (error) {
      log.error('Failed to save notification cooldown:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      removeItem(NotificationStore.STORE_KEY);
      this.cooldowns.clear();
      this.initialized = false;
    } catch (error) {
      log.error('Failed to clear notification store:', error);
    }
  }
}

export const notificationStore = new NotificationStore();
