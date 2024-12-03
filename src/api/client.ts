import { EventEmitter as ExpoEventEmitter } from 'expo-modules-core';
import io, { type Socket } from 'socket.io-client';

import { infoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorStore';

import {
  type EventPayloads,
  type HeartBeat,
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

interface MonitorUpdate {
  heartBeatList?: HeartBeat[];
  avgPing?: number;
  uptime: {
    day: number;
    month: number;
  };
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
  private tempHeartbeats: Record<number, HeartBeat[]> = {};
  private tempUptime: Record<number, { period: number; uptime: number }[]> = [];
  private tempAvgPing: Record<number, number | null> = {};

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
    return monitorStore.getState().monitors ?? [];
  }

  private set monitors(value: Monitor[]) {
    monitorStore.getState().setMonitor(value);
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

  private updateMonitor(id: number, update: Partial<MonitorUpdate>): void {
    const monitors = this.monitors;
    const index = monitors.findIndex(m => Number(m.id) === Number(id));
    if (index === -1) {
      console.warn(`Monitor ${id} not found. Current monitors:`, monitors.map(m => m.id));
      return;
    }

    const currentUptime = monitors[index].uptime || { day: 0, month: 0 };
    const updatedUptime = update.uptime 
      ? { 
          day: update.uptime.day ?? currentUptime.day ?? 0,
          month: update.uptime.month ?? currentUptime.month ?? 0
        }
      : currentUptime;

    monitors[index] = {
      ...monitors[index],
      ...update,
      uptime: updatedUptime
    };

    monitorStore.getState().setMonitor(monitors);
  }

  private setMonitorList(data: Record<string, Monitor>): void {
    console.debug('Setting monitor list', Object.keys(data).length, 'monitors');
    
    if (!this.monitorsInitialized) {
      this.monitors = Object.values(data).map(monitor => ({
        ...monitor,
        id: Number(monitor.id),
        heartBeatList: [],
        avgPing: 0,
        uptime: {
          day: monitor.uptime?.day ?? 0,
          month: monitor.uptime?.month ?? 0
        }
      }));
      this.monitorsInitialized = true;
      console.debug('Monitors initialized:', this.monitors.map(m => m.id));

      Object.keys(this.tempHeartbeats).forEach(monitorId => {
        this.setHeartBeat(Number(monitorId), this.tempHeartbeats[Number(monitorId)]);
      });
      this.tempHeartbeats = {};

      Object.keys(this.tempUptime).forEach(monitorId => {
        this.tempUptime[Number(monitorId)].forEach(({ period, uptime }: { period: number; uptime: number }) => {
          this.setMonitorUptime(Number(monitorId), period, uptime);
        });
      });
      this.tempUptime = {};

      Object.keys(this.tempAvgPing).forEach(monitorId => {
        this.setAvgPing(Number(monitorId), this.tempAvgPing[Number(monitorId)]);
      });
      this.tempAvgPing = {};

      return;
    }

    Object.values(data).forEach(monitor => {
      const index = this.monitors.findIndex(m => Number(m.id) === Number(monitor.id));
      if (index === -1) {
        this.monitors.push({
          ...monitor,
          id: Number(monitor.id),
          heartBeatList: [],
          avgPing: 0,
          uptime: {
            day: monitor.uptime?.day ?? 0,
            month: monitor.uptime?.month ?? 0
          }
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
            month: monitor.uptime?.month ?? this.monitors[index].uptime?.month ?? 0
          }
        };
      }
    });
  }

  private setHeartBeat(
    monitorId: number,
    data: HeartBeat[] | [HeartBeat[], boolean],
  ): void {
    console.debug('Setting heartbeat for monitor:', monitorId);
    if (!this.monitorsInitialized) {
      this.tempHeartbeats[monitorId] = Array.isArray(data[0])
        ? (data as [HeartBeat[], boolean])[0]
        : (data as HeartBeat[]);
      return;
    }
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

    this.updateMonitor(monitorId, { heartBeatList: heartbeats });
  }

  private addHeartBeat(monitorId: number, heartBeat: HeartBeat): void {
    console.debug('Adding heartbeat for monitor:', monitorId);
    const monitor = this.getMonitor(monitorId);
    if (!monitor) return;

    const heartBeatList = monitor.heartBeatList || [];
    this.updateMonitor(monitorId, {
      heartBeatList: [heartBeat, ...heartBeatList],
    });
  }

  private setAvgPing(monitorId: number, avgPing: number | null): void {
    console.debug('Setting avgPing for monitor:', monitorId, 'avgPing:', avgPing);
    if (!this.monitorsInitialized) {
      this.tempAvgPing[monitorId] = avgPing;
      return;
    }
    if (avgPing !== null) {
      this.updateMonitor(monitorId, { avgPing });
    }
  }

  private setMonitorUptime(monitorId: number, period: number, uptime: number): void {
    console.debug('Setting uptime for monitor:', monitorId, 'period:', period, 'uptime:', uptime);
    const updateUptime = () => {
      const monitor = this.getMonitor(monitorId);
      if (!monitor) return;

      const currentUptime = monitor.uptime || { day: 0, month: 0 };
      const uptimeUpdate = period === 24
        ? { ...currentUptime, day: uptime }
        : period === 720
          ? { ...currentUptime, month: uptime }
          : currentUptime;

      this.updateMonitor(monitorId, { uptime: uptimeUpdate });
    };

    if (!this.monitorsInitialized) {
      if (!this.tempUptime[monitorId]) {
        this.tempUptime[monitorId] = [];
      }
      this.tempUptime[monitorId].push({ period, uptime });
    } else {
      updateUptime();
    }
  }

  public setupListeners(): void {
    this.socket?.on('monitorList', (data) => {
      console.debug('Processing monitor list event');
      this.setMonitorList(data);
    });
    
    this.socket?.on('info', this.setInfo.bind(this));
    this.socket?.on('heartbeatList', this.setHeartBeat.bind(this));
    this.socket?.on('avgPing', (monitorId: number, avgPing: number | null) => {
      this.setAvgPing(monitorId, avgPing);
    });
    this.socket?.on('uptime', (monitorId: number, period: number, uptime: number) => {
      this.setMonitorUptime(monitorId, period, uptime);
    });
    this.socket?.on('heartbeat', (monitorId: number, heartBeat: HeartBeat) => {
      this.addHeartBeat(monitorId, heartBeat);
    });
  }

  public async getMonitors(): Promise<void> {
    console.debug('Fetching monitors');
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
    console.debug('Getting beats for monitor:', monitorId);
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
