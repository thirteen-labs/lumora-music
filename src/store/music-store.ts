import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Song, Album, Artist, Genre, MediaScanStatus, SortField, SortOrder } from '@/types/media';
import { scanMediaLibrary, getCachedSongs, getCachedAlbums, getCachedArtists, getCachedGenres } from '@/services/scanner';
import { useStatsStore } from '@/store/stats-store';
import { isBackgroundScanEnabled, setBackgroundScanEnabled } from '@/services/background-scanner';
import {
  findMissingFiles,
  findRemovedFiles,
  updateKnownFiles,
  getKnownFiles,
  saveScanHistory,
  getScanHistory,
} from '@/scanner/enhanced-scanner';

interface MusicState {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  genres: Genre[];
  scanStatus: MediaScanStatus;
  scanProgress: { processed: number; total: number } | null;
  lastScanTime: number;
  newSongsCount: number;
  removedSongsCount: number;
  sortField: SortField;
  sortOrder: SortOrder;
  backgroundScanEnabled: boolean;
  scan: (force?: boolean) => Promise<void>;
  setSort: (field: SortField, order: SortOrder) => void;
  getSortedSongs: () => Song[];
  setBackgroundScanEnabled: (enabled: boolean) => void;
}

export const useMusicStore = create<MusicState>()(
  immer((set, get) => ({
    songs: [],
    albums: [],
    artists: [],
    genres: [],
    scanStatus: 'idle',
    scanProgress: null,
    lastScanTime: 0,
    newSongsCount: 0,
    removedSongsCount: 0,
    sortField: 'title',
    sortOrder: 'asc',
    backgroundScanEnabled: isBackgroundScanEnabled(),

    scan: async (force?: boolean) => {
      const currentStatus = get().scanStatus;
      if (currentStatus === 'scanning') {
        return;
      }

      if (!force) {
        const cached = getCachedSongs();
        if (cached.length > 0) {
          set((state) => {
            state.songs = cached;
            state.albums = getCachedAlbums();
            state.artists = getCachedArtists();
            state.genres = getCachedGenres();
            state.scanStatus = 'complete';
            state.scanProgress = null;
          });
          return;
        }
      }

      const result = await scanMediaLibrary(
        (status) => {
          set((state) => { state.scanStatus = status; });
        },
        (processed, total) => {
          set((state) => { state.scanProgress = { processed, total }; });
        },
        { video: false },
      );

      const knownUris = new Set(Object.keys(getKnownFiles()));
      const newSongs = findMissingFiles(result.songs, knownUris);
      const removedUris = findRemovedFiles(result.songs.map((s) => s.uri));
      updateKnownFiles(result.songs);
      saveScanHistory({
        lastFullScan: force ? Date.now() : getScanHistory().lastFullScan,
        lastIncrementalScan: Date.now(),
        fileCount: result.songs.length,
      });

      set((state) => {
        state.songs = result.songs;
        state.albums = result.albums;
        state.artists = result.artists;
        state.genres = result.genres;
        state.lastScanTime = Date.now();
        state.newSongsCount = newSongs.length;
        state.removedSongsCount = removedUris.length;
        state.scanProgress = null;
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

    setBackgroundScanEnabled: (enabled) => {
      set((state) => {
        state.backgroundScanEnabled = enabled;
      });
      setBackgroundScanEnabled(enabled);
    },
  })),
);
