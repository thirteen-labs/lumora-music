import { storage, getCachedJSON, setCachedJSON } from '@/services/mmkv';
import type { FileItem } from '@/services/file-browser';

const CACHE_PREFIX = 'lumora-dircache-';
const CACHE_TTL_MS = 30_000;
const MAX_CACHED_DIRS = 200;

interface CacheEntry {
  items: FileItem[];
  timestamp: number;
  showHidden: boolean;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

export function getCachedDirectory(uri: string, showHidden: boolean): FileItem[] | null {
  try {
    const key = CACHE_PREFIX + uri;
    const entry = getCachedJSON<CacheEntry | null>(key, null);
    if (!entry) return null;
    if (isExpired(entry) || entry.showHidden !== showHidden) {
      return null;
    }
    return entry.items;
  } catch {
    return null;
  }
}

export function setCachedDirectory(uri: string, items: FileItem[], showHidden: boolean): void {
  try {
    const key = CACHE_PREFIX + uri;
    const entry: CacheEntry = { items, timestamp: Date.now(), showHidden };
    setCachedJSON(key, entry);
    trimCache();
  } catch {}
}

export function invalidateCache(uri?: string): void {
  try {
    if (uri) {
      const key = CACHE_PREFIX + uri;
      storage.remove(key);
    } else {
      const keys = storage.getAllKeys().filter((k: string) => k.startsWith(CACHE_PREFIX));
      for (const k of keys) storage.remove(k);
    }
  } catch {}
}

function trimCache(): void {
  try {
    const keys = storage.getAllKeys().filter((k: string) => k.startsWith(CACHE_PREFIX));
    if (keys.length <= MAX_CACHED_DIRS) return;
    const entries = keys.map((k: string) => {
      const raw = storage.getString(k);
      if (!raw) return { key: k, timestamp: 0 };
      try {
        return { key: k, timestamp: JSON.parse(raw).timestamp ?? 0 };
      } catch {
        return { key: k, timestamp: 0 };
      }
    });
    entries.sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
    const toRemove = entries.length - MAX_CACHED_DIRS;
    for (let i = 0; i < toRemove; i++) {
      storage.remove(entries[i].key);
    }
  } catch {}
}
