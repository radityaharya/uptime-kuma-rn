import { type ClassValue,clsx } from 'clsx';
import { Linking } from 'react-native';
import { twMerge } from 'tailwind-merge';
import type { StoreApi, UseBoundStore } from 'zustand';

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
export const formatDateTime = (utcDate: Date) => {
  const localDate = new Date(
    utcDate.getTime() - utcDate.getTimezoneOffset() * 60000
  );

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return localDate.toLocaleString(undefined, options);
};
