import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

const TELEMETRY_KEY = 'lumora-telemetry-events';
const MAX_EVENTS = 500;

interface TelemetryEvent {
  ts: number;
  type: string;
  detail?: string;
  payload?: Record<string, unknown>;
}

interface TelemetryState {
  events: TelemetryEvent[];
  totalPlays: number;
  totalErrors: number;
  totalSkips: number;
  totalDecodeTimeMs: number;
  decodeCount: number;
  bufferPoolHits: number;
  bufferPoolMisses: number;
  poolTotalBytes: number;
  ensureAliveCount: number;
  interruptionCount: number;

  record: (type: string, detail?: string, payload?: Record<string, unknown>) => void;
  recordPlay: (trackId: string, decodeMs?: number) => void;
  recordError: (source: string, error: string) => void;
  recordSkip: (trackId: string) => void;
  recordDecode: (trackId: string, ms: number) => void;
  recordBufferPoolHit: () => void;
  recordBufferPoolMiss: () => void;
  recordEnsureAlive: () => void;
  recordInterruption: (event: string) => void;
  getEvents: (limit?: number) => TelemetryEvent[];
  getRecentErrors: (limit?: number) => TelemetryEvent[];
  getStats: () => {
    totalPlays: number;
    totalErrors: number;
    totalSkips: number;
    avgDecodeMs: number;
    bufferPoolHitRate: number;
    poolTotalBytes: number;
    ensureAliveCount: number;
    interruptionCount: number;
  };
  setPoolTotalBytes: (bytes: number) => void;
  clear: () => void;
}

function loadEvents(): TelemetryEvent[] {
  try {
    const raw = storage.getString(TELEMETRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistEvents(events: TelemetryEvent[]): void {
  try {
    storage.set(TELEMETRY_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {}
}

export const useTelemetryStore = create<TelemetryState>()(
  immer((set, get) => ({
    events: loadEvents(),
    totalPlays: 0,
    totalErrors: 0,
    totalSkips: 0,
    totalDecodeTimeMs: 0,
    decodeCount: 0,
    bufferPoolHits: 0,
    bufferPoolMisses: 0,
    poolTotalBytes: 0,
    ensureAliveCount: 0,
    interruptionCount: 0,

    record: (type, detail, payload) => {
      set((s) => {
        s.events.push({ ts: Date.now(), type, detail, payload });
        if (s.events.length > MAX_EVENTS) {
          s.events = s.events.slice(-MAX_EVENTS);
        }
      });
      persistEvents(get().events);
    },

    recordPlay: (trackId, decodeMs) => {
      set((s) => {
        s.totalPlays++;
        s.events.push({ ts: Date.now(), type: 'play', detail: trackId, payload: { decodeMs } });
        if (s.events.length > MAX_EVENTS) s.events = s.events.slice(-MAX_EVENTS);
      });
      persistEvents(get().events);
    },

    recordError: (source, error) => {
      set((s) => {
        s.totalErrors++;
        s.events.push({ ts: Date.now(), type: 'error', detail: `${source}: ${error}` });
        if (s.events.length > MAX_EVENTS) s.events = s.events.slice(-MAX_EVENTS);
      });
      persistEvents(get().events);
    },

    recordSkip: (trackId) => {
      set((s) => {
        s.totalSkips++;
        s.events.push({ ts: Date.now(), type: 'skip', detail: trackId });
        if (s.events.length > MAX_EVENTS) s.events = s.events.slice(-MAX_EVENTS);
      });
      persistEvents(get().events);
    },

    recordDecode: (_trackId, ms) => {
      set((s) => {
        s.totalDecodeTimeMs += ms;
        s.decodeCount++;
      });
    },

    recordBufferPoolHit: () => {
      set((s) => {
        s.bufferPoolHits++;
      });
    },

    recordBufferPoolMiss: () => {
      set((s) => {
        s.bufferPoolMisses++;
      });
    },

    recordEnsureAlive: () => {
      set((s) => {
        s.ensureAliveCount++;
      });
    },

    recordInterruption: (event) => {
      set((s) => {
        s.interruptionCount++;
        s.events.push({ ts: Date.now(), type: 'interruption', detail: event });
        if (s.events.length > MAX_EVENTS) s.events = s.events.slice(-MAX_EVENTS);
      });
      persistEvents(get().events);
    },

    getEvents: (limit) => {
      const events = get().events;
      return limit ? events.slice(-limit) : events;
    },

    getRecentErrors: (limit) => {
      return get().events
        .filter((e) => e.type === 'error')
        .slice(-(limit ?? 20));
    },

    getStats: () => {
      const s = get();
      const decodeCount = s.decodeCount || 1;
      const totalPoolOps = s.bufferPoolHits + s.bufferPoolMisses || 1;
      return {
        totalPlays: s.totalPlays,
        totalErrors: s.totalErrors,
        totalSkips: s.totalSkips,
        avgDecodeMs: Math.round(s.totalDecodeTimeMs / decodeCount),
        bufferPoolHitRate: Math.round((s.bufferPoolHits / totalPoolOps) * 100),
        poolTotalBytes: s.poolTotalBytes,
        ensureAliveCount: s.ensureAliveCount,
        interruptionCount: s.interruptionCount,
      };
    },

    setPoolTotalBytes: (bytes) => {
      set((s) => { s.poolTotalBytes = bytes; });
    },

    clear: () => {
      set((s) => {
        s.events = [];
        s.totalPlays = 0;
        s.totalErrors = 0;
        s.totalSkips = 0;
        s.totalDecodeTimeMs = 0;
        s.decodeCount = 0;
        s.bufferPoolHits = 0;
        s.bufferPoolMisses = 0;
        s.poolTotalBytes = 0;
        s.ensureAliveCount = 0;
        s.interruptionCount = 0;
      });
      try { storage.set(TELEMETRY_KEY, JSON.stringify([])); } catch {}
    },
  }))
);
