import { logger } from '@/lib/log';
import statusStore from '@/store/statusStore';

import { type StatusApiResponse, type StatusPageData } from './types';

export class StatusPageClient {
  private refreshInterval: number = 30000; // 30 seconds
  private refreshTimer?: ReturnType<typeof setInterval>;
  private baseUrl: string;
  private slug: string;

  constructor(url: string) {
    const urlObj = new URL(url);
    this.baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    this.slug = urlObj.pathname.split('/').pop()?.replace(/^status\//, '') || '';
  }

  public async initialize(): Promise<void> {
    try {
      await this.fetchInitialData();
      this.startAutoRefresh();
    } catch (error) {
      logger.error('Failed to initialize status page:', error);
      throw error;
    }
  }

  private async fetchInitialData(): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/status-page/${this.slug}`,
    );

    await this.updateStatusData(await response.json());
    await this.fetchHeartbeats();
  }

  private async fetchHeartbeats(): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/status-page/heartbeat/${this.slug}`,
    );
    const data: StatusApiResponse = await response.json();

    const status = statusStore.statusList.find(
      (s) => s.url === `${this.baseUrl}/status/${this.slug}`
    );
    
    if (!status || !status.monitors) return;

    const updatedStatus = {
      ...status,
      monitors: status.monitors.map(monitor => {
        if (!monitor?.id) return monitor;
        
        const heartbeats = data.heartbeatList[monitor.id] || [];
        const uptimeKey = `${monitor.id}_24`;
        const uptime = data.uptimeList[uptimeKey] || 0;

        return {
          ...monitor,
          heartBeatList: heartbeats,
          uptime: uptime
        };
      })
    };

    statusStore.updateStatus(updatedStatus);
  }

  private async updateStatusData(data: StatusPageData): Promise<void> {
    const monitors = data.publicGroupList.flatMap((group) => group.monitorList).map(monitor => ({
      ...monitor,
      heartBeatList: [],
      uptime: 0
    }));
    const statusUrl = `${this.baseUrl}/status/${this.slug}`;

    statusStore.addStatus({
      url: statusUrl,
      monitors: monitors,
      isExternal: false
    });
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.fetchHeartbeats().catch((error) => {
        logger.error('Failed to refresh heartbeats:', error);
      });
    }, this.refreshInterval);
  }

  public dispose(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}
