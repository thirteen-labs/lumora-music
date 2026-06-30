import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Song,
  Album,
  Artist,
  Genre,
  MediaScanStatus,
  SortField,
  SortOrder,
} from "@/types/media";
import {
  scanMediaLibrary,
  getCachedSongs,
  getCachedAlbums,
  getCachedArtists,
  getCachedGenres,
} from "@/services/scanner";
import { storage } from "@/services/mmkv";
import { useStatsStore } from "@/store/stats-store";
import {
  isBackgroundScanEnabled,
  setBackgroundScanEnabled,
} from "@/services/background-scanner";
import {
  findNewSongs,
  findRemovedFiles,
  updateKnownFiles,
  getKnownFiles,
  saveScanHistory,
  getScanHistory,
} from "@/scanner/enhanced-scanner";
import {
  showScanningNotification,
  showScanCompleteNotification,
} from "@/services/notifications";
import { useToastStore } from "@/store/toast-store";

const LAST_SCAN_TIME_KEY = "lumora-last-scan-time";
const SORT_FIELD_KEY = "lumora-sort-field";
const SORT_ORDER_KEY = "lumora-sort-order";

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
    scanStatus: getCachedSongs().length > 0 ? "complete" : "idle",
    scanProgress: null,
    lastScanTime: (() => {
      try {
        const val = storage.getNumber(LAST_SCAN_TIME_KEY);
        return val ?? 0;
      } catch { return 0; }
    })(),
    newSongsCount: 0,
    removedSongsCount: 0,
    sortField: (() => {
      try { return storage.getString(SORT_FIELD_KEY) as any ?? "dateAdded"; } catch { return "dateAdded"; }
    })(),
    sortOrder: (() => {
      try { return storage.getString(SORT_ORDER_KEY) as any ?? "desc"; } catch { return "desc"; }
    })(),
    backgroundScanEnabled: isBackgroundScanEnabled(),

    scan: async (force?: boolean) => {
      const currentStatus = get().scanStatus;
      if (currentStatus === "scanning") {
        return;
      }

      const cached = getCachedSongs();
      const stale = force || cached.length === 0;

      if (!stale && cached.length > 0) {
        set((state) => {
          state.songs = cached;
          state.albums = getCachedAlbums();
          state.artists = getCachedArtists();
          state.genres = getCachedGenres();
          state.scanStatus = "complete";
          state.scanProgress = null;
        });
        return;
      }

      if (cached.length > 0) {
        set((state) => {
          state.songs = cached;
          state.albums = getCachedAlbums();
          state.artists = getCachedArtists();
          state.genres = getCachedGenres();
        });
      }

      useToastStore.getState().showToast("Scanning media library...", "music");
      showScanningNotification();
      try {
        const result = await scanMediaLibrary(
          (status) => {
            set((state) => {
              state.scanStatus = status;
            });
          },
          (processed, total) => {
            set((state) => {
              state.scanProgress = { processed, total };
            });
          },
        );

        const knownUris = new Set(Object.keys(getKnownFiles()));
        const newSongs = findNewSongs(result.songs, knownUris);
        const removedUris = findRemovedFiles(result.songs.map((s) => s.uri));
        updateKnownFiles(result.songs);
        saveScanHistory({
          lastFullScan: force ? Date.now() : getScanHistory().lastFullScan,
          lastIncrementalScan: Date.now(),
          fileCount: result.songs.length,
        });

        const now = Date.now();
        try {
          storage.set(LAST_SCAN_TIME_KEY, now);
        } catch {
          console.warn('[MusicStore] Failed to save last scan time');
        }
        showScanCompleteNotification(result.songs.length);

        if (newSongs.length > 0) {
          useToastStore.getState().showToast(`Found ${newSongs.length} new song${newSongs.length !== 1 ? 's' : ''}`, "check");
        } else if (result.songs.length > 0) {
          useToastStore.getState().showToast(`Library has ${result.songs.length} songs`, "check");
        } else {
          useToastStore.getState().showToast("No songs found in library", "music");
        }

        set((state) => {
          state.songs = result.songs;
          state.albums = result.albums;
          state.artists = result.artists;
          state.genres = result.genres;
          state.scanStatus = "complete";
          state.lastScanTime = now;
          state.newSongsCount = newSongs.length;
          state.removedSongsCount = removedUris.length;
          state.scanProgress = null;
        });
      } catch {
        set((state) => {
          state.scanStatus = "error";
          state.scanProgress = null;
        });
        useToastStore.getState().showToast("Scan failed. Please try again.", "music");
      }
    },

    setSort: (field, order) => {
      set((state) => {
        state.sortField = field;
        state.sortOrder = order;
      });
      try { storage.set(SORT_FIELD_KEY, field); storage.set(SORT_ORDER_KEY, order); } catch {}
    },

    getSortedSongs: () => {
      const state = get();
      const stats = useStatsStore.getState().trackStats;
      const sorted = [...state.songs];
      sorted.sort((a, b) => {
        let cmp = 0;
        switch (state.sortField) {
          case "title":
            cmp = a.title.localeCompare(b.title);
            break;
          case "artist":
            cmp = a.artist.localeCompare(b.artist);
            break;
          case "dateAdded":
            cmp = a.dateAdded - b.dateAdded;
            break;
          case "duration":
            cmp = a.duration - b.duration;
            break;
          case "fileSize":
            cmp = a.fileSize - b.fileSize;
            break;
          case "playCount":
            cmp = (stats[a.id]?.playCount || 0) - (stats[b.id]?.playCount || 0);
            break;
          case "lastPlayed":
            cmp =
              (stats[a.id]?.lastPlayed || 0) - (stats[b.id]?.lastPlayed || 0);
            break;
        }
        return state.sortOrder === "desc" ? -cmp : cmp;
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
