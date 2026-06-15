import type { Song, Album as LumoraAlbum, Artist, Genre, Video, MediaScanStatus } from '@/types/media';

let MediaLibrary: any = null;
let MetadataRetriever: any = null;
let FileSystem: any = null;

async function loadModules(): Promise<boolean> {
  try {
    const [ml, mr, fs] = await Promise.all([
      import('expo-media-library/legacy').catch(() => import('expo-media-library')),
      import('@missingcore/react-native-metadata-retriever'),
      import('expo-file-system'),
    ]);
    MediaLibrary = ml;
    MetadataRetriever = mr;
    FileSystem = fs;
    return true;
  } catch (e) {
    console.warn('Failed to load media scanner modules:', e);
    return false;
  }
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

let cachedSongs: Song[] = [];
let cachedAlbums: LumoraAlbum[] = [];
let cachedArtists: Artist[] = [];
let cachedGenres: Genre[] = [];
let cachedVideos: Video[] = [];

export function getCachedSongs(): Song[] { return cachedSongs; }
export function getCachedAlbums(): LumoraAlbum[] { return cachedAlbums; }
export function getCachedArtists(): Artist[] { return cachedArtists; }
export function getCachedGenres(): Genre[] { return cachedGenres; }
export function getCachedVideos(): Video[] { return cachedVideos; }

export async function requestPermissions(): Promise<boolean> {
  if (!MediaLibrary) return false;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function getFileSize(uri: string): Promise<number> {
  if (!FileSystem) return 0;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info) {
      return info.size;
    }
  } catch {}
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
    if (assetId && MediaLibrary) {
      const assetInfo = preloadedInfo ?? await MediaLibrary.getAssetInfoAsync(assetId);
      if (assetInfo && typeof assetInfo.fileSize === 'number' && assetInfo.fileSize > 0) {
        return assetInfo.fileSize;
      }
      if (assetInfo?.localUri) {
        const size = await getFileSize(assetInfo.localUri);
        if (size > 0) return size;
      }
    }
  } catch {}
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
  } catch {
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
}

async function fetchSongs(
  onProgress?: (batchCount: number) => void,
): Promise<Song[]> {
  if (!MediaLibrary) return [];
  const batch = 500;
  const allSongs: Song[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  const MediaType = MediaLibrary.MediaType;

  while (hasMore) {
    const result = await MediaLibrary.getAssetsAsync({
      first: batch,
      after: cursor,
      mediaType: MediaType.audio,
      sortBy: 'default',
    });

    if (result.assets.length === 0) break;

    const resolved = await Promise.all(
      result.assets.map(async (asset: any) => {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        const uri = info.uri ?? asset.uri;
        const meta = await parseAudioMetadata(uri);
        let fileSize = await getAssetFileSize(uri, asset.id, info);

        if (fileSize <= 0) {
          fileSize = estimateFileSizeFromBitrate(meta.bitrate, meta.sampleRate, info.duration ?? asset.duration ?? 0);
        }

        return {
          id: info.id,
          uri,
          title: meta.title ?? asset.filename.replace(/\.[^/.]+$/, ''),
          artist: meta.artist ?? 'Unknown Artist',
          album: meta.album ?? 'Unknown Album',
          albumId: info.id,
          duration: info.duration ?? 0,
          fileSize,
          dateAdded: info.creationTime ?? 0,
          artwork: meta.artwork,
          genre: meta.genre,
          bitrate: meta.bitrate,
          sampleRate: meta.sampleRate,
        };
      }),
    );

    allSongs.push(...resolved);
    onProgress?.(resolved.length);
    hasMore = result.hasNextPage;
    cursor = result.endCursor;
  }

  return allSongs;
}

async function fetchVideos(
  onProgress?: (batchCount: number) => void,
): Promise<Video[]> {
  if (!MediaLibrary) return [];
  const batch = 500;
  const allVideos: Video[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  const MediaType = MediaLibrary.MediaType;

  while (hasMore) {
    const result = await MediaLibrary.getAssetsAsync({
      first: batch,
      after: cursor,
      mediaType: MediaType.video,
      sortBy: 'default',
    });

    if (result.assets.length === 0) break;

    const resolved = await Promise.all(
      result.assets.map(async (asset: any) => {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        const uri = info.uri ?? asset.uri;
        let fileSize = await getAssetFileSize(uri, asset.id, info);

        if (fileSize <= 0 && info.duration && info.width && info.height) {
          const bitrateEstimate = (info.width ?? 1920) * (info.height ?? 1080) * 3 * 8;
          fileSize = estimateFileSizeFromBitrate(bitrateEstimate, null, info.duration ?? asset.duration ?? 0);
        }

        return {
          id: info.id,
          uri,
          title: info.filename?.replace(/\.[^/.]+$/, '') ?? asset.filename.replace(/\.[^/.]+$/, ''),
          duration: info.duration ?? asset.duration ?? 0,
          fileSize,
          dateAdded: info.creationTime ?? asset.creationTime ?? 0,
          thumbnail: info.thumbnail ?? null,
          width: info.width ?? asset.width,
          height: info.height ?? asset.height,
        };
      }),
    );

    allVideos.push(...resolved);
    onProgress?.(resolved.length);
    hasMore = result.hasNextPage;
    cursor = result.endCursor;
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
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onStatusChange?.('error');
      return { songs: [], albums: [], artists: [], genres: [], videos: [] };
    }

    const MediaType = MediaLibrary.MediaType;
    const countPromises: Promise<any>[] = [];
    if (scanAudio) countPromises.push(MediaLibrary.getAssetsAsync({ first: 1, mediaType: MediaType.audio }));
    if (scanVideo) countPromises.push(MediaLibrary.getAssetsAsync({ first: 1, mediaType: MediaType.video }));
    const counts = await Promise.all(countPromises);
    const totalItems = counts.reduce((sum, c) => sum + (c.totalCount ?? 0), 0);

    let songsProcessed = 0;
    let videosProcessed = 0;

    type SongsResult = { songs: Song[] };
    type VideosResult = { videos: Video[] };
    const scanPromises: Promise<SongsResult | VideosResult>[] = [];
    if (scanAudio) {
      scanPromises.push(
        fetchSongs((count) => {
          songsProcessed += count;
          onProgress?.(songsProcessed + videosProcessed, totalItems);
        }).then((songs) => ({ songs }) as SongsResult),
      );
    }
    if (scanVideo) {
      scanPromises.push(
        fetchVideos((count) => {
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

    cachedSongs = songs;
    cachedAlbums = albums;
    cachedArtists = artists;
    cachedGenres = genres;
    cachedVideos = videos;

    onProgress?.(totalItems, totalItems);
    onStatusChange?.('complete');
    return { songs, albums, artists, genres, videos };
  } catch (error) {
    console.error('Media scan error:', error);
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], videos: [] };
  }
}
