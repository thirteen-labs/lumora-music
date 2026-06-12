import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { Song, Playlist } from '@/types/media';

const PLAYLISTS_KEY = 'lumora-playlists';

function loadPlaylists(): Playlist[] {
  try {
    const raw = storage.getString(PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists: Playlist[]): void {
  try {
    storage.set(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {}
}

interface PlaylistState {
  playlists: Playlist[];
  loadPlaylists: () => void;
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  updateDescription: (id: string, description: string) => void;
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => void;
  removeSongsFromPlaylist: (playlistId: string, songIds: string[]) => void;
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  getPlaylistSongs: (playlistId: string, allSongs: Song[]) => Song[];
  isSongInPlaylist: (playlistId: string, songId: string) => boolean;
}

export const usePlaylistStore = create<PlaylistState>()(
  immer((set, get) => ({
    playlists: loadPlaylists(),

    loadPlaylists: () => {
      set((s) => {
        s.playlists = loadPlaylists();
      });
    },

    createPlaylist: (name, description = '') => {
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        description,
        songIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        artwork: null,
      };
      set((s) => {
        s.playlists.push(newPlaylist);
        savePlaylists(s.playlists);
      });
      return newPlaylist;
    },

    deletePlaylist: (id) => {
      set((s) => {
        s.playlists = s.playlists.filter((p) => p.id !== id);
        savePlaylists(s.playlists);
      });
    },

    renamePlaylist: (id, name) => {
      set((s) => {
        const playlist = s.playlists.find((p) => p.id === id);
        if (playlist) {
          playlist.name = name;
          playlist.updatedAt = Date.now();
          savePlaylists(s.playlists);
        }
      });
    },

    updateDescription: (id, description) => {
      set((s) => {
        const playlist = s.playlists.find((p) => p.id === id);
        if (playlist) {
          playlist.description = description;
          playlist.updatedAt = Date.now();
          savePlaylists(s.playlists);
        }
      });
    },

    addSongsToPlaylist: (playlistId, songIds) => {
      set((s) => {
        const playlist = s.playlists.find((p) => p.id === playlistId);
        if (playlist) {
          const uniqueNew = songIds.filter((id) => !playlist.songIds.includes(id));
          playlist.songIds.push(...uniqueNew);
          playlist.updatedAt = Date.now();
          if (!playlist.artwork && uniqueNew.length > 0) {
            playlist.artwork = null;
          }
          savePlaylists(s.playlists);
        }
      });
    },

    removeSongsFromPlaylist: (playlistId, songIds) => {
      set((s) => {
        const playlist = s.playlists.find((p) => p.id === playlistId);
        if (playlist) {
          const removeSet = new Set(songIds);
          playlist.songIds = playlist.songIds.filter((id) => !removeSet.has(id));
          playlist.updatedAt = Date.now();
          savePlaylists(s.playlists);
        }
      });
    },

    reorderPlaylistSongs: (playlistId, fromIndex, toIndex) => {
      set((s) => {
        const playlist = s.playlists.find((p) => p.id === playlistId);
        if (playlist && fromIndex >= 0 && fromIndex < playlist.songIds.length && toIndex >= 0 && toIndex < playlist.songIds.length) {
          const [item] = playlist.songIds.splice(fromIndex, 1);
          playlist.songIds.splice(toIndex, 0, item);
          playlist.updatedAt = Date.now();
          savePlaylists(s.playlists);
        }
      });
    },

    getPlaylistSongs: (playlistId, allSongs) => {
      const playlist = get().playlists.find((p) => p.id === playlistId);
      if (!playlist) return [];
      const songMap = new Map(allSongs.map((s) => [s.id, s]));
      return playlist.songIds.map((id) => songMap.get(id)).filter(Boolean) as Song[];
    },

    isSongInPlaylist: (playlistId, songId) => {
      const playlist = get().playlists.find((p) => p.id === playlistId);
      return playlist?.songIds.includes(songId) ?? false;
    },
  })),
);
