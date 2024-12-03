import { create } from 'zustand'

import type { Monitor } from '@/api'

interface MonitorStoreInterface {
  // State
  monitors: Monitor[] | null
  // Actions
  setMonitor: (monitors: Monitor[]) => void
  getMonitor: () => Monitor[] | null
}

export const monitorStore = create<MonitorStoreInterface>((set, get) => ({
  monitors: null,

  setMonitor: (monitors: Monitor[]) => set({ monitors }),
  getMonitor: () => get().monitors,
}))