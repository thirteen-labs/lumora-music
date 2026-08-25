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
import { logger } from "@/utils/logger";
import {
  scanMediaLibrary,
  getCachedSongs,
  getCachedAlbums,
  getCachedArtists,
  getCachedGenres,
} from "@/services/scanner";
import { storage } from "@/services/mmkv";
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
import {
  enrichMissingArtwork,
  pruneArtworkCache,
} from "@/services/artwork-cache";

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
      try { return storage.getString(SORT_FIELD_KEY) as SortField ?? "dateAdded"; } catch { return "dateAdded"; }
    })(),
    sortOrder: (() => {
      try { return storage.getString(SORT_ORDER_KEY) as SortOrder ?? "desc"; } catch { return "desc"; }
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
          force,
        );

        const knownUris = new Set(Object.keys(getKnownFiles()));
        const newSongs = findNewSongs(result.songs, knownUris);
        const removedUris = findRemovedFiles(result.songs.map((s) => s.uri));
        if (!result.error) {
          updateKnownFiles(result.songs);
          saveScanHistory({
            lastFullScan: force ? Date.now() : getScanHistory().lastFullScan,
            lastIncrementalScan: Date.now(),
            fileCount: result.songs.length,
          });
        }

        const now = Date.now();
        try {
          storage.set(LAST_SCAN_TIME_KEY, now);
        } catch {
          logger.warn('[MusicStore] Failed to save last scan time');
        }
        if (!result.error) {
          showScanCompleteNotification(result.songs.length);
        }

        if (result.error?.code === 'MODULES_FAILED') {
          useToastStore.getState().showToast("Media scanner unavailable. Reinstall or rebuild the app.", "music");
        } else if (result.error?.code === 'PERMISSION_DENIED') {
          useToastStore.getState().showToast("Music permission required. Allow media access in Settings.", "music");
        } else if (result.error?.code === 'SCAN_FAILED') {
          useToastStore.getState().showToast("Scan failed. Please try again.", "music");
        } else if (newSongs.length > 0) {
          useToastStore.getState().showToast(`Found ${newSongs.length} new song${newSongs.length !== 1 ? 's' : ''}`, "check");
        } else if (result.songs.length > 0) {
          useToastStore.getState().showToast(`Library has ${result.songs.length} songs`, "check");
        } else {
          useToastStore.getState().showToast("No songs found in library", "music");
        }

        logger.log('[MusicStore] Scan result:', {
          error: result.error,
          diagnostics: result.diagnostics,
          songs: result.songs.length,
        });

        set((state) => {
          state.songs = result.songs;
          state.albums = result.albums;
          state.artists = result.artists;
          state.genres = result.genres;
          state.scanStatus = result.error ? "error" : "complete";
          state.lastScanTime = now;
          state.newSongsCount = newSongs.length;
          state.removedSongsCount = removedUris.length;
          state.scanProgress = null;
        });

        if (result.songs.length > 0) {
          enrichMissingArtwork(result.songs)
            .then((updates) => {
              const keys = Object.keys(updates);
              if (keys.length > 0) {
                set((state) => {
                  for (const song of state.songs) {
                    const path = updates[song.uri];
                    if (path) song.artwork = path;
                  }
                  // Propagate newly found artwork to albums/artists so grids show thumbnails
                  for (const album of state.albums) {
                    if (!album.artwork) {
                      const candidate = state.songs.find((s) => s.albumId === album.id && s.artwork);
                      if (candidate?.artwork) album.artwork = candidate.artwork;
                    }
                  }
                  for (const artist of state.artists) {
                    if (!artist.artwork) {
                      const candidate = state.songs.find((s) => s.artist === artist.name && s.artwork);
                      if (candidate?.artwork) artist.artwork = candidate.artwork;
                    }
                  }
                });
              }
              pruneArtworkCache(new Set(result.songs.map((s) => s.uri)));
            })
            .catch((error) => {
              logger.warn('[MusicStore] Artwork enrichment failed:', error);
            });
        }
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
      try { storage.set(SORT_FIELD_KEY, field); storage.set(SORT_ORDER_KEY, order); } catch (e) { logger.warn('Failed to save sort settings:', e); }
    },

    setBackgroundScanEnabled: (enabled) => {
      set((state) => {
        state.backgroundScanEnabled = enabled;
      });
      setBackgroundScanEnabled(enabled);
    },
  })),
);
