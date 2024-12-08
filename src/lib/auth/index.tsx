import { create } from 'zustand';

import { clientStore } from '@/store/clientStore';
import { infoStore } from '@/store/infoStore';
import { monitorStore } from '@/store/monitorContext';

import { createSelectors } from '../utils';
import type { AuthCredentials } from './utils';
import { getToken, removeToken, setToken } from './utils';

interface AuthState {
  credentials: AuthCredentials | null;
  status: 'idle' | 'unauthenticated' | 'authenticated';
  signIn: (data: AuthCredentials) => void;
  signOut: () => void;
  hydrate: () => void;
}

const _useAuth = create<AuthState>((set, get) => ({
  status: 'idle',
  credentials: null,
  signIn: (credentials) => {
    setToken(credentials);
    set({ status: 'authenticated', credentials });
  },
  signOut: () => {
    console.debug('Signing out');
    monitorStore.reset();
    infoStore.getState().reset();
    clientStore.getClient()?.disconnect();
    clientStore.destroyClient();

    removeToken();
    set({ status: 'unauthenticated', credentials: null });
  },
  hydrate: () => {
    try {
      const userToken = getToken();
      if (userToken !== null) {
        get().signIn(userToken);
      } else {
        get().signOut();
      }
    } catch (e) {
      // catch error here
      // Maybe sign_out user!
    }
  },
}));

export const useAuth = createSelectors(_useAuth);

export const signOut = () => _useAuth.getState().signOut();
export const signIn = (token: AuthCredentials) => _useAuth.getState().signIn(token);
export const hydrateAuth = () => _useAuth.getState().hydrate();
