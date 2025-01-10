import { create } from 'zustand';

import { clientStore } from '@/store/clientStore';
import { useInfoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorStore';

import { stopBackgroundService } from '../background-service';
import { createSelectors } from '../utils';
import type { AuthCredentials } from './utils';
import { getToken, removeToken, setToken } from './utils';

interface AuthState {
  credentials: AuthCredentials | null;
  status: 'idle' | 'unauthenticated' | 'authenticated';
  isSigningOut: boolean;
  signIn: (data: AuthCredentials) => void;
  signOut: () => void;
  hydrate: () => Promise<void>;
}

const _useAuth = create<AuthState>((set, get) => ({
  status: 'idle',
  credentials: null,
  isSigningOut: false,

  signIn: (credentials) => {
    setToken(credentials);
    set({ status: 'authenticated', credentials });
  },

  signOut: () => {
    const state = get();
    if (state.isSigningOut) return;

    set({ isSigningOut: true });
    console.debug('Signing out');

    monitorStore.reset();
    useInfoStore.reset();

    const client = clientStore.getClient();
    if (client) {
      client.disconnect();
      client.destroy();
      clientStore.destroyClient();
    }

    stopBackgroundService();
    removeToken();

    set({
      status: 'unauthenticated',
      credentials: null,
      isSigningOut: false
    });
  },

  hydrate: async () => {
    const state = get();
    if (state.status !== 'idle') return;

    try {
      const userToken = getToken();
      if (userToken !== null) {
        get().signIn(userToken);
      } else {
        get().signOut();
      }
    } catch (e) {
      get().signOut();
    }
  }
}));

export const useAuth = createSelectors(_useAuth);

export const signOut = () => _useAuth.getState().signOut();
export const signIn = (token: AuthCredentials) =>
  _useAuth.getState().signIn(token);
export const hydrateAuth = () => _useAuth.getState().hydrate();
