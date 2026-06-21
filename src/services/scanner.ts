import { Platform, PermissionsAndroid } from 'react-native';
import type { Song, Album as LumoraAlbum, Artist, Genre, Video, MediaScanStatus } from '@/types/media';
import { getVideoThumbnailUri } from '@/services/video-thumbnails';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const CACHED_SONGS_KEY = 'lumora-cached-songs';
const CACHED_ALBUMS_KEY = 'lumora-cached-albums';
const CACHED_ARTISTS_KEY = 'lumora-cached-artists';
const CACHED_GENRES_KEY = 'lumora-cached-genres';
const CACHED_VIDEOS_KEY = 'lumora-cached-videos';

let MediaLibrary: any = null;
let MetadataRetriever: any = null;
let FileSystemLegacy: any = null;

async function loadModules(): Promise<boolean> {
  let hasMediaLibrary = false;
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
  return modulesLoaded;
}

let cachedSongs: Song[] = [];
let cachedAlbums: LumoraAlbum[] = [];
let cachedArtists: Artist[] = [];
let cachedGenres: Genre[] = [];
let cachedVideos: Video[] = [];

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
  cachedVideos = tryParse(CACHED_VIDEOS_KEY, cachedVideos);
}

function saveCachedDataToStorage(): void {
  try {
    storage.set(CACHED_SONGS_KEY, JSON.stringify(cachedSongs));
    storage.set(CACHED_ALBUMS_KEY, JSON.stringify(cachedAlbums));
    storage.set(CACHED_ARTISTS_KEY, JSON.stringify(cachedArtists));
    storage.set(CACHED_GENRES_KEY, JSON.stringify(cachedGenres));
    storage.set(CACHED_VIDEOS_KEY, JSON.stringify(cachedVideos));
  } catch (error) {
    reportWarning('Scanner', error, 'Failed to save cached data to storage');
  }
}

// Load persisted cache on module init so stores can skip re-scan
loadCachedDataFromStorage();

export function getCachedSongs(): Song[] { return cachedSongs; }
export function getCachedAlbums(): LumoraAlbum[] { return cachedAlbums; }
export function getCachedArtists(): Artist[] { return cachedArtists; }
export function getCachedGenres(): Genre[] { return cachedGenres; }
export function getCachedVideos(): Video[] { return cachedVideos; }

export async function requestPermissions(options?: { audio?: boolean; video?: boolean }, force = false): Promise<boolean> {
  if (!MediaLibrary) return false;
  if (!force && permissionCache !== null) return permissionCache;
  const needAudio = options?.audio !== false;
  const needVideo = options?.video !== false;
  try {
    const { status, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();
    console.log('[Scanner] MediaLibrary permission status:', status, 'accessPrivileges:', accessPrivileges);
    let mediaLibraryGranted = status === 'granted';

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const permPromises: Promise<string>[] = [];
        if (needAudio) {
          permPromises.push(PermissionsAndroid.request('android.permission.READ_MEDIA_AUDIO' as any));
        }
        if (needVideo) {
          permPromises.push(PermissionsAndroid.request('android.permission.READ_MEDIA_VIDEO' as any));
        }
        const results = await Promise.all(permPromises);
        const allGranted = results.every((r) => r === 'granted');
        if (!allGranted) {
          console.warn('[Scanner] Some Android 13+ media permissions were denied');
        }
      } catch (permError) {
        console.error('[Scanner] Failed to request Android 13+ permissions:', permError);
      }
    } else if (Platform.OS === 'android' && Platform.Version < 33) {
      if (needAudio || needVideo) {
        try {
          const storageResult = await PermissionsAndroid.request(
            'android.permission.READ_EXTERNAL_STORAGE' as any,
          );
          console.log('[Scanner] Legacy storage permission:', storageResult);
          if (storageResult !== 'granted') {
            console.warn('[Scanner] READ_EXTERNAL_STORAGE was denied');
          }
        } catch (permError) {
          console.error('[Scanner] Failed to request legacy storage permission:', permError);
        }
      }
    }

    permissionCache = mediaLibraryGranted;
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

    return {
      title: meta.title ?? null,
      artist: meta.artist ?? null,
      album: meta.albumTitle ?? null,
      genre: meta.genre ?? null,
      artwork: artwork ?? meta.artworkData ?? null,
      bitrate: meta.bitrate ?? null,
      sampleRate: meta.sampleRate ?? null,
    };
  } catch (error) {
    console.warn('[Scanner] parseAudioMetadata failed for:', uri, error);
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
}

async function processAsset(asset: any, excludedFolders: string[] = []): Promise<Song | null> {
  try {
    const uri = asset.uri as string | undefined;
    if (!uri) return null;

    if (excludedFolders.some(folder => uri.includes(folder))) return null;

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

async function processBatch(assets: any[], concurrency = 10, excludedFolders: string[] = []): Promise<Song[]> {
  const results: Song[] = [];
  const queue = [...assets];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const asset = queue.shift()!;
      const song = await processAsset(asset, excludedFolders);
      if (song) results.push(song);
    }
  }

  const workers = Array(Math.min(concurrency, assets.length))
    .fill(0)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function fetchSongs(
  excludedFolders: string[],
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  if (!MediaLibrary || typeof MediaLibrary.getAssetsAsync !== 'function') return [];
  const batch = 500;
  const allSongs: Song[] = [];
  const MediaType = MediaLibrary.MediaType;

  // Fetch first page
  let result = await MediaLibrary.getAssetsAsync({
    first: batch,
    mediaType: MediaType?.audio ?? 'audio',
    sortBy: 'default',
  });

  // Start fetching next page in parallel with processing current page
  let nextPagePromise: Promise<any> | null = null;
  if (result.hasNextPage && result.endCursor) {
    nextPagePromise = MediaLibrary.getAssetsAsync({
      first: batch,
      after: result.endCursor,
      mediaType: MediaType?.audio ?? 'audio',
      sortBy: 'default',
    });
  }

  while (result.assets.length > 0) {
    const songs = await processBatch(result.assets, 20, excludedFolders);
    allSongs.push(...songs);
    onProgress?.(songs.length);

    if (!nextPagePromise) break;

    result = await nextPagePromise;
    nextPagePromise = null;

    if (result.hasNextPage && result.endCursor) {
      nextPagePromise = MediaLibrary.getAssetsAsync({
        first: batch,
        after: result.endCursor,
        mediaType: MediaType?.audio ?? 'audio',
        sortBy: 'default',
      });
    }
  }

  return allSongs;
}

async function processVideoAsset(asset: any, excludedFolders: string[] = []): Promise<Video | null> {
  try {
    const uri = asset.uri as string | undefined;
    if (!uri) return null;

    if (excludedFolders.some(folder => uri.includes(folder))) return null;

    let fileSize = asset.fileSize ?? asset.size ?? 0;
    if (fileSize <= 0) {
      fileSize = await getAssetFileSize(uri, asset.id);
    }
    if (fileSize <= 0 && asset.duration && asset.width && asset.height) {
      const bitrateEstimate = (asset.width ?? 1920) * (asset.height ?? 1080) * 3 * 8;
      fileSize = estimateFileSizeFromBitrate(bitrateEstimate, null, asset.duration ?? 0);
    }

    const thumbnail = getVideoThumbnailUri(uri, asset.id);

    return {
      id: asset.id,
      uri,
      title: asset.filename?.replace(/\.[^/.]+$/, '') ?? 'Unknown',
      duration: asset.duration ?? 0,
      fileSize,
      dateAdded: asset.creationTime ?? 0,
      thumbnail,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
    };
  } catch (error) {
    console.warn('[Scanner] Failed to process video asset:', asset?.id, error);
    return null;
  }
}

async function processVideoBatch(assets: any[], concurrency = 10, excludedFolders: string[] = []): Promise<Video[]> {
  const results: Video[] = [];
  const queue = [...assets];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const asset = queue.shift()!;
      const video = await processVideoAsset(asset, excludedFolders);
      if (video) results.push(video);
    }
  }

  const workers = Array(Math.min(concurrency, assets.length))
    .fill(0)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function fetchVideos(
  excludedFolders: string[],
  onProgress?: (batchCount: number) => void,
): Promise<Video[]> {
  if (!MediaLibrary || typeof MediaLibrary.getAssetsAsync !== 'function') return [];
  const batch = 500;
  const allVideos: Video[] = [];
  const MediaType = MediaLibrary.MediaType;

  let result = await MediaLibrary.getAssetsAsync({
    first: batch,
    mediaType: MediaType?.video ?? 'video',
    sortBy: 'default',
  });

  let nextPagePromise: Promise<any> | null = null;
  if (result.hasNextPage && result.endCursor) {
    nextPagePromise = MediaLibrary.getAssetsAsync({
      first: batch,
      after: result.endCursor,
      mediaType: MediaType?.video ?? 'video',
      sortBy: 'default',
    });
  }

  while (result.assets.length > 0) {
    const videos = await processVideoBatch(result.assets, 20, excludedFolders);
    allVideos.push(...videos);
    onProgress?.(videos.length);

    if (!nextPagePromise) break;

    result = await nextPagePromise;
    nextPagePromise = null;

    if (result.hasNextPage && result.endCursor) {
      nextPagePromise = MediaLibrary.getAssetsAsync({
        first: batch,
        after: result.endCursor,
        mediaType: MediaType?.video ?? 'video',
        sortBy: 'default',
      });
    }
  }

  return allVideos;
}

export async function scanMediaLibrary(
  onStatusChange?: (status: MediaScanStatus) => void,
  onProgress?: (processed: number, total: number) => void,
  options?: { audio?: boolean; video?: boolean },
): Promise<{ songs: Song[]; albums: LumoraAlbum[]; artists: Artist[]; genres: Genre[]; videos: Video[] }> {
  const scanAudio = options?.audio !== false;
  const scanVideo = options?.video !== false;

  onStatusChange?.('scanning');
  onProgress?.(0, 1);

  const loaded = await ensureModulesLoaded();
  if (!loaded) {
    console.warn('Media scanner modules failed to load');
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], videos: [] };
  }

  try {
    const hasPermission = await requestPermissions({ audio: scanAudio, video: scanVideo });
    if (!hasPermission) {
      onStatusChange?.('error');
      return { songs: [], albums: [], artists: [], genres: [], videos: [] };
    }

    let excludedFolders: string[] = [];
    try {
      const raw = storage.getString('lumora-setting-excluded-folders');
      if (raw) excludedFolders = JSON.parse(raw);
    } catch (e) {
      reportWarning('Scanner', e, 'Failed to load excluded folders');
    }

    const MediaType = MediaLibrary.MediaType;
    const countPromises: Promise<any>[] = [];
    if (scanAudio) countPromises.push(MediaLibrary.getAssetsAsync({ first: 1, mediaType: MediaType?.audio ?? 'audio' }));
    if (scanVideo) countPromises.push(MediaLibrary.getAssetsAsync({ first: 1, mediaType: MediaType?.video ?? 'video' }));
    const counts = await Promise.all(countPromises);
    const totalItems = counts.reduce((sum, c) => sum + (c.totalCount ?? 0), 0);

    let songsProcessed = 0;
    let videosProcessed = 0;

    type SongsResult = { songs: Song[] };
    type VideosResult = { videos: Video[] };
    const scanPromises: Promise<SongsResult | VideosResult>[] = [];
    if (scanAudio) {
      scanPromises.push(
        fetchSongs(excludedFolders, (count) => {
          songsProcessed += count;
          onProgress?.(songsProcessed + videosProcessed, totalItems);
        }).then((songs) => ({ songs }) as SongsResult),
      );
    }
    if (scanVideo) {
      scanPromises.push(
        fetchVideos(excludedFolders, (count) => {
          videosProcessed += count;
          onProgress?.(songsProcessed + videosProcessed, totalItems);
        }).then((videos) => ({ videos }) as VideosResult),
      );
    }
    const results = await Promise.all(scanPromises);
    const songs: Song[] = [];
    const videos: Video[] = [];
    for (const r of results) {
      if ('songs' in r) songs.push(...r.songs);
      if ('videos' in r) videos.push(...r.videos);
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

    if (scanAudio) {
      cachedSongs = songs;
      cachedAlbums = albums;
      cachedArtists = artists;
      cachedGenres = genres;
    }
    if (scanVideo) {
      cachedVideos = videos;
    }
    saveCachedDataToStorage();

    onProgress?.(totalItems, totalItems);
    onStatusChange?.('complete');
    return { songs, albums, artists, genres, videos };
  } catch (error) {
    console.error('Media scan error:', error);
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], videos: [] };
  }
}
