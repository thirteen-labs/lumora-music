import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { logger } from '@/utils/logger';
import type { SleepTimerSettings } from '@/types/audio';
import { usePlayerStore } from '@/store/player-store';
import { showSleepTimerNotification, dismissSleepTimerNotification } from '@/services/notifications';
import { reportWarning } from '@/utils/error-handler';

const TIMER_KEY = 'lumora-sleep-timer';

interface SleepTimerState extends SleepTimerSettings {
  expiredFlag: boolean;
  start: (minutes: number, stopAtEndOfTrack?: boolean) => void;
  cancel: () => void;
  tick: () => boolean;
  consumeExpiredFlag: () => boolean;
  getRemainingMs: () => number;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

function clearTickInterval() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function startTickInterval() {
  clearTickInterval();
  tickInterval = setInterval(() => {
    try { useSleepTimerStore.getState().tick(); } catch { /* tick failed */ }
  }, 1000);
}

function loadTimer(): SleepTimerSettings {
  try {
    const raw = storage.getString(TIMER_KEY);
    if (raw) {
      const parsed: SleepTimerSettings = JSON.parse(raw);
      if (parsed.active && parsed.endTime > Date.now()) {
        return parsed;
      }
    }
  } catch (e) { logger.warn('Failed to load sleep timer:', e); }
  return { active: false, minutesRemaining: 0, totalMinutes: 0, endTime: 0, stopAtEndOfTrack: false };
}

export function restoreSleepTimer(): void {
  const state = useSleepTimerStore.getState();
  if (state.active && state.endTime > Date.now()) {
    startTickInterval();
  }
}

function saveTimer(settings: SleepTimerSettings): void {
  try { storage.set(TIMER_KEY, JSON.stringify(settings)); } catch (e) { logger.warn('Failed to save sleep timer:', e); }
}

export const useSleepTimerStore = create<SleepTimerState>()(
  immer((set, get) => ({
    ...loadTimer(),
    expiredFlag: false,

    start: (minutes, stopAtEndOfTrack = false) => {
      const endTime = Date.now() + minutes * 60 * 1000;
      set((s) => {
        s.active = true;
        s.minutesRemaining = minutes;
        s.totalMinutes = minutes;
        s.endTime = endTime;
        s.stopAtEndOfTrack = stopAtEndOfTrack;
      });
      saveTimer(get());

      showSleepTimerNotification(minutes);

      startTickInterval();
    },

    cancel: () => {
      set((s) => {
        s.active = false;
        s.minutesRemaining = 0;
        s.totalMinutes = 0;
        s.endTime = 0;
      });
      saveTimer(get());
      clearTickInterval();
      dismissSleepTimerNotification();
    },

    tick: () => {
      const state = get();
      if (!state.active) {
        clearTickInterval();
        return false;
      }

      const remaining = state.endTime - Date.now();
      if (remaining <= 0) {
        set((s) => { s.expiredFlag = true; });
        try { usePlayerStore.getState().pause(); } catch (e) { reportWarning('SleepTimer', e, 'Failed to pause on timer expiry'); }
        dismissSleepTimerNotification();
        get().cancel();
        return true;
      } else {
        set((s) => {
          s.minutesRemaining = Math.ceil(remaining / 60000);
        });
        showSleepTimerNotification(Math.ceil(remaining / 60000));
        return false;
      }
    },

    consumeExpiredFlag: () => {
      const flag = get().expiredFlag;
      if (flag) set((s) => { s.expiredFlag = false; });
      return flag;
    },

    getRemainingMs: () => {
      const state = get();
      if (!state.active) return 0;
      return Math.max(0, state.endTime - Date.now());
    },
  })),
);

export const SLEEP_TIMER_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];
