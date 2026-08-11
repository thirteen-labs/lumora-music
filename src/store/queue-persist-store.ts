import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage, removeItem } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import type { Song } from '@/types/media';
import { logger } from '@/utils/logger';

const QUEUE_KEY = 'lumora-persisted-queue';
const QUEUE_VERSION = 4;

interface StubSong {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  duration: number;
  uri: string;
}

interface PersistedQueue {
  version: number;
  currentTrackId: string | null;
  queueIds: string[];
  /** Fallback song data so queue is usable even without the full music store loaded */
  queueItems: StubSong[];
  currentTrackStub: StubSong | null;
  queueIndex: number;
  priorityQueueIds: string[];
  priorityQueueItems: StubSong[];
  shuffle: boolean;
  repeat: string;
  position: number;
  savedAt: number;
  isPlaying: boolean;
}

interface QueuePersistState {
  saveQueue: (track: Song | null, queue: Song[], queueIndex: number, shuffle: boolean, repeat: string, position: number, isPlaying?: boolean, priorityQueue?: Song[]) => void;
  loadQueue: () => PersistedQueue | null;
  clearQueue: () => void;
}

function toStub(song: Song): StubSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    artwork: song.artwork,
    duration: song.duration,
    uri: song.uri,
  };
}

function validatePersistedQueue(data: unknown): data is PersistedQueue {
  if (!data || typeof data !== 'object') return false;
  const q = data as Record<string, unknown>;
  const valid =
    typeof q.currentTrackId === 'string' &&
    Array.isArray(q.queueIds) &&
    typeof q.queueIndex === 'number' &&
    typeof q.shuffle === 'boolean' &&
    typeof q.repeat === 'string';
  if (!valid) return false;
  if (typeof q.queueItems === 'undefined' || !Array.isArray(q.queueItems)) {
    (q as Record<string, unknown>).queueItems = [];
    (q as Record<string, unknown>).currentTrackStub = null;
  }
  if (typeof q.isPlaying === 'undefined') {
    (q as Record<string, unknown>).isPlaying = false;
  }
  return true;
}

export const useQueuePersistStore = create<QueuePersistState>()(
  immer(() => ({
    saveQueue: (track, queue, queueIndex, shuffle, repeat, position, isPlaying = false, priorityQueue = []) => {
      try {
        const data: PersistedQueue = {
          version: QUEUE_VERSION,
          currentTrackId: track?.id ?? null,
          queueIds: queue.map((s) => s.id),
          queueItems: queue.map((s) => toStub(s)),
          currentTrackStub: track ? toStub(track) : null,
          queueIndex: Math.max(0, Math.min(queueIndex, queue.length - 1)),
          priorityQueueIds: priorityQueue.map((s) => s.id),
          priorityQueueItems: priorityQueue.map((s) => toStub(s)),
          shuffle,
          repeat,
          position: Math.max(0, position),
          savedAt: Date.now(),
          isPlaying,
        };
        storage.set(QUEUE_KEY, JSON.stringify(data));
      } catch (e) { reportWarning('QueuePersist', e); }
    },

    loadQueue: () => {
      try {
        const raw = storage.getString(QUEUE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!validatePersistedQueue(parsed)) {
          logger.warn('[QueuePersist] Invalid persisted queue data, discarding');
          removeItem(QUEUE_KEY);
          return null;
        }
        if (typeof parsed.version === 'number' && parsed.version < QUEUE_VERSION) {
          logger.warn('[QueuePersist] Migrating queue from version', parsed.version);
          parsed.version = QUEUE_VERSION;
        }
        const MAX_STALE_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - (parsed.savedAt ?? 0) > MAX_STALE_MS) {
          logger.warn('[QueuePersist] Queue data is stale (>24h), discarding');
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

export function reconstructQueue(persisted: PersistedQueue, allSongs: Song[]): { track: Song | null; queue: Song[]; queueIndex: number; priorityQueue: Song[] } {
  const songMap = new Map(allSongs.map((s) => [s.id, s]));
  const hasFullSongs = allSongs.length > 0;

  const promote = (stub: StubSong): Song => ({
    id: stub.id,
    title: stub.title,
    artist: stub.artist,
    artwork: stub.artwork,
    duration: stub.duration,
    uri: stub.uri,
    album: '',
    albumId: '',
    fileSize: 0,
    dateAdded: 0,
    genre: null,
    bitrate: null,
    sampleRate: null,
  });

  if (hasFullSongs) {
    const queue = persisted.queueIds.map((id) => songMap.get(id)).filter(Boolean) as Song[];
    const track = persisted.currentTrackId ? songMap.get(persisted.currentTrackId) ?? null : null;
    const queueIndex = queue.length > 0 ? Math.min(persisted.queueIndex, queue.length - 1) : 0;
    const priorityQueue = (persisted.priorityQueueIds || []).map((id) => songMap.get(id)).filter(Boolean) as Song[];
    return { track, queue, queueIndex, priorityQueue };
  }

  const queue = persisted.queueItems.map((stub) => promote(stub));
  const track = persisted.currentTrackStub ? promote(persisted.currentTrackStub) : null;
  const queueIndex = queue.length > 0 ? Math.min(persisted.queueIndex, queue.length - 1) : 0;
  const priorityQueue = (persisted.priorityQueueItems || []).map((stub) => promote(stub));
  return { track, queue, queueIndex, priorityQueue };
}
