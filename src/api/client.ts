import { EventEmitter as ExpoEventEmitter } from 'expo-modules-core';
import io, { type Socket } from 'socket.io-client';

import { logger } from '@/lib/log';
import { infoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorContext';
import statusStore from '@/store/statusStore';

import {
  type EventPayloads,
  type HeartBeat,
  type ImportantHeartBeat,
  type Info,
  type Monitor,
  type StatusPage,
  type UptimeKumaEvent,
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
}

class CustomEventEmitter extends ExpoEventEmitter<EventPayloads> {
  on<T extends UptimeKumaEvent>(
    event: T,
    listener: (payload: EventPayloads[T]) => void,
  ): this {
    super.addListener(event, listener);
    return this;
  }
}

export class UptimeKumaClient {
  private static readonly DEFAULT_OPTIONS: UptimeKumaOptions = {
    autoReconnect: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
  };

  private readonly emitter: CustomEventEmitter;
  private readonly connectionOptions: UptimeKumaOptions;
  private monitorsInitialized = false;
  private credentials?: Credentials;
  public socket: Socket | null = null;

  constructor(
    private readonly url: string,
    options: Partial<UptimeKumaOptions> = {},
  ) {
    this.emitter = new CustomEventEmitter();
    this.connectionOptions = {
      ...UptimeKumaClient.DEFAULT_OPTIONS,
      ...options,
    };
  }

  // Authentication Methods
  public async authenticate(username: string, password: string): Promise<void> {
    this.credentials = { username, password };
    return this.connectAndAuthenticate();
  }

  private cleanupExistingSocket(): void {
    if (this.socket) {
      this.socket?.removeAllListeners();
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
              logger.debug(
                `Retrying connection (${retryCount}/${maxRetries})...`,
              );
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
    reject: (error: Error) => void,
  ): void {
    this.socket = io(this.url, this.connectionOptions);

    this.socket.once('connect', () => {
      logger.debug('Socket connected successfully');
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
    reject: (error: Error) => void,
  ): void {
    this.socket?.emit('login', this.credentials, (response: AuthResponse) => {
      if (response.ok) {
        this.setupListeners();
        resolve();
      } else {
        this.socket?.disconnect();
        reject(new Error(response.msg ?? 'Authentication failed'));
      }
    });
  }

  private setupSocketErrorHandling(reject: (error: Error) => void): void {
    this.socket?.once('connect_error', (error) => {
      logger.error('Socket connect error:', error.message);
      if (error.message === 'timeout') {
        logger.debug(
          `Connection timed out after ${this.connectionOptions.timeout}ms`,
        );
      }
      reject(error);
    });

    this.socket?.on('disconnect', (reason: string) => {
      logger.debug(`Socket disconnected: ${reason}`);
      this.emitter.emit('disconnect', reason);
      if (
        this.connectionOptions.autoReconnect &&
        reason !== 'io client disconnect'
      ) {
        logger.debug('Attempting automatic reconnection...');
        this.handleReconnect();
      }
    });
  }

  // Monitor Management
  private get monitors(): Monitor[] {
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
    logger.debug(
      'Monitors initialized:',
      this.monitors.map((m) => m.id),
    );
  }

  private createMonitorObject(monitor: Monitor): Monitor {
    return {
      ...monitor,
      id: Number(monitor.id),
      heartBeatList: [],
      avgPing: 0,
      uptime: {
        day: monitor.uptime?.day ?? 0,
        month: monitor.uptime?.month ?? 0,
      },
    };
  }

  private updateExistingMonitors(data: Record<string, Monitor>): void {
    Object.values(data).forEach((monitor) => {
      const index = this.monitors.findIndex(
        (m) => Number(m.id) === Number(monitor.id),
      );

      if (index === -1) {
        this.monitors.push(this.createMonitorObject(monitor));
      } else {
        this.monitors[index] = this.mergeMonitorData(
          this.monitors[index],
          monitor,
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
      },
    };
  }

  // Heartbeat Management
  private handleHeartbeatData<T>(
    monitorId: number,
    data: T[] | [T[], boolean],
    maxHeartbeats: number = 100,
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
    data: HeartBeat[] | [HeartBeat[], boolean],
  ): void {
    this.validateMonitorId(monitorId);

    const heartbeats = this.handleHeartbeatData(monitorId, data);
    this.updateMonitor(monitorId, { heartBeatList: heartbeats });
  }

  private addHeartbeat(heartbeat: ImportantHeartBeat): void {
    monitorStore.addHeartbeat(heartbeat);
  }

  private setImportantHeartBeatList(
    monitorId: number,
    data: ImportantHeartBeat[] | [ImportantHeartBeat[], boolean],
  ): void {
    this.validateMonitorId(monitorId);

    const heartbeats = this.handleHeartbeatData(monitorId, data);
    this.updateMonitor(monitorId, { importantHeartBeatList: heartbeats });
  }

  private setAvgPing(monitorId: number, avgPing: number): void {
    if (avgPing === null) return;
    this.updateMonitor(monitorId, { avgPing });
  }

  private setUptime(monitorId: number, period: number, uptime: number): void {
    const monitor = this.getMonitor(monitorId);
    if (!monitor) return;

    const currentUptime = monitor.uptime || { day: 0, month: 0 };
    const uptimeUpdate =
      period === 24
        ? { ...currentUptime, day: uptime }
        : period === 720
          ? { ...currentUptime, month: uptime }
          : currentUptime;

    this.updateMonitor(monitorId, { uptime: uptimeUpdate });
  }

  private handleStatusPageList(statusPages: {
    [key: string]: StatusPage;
  }): void {
    logger.debug('Processing status pages:', statusPages);
    const statusPageArray = Object.values(statusPages);

    if (!this.url) {
      logger.error('No base URL available');
      return;
    }

    for (const statusPage of statusPageArray) {
      try {
        const status = {
          url: `${this.url}/status/${statusPage.slug}`,
          isExternal: false,
          monitors: [],
        };

        logger.debug('Adding status page:', status);
        statusStore.addStatus(status);
      } catch (error) {
        logger.error('Failed to add status page:', statusPage.slug);
      }
    }
  }

  private validateMonitorId(monitorId: number): void {
    const numericId = Number(monitorId);
    if (!Number.isInteger(numericId)) {
      throw new Error(`Invalid monitor ID: ${monitorId}`);
    }
  }

  // Public API Methods
  public async getMonitors(): Promise<void> {
    logger.debug('Fetching monitors');
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
    period?: number,
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

  public async getHeartbeats(): Promise<void> {
    this.monitors.map((monitor) => this.getMonitorBeats(monitor.id));
    return Promise.resolve();
  }

  // Event Listeners
  public setupListeners(): void {
    this.socket?.removeAllListeners();

    const handlers = {
      monitorList: this.setMonitorList.bind(this),
      info: (data: Info) => infoStore.setState({ info: data }),
      heartbeatList: this.setHeartBeat.bind(this),
      importantHeartbeatList: this.setImportantHeartBeatList.bind(this),
      avgPing: this.setAvgPing.bind(this),
      uptime: this.setUptime.bind(this),
      heartbeat: this.addHeartbeat.bind(this),
      statusPageList: this.handleStatusPageList.bind(this),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      this.socket?.on(event, (...args: any[]) => {
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
    this.cleanupExistingSocket();
  }

  public isSocketConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public async reinitializeSocket(): Promise<void> {
    logger.debug('Reinitializing socket connection');
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
    } catch (error) {
      logger.error('Failed to reinitialize socket:', error);
      throw error;
    }
  }
}
