import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import { useMusicStore } from './music-store';

const PLAYLISTS_KEY = 'lumora-custom-playlists';

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  artwork?: string | null;
}

interface PlaylistState {
  playlists: Playlist[];
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  reorderSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  getPlaylistSongs: (playlistId: string) => any[];
  reloadPlaylists: () => void;
}

function loadPlaylists(): Playlist[] {
  try {
    const raw = storage.getString(PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    reportWarning('Playlist', e);
    return [];
  }
}

function savePlaylists(playlists: Playlist[]) {
  try {
    storage.set(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (e) { reportWarning('Playlist', e); }
}

export const usePlaylistStore = create<PlaylistState>()(
  immer((set, get) => ({
    playlists: loadPlaylists(),
    
    createPlaylist: (name) => {
      const id = Math.random().toString(36).substring(7);
      const newPlaylist: Playlist = {
        id,
        name,
        songIds: [],
        createdAt: Date.now(),
      };
      set((state) => {
        state.playlists.push(newPlaylist);
        savePlaylists(state.playlists);
      });
      return id;
    },

    deletePlaylist: (id) => {
      set((state) => {
        state.playlists = state.playlists.filter(p => p.id !== id);
        savePlaylists(state.playlists);
      });
    },

    renamePlaylist: (id, name) => {
      set((state) => {
        const p = state.playlists.find(p => p.id === id);
        if (p) {
          p.name = name;
          savePlaylists(state.playlists);
        }
      });
    },

    addSongToPlaylist: (playlistId, songId) => {
      set((state) => {
        const p = state.playlists.find(p => p.id === playlistId);
        if (p) {
          if (!p.songIds.includes(songId)) {
            p.songIds.push(songId);
            savePlaylists(state.playlists);
          }
        }
      });
    },

    addSongsToPlaylist: (playlistId, songIds) => {
      set((state) => {
        const p = state.playlists.find(p => p.id === playlistId);
        if (p) {
          for (const songId of songIds) {
            if (!p.songIds.includes(songId)) {
              p.songIds.push(songId);
            }
          }
          savePlaylists(state.playlists);
        }
      });
    },

    removeSongFromPlaylist: (playlistId, songId) => {
      set((state) => {
        const p = state.playlists.find(p => p.id === playlistId);
        if (p) {
          p.songIds = p.songIds.filter(id => id !== songId);
          savePlaylists(state.playlists);
        }
      });
    },

    reorderSongs: (playlistId, fromIndex, toIndex) => {
      set((state) => {
        const p = state.playlists.find(p => p.id === playlistId);
        if (p) {
          const [moved] = p.songIds.splice(fromIndex, 1);
          p.songIds.splice(toIndex, 0, moved);
          savePlaylists(state.playlists);
        }
      });
    },

    getPlaylistSongs: (playlistId) => {
      const playlist = get().playlists.find(p => p.id === playlistId);
      if (!playlist) return [];
      const allSongs = useMusicStore.getState().songs;
      return playlist.songIds
        .map(id => allSongs.find(s => s.id === id))
        .filter(s => !!s);
    },

    reloadPlaylists: () => {
      set((state) => {
        state.playlists = loadPlaylists();
      });
    },
  })),
);
