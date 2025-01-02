import { type ClassValue, clsx } from 'clsx';
import { Linking } from 'react-native';
import { twMerge } from 'tailwind-merge';
import type { StoreApi, UseBoundStore } from 'zustand';

import { useInfoStore } from '@/store/infoStore';

export function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url));
}

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  let store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (let k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withServerTimezone(time: string | Date): Date {
  const date = new Date(time);
  const { offsetMs = 0 } = useInfoStore.getState();
  return new Date(date.getTime() + offsetMs);
}

export const formatDateTime = (time?: string | Date) => {
  if (!time) return 'Invalid date';

  const date = withServerTimezone(time);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: true
  };
  return date.toLocaleDateString(undefined, options);
};
