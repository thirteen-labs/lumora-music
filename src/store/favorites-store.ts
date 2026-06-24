import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import type { Song } from '@/types/media';

const FAV_SONGS_KEY = 'lumora-fav-songs';

function loadIds(key: string): string[] {
  try {
    const raw = storage.getString(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { reportWarning('Favorites', e); return []; }
}

function saveIds(key: string, ids: string[]): void {
  try { storage.set(key, JSON.stringify(ids)); } catch (e) { reportWarning('Favorites', e); }
}

interface FavoritesState {
  favoriteSongIds: string[];
  songs: Song[];
  toggleSongFavorite: (song: Song) => void;
  isSongFavorite: (id: string) => boolean;
  setSongs: (songs: Song[]) => void;
  hydrateFavorites: (allSongs: Song[]) => void;
  clearSongFavorites: () => void;
  clearAllFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  immer((set, get) => ({
    favoriteSongIds: loadIds(FAV_SONGS_KEY),
    songs: [],

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

    isSongFavorite: (id) => get().favoriteSongIds.includes(id),

    setSongs: (songs) => { set((s) => { s.songs = songs; }); },

    hydrateFavorites: (allSongs) => {
      set((s) => {
        s.songs = allSongs.filter((song) => s.favoriteSongIds.includes(song.id));
      });
    },

    clearSongFavorites: () => {
      set((s) => {
        s.favoriteSongIds = [];
        s.songs = [];
        saveIds(FAV_SONGS_KEY, []);
      });
    },

    clearAllFavorites: () => {
      set((s) => {
        s.favoriteSongIds = [];
        s.songs = [];
        saveIds(FAV_SONGS_KEY, []);
      });
    },
  })),
);
