import { Platform } from 'react-native';
import type { Song, Album as LumoraAlbum, Artist, Genre, MediaScanStatus } from '@/types/media';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const CACHED_SONGS_KEY = 'lumora-cached-songs';
const CACHED_ALBUMS_KEY = 'lumora-cached-albums';
const CACHED_ARTISTS_KEY = 'lumora-cached-artists';
const CACHED_GENRES_KEY = 'lumora-cached-genres';
const CACHED_VERSION_KEY = 'lumora-cache-version';
const SCANNER_LAST_SCAN_KEY = 'lumora-scanner-last-scan';

const CACHE_VERSION = 2;

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

interface AssetsResult {
  assets: any[];
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
        console.warn(`[Scanner] Retry ${attempt + 1}/${maxRetries} for ${label} in ${delay}ms:`, e);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error(`All ${maxRetries + 1} attempts failed for ${label}`);
}

const isAndroid = Platform.OS === 'android';

let MediaStore: any = null;
let MediaLibrary: any = null;
let MetadataRetriever: any = null;
let FileSystemLegacy: any = null;

async function loadModules(): Promise<boolean> {
  let hasMediaLibrary = false;

  if (isAndroid) {
    try {
      const ms = await import('@obsidian_north/react-native-mediastore');
      MediaStore = ms;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load react-native-mediastore');
    }
    try {
      const fs = await import('expo-file-system/legacy');
      FileSystemLegacy = fs;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load expo-file-system/legacy');
    }
    try {
      const ml = await import('expo-media-library/legacy');
      MediaLibrary = ml;
      hasMediaLibrary = true;
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load expo-media-library/legacy (android)');
      try {
        const ml2 = await import('expo-media-library');
        if (typeof ml2.getAssetsAsync === 'function') {
          MediaLibrary = ml2;
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
    MediaLibrary = ml;
    hasMediaLibrary = true;
  } catch (e) {
    reportWarning('Scanner', e, 'Failed to load expo-media-library/legacy');
    try {
      const ml = await import('expo-media-library');
      if (typeof ml.getAssetsAsync === 'function') {
        MediaLibrary = ml;
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
    MetadataRetriever = mr;
  } catch (e) {
    reportWarning('Scanner', e, 'Metadata parsing disabled');
  }
  try {
    const fs = await import('expo-file-system/legacy');
    FileSystemLegacy = fs;
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
}> = {};

let _metadataCacheTimer: ReturnType<typeof setTimeout> | null = null;

function loadMetadataCache(): void {
  try {
    const raw = storage.getString(METADATA_CACHE_KEY);
    if (raw) _metadataCache = JSON.parse(raw);
  } catch {}
}

function saveMetadataCache(): void {
  trimMetadataCache();
  try { storage.set(METADATA_CACHE_KEY, JSON.stringify(_metadataCache)); } catch {}
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
}): void {
  _metadataCache[uri] = meta;
  scheduleMetadataCacheSave();
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
          const granted = status?.audio ?? status?.granted ?? false;
          if (granted) {
            permissionCache = true;
            return true;
          }

          const deadline = Date.now() + PERMISSION_POLL_TIMEOUT;
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, PERMISSION_POLL_INTERVAL));
            const check = await MediaStore.checkPermissions();
            const polled = check?.audio ?? check?.granted ?? false;
            if (polled) {
              permissionCache = true;
              return true;
            }
          }

          console.warn('[Scanner] Media permission not granted within timeout');
        } catch (error) {
          console.error('[Scanner] MediaStore permission request failed:', error);
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
          console.error('[Scanner] MediaLibrary permission request failed:', error);
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
    console.error('[Scanner] Permission request failed:', error);
    return false;
  }
}

async function getFileSize(uri: string): Promise<number> {
  if (!FileSystemLegacy) return 0;
  try {
    const info = await FileSystemLegacy.getInfoAsync(uri);
    if (info.exists && 'size' in info) {
      return info.size;
    }
  } catch (error) {
    console.warn('[Scanner] getFileSize failed for:', uri, error);
  }
  return 0;
}

async function getAssetFileSize(
  assetUri: string,
  assetId?: string,
  preloadedInfo?: any,
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
    console.warn('[Scanner] getAssetFileSize failed:', assetUri, error);
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
      'artworkData',
    ];
    const [meta, artwork] = await Promise.all([
      MetadataRetriever.getMetadata(uri, fields),
      MetadataRetriever.getArtwork(uri),
    ]);

    const result = {
      title: meta.title ?? null,
      artist: meta.artist ?? null,
      album: meta.albumTitle ?? null,
      genre: meta.genre ?? null,
      artwork: artwork ?? meta.artworkData ?? null,
      bitrate: meta.bitrate ?? null,
      sampleRate: meta.sampleRate ?? null,
    };
    setCachedMetadata(uri, result);
    return result;
  } catch (error) {
    console.warn('[Scanner] parseAudioMetadata failed for:', uri, error);
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
}

function processMediaStoreItem(item: any): Song | null {
  try {
    const uri = item.contentUri ?? item.uri;
    if (!uri) return null;

    let fileSize = item.size ?? 0;
    if (fileSize <= 0) {
      fileSize = estimateFileSizeFromBitrate(item.bitrate ?? null, item.sampleRate ?? null, item.duration ?? 0);
    }

    return {
      id: item.id ?? uri,
      uri,
      title: item.title ?? 'Unknown',
      artist: item.artist ?? 'Unknown Artist',
      album: item.album ?? 'Unknown Album',
      albumId: item.albumId ?? item.id ?? uri,
      duration: item.duration ?? 0,
      fileSize,
      dateAdded: item.dateAdded ?? 0,
      artwork: item.artworkUri ?? null,
      genre: item.genre ?? null,
      bitrate: item.bitrate ?? null,
      sampleRate: item.sampleRate ?? null,
    };
  } catch (error) {
    console.warn('[Scanner] Failed to process MediaStore item:', item?.id, error);
    return null;
  }
}

async function processAsset(asset: any): Promise<Song | null> {
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

    return {
      id: asset.id,
      uri,
      title: meta.title ?? asset.filename?.replace(/\.[^/.]+$/, '') ?? 'Unknown',
      artist: meta.artist ?? 'Unknown Artist',
      album: meta.album ?? 'Unknown Album',
      albumId: asset.albumId ?? asset.id,
      duration: asset.duration ?? 0,
      fileSize,
      dateAdded: asset.creationTime ?? 0,
      artwork: meta.artwork,
      genre: meta.genre,
      bitrate: meta.bitrate,
      sampleRate: meta.sampleRate,
    };
  } catch (error) {
    console.warn('[Scanner] Failed to process audio asset:', asset?.id, error);
    return null;
  }
}

function markCacheValid(): void {
  try {
    storage.set(CACHED_VERSION_KEY, CACHE_VERSION);
    storage.set(SCANNER_LAST_SCAN_KEY, Date.now());
  } catch {}
}

async function processBatch(assets: any[], concurrency = 10): Promise<Song[]> {
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

  const fetchPage = async (params: any): Promise<AssetsResult> => {
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

      const songs: any[] = await fetchWithTimeout(
        retryWithBackoff(() => MediaStore.getAudio({ field: 'dateAdded', order: 'desc' }, null, null), 'getAudio'),
        MEDIA_FETCH_TIMEOUT,
        'getAudio',
      );

      console.log(`[Scanner] MediaStore.getAudio returned ${songs.length} items`);

      const results: Song[] = [];
      for (const item of songs) {
        const song = processMediaStoreItem(item);
        if (song) results.push(song);
      }
      console.log(`[Scanner] Processed ${results.length} songs from ${songs.length} items`);
      if (results.length > 0) {
        onProgress?.(results.length);
        return results;
      }

      if (typeof MediaStore.getStatistics === 'function') {
        try {
          const stats = await MediaStore.getStatistics();
          console.log(`[Scanner] MediaStore returned 0 songs. stats: audio=${stats?.totalAudio}, video=${stats?.totalVideo}, images=${stats?.totalImages}, documents=${stats?.totalDocuments}, totalSize=${stats?.totalSize}`);
        } catch (statsError) {
          console.warn('[Scanner] Failed to read MediaStore statistics:', statsError);
        }
      }
    } catch (e) {
      console.warn('[Scanner] fetchSongsAndroid (mediastore) failed:', e);
      primaryError = e;
    }
  } else {
    console.warn('[Scanner] MediaStore module unavailable on Android');
  }

  if (MediaLibrary && typeof MediaLibrary.getAssetsAsync === 'function') {
    try {
      console.log('[Scanner] Falling back to expo-media-library on Android');
      const fallbackSongs = await fetchSongsViaMediaLibrary(onProgress);
      if (fallbackSongs.length > 0) {
        console.log(`[Scanner] MediaLibrary fallback returned ${fallbackSongs.length} songs`);
        return fallbackSongs;
      }
      console.warn('[Scanner] MediaLibrary fallback returned 0 songs');
    } catch (fallbackError) {
      console.warn('[Scanner] MediaLibrary fallback failed:', fallbackError);
      if (primaryError) console.warn('[Scanner] Primary mediastore error was:', primaryError);
    }
  }

  return [];
}

async function fetchSongs(
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  return isAndroid ? fetchSongsAndroid(onProgress) : fetchSongsViaMediaLibrary(onProgress);
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
    console.warn('Media scanner modules failed to load');
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
      console.warn('[Scanner] Scan aborted: media permission not granted');
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

    onProgress?.(songs.length, songs.length);
    onStatusChange?.('complete');
    return { songs, albums, artists, genres, diagnostics: getDiagnostics() };
  } catch (error) {
    console.error('Media scan error:', error);
    const errorInfo = {
      code: 'SCAN_FAILED' as ScanErrorCode,
      message: error instanceof Error ? error.message : String(error),
    };
    if (cachedSongs.length > 0) {
      console.warn('[Scanner] Scan failed – returning cached data as fallback');
      onStatusChange?.('complete');
      onProgress?.(cachedSongs.length, cachedSongs.length);
      return { songs: cachedSongs, albums: cachedAlbums, artists: cachedArtists, genres: cachedGenres, error: errorInfo, diagnostics: getDiagnostics() };
    }
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], error: errorInfo, diagnostics: getDiagnostics() };
  }
}
