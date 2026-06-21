import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const DELETED_KEY = 'lumora-recently-deleted';
const MAX_DELETED = 50;

export interface DeletedItem {
  id: string;
  title: string;
  artist?: string;
  uri: string;
  type: 'song' | 'video';
  deletedAt: number;
  fileSize: number;
  duration: number;
}

function loadDeleted(): DeletedItem[] {
  try {
    const raw = storage.getString(DELETED_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { reportWarning('RecentlyDeleted', e); }
  return [];
}

function saveDeleted(items: DeletedItem[]): void {
  try { storage.set(DELETED_KEY, JSON.stringify(items)); } catch (e) { reportWarning('RecentlyDeleted', e); }
}

interface RecentlyDeletedState {
  items: DeletedItem[];
  addDeleted: (item: Omit<DeletedItem, 'deletedAt'>) => void;
  restoreItem: (id: string) => DeletedItem | undefined;
  permanentlyDelete: (id: string) => void;
  clearAll: () => void;
}

export const useRecentlyDeletedStore = create<RecentlyDeletedState>()(
  immer((set, get) => ({
    items: loadDeleted(),

    addDeleted: (item) => {
      set((s) => {
        s.items.unshift({ ...item, deletedAt: Date.now() });
        if (s.items.length > MAX_DELETED) s.items = s.items.slice(0, MAX_DELETED);
      });
      saveDeleted(get().items);
    },

    restoreItem: (id) => {
      const item = get().items.find((i) => i.id === id);
      if (!item) return undefined;
      set((s) => { s.items = s.items.filter((i) => i.id !== id); });
      saveDeleted(get().items);
      return item;
    },

    permanentlyDelete: (id) => {
      set((s) => { s.items = s.items.filter((i) => i.id !== id); });
      saveDeleted(get().items);
    },

    clearAll: () => {
      set((s) => { s.items = []; });
      saveDeleted([]);
    },
  })),
);
