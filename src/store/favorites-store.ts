import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { Song, Video } from '@/types/media';

const FAV_SONGS_KEY = 'lumora-fav-songs';
const FAV_VIDEOS_KEY = 'lumora-fav-videos';

function loadIds(key: string): string[] {
  try {
    const raw = storage.getString(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIds(key: string, ids: string[]): void {
  try { storage.set(key, JSON.stringify(ids)); } catch {}
}

interface FavoritesState {
  favoriteSongIds: string[];
  favoriteVideoIds: string[];
  songs: Song[];
  videos: Video[];
  toggleSongFavorite: (song: Song) => void;
  toggleVideoFavorite: (video: Video) => void;
  isSongFavorite: (id: string) => boolean;
  isVideoFavorite: (id: string) => boolean;
  setSongs: (songs: Song[]) => void;
  setVideos: (videos: Video[]) => void;
  hydrateFavorites: (allSongs: Song[], allVideos: Video[]) => void;
  refreshFavoriteVideos: (allVideos: Video[]) => void;
  clearSongFavorites: () => void;
  clearVideoFavorites: () => void;
  clearAllFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  immer((set, get) => ({
    favoriteSongIds: loadIds(FAV_SONGS_KEY),
    favoriteVideoIds: loadIds(FAV_VIDEOS_KEY),
    songs: [],
    videos: [],

    toggleSongFavorite: (song) => {
      set((state) => {
        const idx = state.favoriteSongIds.indexOf(song.id);
        if (idx >= 0) {
          state.favoriteSongIds.splice(idx, 1);
          state.songs = state.songs.filter((s) => s.id !== song.id);
        } else {
          state.favoriteSongIds.push(song.id);
          state.songs.push(song);
        }
        saveIds(FAV_SONGS_KEY, state.favoriteSongIds);
      });
    },

    toggleVideoFavorite: (video) => {
      set((state) => {
        const idx = state.favoriteVideoIds.indexOf(video.id);
        if (idx >= 0) {
          state.favoriteVideoIds.splice(idx, 1);
          state.videos = state.videos.filter((v) => v.id !== video.id);
        } else {
          state.favoriteVideoIds.push(video.id);
          state.videos.push(video);
        }
        saveIds(FAV_VIDEOS_KEY, state.favoriteVideoIds);
      });
    },

    isSongFavorite: (id) => get().favoriteSongIds.includes(id),
    isVideoFavorite: (id) => get().favoriteVideoIds.includes(id),

    setSongs: (songs) => { set((s) => { s.songs = songs; }); },
    setVideos: (videos) => { set((s) => { s.videos = videos; }); },

    hydrateFavorites: (allSongs, allVideos) => {
      set((s) => {
        s.songs = allSongs.filter((song) => s.favoriteSongIds.includes(song.id));
        s.videos = allVideos.filter((video) => s.favoriteVideoIds.includes(video.id));
      });
    },

    refreshFavoriteVideos: (allVideos) => {
      set((s) => {
        s.videos = allVideos.filter((video) => s.favoriteVideoIds.includes(video.id));
      });
    },

    clearSongFavorites: () => {
      set((s) => {
        s.favoriteSongIds = [];
        s.songs = [];
        saveIds(FAV_SONGS_KEY, []);
      });
    },

    clearVideoFavorites: () => {
      set((s) => {
        s.favoriteVideoIds = [];
        s.videos = [];
        saveIds(FAV_VIDEOS_KEY, []);
      });
    },

    clearAllFavorites: () => {
      set((s) => {
        s.favoriteSongIds = [];
        s.favoriteVideoIds = [];
        s.songs = [];
        s.videos = [];
        saveIds(FAV_SONGS_KEY, []);
        saveIds(FAV_VIDEOS_KEY, []);
      });
    },
  })),
);
