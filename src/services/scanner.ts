import { Platform } from 'react-native';
import type { Song, Album as LumoraAlbum, Artist, Genre, MediaScanStatus } from '@/types/media';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import {
  saveSongArtworkFile,
  getCachedAlbumArtwork,
  setCachedAlbumArtwork,
  getCachedSongArtwork,
} from '@/services/artwork-cache';
import {
  parseFilenameMetadata,
  cleanString,
  parseAlbumFromPath,
} from '@/utils/filename-metadata';
import { logger } from '@/utils/logger';
import { useReplayGainStore } from '@/store/replay-gain-store';

const CACHED_SONGS_KEY = 'lumora-cached-songs';
const CACHED_ALBUMS_KEY = 'lumora-cached-albums';
const CACHED_ARTISTS_KEY = 'lumora-cached-artists';
const CACHED_GENRES_KEY = 'lumora-cached-genres';
const CACHED_VERSION_KEY = 'lumora-cache-version';
const SCANNER_LAST_SCAN_KEY = 'lumora-scanner-last-scan';

const CACHE_VERSION = 3;

const MEDIA_FETCH_TIMEOUT = 30000;
const SCAN_MAX_RETRIES = 2;
const SCAN_RETRY_DELAY = 2000;
const PAGE_BATCH_SIZE = 500;
const WORKER_CONCURRENCY = 20;
const META_CACHE_SAVE_DEBOUNCE_MS = 5000;
const PERMISSION_POLL_TIMEOUT = 15000;
const PERMISSION_POLL_INTERVAL = 500;

export type ScanErrorCode =
  | 'MODULES_FAILED'
  | 'PERMISSION_DENIED'
  | 'SCAN_FAILED';

export interface ScanDiagnostics {
  android: boolean;
  mediaStore: boolean;
  mediaLibrary: boolean;
  metadataRetriever: boolean;
  fileSystem: boolean;
}

export interface ScanResult {
  songs: Song[];
  albums: LumoraAlbum[];
  artists: Artist[];
  genres: Genre[];
  error?: {
    code: ScanErrorCode;
    message: string;
  };
  diagnostics?: ScanDiagnostics;
}

interface MediaLibraryAsset {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  size?: number;
  duration: number;
  creationTime: number;
  modificationTime: number;
  albumId: string;
  width?: number;
  height?: number;
  mediaType?: string;
}

interface AssetsResult {
  assets: MediaLibraryAsset[];
  hasNextPage: boolean;
  endCursor: string | undefined;
  totalCount?: number;
}

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, label: string, maxRetries = SCAN_MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxRetries) {
        const delay = SCAN_RETRY_DELAY * Math.pow(2, attempt);
        logger.warn(`[Scanner] Retry ${attempt + 1}/${maxRetries} for ${label} in ${delay}ms:`, e);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error(`All ${maxRetries + 1} attempts failed for ${label}`);
}

const isAndroid = Platform.OS === 'android';

type MediaStoreModule = typeof import('@obsidian_north/react-native-mediastore');
let MediaStore: MediaStoreModule | null = null;
let MediaLibrary: {
  requestPermissionsAsync?: () => Promise<{ status: string }>;
  getAssetsAsync?: (params: { first: number; after?: string; mediaType: string; sortBy: string }) => Promise<AssetsResult>;
  getAssetInfoAsync?: (assetId: string) => Promise<{ fileSize?: number; size?: number; localUri?: string }>;
  MediaType?: { audio: string };
} | null = null;
let MetadataRetriever: {
  MetadataPresets: Record<string, string[]>;
  getMetadata: (uri: string, fields: string[]) => Promise<Record<string, unknown>>;
} | null = null;
let FileSystemLegacy: {
  getInfoAsync: (uri: string) => Promise<{ exists: boolean; size?: number }>;
} | null = null;

async function loadModules(): Promise<boolean> {
  let hasMediaLibrary = false;

  if (isAndroid) {
    try {
      const ms = await import('@obsidian_north/react-native-mediastore');
      MediaStore = ms as typeof MediaStore;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load react-native-mediastore');
    }
    try {
      const fs = await import('expo-file-system/legacy');
      FileSystemLegacy = fs as typeof FileSystemLegacy;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load expo-file-system/legacy');
    }
    try {
      const ml = await import('expo-media-library/legacy');
      MediaLibrary = ml as typeof MediaLibrary;
      hasMediaLibrary = true;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load expo-media-library/legacy (android)');
      try {
        const ml2 = await import('expo-media-library');
        if (typeof ml2.getAssetsAsync === 'function') {
          MediaLibrary = ml2 as typeof MediaLibrary;
          hasMediaLibrary = true;
        }
      } catch (e2) {
        reportWarning('Scanner', e2, 'Failed to load expo-media-library (android)');
      }
    }
    if (!MediaStore && !hasMediaLibrary) {
      reportWarning('Scanner', null, 'No media module available on Android (mediastore + media-library both failed)');
      return false;
    }
    return true;
  }

  try {
    const ml = await import('expo-media-library/legacy');
    MediaLibrary = ml as typeof MediaLibrary;
    hasMediaLibrary = true;
  } catch (e) {
    reportWarning('Scanner', e, 'Failed to load expo-media-library/legacy');
    try {
      const ml = await import('expo-media-library');
      if (typeof ml.getAssetsAsync === 'function') {
        MediaLibrary = ml as typeof MediaLibrary;
        hasMediaLibrary = true;
      } else {
        reportWarning('Scanner', null, 'expo-media-library (new API) lacks getAssetsAsync');
      }
    } catch (e2) {
      reportWarning('Scanner', e2, 'Failed to load expo-media-library');
    }
  }
  try {
    const mr = await import('@missingcore/react-native-metadata-retriever');
    MetadataRetriever = mr as unknown as typeof MetadataRetriever;
  } catch (e) {
    reportWarning('Scanner', e, 'Metadata parsing disabled');
  }
  try {
    const fs = await import('expo-file-system/legacy');
    FileSystemLegacy = fs as typeof FileSystemLegacy;
  } catch (e) {
    reportWarning('Scanner', e, 'Failed to load expo-file-system/legacy');
  }
  if (!hasMediaLibrary) {
    reportWarning('Scanner', null, 'Media library module is required but failed to load');
    return false;
  }
  return true;
}

let modulesLoaded = false;
let moduleLoadAttempted = false;
let permissionCache: boolean | null = null;

async function ensureModulesLoaded(): Promise<boolean> {
  if (modulesLoaded) return true;
  if (!moduleLoadAttempted) {
    moduleLoadAttempted = true;
    modulesLoaded = await loadModules();
  }
  if (!modulesLoaded) {
    moduleLoadAttempted = false;
  }
  return modulesLoaded;
}

const METADATA_CACHE_KEY = 'lumora-metadata-cache';
const METADATA_CACHE_MAX = 5000;

let cachedSongs: Song[] = [];
let cachedAlbums: LumoraAlbum[] = [];
let cachedArtists: Artist[] = [];
let cachedGenres: Genre[] = [];
let _cacheLoaded = false;
let _metadataCache: Record<string, {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  artwork: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string | null;
}> = {};

let _metadataCacheTimer: ReturnType<typeof setTimeout> | null = null;

function loadMetadataCache(): void {
  try {
    const raw = storage.getString(METADATA_CACHE_KEY);
    if (raw) _metadataCache = JSON.parse(raw);
  } catch (e) { logger.warn('Failed to load metadata cache:', e); }
}

function saveMetadataCache(): void {
  trimMetadataCache();
  try { storage.set(METADATA_CACHE_KEY, JSON.stringify(_metadataCache)); } catch (e) { logger.warn('Failed to save metadata cache:', e); }
}

function scheduleMetadataCacheSave(): void {
  if (_metadataCacheTimer) clearTimeout(_metadataCacheTimer);
  _metadataCacheTimer = setTimeout(() => {
    saveMetadataCache();
    _metadataCacheTimer = null;
  }, META_CACHE_SAVE_DEBOUNCE_MS);
}

function trimMetadataCache(): void {
  const keys = Object.keys(_metadataCache);
  if (keys.length > METADATA_CACHE_MAX) {
    const toRemove = keys.length - METADATA_CACHE_MAX;
    const remove = new Set(keys.slice(0, toRemove));
    for (const key of remove) delete _metadataCache[key];
  }
}

function getCachedMetadata(uri: string) {
  return _metadataCache[uri] ?? null;
}

function setCachedMetadata(uri: string, meta: {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  artwork: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels?: number | null;
  codec?: string | null;
}): void {
  _metadataCache[uri] = { ..._metadataCache[uri], ...meta };
  scheduleMetadataCacheSave();
}

/**
 * Enriches a song with accurate technical metadata (bitrate, sample rate,
 * channel count, codec) by opening the file via the media-store module's
 * deep metadata extractor. Catalog queries often leave these null, so this
 * fills them in. Results are cached persistently per URI.
 */
async function enrichTechnicalMetadata(song: Song): Promise<Song> {
  if (!MediaStore?.getDetailedMetadataByUri) return song;

  const cached = _metadataCache[song.uri];
  const hasDetailed =
    !!cached && (cached.channels !== undefined || cached.codec !== undefined);
  if (hasDetailed) {
    if (song.bitrate == null && cached.bitrate != null) song.bitrate = cached.bitrate;
    if (song.sampleRate == null && cached.sampleRate != null) song.sampleRate = cached.sampleRate;
    song.channels = cached.channels ?? null;
    song.codec = cached.codec ?? null;
    return song;
  }

  try {
    const detail = await MediaStore.getDetailedMetadataByUri(song.uri);
    const audio = detail?.audio;
    if (audio) {
      if (song.bitrate == null && audio.bitrate != null) song.bitrate = audio.bitrate;
      if (song.sampleRate == null && audio.sampleRate != null) song.sampleRate = audio.sampleRate;
      song.channels = audio.channels ?? null;
      song.codec = audio.codec ?? null;
      setCachedMetadata(song.uri, {
        title: cached?.title ?? null,
        artist: cached?.artist ?? null,
        album: cached?.album ?? null,
        genre: cached?.genre ?? null,
        artwork: cached?.artwork ?? null,
        bitrate: song.bitrate,
        sampleRate: song.sampleRate,
        channels: song.channels,
        codec: song.codec,
      });
    }
  } catch (error) {
    logger.warn('[Scanner] getDetailedMetadataByUri failed:', song.uri, error);
  }
  return song;
}

function loadCachedDataFromStorage(): void {
  const tryParse = <T>(key: string, fallback: T): T => {
    try {
      const raw = storage.getString(key);
      if (raw) return JSON.parse(raw);
    } catch (error) {
      reportWarning('Scanner', error, `Failed to load cached data: ${key}`);
    }
    return fallback;
  };

  cachedSongs = tryParse(CACHED_SONGS_KEY, cachedSongs);
  cachedAlbums = tryParse(CACHED_ALBUMS_KEY, cachedAlbums);
  cachedArtists = tryParse(CACHED_ARTISTS_KEY, cachedArtists);
  cachedGenres = tryParse(CACHED_GENRES_KEY, cachedGenres);
}

function getCacheVersion(): number {
  try {
    return storage.getNumber(CACHED_VERSION_KEY) ?? 0;
  } catch {
    return 0;
  }
}

function clearCachedData(): void {
  _metadataCache = {};
  cachedSongs = [];
  cachedAlbums = [];
  cachedArtists = [];
  cachedGenres = [];
  for (const key of [
    CACHED_SONGS_KEY,
    CACHED_ALBUMS_KEY,
    CACHED_ARTISTS_KEY,
    CACHED_GENRES_KEY,
    METADATA_CACHE_KEY,
  ]) {
    try {
      storage.remove(key);
    } catch (e) { logger.warn('Failed to remove cached data key:', e); }
  }
}

function saveCachedDataToStorage(): void {
  try {
    storage.set(CACHED_SONGS_KEY, JSON.stringify(cachedSongs));
    storage.set(CACHED_ALBUMS_KEY, JSON.stringify(cachedAlbums));
    storage.set(CACHED_ARTISTS_KEY, JSON.stringify(cachedArtists));
    storage.set(CACHED_GENRES_KEY, JSON.stringify(cachedGenres));
    saveMetadataCache();
  } catch (error) {
    reportWarning('Scanner', error, 'Failed to save cached data to storage');
  }
}

function ensureCacheLoaded(): void {
  if (!_cacheLoaded) {
    _cacheLoaded = true;
    if (getCacheVersion() !== CACHE_VERSION) {
      clearCachedData();
      return;
    }
    loadMetadataCache();
    loadCachedDataFromStorage();
  }
}

function getDiagnostics(): ScanDiagnostics {
  return {
    android: isAndroid,
    mediaStore: !!MediaStore,
    mediaLibrary: !!MediaLibrary,
    metadataRetriever: !!MetadataRetriever,
    fileSystem: !!FileSystemLegacy,
  };
}

export async function diagnoseMediaModule(): Promise<ScanDiagnostics> {
  await ensureModulesLoaded();
  return getDiagnostics();
}

export function getCachedSongs(): Song[] { ensureCacheLoaded(); return cachedSongs; }
export function getCachedAlbums(): LumoraAlbum[] { ensureCacheLoaded(); return cachedAlbums; }
export function getCachedArtists(): Artist[] { ensureCacheLoaded(); return cachedArtists; }
export function getCachedGenres(): Genre[] { ensureCacheLoaded(); return cachedGenres; }

export async function requestPermissions(force = false): Promise<boolean> {
  if (force) permissionCache = null;
  if (!force && permissionCache === true) return true;

  try {
    if (isAndroid) {
      if (MediaStore) {
        try {
          const status = await MediaStore.requestPermissions();
          const granted = status.audio;
          if (granted) {
            permissionCache = true;
            return true;
          }

          const deadline = Date.now() + PERMISSION_POLL_TIMEOUT;
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, PERMISSION_POLL_INTERVAL));
            const check = await MediaStore.checkPermissions();
            const polled = check.audio;
            if (polled) {
              permissionCache = true;
              return true;
            }
          }

          logger.warn('[Scanner] Media permission not granted within timeout');
        } catch (error) {
          logger.error('[Scanner] MediaStore permission request failed:', error);
        }
      }

      if (MediaLibrary && typeof MediaLibrary.requestPermissionsAsync === 'function') {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted' || status === 'limited') {
            permissionCache = true;
            return true;
          }
        } catch (error) {
          logger.error('[Scanner] MediaLibrary permission request failed:', error);
        }
      }

      return false;
    }

    if (!MediaLibrary) return false;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const mediaLibraryGranted = status === 'granted';
    if (mediaLibraryGranted) permissionCache = true;
    return mediaLibraryGranted;
  } catch (error) {
    logger.error('[Scanner] Permission request failed:', error);
    return false;
  }
}

async function getFileSize(uri: string): Promise<number> {
  if (!FileSystemLegacy) return 0;
  try {
    const info = await FileSystemLegacy.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch (error) {
    logger.warn('[Scanner] getFileSize failed for:', uri, error);
  }
  return 0;
}

async function getAssetFileSize(
  assetUri: string,
  assetId?: string,
  preloadedInfo?: { fileSize?: number; size?: number; localUri?: string } | null,
): Promise<number> {
  try {
    if (preloadedInfo && typeof preloadedInfo.fileSize === 'number' && preloadedInfo.fileSize > 0) {
      return preloadedInfo.fileSize;
    }
    if (preloadedInfo && typeof preloadedInfo.size === 'number' && preloadedInfo.size > 0) {
      return preloadedInfo.size;
    }
    if (assetId && MediaLibrary) {
      const assetInfo = preloadedInfo ?? await MediaLibrary.getAssetInfoAsync(assetId);
      if (assetInfo) {
        const fileSize = assetInfo.fileSize ?? assetInfo.size;
        if (typeof fileSize === 'number' && fileSize > 0) {
          return fileSize;
        }
      }
      if (assetInfo?.localUri) {
        const size = await getFileSize(assetInfo.localUri);
        if (size > 0) return size;
      }
    }
  } catch (error) {
    logger.warn('[Scanner] getAssetFileSize failed:', assetUri, error);
  }
  const fsSize = await getFileSize(assetUri);
  if (fsSize > 0) return fsSize;
  return 0;
}

function estimateFileSizeFromBitrate(bitrate: number | null, sampleRate: number | null, duration: number): number {
  if (bitrate && bitrate > 0) {
    return Math.round((bitrate / 8) * duration);
  }
  if (sampleRate && sampleRate > 0) {
    return Math.round(sampleRate * 2 * 2 * duration);
  }
  return 0;
}

/**
 * Best-effort ReplayGain extraction. The metadata library only exposes a single
 * R128 track gain (Android), so that is used as the track gain; album gain and
 * peaks are not surfaced by the public API and stay null (the engine then falls
 * back to preamp-only and skips peak clipping). Gated on the RG setting so we
 * don't pay an extra native call per file for users who don't use ReplayGain.
 */
async function parseReplayGain(uri: string): Promise<{
  trackGain: number | null;
  albumGain: number | null;
  trackPeak: number | null;
  albumPeak: number | null;
}> {
  if (!useReplayGainStore.getState().enabled) {
    return { trackGain: null, albumGain: null, trackPeak: null, albumPeak: null };
  }
  try {
    const mod: any = await import('@missingcore/react-native-metadata-retriever');
    const gain = await mod.getR128Gain?.(uri);
    const trackGain = typeof gain === 'number' && isFinite(gain) ? gain : null;
    return { trackGain, albumGain: null, trackPeak: null, albumPeak: null };
  } catch {
    return { trackGain: null, albumGain: null, trackPeak: null, albumPeak: null };
  }
}

async function parseAudioMetadata(uri: string): Promise<{
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  artwork: string | null;
  bitrate: number | null;
  sampleRate: number | null;
}> {
  const cached = getCachedMetadata(uri);
  if (cached) return cached;

  if (!MetadataRetriever) {
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
  try {
    const fields = [
      ...MetadataRetriever.MetadataPresets.standard,
      'genre',
      'bitrate',
      'sampleRate',
    ];
    const meta = await MetadataRetriever.getMetadata(uri, fields);
    const artwork = await saveSongArtworkFile(uri);

    const result = {
      title: String(meta.title ?? ''),
      artist: String(meta.artist ?? ''),
      album: String(meta.albumTitle ?? ''),
      genre: String(meta.genre ?? ''),
      artwork,
      bitrate: Number(meta.bitrate ?? 0),
      sampleRate: Number(meta.sampleRate ?? 0),
    };
    setCachedMetadata(uri, result);
    return result;
  } catch (error) {
    logger.warn('[Scanner] parseAudioMetadata failed for:', uri, error);
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
}

async function processMediaStoreItem(
  item: import('@obsidian_north/react-native-mediastore').AudioItem,
): Promise<Song | null> {
  try {
    const uri = item.contentUri ?? item.uri;
    if (!uri) return null;

    let fileSize = item.size ?? 0;
    if (fileSize <= 0) {
      fileSize = estimateFileSizeFromBitrate(item.bitrate ?? null, item.sampleRate ?? null, item.duration ?? 0);
    }

    const filenameMeta = parseFilenameMetadata(item.displayName ?? item.title ?? '');
    const title = cleanString(item.title) ?? filenameMeta.title;
    const artist = cleanString(item.artist) ?? filenameMeta.artist ?? 'Unknown Artist';
    const album =
      cleanString(item.album) ??
      parseAlbumFromPath(item.relativePath) ??
      filenameMeta.album ??
      'Unknown Album';

    // Try cached embedded artwork to show thumbnails instantly before background enrichment
    const cachedArt = getCachedSongArtwork(uri);
    const song: Song = {
      id: item.id ?? uri,
      uri,
      title,
      artist,
      album,
      albumId: item.albumId ?? item.id ?? uri,
      duration: item.duration ?? 0,
      fileSize,
      dateAdded: item.dateAdded ?? 0,
      artwork: cachedArt ?? null,
      genre: cleanString(item.genre) ?? null,
      bitrate: item.bitrate ?? null,
      sampleRate: item.sampleRate ?? null,
      channels: null,
      codec: null,
    };
    const rg = await parseReplayGain(uri);
    song.replayGainTrackGain = rg.trackGain;
    song.replayGainAlbumGain = rg.albumGain;
    song.replayGainTrackPeak = rg.trackPeak;
    song.replayGainAlbumPeak = rg.albumPeak;
    return await enrichTechnicalMetadata(song);
  } catch (error) {
    logger.warn('[Scanner] Failed to process MediaStore item:', item?.id, error);
    return null;
  }
}

async function processAsset(asset: MediaLibraryAsset): Promise<Song | null> {
  try {
    const uri = asset.uri as string | undefined;
    if (!uri) return null;

    const meta = await parseAudioMetadata(uri);
    let fileSize = asset.fileSize ?? asset.size ?? 0;

    if (fileSize <= 0) {
      fileSize = await getAssetFileSize(uri, asset.id);
    }
    if (fileSize <= 0) {
      fileSize = estimateFileSizeFromBitrate(meta.bitrate, meta.sampleRate, asset.duration ?? 0);
    }

    const filenameMeta = parseFilenameMetadata(asset.filename ?? meta.title ?? '');
    const title = cleanString(meta.title) ?? filenameMeta.title;
    const artist = cleanString(meta.artist) ?? filenameMeta.artist ?? 'Unknown Artist';
    const album = cleanString(meta.album) ?? filenameMeta.album ?? 'Unknown Album';

    const song: Song = {
      id: asset.id,
      uri,
      title,
      artist,
      album,
      albumId: asset.albumId ?? asset.id,
      duration: asset.duration ?? 0,
      fileSize,
      dateAdded: asset.creationTime ?? 0,
      artwork: meta.artwork,
      genre: cleanString(meta.genre) ?? null,
      bitrate: meta.bitrate,
      sampleRate: meta.sampleRate,
      channels: null,
      codec: null,
    };
    const rg = await parseReplayGain(uri);
    song.replayGainTrackGain = rg.trackGain;
    song.replayGainAlbumGain = rg.albumGain;
    song.replayGainTrackPeak = rg.trackPeak;
    song.replayGainAlbumPeak = rg.albumPeak;
    return await enrichTechnicalMetadata(song);
  } catch (error) {
    logger.warn('[Scanner] Failed to process audio asset:', asset?.id, error);
    return null;
  }
}

function markCacheValid(): void {
  try {
    storage.set(CACHED_VERSION_KEY, CACHE_VERSION);
    storage.set(SCANNER_LAST_SCAN_KEY, Date.now());
  } catch (e) { logger.warn('Failed to mark cache valid:', e); }
}

async function processBatch(assets: MediaLibraryAsset[], concurrency = 10): Promise<Song[]> {
  const results: Song[] = [];
  const queue = [...assets];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const asset = queue.shift();
      if (!asset) continue;
      const song = await processAsset(asset);
      if (song) results.push(song);
    }
  }

  const workers = Array(Math.min(concurrency, assets.length))
    .fill(0)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function fetchSongsViaMediaLibrary(
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  if (!MediaLibrary || typeof MediaLibrary.getAssetsAsync !== 'function') return [];
  const allSongs: Song[] = [];
  const MediaType = MediaLibrary.MediaType;

  const fetchPage = async (params: { first: number; after?: string; mediaType: string; sortBy: string }): Promise<AssetsResult> => {
    const raw = await fetchWithTimeout(
      retryWithBackoff(() => MediaLibrary.getAssetsAsync(params), 'getAssetsAsync'),
      MEDIA_FETCH_TIMEOUT,
      'getAssetsAsync',
    );
    return raw as AssetsResult;
  };

  let result: AssetsResult = await fetchPage({
    first: PAGE_BATCH_SIZE,
    mediaType: MediaType?.audio ?? 'audio',
    sortBy: 'default',
  });

  let nextPagePromise: Promise<AssetsResult> | null = null;
  if (result.hasNextPage && result.endCursor) {
    nextPagePromise = fetchPage({
      first: PAGE_BATCH_SIZE,
      after: result.endCursor,
      mediaType: MediaType?.audio ?? 'audio',
      sortBy: 'default',
    });
  }

  while (result.assets.length > 0) {
    const songs = await processBatch(result.assets, WORKER_CONCURRENCY);
    allSongs.push(...songs);
    onProgress?.(songs.length);

    if (!nextPagePromise) break;

    result = await nextPagePromise;
    nextPagePromise = null;

    if (result.hasNextPage && result.endCursor) {
      nextPagePromise = fetchPage({
        first: PAGE_BATCH_SIZE,
        after: result.endCursor,
        mediaType: MediaType?.audio ?? 'audio',
        sortBy: 'default',
      });
    }
  }

  return allSongs;
}

async function fetchSongsAndroid(
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  if (!MediaStore && !MediaLibrary) return [];

  let primaryError: unknown = null;

  if (MediaStore) {
    try {
      if (typeof MediaStore.refresh === 'function') {
        await MediaStore.refresh();
      }

      // Page the query so very large libraries don't materialize as a single
      // giant native array / JS allocation. Limit/offset pagination is provided
      // by the 3.3 API; we stop once a page returns fewer items than the limit.
      const GET_AUDIO_PAGE_SIZE = 2000;
      const songs: import('@obsidian_north/react-native-mediastore').AudioItem[] = [];
      let offset = 0;
      let page: import('@obsidian_north/react-native-mediastore').AudioItem[];
      do {
        page = await fetchWithTimeout(
          retryWithBackoff(
            () =>
              MediaStore.getAudio(
                { field: MediaStore.SortField.DateAdded, order: MediaStore.SortOrder.Descending },
                { mimeTypes: ['audio/*'] },
                { limit: GET_AUDIO_PAGE_SIZE, offset },
              ),
            'getAudio',
          ),
          MEDIA_FETCH_TIMEOUT,
          'getAudio',
        );
        songs.push(...page);
        offset += page.length;
      } while (page.length === GET_AUDIO_PAGE_SIZE);

      logger.log(`[Scanner] MediaStore.getAudio returned ${songs.length} items`);

      const results: Song[] = [];
      for (const item of songs) {
        // Skip non-music catalog entries (ringtone/alarm/notification tones)
        if (item.isRingtone || item.isAlarm || item.isNotification) continue;
        const song = await processMediaStoreItem(item);
        if (song) results.push(song);
      }
      logger.log(`[Scanner] Processed ${results.length} songs from ${songs.length} items`);
      if (results.length > 0) {
        onProgress?.(results.length);
        return results;
      }

      if (typeof MediaStore.getStatistics === 'function') {
        try {
          const stats = await MediaStore.getStatistics();
          logger.log(`[Scanner] MediaStore returned 0 songs. stats: audio=${stats?.totalAudio}, video=${stats?.totalVideo}, images=${stats?.totalImages}, documents=${stats?.totalDocuments}, totalSize=${stats?.totalSize}`);
        } catch (statsError) {
          logger.warn('[Scanner] Failed to read MediaStore statistics:', statsError);
        }
      }
    } catch (e) {
      logger.warn('[Scanner] fetchSongsAndroid (mediastore) failed:', e);
      primaryError = e;
    }
  } else {
    logger.warn('[Scanner] MediaStore module unavailable on Android');
  }

  if (MediaLibrary && typeof MediaLibrary.getAssetsAsync === 'function') {
    try {
      logger.log('[Scanner] Falling back to expo-media-library on Android');
      const fallbackSongs = await fetchSongsViaMediaLibrary(onProgress);
      if (fallbackSongs.length > 0) {
        logger.log(`[Scanner] MediaLibrary fallback returned ${fallbackSongs.length} songs`);
        return fallbackSongs;
      }
      logger.warn('[Scanner] MediaLibrary fallback returned 0 songs');
    } catch (fallbackError) {
      logger.warn('[Scanner] MediaLibrary fallback failed:', fallbackError);
      if (primaryError) logger.warn('[Scanner] Primary mediastore error was:', primaryError);
    }
  }

  return [];
}

async function fetchSongs(
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  return isAndroid ? fetchSongsAndroid(onProgress) : fetchSongsViaMediaLibrary(onProgress);
}

/**
 * Assigns MediaStore album artwork (content URIs) to songs that lack artwork.
 * Results are cached by album id so the MediaStore is not re-queried on every scan.
 */
async function enrichAlbumArtwork(songs: Song[]): Promise<void> {
  if (!MediaStore || typeof MediaStore.getAlbumArtwork !== 'function') return;

  const albumIds = [...new Set(songs.map((s) => s.albumId).filter(Boolean))];
  await Promise.all(
    albumIds.map(async (albumId) => {
      try {
        let artwork = getCachedAlbumArtwork(albumId);
        if (!artwork) {
          const fetched = await MediaStore.getAlbumArtwork(albumId);
          if (fetched && typeof fetched === 'string' && fetched.length > 0) {
            artwork = fetched;
            setCachedAlbumArtwork(albumId, fetched);
          }
        }
        if (!artwork) return;
        for (const song of songs) {
          if (song.albumId === albumId && !song.artwork) {
            song.artwork = artwork;
          }
        }
      } catch (error) {
        logger.warn('[Scanner] getAlbumArtwork failed for album:', albumId, error);
      }
    }),
  );
}

const INCREMENTAL_TS_KEY = 'lumora-mediastore-inc-ts';

function getIncrementalSyncTimestamp(): number {
  try {
    return storage.getNumber(INCREMENTAL_TS_KEY) ?? 0;
  } catch {
    return 0;
  }
}

function setIncrementalSyncTimestamp(ts: number): void {
  try {
    storage.set(INCREMENTAL_TS_KEY, ts);
  } catch {
    /* ignore */
  }
}

/**
 * Uses the 3.3 `refreshIncremental` API to detect media changes since the last
 * baseline without re-querying the whole library. Returns true when audio items
 * were added/modified/removed, after invalidating the module's native cache so
 * the next scan observes the changes. Android-only: the MediaStore module backs
 * the Android path; iOS uses expo-media-library, which has no incremental API.
 */
export async function syncIncrementalIfChanged(): Promise<boolean> {
  if (!isAndroid || !MediaStore) return false;
  try {
    const last = getIncrementalSyncTimestamp();
    const changes = await MediaStore.refreshIncremental(last);
    setIncrementalSyncTimestamp(changes.timestamp);
    if (changes.added + changes.modified + changes.removed > 0) {
      if (typeof MediaStore.refresh === 'function') {
        await MediaStore.refresh();
      }
      return true;
    }
  } catch (e) {
    logger.warn('[Scanner] refreshIncremental failed:', e);
  }
  return false;
}

export async function scanMediaLibrary(
  onStatusChange?: (status: MediaScanStatus) => void,
  onProgress?: (processed: number, total: number) => void,
  force = false,
): Promise<ScanResult> {
  onStatusChange?.('scanning');
  onProgress?.(0, 1);

  ensureCacheLoaded();
  const loaded = await ensureModulesLoaded();
  if (!loaded) {
    logger.warn('Media scanner modules failed to load');
    onStatusChange?.('error');
    return {
      songs: [],
      albums: [],
      artists: [],
      genres: [],
      error: { code: 'MODULES_FAILED', message: 'No media module could be loaded.' },
      diagnostics: getDiagnostics(),
    };
  }

  try {
    const hasPermission = await requestPermissions(force);
    if (!hasPermission) {
      logger.warn('[Scanner] Scan aborted: media permission not granted');
      onStatusChange?.('error');
      return {
        songs: [],
        albums: [],
        artists: [],
        genres: [],
        error: { code: 'PERMISSION_DENIED', message: 'Media permission not granted.' },
        diagnostics: getDiagnostics(),
      };
    }

    const songs: Song[] = [];

    let songsProcessed = 0;
    const fetchedSongs = await fetchSongs((count) => {
      songsProcessed += count;
      onProgress?.(songsProcessed, songsProcessed);
    });
    songs.push(...fetchedSongs);

    const existingSongMap = new Map<string, number>(
      cachedSongs.filter((s) => s.dateAdded > 0).map((s) => [s.uri, s.dateAdded]),
    );
    for (const song of songs) {
      if (existingSongMap.has(song.uri)) {
        song.dateAdded = existingSongMap.get(song.uri)!;
      } else {
        song.dateAdded = Date.now();
      }
    }

    if (isAndroid) {
      await enrichAlbumArtwork(songs);
    }

    const albumMap = new Map<string, LumoraAlbum>();
    for (const song of songs) {
      const existing = albumMap.get(song.albumId);
      if (existing) {
        existing.songCount++;
      } else {
        albumMap.set(song.albumId, {
          id: song.albumId,
          title: song.album,
          artist: song.artist,
          artwork: song.artwork,
          songCount: 1,
          dateAdded: song.dateAdded,
        });
      }
    }
    const albums = Array.from(albumMap.values());

    const artistMap = new Map<string, Artist>();
    for (const song of songs) {
      const existing = artistMap.get(song.artist);
      if (existing) {
        existing.songCount++;
      } else {
        artistMap.set(song.artist, {
          id: song.artist,
          name: song.artist,
          artwork: song.artwork,
          songCount: 1,
          albumCount: 0,
        });
      }
    }
    const artists = Array.from(artistMap.values());

    const genreMap = new Map<string, Genre>();
    for (const song of songs) {
      const genreName = song.genre ?? 'Unknown Genre';
      const existing = genreMap.get(genreName);
      if (existing) {
        existing.songCount++;
      } else {
        genreMap.set(genreName, {
          id: genreName,
          name: genreName,
          songCount: 1,
        });
      }
    }
    const genres = Array.from(genreMap.values());

    cachedSongs = songs;
    cachedAlbums = albums;
    cachedArtists = artists;
    cachedGenres = genres;
    saveCachedDataToStorage();
    markCacheValid();

    if (isAndroid && MediaStore && typeof MediaStore.getLastRefreshTimestamp === 'function') {
      try {
        setIncrementalSyncTimestamp(await MediaStore.getLastRefreshTimestamp());
      } catch {
        setIncrementalSyncTimestamp(Date.now());
      }
    }

    onProgress?.(songs.length, songs.length);
    onStatusChange?.('complete');
    return { songs, albums, artists, genres, diagnostics: getDiagnostics() };
  } catch (error) {
    logger.error('Media scan error:', error);
    const errorInfo = {
      code: 'SCAN_FAILED' as ScanErrorCode,
      message: error instanceof Error ? error.message : String(error),
    };
    if (cachedSongs.length > 0) {
      logger.warn('[Scanner] Scan failed – returning cached data as fallback');
      onStatusChange?.('complete');
      onProgress?.(cachedSongs.length, cachedSongs.length);
      return { songs: cachedSongs, albums: cachedAlbums, artists: cachedArtists, genres: cachedGenres, error: errorInfo, diagnostics: getDiagnostics() };
    }
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], error: errorInfo, diagnostics: getDiagnostics() };
  }
}
