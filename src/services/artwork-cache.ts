import { Platform } from 'react-native';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import type { Song } from '@/types/media';

const SONG_ARTWORK_KEY = 'lumora-song-artwork';
const ALBUM_ARTWORK_KEY = 'lumora-album-artwork';

const ARTWORK_SAVE_CONCURRENCY = 4;

type ArtworkMap = Record<string, string>;

function readMap(key: string): ArtworkMap {
  try {
    const raw = storage.getString(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as ArtworkMap;
    }
  } catch (e) {
    reportWarning('ArtworkCache', e, `Failed to parse ${key}`);
  }
  return {};
}

function writeMap(key: string, map: ArtworkMap): void {
  try {
    storage.set(key, JSON.stringify(map));
  } catch (e) {
    reportWarning('ArtworkCache', e, `Failed to save ${key}`);
  }
}

export function getCachedSongArtwork(songUri: string): string | null {
  return readMap(SONG_ARTWORK_KEY)[songUri] ?? null;
}

export function setCachedSongArtwork(songUri: string, artwork: string): void {
  const map = readMap(SONG_ARTWORK_KEY);
  if (map[songUri] === artwork) return;
  map[songUri] = artwork;
  writeMap(SONG_ARTWORK_KEY, map);
}

export function getCachedAlbumArtwork(albumId: string): string | null {
  return readMap(ALBUM_ARTWORK_KEY)[albumId] ?? null;
}

export function setCachedAlbumArtwork(albumId: string, artwork: string): void {
  const map = readMap(ALBUM_ARTWORK_KEY);
  if (map[albumId] === artwork) return;
  map[albumId] = artwork;
  writeMap(ALBUM_ARTWORK_KEY, map);
}

type MediaStoreModule = typeof import('@obsidian_north/react-native-mediastore');

let mediaStorePromise: Promise<MediaStoreModule | null> | null = null;

function loadMediaStore(): Promise<MediaStoreModule | null> {
  if (Platform.OS !== 'android') return Promise.resolve(null);
  if (!mediaStorePromise) {
    mediaStorePromise = import('@obsidian_north/react-native-mediastore')
      .then((mod) => mod as unknown as MediaStoreModule)
      .catch(() => null);
  }
  return mediaStorePromise;
}

/**
 * Saves the embedded artwork of a song as a thumbnail file (Android only).
 * Returns a `file://` URI, or null when there is no artwork or saving fails.
 * Paths are cached in MMKV so repeated calls resolve instantly.
 *
 * Uses the MediaStore deep extractor (`getDetailedMetadataByUri` /
 * `getMetadata(level:full)`) which surfaces embedded artwork via the
 * artwork field. Returns null when MediaStore yields nothing — callers fall
 * back to album art or `persistThumbnail` for durability.
 */
export async function saveSongArtworkFile(songUri: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  const cached = getCachedSongArtwork(songUri);
  if (cached) return cached;

  // Try latest MediaStore deep extractor first — no extra native dependency
  try {
    const ms = await loadMediaStore();
    if (ms?.getDetailedMetadataByUri) {
      const detail = await ms.getDetailedMetadataByUri(songUri) as unknown as Record<string, unknown> | null;
      const artwork = detail?.['artwork'] as { uri?: string; available?: boolean } | string | undefined;
      const uri = typeof artwork === 'string' ? artwork : artwork?.uri;
      if (uri && typeof uri === 'string' && uri.length > 0) {
        // artwork may already be a file:// or content:// URI; if content://,
        // leave persistence to thumbnail-cache; for file:// we can cache directly
        if (uri.startsWith('file://')) {
          setCachedSongArtwork(songUri, uri);
          return uri;
        }
        if (uri.startsWith('content://')) {
          // content artwork URIs are valid directly; cache them as well
          setCachedSongArtwork(songUri, uri);
          return uri;
        }
      }
    }
    if (ms?.getMetadata) {
      try {
        const res = await (ms as unknown as { getMetadata: (u: string, o?: unknown) => Promise<unknown> }).getMetadata(songUri, { level: 'full' });
        const payload = res as { metadata?: Record<string, unknown> } | Record<string, unknown> | null;
        const meta: Record<string, unknown> | null = payload && typeof payload === 'object' && 'metadata' in (payload as Record<string, unknown>) && (payload as { metadata?: Record<string, unknown> }).metadata
          ? (payload as { metadata: Record<string, unknown> }).metadata
          : (payload as Record<string, unknown>) ?? null;
        const art = meta?.['artwork'] as string | { uri?: string } | undefined;
        const uri = typeof art === 'string' ? art : art && typeof art === 'object' ? (art as { uri?: string }).uri : undefined;
        if (uri && uri.length > 0) {
          setCachedSongArtwork(songUri, uri);
          return uri;
        }
      } catch {
        // getMetadata full may fail for some formats — fall through
      }
    }
  } catch {
    // MediaStore attempt failed
    return null;
  }

  return null;
}

/**
 * Background pass that generates thumbnail files for songs still missing
 * artwork (e.g. MediaStore items without album art). Returns a mapping of
 * song uri -> saved artwork path so callers can apply the updates through
 * their own state management. Reports the number updated via `onProgress`.
 */
export async function enrichMissingArtwork(
  songs: Song[],
  onProgress?: (updated: number) => void,
): Promise<Record<string, string>> {
  if (Platform.OS !== 'android') return {};

  const missing = songs.filter((s) => !s.artwork);
  if (missing.length === 0) return {};

  const updates: Record<string, string> = {};
  let updated = 0;
  for (let i = 0; i < missing.length; i += ARTWORK_SAVE_CONCURRENCY) {
    const batch = missing.slice(i, i + ARTWORK_SAVE_CONCURRENCY);
    await Promise.all(
      batch.map(async (song) => {
        const saved = await saveSongArtworkFile(song.uri);
        if (saved) {
          updates[song.uri] = saved;
          updated++;
        }
      }),
    );
    onProgress?.(updated);
  }
  return updates;
}

/** Drops cached artwork entries whose songs no longer exist. */
export function pruneArtworkCache(validSongUris: Set<string>): void {
  const map = readMap(SONG_ARTWORK_KEY);
  let changed = false;
  for (const uri of Object.keys(map)) {
    if (!validSongUris.has(uri)) {
      delete map[uri];
      changed = true;
    }
  }
  if (changed) writeMap(SONG_ARTWORK_KEY, map);
}
