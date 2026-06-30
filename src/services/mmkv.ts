import { createMMKV } from 'react-native-mmkv';
import { reportWarning } from '@/utils/error-handler';

export const storage = createMMKV({ id: 'lumora-storage' });

const VERSION_KEY = 'lumora-storage-version';
const CURRENT_VERSION = 1;
const BACKUP_PREFIX = 'lumora-backup-';
const MAX_BACKUPS = 3;

function getStorageVersion(): number {
  try {
    return storage.getNumber(VERSION_KEY) ?? 0;
  } catch {
    return 0;
  }
}

function setStorageVersion(): void {
  try {
    storage.set(VERSION_KEY, CURRENT_VERSION);
  } catch {}
}

export function checkStorageIntegrity(): boolean {
  try {
    const version = getStorageVersion();
    if (version === 0) {
      setStorageVersion();
      return true;
    }
    if (version > CURRENT_VERSION) {
      console.warn('[MMKV] Storage was written by a newer version of the app');
      return true;
    }
    return true;
  } catch (e) {
    reportWarning('MMKV', e, 'Storage integrity check failed');
    return false;
  }
}

function tryParseJSON<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getCachedJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (raw) {
      const parsed = tryParseJSON<T>(raw);
      if (parsed !== null) return parsed;
      console.warn(`[MMKV] Corrupt data detected for key: ${key}, using fallback`);
    }
  } catch {}
  return fallback;
}

export function setCachedJSON(key: string, value: unknown): void {
  try {
    const serialized = JSON.stringify(value);
    storage.set(key, serialized);
  } catch (e) {
    reportWarning('MMKV', `Failed to serialize ${key}`, e as any);
  }
}

export function removeItem(key: string): void {
  try {
    storage.remove(key);
  } catch (e) {
    reportWarning('MMKV', `Failed to remove ${key}`, e as any);
  }
}

export function clearStorage(): void {
  try {
    storage.clearAll();
  } catch (e) {
    reportWarning('MMKV', 'Failed to clear storage', e as any);
  }
}

export function createBackup(label: string): void {
  try {
    const backupKey = `${BACKUP_PREFIX}${label}`;
    const snapshot: Record<string, string> = {};
    const keys = storage.getAllKeys();
    for (const key of keys) {
      const val = storage.getString(key);
      if (val !== undefined) {
        snapshot[key] = val;
      }
    }
    storage.set(backupKey, JSON.stringify(snapshot));
    trimBackups();
  } catch (e) {
    reportWarning('MMKV', `Failed to create backup: ${label}`, e as any);
  }
}

function trimBackups(): void {
  try {
    const keys = storage.getAllKeys().filter((k) => k.startsWith(BACKUP_PREFIX));
    if (keys.length <= MAX_BACKUPS) return;
    const sorted = keys.sort();
    for (let i = 0; i < sorted.length - MAX_BACKUPS; i++) {
      storage.remove(sorted[i]);
    }
  } catch {}
}

export function restoreFromBackup(label: string): boolean {
  try {
    const backupKey = `${BACKUP_PREFIX}${label}`;
    const raw = storage.getString(backupKey);
    if (!raw) return false;
    const snapshot = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(snapshot)) {
      storage.set(key, value);
    }
    return true;
  } catch (e) {
    reportWarning('MMKV', `Failed to restore backup: ${label}`, e as any);
    return false;
  }
}
