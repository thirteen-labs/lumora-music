import {
  requestPermissionsAsync,
  Asset,
  Query,
  MediaType,
  AssetField,
} from 'expo-media-library';
import type { Song, Album as LumoraAlbum, Artist, Genre, Video, MediaScanStatus } from '@/types/media';

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

async function fetchAssetsByType(mediaType: MediaType): Promise<Song[] | Video[]> {
  const batch = 500;
  const allAssets: Song[] | Video[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const query = new Query()
      .eq(AssetField.MEDIA_TYPE, mediaType)
      .limit(batch)
      .offset(offset);

    const assets = await query.exe();
    if (assets.length === 0) break;

    const resolved = await Promise.all(
      assets.map(async (asset) => {
        const info = await asset.getInfo();
        return {
          id: info.id,
          uri: info.uri,
          title: info.filename.replace(/\.[^/.]+$/, ''),
          duration: info.duration ?? 0,
          fileSize: 0,
          dateAdded: info.creationTime ?? 0,
          width: info.width,
          height: info.height,
        };
      }),
    );

    if (mediaType === MediaType.AUDIO) {
      for (const r of resolved) {
        (allAssets as Song[]).push({
          ...r,
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          albumId: r.id,
          artwork: r.uri,
          genre: null,
          bitrate: null,
          sampleRate: null,
        });
      }
    } else {
      for (const r of resolved) {
        (allAssets as Video[]).push({
          ...r,
          thumbnail: r.uri,
        });
      }
    }

    offset += assets.length;
    hasMore = assets.length === batch;
  }

  return allAssets;
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

    const [audioResults, videoResults] = await Promise.all([
      fetchAssetsByType(MediaType.AUDIO),
      fetchAssetsByType(MediaType.VIDEO),
    ]);

    const songs = audioResults as Song[];
    const videos = videoResults as Video[];

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
