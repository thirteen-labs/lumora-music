import {
  requestPermissionsAsync,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Asset is required as a base class for Query
  Asset,
  Query,
  MediaType,
  AssetField,
} from 'expo-media-library';
import { fetchFromUrl, type IAudioMetadata } from 'music-metadata-browser';
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    result += chars[(a >> 2) & 0x3f];
    result += chars[((a << 4) | (b >> 4)) & 0x3f];
    result += i + 1 < binary.length ? chars[((b << 2) | (c >> 6)) & 0x3f] : '=';
    result += i + 2 < binary.length ? chars[c & 0x3f] : '=';
  }
  return result;
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
    const metadata: IAudioMetadata = await fetchFromUrl(uri);
    const { common, format } = metadata;

    let artwork: string | null = null;
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const bytes = new Uint8Array(pic.data);
      artwork = `data:${pic.format};base64,${bytesToBase64(bytes)}`;
    }

    return {
      title: common.title ?? null,
      artist: common.artist ?? null,
      album: common.album ?? null,
      genre: common.genre && common.genre.length > 0 ? common.genre[0] : null,
      artwork,
      bitrate: format.bitrate ?? null,
      sampleRate: format.sampleRate ?? null,
    };
  } catch {
    return { title: null, artist: null, album: null, genre: null, artwork: null, bitrate: null, sampleRate: null };
  }
}

async function fetchSongs(mediaType: MediaType.AUDIO): Promise<Song[]> {
  const batch = 500;
  const allSongs: Song[] = [];
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
        const meta = await parseAudioMetadata(info.uri);

        return {
          id: info.id,
          uri: info.uri,
          title: meta.title ?? info.filename.replace(/\.[^/.]+$/, ''),
          artist: meta.artist ?? 'Unknown Artist',
          album: meta.album ?? 'Unknown Album',
          albumId: info.id,
          duration: info.duration ?? 0,
          fileSize: 0,
          dateAdded: info.creationTime ?? 0,
          artwork: meta.artwork ?? info.uri,
          genre: meta.genre,
          bitrate: meta.bitrate,
          sampleRate: meta.sampleRate,
        };
      }),
    );

    allSongs.push(...resolved);
    offset += assets.length;
    hasMore = assets.length === batch;
  }

  return allSongs;
}

async function fetchVideos(mediaType: MediaType.VIDEO): Promise<Video[]> {
  const batch = 500;
  const allVideos: Video[] = [];
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
          thumbnail: info.uri,
          width: info.width,
          height: info.height,
        };
      }),
    );

    allVideos.push(...resolved);
    offset += assets.length;
    hasMore = assets.length === batch;
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
      fetchSongs(MediaType.AUDIO),
      fetchVideos(MediaType.VIDEO),
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
