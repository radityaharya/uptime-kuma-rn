import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export function getItem<T>(key: string): T | null {
  try {
    const value = storage.getString(key);
    return value ? JSON.parse(value) as T : null;
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to storage (${key}):`, error);
  }
}

export function removeItem(key: string): void {
  try {
    storage.delete(key);
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error);
  }
}

// Utility to clear all storage
export function clearStorage(): void {
  try {
    storage.clearAll();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}
