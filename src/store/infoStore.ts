import { create } from 'zustand';

import type { Info } from '@/api';

// Define store type
interface InfoStore {
  // State
  info: Info;
  // Actions
  setInfo: (info: Info) => void;
  getInfo: () => Info;
  reset: () => void;
}

export const infoStore = create<InfoStore>((set, get) => ({
  info: {
    isContainer: false,
    latestVersion: '',
    primaryBaseURL: null,
    serverTimezone: '',
    serverTimezoneOffset: '',
    version: '',
  },

  setInfo: (info: Info) => set({ info }),
  getInfo: () => get().info,
  reset: () =>
    set({
      info: {
        isContainer: false,
        latestVersion: '',
        primaryBaseURL: null,
        serverTimezone: '',
        serverTimezoneOffset: '',
        version: '',
      },
    }),
}));
