import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { Song } from '@/types/media';

const QUEUE_KEY = 'lumora-persisted-queue';

interface PersistedQueue {
  currentTrackId: string | null;
  queueIds: string[];
  queueIndex: number;
  shuffle: boolean;
  repeat: string;
  position: number;
}

interface QueuePersistState {
  saveQueue: (track: Song | null, queue: Song[], queueIndex: number, shuffle: boolean, repeat: string, position: number) => void;
  loadQueue: () => PersistedQueue | null;
  clearQueue: () => void;
}

export const useQueuePersistStore = create<QueuePersistState>()(
  immer(() => ({
    saveQueue: (track, queue, queueIndex, shuffle, repeat, position) => {
      const data: PersistedQueue = {
        currentTrackId: track?.id ?? null,
        queueIds: queue.map((s) => s.id),
        queueIndex,
        shuffle,
        repeat,
        position,
      };
      try { storage.set(QUEUE_KEY, JSON.stringify(data)); } catch {}
    },

    loadQueue: () => {
      try {
        const raw = storage.getString(QUEUE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    },

    clearQueue: () => {
      try { storage.set(QUEUE_KEY, ''); } catch {}
    },
  })),
);

export function reconstructQueue(persisted: PersistedQueue, allSongs: Song[]): { track: Song | null; queue: Song[]; queueIndex: number } {
  const songMap = new Map(allSongs.map((s) => [s.id, s]));
  const queue = persisted.queueIds.map((id) => songMap.get(id)).filter(Boolean) as Song[];
  const track = persisted.currentTrackId ? songMap.get(persisted.currentTrackId) ?? null : null;
  return { track, queue, queueIndex: Math.min(persisted.queueIndex, queue.length - 1) };
}
