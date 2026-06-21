import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Video, SortField, SortOrder, MediaScanStatus } from '@/types/media';
import { scanMediaLibrary, getCachedVideos } from '@/services/scanner';

interface VideoState {
  videos: Video[];
  scanStatus: MediaScanStatus;
  scanProgress: { processed: number; total: number } | null;
  sortField: SortField;
  sortOrder: SortOrder;
  scanVideos: (force?: boolean) => Promise<void>;
  setSort: (field: SortField, order: SortOrder) => void;
  getSortedVideos: () => Video[];
}

export const useVideoStore = create<VideoState>()(
  immer((set, get) => ({
    videos: [],
    scanStatus: getCachedVideos().length > 0 ? 'complete' : 'idle',
    scanProgress: null,
    sortField: 'dateAdded',
    sortOrder: 'desc',

    scanVideos: async (force?: boolean) => {
      const currentStatus = get().scanStatus;
      if (currentStatus === 'scanning') {
        return;
      }

      if (!force) {
        const cached = getCachedVideos();
        if (cached.length > 0) {
          set((s) => {
            s.videos = cached;
            s.scanStatus = 'complete';
            s.scanProgress = null;
          });
          return;
        }
      }
      const result = await scanMediaLibrary(
        (status) => {
          set((s) => { s.scanStatus = status; });
        },
        (processed, total) => {
          set((s) => { s.scanProgress = { processed, total }; });
        },
        { audio: false },
      );
      set((s) => {
        s.videos = result.videos;
        s.scanStatus = 'complete';
        s.scanProgress = null;
      });
    },

    setSort: (field, order) => {
      set((s) => { s.sortField = field; s.sortOrder = order; });
    },

    getSortedVideos: () => {
      const state = get();
      const sorted = [...state.videos];
      sorted.sort((a, b) => {
        let cmp = 0;
        switch (state.sortField) {
          case 'title': cmp = a.title.localeCompare(b.title); break;
          case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
          case 'duration': cmp = a.duration - b.duration; break;
          case 'fileSize': cmp = a.fileSize - b.fileSize; break;
          default: cmp = a.dateAdded - b.dateAdded;
        }
        return state.sortOrder === 'desc' ? -cmp : cmp;
      });
      return sorted;
    },
  })),
);
