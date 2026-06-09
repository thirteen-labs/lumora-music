import * as MediaLibrary from 'expo-media-library';
import type { Song, Album, Artist, Genre, Video, MediaScanStatus } from '@/types/media';

let cachedSongs: Song[] = [];
let cachedAlbums: Album[] = [];
let cachedArtists: Artist[] = [];
let cachedGenres: Genre[] = [];
let cachedVideos: Video[] = [];

export function getCachedSongs(): Song[] { return cachedSongs; }
export function getCachedAlbums(): Album[] { return cachedAlbums; }
export function getCachedArtists(): Artist[] { return cachedArtists; }
export function getCachedGenres(): Genre[] { return cachedGenres; }
export function getCachedVideos(): Video[] { return cachedVideos; }

export async function requestPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function scanMediaLibrary(
  onStatusChange?: (status: MediaScanStatus) => void,
): Promise<{ songs: Song[]; albums: Album[]; artists: Artist[]; genres: Genre[]; videos: Video[] }> {
  onStatusChange?.('scanning');

  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onStatusChange?.('error');
      return { songs: [], albums: [], artists: [], genres: [], videos: [] };
    }

    const audioAssets = await MediaLibrary.getAssetsAsync({
      mediaType: 'audio',
      first: 100000,
    });

    const videoAssets = await MediaLibrary.getAssetsAsync({
      mediaType: 'video',
      first: 100000,
    });

    const songs: Song[] = audioAssets.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      title: asset.filename.replace(/\.[^/.]+$/, ''),
      artist: (asset as any).artist ?? 'Unknown Artist',
      album: (asset as any).albumTitle ?? 'Unknown Album',
      albumId: (asset as any).albumId ?? asset.id,
      duration: asset.duration ?? 0,
      fileSize: (asset as any).fileSize ?? 0,
      dateAdded: asset.creationTime ?? 0,
      artwork: asset.uri,
      genre: (asset as any).genre ?? null,
      bitrate: null,
      sampleRate: null,
    }));

    const videos: Video[] = videoAssets.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      title: asset.filename.replace(/\.[^/.]+$/, ''),
      duration: asset.duration ?? 0,
      fileSize: (asset as any).fileSize ?? 0,
      dateAdded: asset.creationTime ?? 0,
      thumbnail: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
    }));

    const albumMap = new Map<string, Album>();
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
