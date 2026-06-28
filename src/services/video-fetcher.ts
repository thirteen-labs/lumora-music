import { Platform, PermissionsAndroid } from 'react-native';
import type { Video, MediaScanStatus } from '@/types/media';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const CACHED_VIDEOS_KEY = 'lumora-cached-videos';
const VIDEO_META_CACHE_KEY = 'lumora-video-meta-cache';

const MEDIA_FETCH_TIMEOUT = 30000;
const SCAN_MAX_RETRIES = 2;
const SCAN_RETRY_DELAY = 2000;
const PAGE_BATCH_SIZE = 500;
const WORKER_CONCURRENCY = 10;
const META_CACHE_SAVE_DEBOUNCE_MS = 5000;

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
        console.warn(`[VideoFetcher] Retry ${attempt + 1}/${maxRetries} for ${label} in ${delay}ms:`, e);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error(`All ${maxRetries + 1} attempts failed for ${label}`);
}

let MediaLibrary: any = null;
let MetadataRetriever: any = null;

async function loadModules(): Promise<boolean> {
  let hasMediaLibrary = false;
  try {
    const ml = await import('expo-media-library/legacy');
    MediaLibrary = ml;
    hasMediaLibrary = true;
  } catch (e) {
    reportWarning('VideoFetcher', e, 'Failed to load expo-media-library/legacy');
    try {
      const ml = await import('expo-media-library');
      if (typeof ml.getAssetsAsync === 'function') {
        MediaLibrary = ml;
        hasMediaLibrary = true;
      } else {
        reportWarning('VideoFetcher', null, 'expo-media-library lacks getAssetsAsync');
      }
    } catch (e2) {
      reportWarning('VideoFetcher', e2, 'Failed to load expo-media-library');
    }
  }
  try {
    const mr = await import('@missingcore/react-native-metadata-retriever');
    MetadataRetriever = mr;
  } catch (e) {
    reportWarning('VideoFetcher', e, 'Video metadata parsing disabled');
  }
  if (!hasMediaLibrary) {
    reportWarning('VideoFetcher', null, 'Media library module required');
    return false;
  }
  return true;
}

let modulesLoaded = false;
let moduleLoadAttempted = false;

async function ensureModulesLoaded(): Promise<boolean> {
  if (modulesLoaded) return true;
  if (!moduleLoadAttempted) {
    moduleLoadAttempted = true;
    modulesLoaded = await loadModules();
  }
  return modulesLoaded;
}

let cachedVideos: Video[] = [];
let _cacheLoaded = false;
let _videoMetaCache: Record<string, {
  title: string | null;
  artist: string | null;
  width: number;
  height: number;
  codec: string | null;
  frameRate: number | null;
  bitrate: number | null;
  language: string | null;
  hasSubtitles: boolean;
  subtitleLanguages: string[];
}> = {};

let _videoMetaCacheTimer: ReturnType<typeof setTimeout> | null = null;

function loadVideoMetaCache(): void {
  try {
    const raw = storage.getString(VIDEO_META_CACHE_KEY);
    if (raw) _videoMetaCache = JSON.parse(raw);
  } catch {}
}

function saveVideoMetaCache(): void {
  try { storage.set(VIDEO_META_CACHE_KEY, JSON.stringify(_videoMetaCache)); } catch {}
}

function scheduleVideoMetaCacheSave(): void {
  if (_videoMetaCacheTimer) clearTimeout(_videoMetaCacheTimer);
  _videoMetaCacheTimer = setTimeout(() => {
    saveVideoMetaCache();
    _videoMetaCacheTimer = null;
  }, META_CACHE_SAVE_DEBOUNCE_MS);
}

function getCachedVideoMeta(uri: string) {
  return _videoMetaCache[uri] ?? null;
}

function setCachedVideoMeta(uri: string, meta: typeof _videoMetaCache[string]): void {
  _videoMetaCache[uri] = meta;
  scheduleVideoMetaCacheSave();
}

function loadCachedVideos(): Video[] {
  if (_cacheLoaded) return cachedVideos;
  _cacheLoaded = true;
  try {
    const raw = storage.getString(CACHED_VIDEOS_KEY);
    if (raw) {
      cachedVideos = JSON.parse(raw);
    }
  } catch (e) {
    reportWarning('VideoFetcher', e, 'Failed to load cached videos');
  }
  loadVideoMetaCache();
  return cachedVideos;
}

function saveCachedVideos(): void {
  try {
    storage.set(CACHED_VIDEOS_KEY, JSON.stringify(cachedVideos));
    saveVideoMetaCache();
  } catch (e) {
    reportWarning('VideoFetcher', e, 'Failed to save cached videos');
  }
}

export function getCachedVideos(): Video[] {
  return loadCachedVideos();
}

let _videoPermCache: boolean | null = null;

export async function requestVideoPermissions(force = false): Promise<boolean> {
  if (!MediaLibrary) return false;
  if (force) _videoPermCache = null;
  if (!force && _videoPermCache !== null) return _videoPermCache;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === 'granted';

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const result = await PermissionsAndroid.request(
          'android.permission.READ_MEDIA_VIDEO' as any,
        );
        if (result !== 'granted') {
          console.warn('[VideoFetcher] READ_MEDIA_VIDEO denied');
        }
      } catch (permError) {
        console.error('[VideoFetcher] Android 13+ permission error:', permError);
      }
    } else if (Platform.OS === 'android' && Platform.Version < 33) {
      try {
        await PermissionsAndroid.request(
          'android.permission.READ_EXTERNAL_STORAGE' as any,
        );
      } catch (permError) {
        console.error('[VideoFetcher] Legacy storage permission error:', permError);
      }
    }

    _videoPermCache = granted;
    return granted;
  } catch (error) {
    console.error('[VideoFetcher] Permission request failed:', error);
    _videoPermCache = false;
    return false;
  }
}

async function parseVideoMetadata(uri: string): Promise<{
  title: string | null;
  artist: string | null;
  width: number;
  height: number;
  codec: string | null;
  frameRate: number | null;
  bitrate: number | null;
  language: string | null;
  hasSubtitles: boolean;
  subtitleLanguages: string[];
}> {
  const cached = getCachedVideoMeta(uri);
  if (cached) return cached;

  if (!MetadataRetriever) {
    return {
      title: null, artist: null, width: 0, height: 0,
      codec: null, frameRate: null, bitrate: null,
      language: null, hasSubtitles: false, subtitleLanguages: [],
    };
  }
  try {
    const fields = [
      ...MetadataRetriever.MetadataPresets.standard,
      'bitrate', 'width', 'height', 'videoCodec',
      'frameRate', 'language',
    ];
    const meta = await MetadataRetriever.getMetadata(uri, fields);

    let hasSubtitles = false;
    let subtitleLanguages: string[] = [];

    if (meta.subtitleTracks && Array.isArray(meta.subtitleTracks)) {
      hasSubtitles = meta.subtitleTracks.length > 0;
      subtitleLanguages = meta.subtitleTracks
        .map((t: any) => t.language)
        .filter(Boolean);
    }

    const result = {
      title: meta.title ?? null,
      artist: meta.artist ?? meta.author ?? null,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      codec: meta.videoCodec ?? null,
      frameRate: meta.frameRate ?? null,
      bitrate: meta.bitrate ?? null,
      language: meta.language ?? null,
      hasSubtitles,
      subtitleLanguages,
    };
    setCachedVideoMeta(uri, result);
    return result;
  } catch (error) {
    console.warn('[VideoFetcher] Metadata failed for:', uri, error);
    return {
      title: null, artist: null, width: 0, height: 0,
      codec: null, frameRate: null, bitrate: null,
      language: null, hasSubtitles: false, subtitleLanguages: [],
    };
  }
}

async function getAssetFileSize(
  assetUri: string,
  assetId?: string,
): Promise<number> {
  try {
    if (assetId && MediaLibrary) {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      if (assetInfo) {
        const fileSize = assetInfo.fileSize ?? assetInfo.size;
        if (typeof fileSize === 'number' && fileSize > 0) {
          return fileSize;
        }
      }
    }
  } catch (error) {
    console.warn('[VideoFetcher] getAssetFileSize failed:', assetUri, error);
  }
  return 0;
}

async function processVideoAsset(asset: any): Promise<Video | null> {
  try {
    const uri = asset.uri as string | undefined;
    if (!uri) return null;

    const meta = await parseVideoMetadata(uri);

    let fileSize = asset.fileSize ?? asset.size ?? 0;
    if (fileSize <= 0) {
      fileSize = await getAssetFileSize(uri, asset.id);
    }

    const title = meta.title ?? asset.filename?.replace(/\.[^/.]+$/, '') ?? 'Unknown Video';

    const video: Video = {
      id: asset.id,
      uri,
      title,
      artist: meta.artist,
      duration: asset.duration ?? 0,
      fileSize,
      dateAdded: asset.creationTime ?? 0,
      thumbnail: null,
      width: meta.width,
      height: meta.height,
      codec: meta.codec,
      frameRate: meta.frameRate,
      bitrate: meta.bitrate,
      language: meta.language,
      hasEmbeddedSubtitles: meta.hasSubtitles,
      subtitleLanguages: meta.subtitleLanguages,
    };

    return video;
  } catch (error) {
    console.warn('[VideoFetcher] Failed to process video asset:', asset?.id, error);
    return null;
  }
}

async function processVideoBatch(assets: any[], concurrency = 10): Promise<Video[]> {
  const results: Video[] = [];
  const queue = [...assets];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const asset = queue.shift();
      if (!asset) continue;
      try {
        const video = await processVideoAsset(asset);
        if (video) results.push(video);
      } catch (e) {
        console.warn('[VideoFetcher] Worker failed for:', asset?.id, e);
      }
    }
  }

  const workers = Array(Math.min(concurrency, assets.length))
    .fill(0)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function fetchAllVideos(
  onProgress?: (batchCount: number) => void,
): Promise<Video[]> {
  if (!MediaLibrary || typeof MediaLibrary.getAssetsAsync !== 'function') return [];
  const allVideos: Video[] = [];
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
    mediaType: MediaType?.video ?? 'video',
    sortBy: 'default',
  });

  let nextPagePromise: Promise<AssetsResult> | null = null;
  if (result.hasNextPage && result.endCursor) {
    nextPagePromise = fetchPage({
      first: PAGE_BATCH_SIZE,
      after: result.endCursor,
      mediaType: MediaType?.video ?? 'video',
      sortBy: 'default',
    });
  }

  while (result.assets.length > 0) {
    const videos = await processVideoBatch(result.assets, WORKER_CONCURRENCY);
    allVideos.push(...videos);
    onProgress?.(videos.length);

    if (!nextPagePromise) break;

    result = await nextPagePromise;
    nextPagePromise = null;

    if (result.hasNextPage && result.endCursor) {
      nextPagePromise = fetchPage({
        first: PAGE_BATCH_SIZE,
        after: result.endCursor,
        mediaType: MediaType?.video ?? 'video',
        sortBy: 'default',
      });
    }
  }

  return allVideos;
}

export async function fetchVideos(
  onStatusChange?: (status: MediaScanStatus) => void,
  onProgress?: (processed: number, total: number) => void,
): Promise<Video[]> {
  onStatusChange?.('scanning');
  onProgress?.(0, 1);

  const loaded = await ensureModulesLoaded();
  if (!loaded) {
    onStatusChange?.('error');
    return [];
  }

  try {
    const hasPermission = await requestVideoPermissions();
    if (!hasPermission) {
      onStatusChange?.('error');
      return [];
    }

    const MediaType = MediaLibrary.MediaType;
    let totalCount = 0;
    try {
      const countResult: AssetsResult = await retryWithBackoff(
        () => MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaType?.video ?? 'video',
        }),
        'countAssets',
      );
      totalCount = countResult.totalCount ?? 0;
    } catch {}

    let processed = 0;
    const videos = await fetchAllVideos((count) => {
      processed += count;
      onProgress?.(processed, totalCount);
    });

    loadCachedVideos();
    const existingVideoMap = new Map<string, number>(
      cachedVideos.filter((v) => v.dateAdded > 0).map((v) => [v.uri, v.dateAdded]),
    );
    for (const video of videos) {
      if (existingVideoMap.has(video.uri)) {
        video.dateAdded = existingVideoMap.get(video.uri)!;
      } else {
        video.dateAdded = Date.now();
      }
    }

    cachedVideos = videos;
    saveCachedVideos();

    onProgress?.(totalCount, totalCount);
    onStatusChange?.('complete');
    return videos;
  } catch (error) {
    console.error('[VideoFetcher] Scan error:', error);
    if (cachedVideos.length > 0) {
      console.warn('[VideoFetcher] Returning cached videos as fallback');
      onStatusChange?.('complete');
      onProgress?.(cachedVideos.length, cachedVideos.length);
      return cachedVideos;
    }
    onStatusChange?.('error');
    return [];
  }
}
