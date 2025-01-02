import { useCallback, useState } from 'react';

import type { Info } from '@/api';
import { getItem, setItem } from '@/lib/storage';

// Extend Info type
interface InfoWithOffset extends Info {
  offsetMs?: number;
}

const STORAGE_KEY = 'info_store';

const DEFAULT_INFO: InfoWithOffset = {
  isContainer: false,
  latestVersion: '',
  primaryBaseURL: null,
  serverTimezone: '',
  serverTimezoneOffset: '',
  version: '',
  offsetMs: 0
};

// Helper to calculate offset
const calculateOffsetMs = (offsetStr: string): number => {
  const matches = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
  if (!matches) return 0;

  const sign = matches[1] === '+' ? 1 : -1;
  const hours = parseInt(matches[2]);
  const minutes = parseInt(matches[3]);

  return sign * ((hours * 60 + minutes) * 60 * 1000);
};

// Static state
let staticState: InfoWithOffset =
  getItem<InfoWithOffset>(STORAGE_KEY) || DEFAULT_INFO;

// Static methods
const getState = () => staticState;
const setState = (newState: Info) => {
  const offsetMs = calculateOffsetMs(newState.serverTimezoneOffset);
  staticState = { ...newState, offsetMs };
  setItem(STORAGE_KEY, staticState);
};

export const useInfoStore = () => {
  const [info, setInfoState] = useState<InfoWithOffset>(staticState);

  const setInfo = useCallback((newInfo: Info) => {
    const offsetMs = calculateOffsetMs(newInfo.serverTimezoneOffset);
    const newState = { ...newInfo, offsetMs };
    setInfoState(newState);
    setState(newState);
  }, []);

  const getInfo = useCallback(() => info, [info]);

  const reset = useCallback(() => {
    setInfoState(DEFAULT_INFO);
    setState(DEFAULT_INFO);
  }, []);

  return {
    info,
    setInfo,
    getInfo,
    reset
  };
};

// Static access
useInfoStore.getState = getState;
useInfoStore.setState = setState;
useInfoStore.reset = () => {
  staticState = DEFAULT_INFO;
  setItem(STORAGE_KEY, DEFAULT_INFO);
};
