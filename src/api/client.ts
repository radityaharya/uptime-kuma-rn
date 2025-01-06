import io, { type Socket } from 'socket.io-client';

import { log } from '@/lib/log';
import { sendNotificationImmediately } from '@/lib/notification';
import {
  type HeartBeat,
  type ImportantHeartBeat,
  type Monitor
} from '@/schemas/monitor';
import { useInfoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorStore';
import statusStore from '@/store/statusStore';

import {
  // type HeartBeat,
  // type ImportantHeartBeat,
  type Info,
  // type Monitor,
  type StatusPage
} from './types';

interface UptimeKumaOptions {
  autoReconnect: boolean;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  reconnectionAttempts: number;
  timeout: number;
}

interface AuthResponse {
  ok: boolean;
  msg?: string;
}

interface Credentials {
  username: string;
  password: string;
  token?: string;
}

export class UptimeKumaClient {
  private static readonly DEFAULT_OPTIONS: UptimeKumaOptions = {
    autoReconnect: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 10000
  };

  private readonly connectionOptions: UptimeKumaOptions;
  private monitorsInitialized = false;
  private credentials?: Credentials;
  public socket: Socket | null = null;

  constructor(
    private readonly url: string,
    options: Partial<UptimeKumaOptions> = {}
  ) {
    this.connectionOptions = {
      ...UptimeKumaClient.DEFAULT_OPTIONS,
      ...options
    };
  }

  // Authentication Methods
  public async authenticate(username: string, password: string): Promise<void> {
    this.credentials = { username, password };
    return this.connectAndAuthenticate();
  }

  private cleanupExistingSocket(): void {
    if (this.socket) {
      // Remove all listeners first
      this.socket.removeAllListeners();
      // Force close any pending connections
      this.socket.close();
      // Disconnect the socket
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private async connectAndAuthenticate(): Promise<void> {
    this.cleanupExistingSocket();

    return new Promise<void>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 3;

      const attemptConnection = () => {
        try {
          this.initializeSocket(resolve, (error) => {
            if (retryCount < maxRetries && error.message.includes('timeout')) {
              retryCount++;
              log.debug(`Retrying connection (${retryCount}/${maxRetries})...`);
              setTimeout(attemptConnection, 1000 * retryCount);
            } else {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      };

      attemptConnection();
    });
  }

  // Socket Initialization and Management
  private initializeSocket(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.socket = io(this.url, this.connectionOptions);

    this.socket.once('connect', () => {
      log.debug('Socket connected successfully');
      if (!this.credentials) {
        this.setupListeners();
        return resolve();
      }

      this.handleAuthentication(resolve, reject);
    });

    this.setupSocketErrorHandling(reject);
  }

  private handleAuthentication(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.setupListeners();
    this.socket?.emit('login', this.credentials, (response: AuthResponse) => {
      if (response.ok) {
        resolve();
      } else {
        this.socket?.disconnect();
        reject(new Error(response.msg ?? 'Authentication failed'));
      }
    });
  }

  private setupSocketErrorHandling(reject: (error: Error) => void): void {
    this.socket?.once('connect_error', (error) => {
      log.error('Socket connect error:', error.message);
      if (error.message === 'timeout') {
        log.debug(
          `Connection timed out after ${this.connectionOptions.timeout}ms`
        );
      }
      reject(error);
    });

    this.socket?.on('disconnect', (reason: string) => {
      log.debug(`Socket disconnected: ${reason}`);
      if (
        this.connectionOptions.autoReconnect &&
        reason !== 'io client disconnect'
      ) {
        log.debug('Attempting automatic reconnection...');
        this.handleReconnect();
      }
    });
  }

  // Monitor Management
  public get monitors(): Monitor[] {
    return monitorStore.getMonitors();
  }

  private set monitors(value: Monitor[]) {
    monitorStore.setMonitors(value);
  }

  private updateMonitor(id: number, data: Partial<Monitor>): void {
    monitorStore.updateMonitor(id, data);
  }

  public getMonitor(id: number): Monitor | undefined {
    return this.monitors.find((monitor) => monitor.id === id);
  }

  // Monitor Data Updates
  private setMonitorList(data: Record<string, Monitor>): void {
    if (!this.monitorsInitialized) {
      this.initializeMonitors(data);
      return;
    }

    this.updateExistingMonitors(data);
  }

  private initializeMonitors(data: Record<string, Monitor>): void {
    this.monitors = Object.values(data).map(this.createMonitorObject);
    this.monitorsInitialized = true;
    log.debug(
      'Monitors initialized:',
      this.monitors.map((m) => m.id)
    );
  }

  private createMonitorObject(monitor: Monitor): Monitor {
    return {
      ...monitor,
      id: Number(monitor.id),
      heartBeatList: [],
      avgPing: 0,
      uptime: {
        day:
          monitor.uptime?.day ??
          monitorStore.getMonitor(Number(monitor.id))?.uptime?.day ??
          0,
        month:
          monitor.uptime?.month ??
          monitorStore.getMonitor(Number(monitor.id))?.uptime?.month ??
          0,
        year:
          monitor.uptime?.year ??
          monitorStore.getMonitor(Number(monitor.id))?.uptime?.year ??
          0
      }
    };
  }

  private updateExistingMonitors(data: Record<string, Monitor>): void {
    Object.values(data).forEach((monitor) => {
      const index = this.monitors.findIndex(
        (m) => Number(m.id) === Number(monitor.id)
      );

      if (index === -1) {
        this.monitors.push(this.createMonitorObject(monitor));
      } else {
        this.monitors[index] = this.mergeMonitorData(
          this.monitors[index],
          monitor
        );
      }
    });
  }

  private mergeMonitorData(existing: Monitor, update: Monitor): Monitor {
    return {
      ...existing,
      ...update,
      id: Number(update.id),
      heartBeatList: existing.heartBeatList,
      avgPing: existing.avgPing,
      uptime: {
        day: update.uptime?.day ?? existing.uptime?.day ?? 0,
        month: update.uptime?.month ?? existing.uptime?.month ?? 0,
        year: update.uptime?.year ?? existing.uptime?.year ?? 0
      }
    };
  }

  // Heartbeat Management
  private handleHeartbeatData<T>(
    monitorId: number,
    data: T[] | [T[], boolean],
    maxHeartbeats: number = 100
  ): T[] {
    const [heartbeats, _isHistory = false] = Array.isArray(data[0])
      ? (data as [T[], boolean])
      : [data as T[], false];

    if (!Array.isArray(heartbeats)) {
      throw new Error('Invalid heartbeat data: not an array');
    }

    return heartbeats.slice(0, maxHeartbeats);
  }

  private setHeartBeat(
    monitorId: number,
    data: HeartBeat[] | [HeartBeat[], boolean]
  ): void {
    this.validateMonitorId(monitorId);

    const heartbeats = this.handleHeartbeatData(monitorId, data);
    this.updateMonitor(monitorId, { heartBeatList: heartbeats });
  }

  private getLatestHeartbeat(monitor: Monitor): HeartBeat | undefined {
    if (!monitor.heartBeatList?.length) return undefined;

    return monitor.heartBeatList.reduce((latest, current) => {
      const currentTime = new Date(current.time).getTime();
      const latestTime = new Date(latest.time).getTime();
      return currentTime > latestTime ? current : latest;
    }, monitor.heartBeatList[0]);
  }

  private async handleHeartbeat(heartbeat: ImportantHeartBeat): Promise<void> {
    try {
      const monitor = this.monitors.find((m) => m.id === heartbeat.monitorID);
      if (!monitor) return;

      const previousHeartbeat = this.getLatestHeartbeat(monitor);
      const previousStatus = previousHeartbeat?.status;

      monitorStore.addHeartbeat(heartbeat);

      if (previousStatus !== undefined && previousStatus !== heartbeat.status) {
        log.info(
          `Monitor ${monitor.name} status changed from ${previousStatus} to ${heartbeat.status}`
        );

        if (heartbeat.status === 0) {
          await sendNotificationImmediately(
            'Monitor Down',
            `${monitor.name} is currently down!`,
            { monitorId: monitor.id }
          );
        } else if (heartbeat.status === 1 && previousStatus === 0) {
          await sendNotificationImmediately(
            'Monitor Up',
            `${monitor.name} is back online!`,
            { monitorId: monitor.id }
          );
        }
      }
    } catch (error) {
      log.error('Failed to handle heartbeat:', error);
    }
  }

  private setImportantHeartBeatList(
    monitorId: number,
    data: ImportantHeartBeat[] | [ImportantHeartBeat[], boolean]
  ): void {
    this.validateMonitorId(monitorId);

    const heartbeats = this.handleHeartbeatData(monitorId, data);
    this.updateMonitor(monitorId, { importantHeartBeatList: heartbeats });
  }

  private setAvgPing(monitorId: number, avgPing: number): void {
    if (avgPing === null) return;
    this.updateMonitor(monitorId, { avgPing });
  }

  private setUptime(
    monitorId: number,
    period: number | string,
    uptime: number
  ): void {
    const monitor = this.getMonitor(monitorId);
    if (!monitor) return;

    const currentUptime = {
      day: monitor.uptime?.day ?? 0,
      month: monitor.uptime?.month ?? 0,
      year: monitor.uptime?.year ?? 0
    };

    const uptimeUpdate = {
      day: period === 24 ? uptime : currentUptime.day,
      month: period === 720 ? uptime : currentUptime.month,
      year: period === '1y' ? uptime : currentUptime.year
    };

    this.updateMonitor(monitorId, { uptime: uptimeUpdate });
  }

  private handleStatusPageList(statusPages: {
    [key: string]: StatusPage;
  }): void {
    log.debug('Processing status pages:', statusPages);
    const statusPageArray = Object.values(statusPages);

    if (!this.url) {
      log.error('No base URL available');
      return;
    }

    for (const statusPage of statusPageArray) {
      try {
        const status = {
          url: `${this.url}/status/${statusPage.slug}`,
          isExternal: false,
          monitors: []
        };

        log.debug('Adding status page:', status);
        statusStore.addStatus(status);
      } catch (error) {
        log.error('Failed to add status page:', statusPage.slug);
      }
    }
  }

  private validateMonitorId(monitorId: number): void {
    const numericId = Number(monitorId);
    if (!Number.isInteger(numericId)) {
      throw new Error(`Invalid monitor ID: ${monitorId}`);
    }
  }

  public async addMonitorTag(monitorId: number, tag_id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'addMonitorTag',
        tag_id,
        monitorId,
        '',
        (data: { ok: boolean; msg?: string }) => {
          if (!data.ok) {
            log.error('Failed to add tag:', data.msg);
            reject(new Error('Failed to add tag'));
            return;
          }
          log.debug('Tag added successfully');
          resolve();
        }
      );
    });
  }

  public async deleteMonitorTag(
    monitorId: number,
    tag_id: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'deleteMonitorTag',
        tag_id,
        monitorId,
        '',
        (data: { ok: boolean; msg?: string }) => {
          if (!data.ok) {
            log.error('Failed to delete tag:', data.msg);
            reject(new Error('Failed to delete tag'));
            return;
          }
          log.debug('Tag deleted successfully');
          resolve();
        }
      );
    });
  }

  public async addMonitor(monitor: Monitor): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'addMonitor',
        monitor,
        (data: { ok: boolean; msg?: string; monitorID?: number }) => {
          if (!data.ok) {
            reject(new Error('Failed to add monitor'));
            return;
          }

          resolve();
        }
      );
    });
  }

  public async editMonitor(monitor: Monitor): Promise<void> {
    return new Promise((resolve, reject) => {
      log.debug('Editing monitor:', monitor);
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'editMonitor',
        monitor,
        (data: { ok: boolean; msg?: string; monitorID?: number }) => {
          if (!data.ok) {
            log.error('Failed to edit monitor:', data.msg);
            reject(new Error('Failed to edit monitor'));
            return;
          }
          log.debug('Monitor edited successfully', data);
          resolve();
        }
      );
    });
  }

  // Public API Methods
  public async getMonitors(): Promise<void> {
    log.debug('Fetching monitors');
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getMonitorList', (data: { ok: boolean }) => {
        if (!data.ok) {
          reject(new Error('Failed to fetch monitors'));
          return;
        }

        resolve();
      });
    });
  }

  public async getMonitorBeats(
    monitorId: number,
    period?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getMonitorBeats', { monitorID: monitorId, period });
      resolve();
    });
  }

  public async getTags(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getTags', (data: { ok: boolean; tags: any[] }) => {
        if (!data.ok) {
          reject(new Error('Failed to fetch tags'));
          return;
        }
        monitorStore.setTags(data.tags);
        resolve();
      });
    });
  }

  public async getHeartbeats(): Promise<void> {
    this.monitors.map((monitor) => this.getMonitorBeats(monitor.id!, 2));
    return Promise.resolve();
  }

  // V2_compatiblity
  public async getMonitorImportantHeartbeatListPaged(
    monitorId: number,
    offset: number,
    count: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      log.debug(
        `Fetching important heartbeats for monitor ${monitorId} (offset: ${offset}, count: ${count})`
      );
      this.socket.emit(
        'monitorImportantHeartbeatListPaged',
        monitorId,
        offset,
        count,
        (response: { ok: boolean; data: ImportantHeartBeat[] }) => {
          log.debug('Received important heartbeat list:', response);
          if (response.ok) {
            this.setImportantHeartBeatList(monitorId, response.data);
            resolve();
          } else {
            reject(new Error('Failed to fetch important heartbeat list'));
          }
        }
      );
    });
  }

  // Event Listeners
  public setupListeners(): void {
    this.socket?.removeAllListeners();

    const handlers = {
      monitorList: this.setMonitorList.bind(this),
      updateMonitorIntoList: (data: Monitor) => {
        log.debug('Received updated monitor:', data);
        this.updateMonitor(data.id as number, data);
      },
      info: (data: Info) => useInfoStore.setState(data),
      heartbeatList: this.setHeartBeat.bind(this),
      importantHeartbeatList: this.setImportantHeartBeatList.bind(this),
      avgPing: this.setAvgPing.bind(this),
      uptime: this.setUptime.bind(this),
      heartbeat: this.handleHeartbeat.bind(this), // Update to use new handler
      statusPageList: this.handleStatusPageList.bind(this),
      // Add pong handler
      pong: () => {
        log.debug('Received pong from server');
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      this.socket?.on(event, (...args: any[]) => {
        // log.debug('Received event:', event);
        (handler as (...args: any[]) => void)(...args);
      });
    });
  }

  // Connection Management
  public async reconnect(): Promise<void> {
    return this.connectAndAuthenticate();
  }

  private async handleReconnect(): Promise<void> {
    try {
      this.cleanupExistingSocket();
      await this.connectAndAuthenticate();
      return;
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  public disconnect(): void {
    this.monitorsInitialized = false;
    // Clear any stored credentials
    this.credentials = undefined;
    this.cleanupExistingSocket();
  }

  public destroy(): void {
    this.disconnect();
    monitorStore.cleanup();
  }

  public isSocketConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public async reinitializeSocket(): Promise<void> {
    log.debug('Reinitializing socket connection');
    if (!this.credentials) {
      throw new Error('No credentials available for reconnection');
    }

    // Attempt to disconnect existing socket if any
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    try {
      await this.connectAndAuthenticate();
      // Refresh data after reconnection
      await this.getMonitors();
      await this.getHeartbeats();
      await this.getTags();
    } catch (error) {
      log.error('Failed to reinitialize socket:', error);
      throw error;
    }
  }
}
