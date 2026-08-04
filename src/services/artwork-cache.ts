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

type MetadataRetrieverModule = typeof import('@missingcore/react-native-metadata-retriever');

let retrieverPromise: Promise<MetadataRetrieverModule | null> | null = null;

function loadMetadataRetriever(): Promise<MetadataRetrieverModule | null> {
  if (Platform.OS !== 'android') return Promise.resolve(null);
  if (!retrieverPromise) {
    retrieverPromise = import('@missingcore/react-native-metadata-retriever')
      .then((mod) => mod)
      .catch((e) => {
        reportWarning('ArtworkCache', e, 'Metadata retriever unavailable');
        return null;
      });
  }
  return retrieverPromise;
}

/**
 * Saves the embedded artwork of a song as a thumbnail file (Android only).
 * Returns a `file://` URI, or null when there is no artwork or saving fails.
 * Paths are cached in MMKV so repeated calls resolve instantly.
 */
export async function saveSongArtworkFile(songUri: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  const cached = getCachedSongArtwork(songUri);
  if (cached) return cached;

  const mr = await loadMetadataRetriever();
  if (!mr?.saveArtwork) return null;

  try {
    const saved = await mr.saveArtwork(songUri, {
      compress: 0.85,
      format: mr.SaveFormat.JPEG,
    });
    if (saved && typeof saved === 'string' && saved.startsWith('file:')) {
      setCachedSongArtwork(songUri, saved);
      return saved;
    }
  } catch (e) {
    reportWarning('ArtworkCache', e, `Failed to save artwork for ${songUri}`);
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

  const mr = await loadMetadataRetriever();
  if (!mr?.saveArtwork) return {};

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
