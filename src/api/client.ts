import { EventEmitter as ExpoEventEmitter } from 'expo-modules-core';
import io, { type Socket } from 'socket.io-client';

import { logger } from '@/lib/log';
import { infoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorContext';

import {
  type EventPayloads,
  type HeartBeat,
  type ImportantHeartBeat,
  type Info,
  type Monitor,
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
  private monitorsInitialized = false;
  private readonly emitter: CustomEventEmitter;
  private credentials?: Credentials;
  private readonly connectionOptions: UptimeKumaOptions;
  private reconnectAttempts = 0;
  private readonly DEFAULT_TIMEOUT = 10000;

  private static readonly DEFAULT_OPTIONS: UptimeKumaOptions = {
    autoReconnect: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 10000,
  };

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

  private get monitors(): Monitor[] {
    return monitorStore.getMonitors();
  }

  private set monitors(value: Monitor[]) {
    monitorStore.setMonitors(value);
  }

  public async authenticate(username: string, password: string): Promise<void> {
    this.credentials = { username, password };
    return this.connectAndAuthenticate();
  }

  private async connectAndAuthenticate(): Promise<void> {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = io(this.url, this.connectionOptions);

        this.socket.once('connect', () => {
          if (!this.credentials) {
            this.setupListeners();
            return resolve();
          }

          this.socket?.emit(
            'login',
            this.credentials,
            (response: AuthResponse) => {
              if (response.ok) {
                this.setupListeners();
                resolve();
              } else {
                this.socket?.disconnect();
                reject(new Error(response.msg ?? 'Authentication failed'));
              }
            },
          );
        });

        this.socket.once('connect_error', reject);

        this.socket.on('disconnect', (reason: string) => {
          this.emitter.emit('disconnect', reason);
          if (this.connectionOptions.autoReconnect) {
            this.handleReconnect();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setInfo(data: Info): void {
    infoStore.setState({ info: data });
  }

  private setMonitorList(data: Record<string, Monitor>): void {
    logger.debug('Setting monitor list', Object.keys(data).length);

    if (!this.monitorsInitialized) {
      this.monitors = Object.values(data).map((monitor) => ({
        ...monitor,
        id: Number(monitor.id),
        heartBeatList: [],
        avgPing: 0,
        uptime: {
          day: monitor.uptime?.day ?? 0,
          month: monitor.uptime?.month ?? 0,
        },
      }));
      this.monitorsInitialized = true;
      logger.debug(
        'Monitors initialized:',
        this.monitors.map((m) => m.id),
      );
      return;
    }

    Object.values(data).forEach((monitor) => {
      const index = this.monitors.findIndex(
        (m) => Number(m.id) === Number(monitor.id),
      );
      if (index === -1) {
        this.monitors.push({
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: [],
          avgPing: 0,
          uptime: {
            day: monitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? 0,
          },
        });
      } else {
        this.monitors[index] = {
          ...this.monitors[index],
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: this.monitors[index].heartBeatList,
          avgPing: this.monitors[index].avgPing,
          uptime: {
            day: monitor.uptime?.day ?? this.monitors[index].uptime?.day ?? 0,
            month:
              monitor.uptime?.month ?? this.monitors[index].uptime?.month ?? 0,
          },
        };
      }
    });
  }

  private setHeartBeat(
    monitorId: number,
    data: HeartBeat[] | [HeartBeat[], boolean],
  ): void {
    logger.debug('Setting heartbeat for monitor:', monitorId);
    const numericId = Number(monitorId);
    if (!Number.isInteger(numericId)) {
      throw new Error(`Invalid monitor ID: ${monitorId}`);
    }

    const [heartbeats, _isHistory = false] = Array.isArray(data[0])
      ? (data as [HeartBeat[], boolean])
      : [data as HeartBeat[], false];

    if (!Array.isArray(heartbeats)) {
      throw new Error('Invalid heartbeat data: not an array');
    }

    const maxHeartbeats = 100;
    heartbeats.splice(maxHeartbeats);
    monitorStore.updateMonitor(monitorId, { heartBeatList: heartbeats });
  }

  private setImportantHeartBeatList(
    monitorId: number,
    data: ImportantHeartBeat[] | [ImportantHeartBeat[], boolean],
  ): void {
    logger.debug('Setting ImportantHeartbeat for monitor:', monitorId);
    const numericId = Number(monitorId);
    if (!Number.isInteger(numericId)) {
      throw new Error(`Invalid monitor ID: ${monitorId}`);
    }

    const [heartbeats, _isHistory = false] = Array.isArray(data[0])
      ? (data as [ImportantHeartBeat[], boolean])
      : [data as ImportantHeartBeat[], false];

    if (!Array.isArray(heartbeats)) {
      throw new Error('Invalid ImportantHeartbeat data: not an array');
    }

    const maxHeartbeats = 100;
    heartbeats.splice(maxHeartbeats);
    monitorStore.updateMonitor(monitorId, {
      importantHeartBeatList: heartbeats,
    });
  }

  private addHeartBeat(monitorId: number, heartBeat: HeartBeat): void {
    logger.debug('Adding heartbeat for monitor:', monitorId);
    const monitor = this.getMonitor(monitorId);
    if (!monitor) return;

    const heartBeatList = monitor.heartBeatList || [];
    monitorStore.updateMonitor(monitorId, {
      heartBeatList: [heartBeat, ...heartBeatList],
    });
  }

  private setAvgPing(monitorId: number, avgPing: number | null): void {
    logger.debug('Setting avgPing for monitor:', monitorId);
    if (avgPing !== null) {
      monitorStore.updateMonitor(monitorId, { avgPing });
    }
  }

  private setMonitorUptime(
    monitorId: number,
    period: number,
    uptime: number,
  ): void {
    logger.debug('Setting uptime for monitor:', {
      monitorId,
      period,
      uptime,
    });
    const monitor = this.getMonitor(monitorId);
    if (!monitor) return;

    const currentUptime = monitor.uptime || { day: 0, month: 0 };
    const uptimeUpdate =
      period === 24
        ? { ...currentUptime, day: uptime }
        : period === 720
          ? { ...currentUptime, month: uptime }
          : currentUptime;

    monitorStore.updateMonitor(monitorId, { uptime: uptimeUpdate });
  }

  public setupListeners(): void {
    this.socket?.on('monitorList', (data) => {
      logger.debug('Processing monitor list event');
      this.setMonitorList(data);
    });

    this.socket?.on('info', this.setInfo.bind(this));
    this.socket?.on('heartbeatList', this.setHeartBeat.bind(this));
    this.socket?.on(
      'importantHeartbeatList',
      this.setImportantHeartBeatList.bind(this),
    );
    this.socket?.on('avgPing', (monitorId: number, avgPing: number | null) => {
      this.setAvgPing(monitorId, avgPing);
    });
    this.socket?.on(
      'uptime',
      (monitorId: number, period: number, uptime: number) => {
        this.setMonitorUptime(monitorId, period, uptime);
      },
    );
    this.socket?.on('heartbeat', (monitorId: number, heartBeat: HeartBeat) => {
      this.addHeartBeat(monitorId, heartBeat);
    });
  }

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
    logger.debug('Getting beats for monitor:', monitorId);
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

  public async reconnect(): Promise<void> {
    return this.connectAndAuthenticate();
  }

  private async handleReconnect(): Promise<void> {
    try {
      await this.connectAndAuthenticate();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  public disconnect(): void {
    this.monitorsInitialized = false;
    this.socket?.disconnect();
    this.socket = null;
  }

  public getMonitor(id: number): Monitor | undefined {
    return this.monitors.find((monitor) => monitor.id === id);
  }
}

// client singleton
export let globalClient: UptimeKumaClient | null = null;
