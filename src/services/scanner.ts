import {
  requestPermissionsAsync,
  getAssetsAsync,
  getAssetInfoAsync,
  MediaType as LegacyMediaType,
} from 'expo-media-library/legacy';
import {
  MetadataPresets,
  getArtwork,
  getMetadata,
} from '@missingcore/react-native-metadata-retriever';
import type { Song, Album as LumoraAlbum, Artist, Genre, Video, MediaScanStatus } from '@/types/media';

const METADATA_FIELDS = [
  ...MetadataPresets.standard,
  'genre',
  'bitrate',
  'sampleRate',
  'artworkData',
] as const;

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
  const { status } = await requestPermissionsAsync();
  return status === 'granted';
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
  try {
    const [meta, artwork] = await Promise.all([
      getMetadata(uri, METADATA_FIELDS),
      getArtwork(uri),
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

async function fetchSongs(): Promise<Song[]> {
  const batch = 500;
  const allSongs: Song[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getAssetsAsync({
      first: batch,
      after: cursor,
      mediaType: LegacyMediaType.audio,
      sortBy: 'default',
    });

    if (result.assets.length === 0) break;

    const resolved = await Promise.all(
      result.assets.map(async (asset) => {
        const info = await getAssetInfoAsync(asset.id);
        const meta = await parseAudioMetadata(info.uri ?? asset.uri);

        return {
          id: info.id,
          uri: info.uri ?? asset.uri,
          title: meta.title ?? asset.filename.replace(/\.[^/.]+$/, ''),
          artist: meta.artist ?? 'Unknown Artist',
          album: meta.album ?? 'Unknown Album',
          albumId: info.id,
          duration: info.duration ?? 0,
          fileSize: 0,
          dateAdded: info.creationTime ?? 0,
          artwork: meta.artwork ?? info.uri ?? asset.uri,
          genre: meta.genre,
          bitrate: meta.bitrate,
          sampleRate: meta.sampleRate,
        };
      }),
    );

    allSongs.push(...resolved);
    hasMore = result.hasNextPage;
    cursor = result.endCursor;
  }

  return allSongs;
}

async function fetchVideos(): Promise<Video[]> {
  const batch = 500;
  const allVideos: Video[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getAssetsAsync({
      first: batch,
      after: cursor,
      mediaType: LegacyMediaType.video,
      sortBy: 'default',
    });

    if (result.assets.length === 0) break;

    const resolved = await Promise.all(
      result.assets.map(async (asset) => {
        const info = await getAssetInfoAsync(asset.id);
        return {
          id: info.id,
          uri: info.uri ?? asset.uri,
          title: info.filename?.replace(/\.[^/.]+$/, '') ?? asset.filename.replace(/\.[^/.]+$/, ''),
          duration: info.duration ?? asset.duration ?? 0,
          fileSize: 0,
          dateAdded: info.creationTime ?? asset.creationTime ?? 0,
          thumbnail: info.uri ?? asset.uri,
          width: info.width ?? asset.width,
          height: info.height ?? asset.height,
        };
      }),
    );

    allVideos.push(...resolved);
    hasMore = result.hasNextPage;
    cursor = result.endCursor;
  }

  return allVideos;
}

export async function scanMediaLibrary(
  onStatusChange?: (status: MediaScanStatus) => void,
): Promise<{ songs: Song[]; albums: LumoraAlbum[]; artists: Artist[]; genres: Genre[]; videos: Video[] }> {
  onStatusChange?.('scanning');

  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onStatusChange?.('error');
      return { songs: [], albums: [], artists: [], genres: [], videos: [] };
    }

    const [songs, videos] = await Promise.all([
      fetchSongs(),
      fetchVideos(),
    ]);

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

    onStatusChange?.('complete');
    return { songs, albums, artists, genres, videos };
  } catch (error) {
    console.error('Media scan error:', error);
    onStatusChange?.('error');
    return { songs: [], albums: [], artists: [], genres: [], videos: [] };
  }
}
