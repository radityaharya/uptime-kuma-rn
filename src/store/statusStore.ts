import React from 'react';

import { type StatusPageMonitor } from '@/api/status/types';

import { getItem, setItem } from '../lib/storage';

export interface Status {
  url: string;
  monitors?: StatusPageMonitor[];
  isExternal?: boolean;
}

class StatusStore {
  private static instance: StatusStore;
  private _statusList: Status[];
  private subscribers: Set<(statusList: Status[]) => void> = new Set();

  private constructor() {
    this._statusList = getItem('statusList') || [];
  }

  static getInstance() {
    if (!StatusStore.instance) {
      StatusStore.instance = new StatusStore();
    }
    return StatusStore.instance;
  }

  subscribe(callback: (statusList: Status[]) => void) {
    this.subscribers.add(callback);
    callback(this._statusList);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this._statusList));
  }

  get statusList(): Status[] {
    return this._statusList;
  }

  addStatus(status: Status): void {
    if (!status.url) {
      console.error('Cannot add status without URL');
      throw new Error('Invalid status: missing URL');
    }

    try {
      const index = this._statusList.findIndex((s) => s.url === status.url);

      if (index !== -1) {
        const existingMonitors = this._statusList[index].monitors || [];
        const newMonitors = status.monitors || [];

        const uniqueNewMonitors = newMonitors.filter(
          (newMonitor) =>
            !existingMonitors.some(
              (existingMonitor) => existingMonitor.name === newMonitor.name,
            ),
        );

        this._statusList[index] = {
          ...this._statusList[index],
          ...status,
          monitors: [...existingMonitors, ...uniqueNewMonitors],
        };
      } else {
        this._statusList.push(status);
      }

      setItem('statusList', this._statusList);
      this.notifySubscribers();
    } catch (error) {
      console.error('Failed to add status:', error);
      throw new Error(
        `Failed to save status: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  updateStatus(updatedStatus: Status): void {
    const index = this._statusList.findIndex((s) => s.url === updatedStatus.url);

    if (index !== -1) {
      this._statusList[index] = updatedStatus;
      setItem('statusList', this._statusList);
      this.notifySubscribers();
    } else {
      console.error('Cannot update status: URL not found');
      throw new Error('Invalid status: URL not found');
    }
  }

  removeStatus(index: number): void {
    this._statusList.splice(index, 1);
    setItem('statusList', this._statusList);
    this.notifySubscribers();
  }

  clearStatusList(): void {
    this._statusList = [];
    setItem('statusList', this._statusList);
    this.notifySubscribers();
  }
}

export function useStatusStore() {
  const [statusList, setStatusList] = React.useState<Status[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = statusStore.subscribe((newStatusList) => {
      setStatusList(newStatusList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { statusList, isLoading };
}

export const statusStore = StatusStore.getInstance();
export default statusStore;
