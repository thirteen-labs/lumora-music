import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'lumora-storage' });

export function getCachedJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function setCachedJSON(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[MMKV] Failed to serialize', key, e);
  }
}

export function removeItem(key: string): void {
  storage.remove(key);
}

export function clearStorage(): void {
  storage.clearAll();
}
