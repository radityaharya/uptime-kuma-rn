
import { type UptimeKumaClient } from '@/api/client';

class ClientStore {
  private static instance: ClientStore;
  private client: UptimeKumaClient | null = null;

  private constructor() {}

  static getInstance(): ClientStore {
    if (!ClientStore.instance) {
      ClientStore.instance = new ClientStore();
    }
    return ClientStore.instance;
  }

  getClient(): UptimeKumaClient | null {
    return this.client;
  }

  setClient(client: UptimeKumaClient | null): void {
    this.client = client;
  }

  hasActiveClient(): boolean {
    return this.client !== null && this.client.socket?.connected === true;
  }

  destroyClient(): void {
    this.client = null;
  }
}

export const clientStore = ClientStore.getInstance();