import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Song, Album, Artist, Genre, MediaScanStatus, SortField, SortOrder } from '@/types/media';
import { scanMediaLibrary, getCachedSongs, getCachedAlbums, getCachedArtists, getCachedGenres } from '@/services/scanner';
import { useStatsStore } from '@/store/stats-store';

interface MusicState {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  genres: Genre[];
  scanStatus: MediaScanStatus;
  lastScanTime: number;
  sortField: SortField;
  sortOrder: SortOrder;
  scan: () => Promise<void>;
  setSort: (field: SortField, order: SortOrder) => void;
  getSortedSongs: () => Song[];
}

export const useMusicStore = create<MusicState>()(
  immer((set, get) => ({
    songs: [],
    albums: [],
    artists: [],
    genres: [],
    scanStatus: 'idle',
    lastScanTime: 0,
    sortField: 'title',
    sortOrder: 'asc',

    scan: async () => {
      const cached = getCachedSongs();
      if (cached.length > 0) {
        set((state) => {
          state.songs = cached;
          state.albums = getCachedAlbums();
          state.artists = getCachedArtists();
          state.genres = getCachedGenres();
          state.scanStatus = 'complete';
        });
        return;
      }

      const result = await scanMediaLibrary((status) => {
        set((state) => { state.scanStatus = status; });
      });

      set((state) => {
        state.songs = result.songs;
        state.albums = result.albums;
        state.artists = result.artists;
        state.genres = result.genres;
        state.lastScanTime = Date.now();
      });
    },

    setSort: (field, order) => {
      set((state) => {
        state.sortField = field;
        state.sortOrder = order;
      });
    },

    getSortedSongs: () => {
      const state = get();
      const stats = useStatsStore.getState().trackStats;
      const sorted = [...state.songs];
      sorted.sort((a, b) => {
        let cmp = 0;
        switch (state.sortField) {
          case 'title': cmp = a.title.localeCompare(b.title); break;
          case 'artist': cmp = a.artist.localeCompare(b.artist); break;
          case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
          case 'duration': cmp = a.duration - b.duration; break;
          case 'fileSize': cmp = a.fileSize - b.fileSize; break;
          case 'playCount': cmp = (stats[a.id]?.playCount || 0) - (stats[b.id]?.playCount || 0); break;
          case 'lastPlayed': cmp = (stats[a.id]?.lastPlayed || 0) - (stats[b.id]?.lastPlayed || 0); break;
        }
        return state.sortOrder === 'desc' ? -cmp : cmp;
      });
      return sorted;
    },
  })),
);
