import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import { logger } from '@/utils/logger';

const ARTWORK_CACHE_DIR = `${FileSystem.cacheDirectory}artwork-preview/`;
const CACHE_INDEX_KEY = 'lumora-artwork-preview-cache';

type CacheIndex = Record<string, string>;

function readIndex(): CacheIndex {
  try {
    const raw = storage.getString(CACHE_INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { logger.warn('Failed to read artwork cache index:', e); }
  return {};
}

function writeIndex(index: CacheIndex): void {
  try {
    storage.set(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (e) { logger.warn('Failed to write artwork cache index:', e); }
}

function hashUri(uri: string): string {
  let h = 0;
  for (let i = 0; i < uri.length; i++) {
    h = ((h << 5) - h + uri.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

async function ensureCacheDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(ARTWORK_CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(ARTWORK_CACHE_DIR, { intermediates: true });
    }
  } catch (e) { logger.warn('Failed to create artwork cache dir:', e); }
}

/**
 * Resolves an artwork URI to a local file URI suitable for rendering.
 * - `content://` URIs are copied to the local cache directory.
 * - `file://` and `http(s)://` URIs are returned as-is.
 * - Results are indexed in MMKV so repeated lookups are instant.
 */
export async function resolveArtworkForDisplay(uri: string): Promise<string | null> {
  if (!uri) return null;

  if (!uri.startsWith('content://')) return uri;

  const index = readIndex();
  const cached = index[uri];
  if (cached) {
    try {
      const info = await FileSystem.getInfoAsync(cached);
      if (info.exists) return cached;
    } catch (e) { logger.warn('Failed to check cached artwork:', e); }
  }

  if (Platform.OS !== 'android') return null;

  try {
    await ensureCacheDir();
    const path = `${ARTWORK_CACHE_DIR}${hashUri(uri)}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: path });
    index[uri] = path;
    writeIndex(index);
    return path;
  } catch (e) {
    reportWarning('ArtworkResolver', e, `Failed to cache artwork: ${uri}`);
    return null;
  }
}
