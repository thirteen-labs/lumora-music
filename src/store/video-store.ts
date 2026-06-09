import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Video, SortField, SortOrder } from '@/types/media';
import { getCachedVideos } from '@/services/scanner';

interface VideoState {
  videos: Video[];
  sortField: SortField;
  sortOrder: SortOrder;
  loadVideos: () => void;
  setSort: (field: SortField, order: SortOrder) => void;
  getSortedVideos: () => Video[];
}

export const useVideoStore = create<VideoState>()(
  immer((set, get) => ({
    videos: [],
    sortField: 'dateAdded',
    sortOrder: 'desc',

    loadVideos: () => {
      const cached = getCachedVideos();
      set((s) => { s.videos = cached; });
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
