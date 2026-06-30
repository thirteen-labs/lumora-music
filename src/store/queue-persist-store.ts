import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage, removeItem } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import type { Song } from '@/types/media';

const QUEUE_KEY = 'lumora-persisted-queue';
const QUEUE_VERSION = 2;

interface PersistedQueue {
  version: number;
  currentTrackId: string | null;
  queueIds: string[];
  queueIndex: number;
  shuffle: boolean;
  repeat: string;
  position: number;
  savedAt: number;
}

interface QueuePersistState {
  saveQueue: (track: Song | null, queue: Song[], queueIndex: number, shuffle: boolean, repeat: string, position: number) => void;
  loadQueue: () => PersistedQueue | null;
  clearQueue: () => void;
}

function validatePersistedQueue(data: unknown): data is PersistedQueue {
  if (!data || typeof data !== 'object') return false;
  const q = data as Record<string, unknown>;
  return (
    typeof q.currentTrackId === 'string' &&
    Array.isArray(q.queueIds) &&
    typeof q.queueIndex === 'number' &&
    typeof q.shuffle === 'boolean' &&
    typeof q.repeat === 'string'
  );
}

export const useQueuePersistStore = create<QueuePersistState>()(
  immer(() => ({
    saveQueue: (track, queue, queueIndex, shuffle, repeat, position) => {
      const data: PersistedQueue = {
        version: QUEUE_VERSION,
        currentTrackId: track?.id ?? null,
        queueIds: queue.map((s) => s.id),
        queueIndex,
        shuffle,
        repeat,
        position: Math.max(0, position),
        savedAt: Date.now(),
      };
      try { storage.set(QUEUE_KEY, JSON.stringify(data)); } catch (e) { reportWarning('QueuePersist', e); }
    },

    loadQueue: () => {
      try {
        const raw = storage.getString(QUEUE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!validatePersistedQueue(parsed)) {
          console.warn('[QueuePersist] Invalid persisted queue data, discarding');
          removeItem(QUEUE_KEY);
          return null;
        }
        if (typeof parsed.version === 'number' && parsed.version < QUEUE_VERSION) {
          console.warn('[QueuePersist] Migrating queue from version', parsed.version);
          parsed.version = QUEUE_VERSION;
        }
        const MAX_STALE_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - (parsed.savedAt ?? 0) > MAX_STALE_MS) {
          console.warn('[QueuePersist] Queue data is stale (>24h), discarding');
          removeItem(QUEUE_KEY);
          return null;
        }
        return parsed;
      } catch (e) { reportWarning('QueuePersist', e); }
      return null;
    },

    clearQueue: () => {
      try { removeItem(QUEUE_KEY); } catch (e) { reportWarning('QueuePersist', e); }
    },
  })),
);

export function reconstructQueue(persisted: PersistedQueue, allSongs: Song[]): { track: Song | null; queue: Song[]; queueIndex: number } {
  const songMap = new Map(allSongs.map((s) => [s.id, s]));
  const queue = persisted.queueIds.map((id) => songMap.get(id)).filter(Boolean) as Song[];
  const track = persisted.currentTrackId ? songMap.get(persisted.currentTrackId) ?? null : null;
  const queueIndex = queue.length > 0 ? Math.min(persisted.queueIndex, queue.length - 1) : 0;
  return {
    track,
    queue,
    queueIndex,
  };
}
