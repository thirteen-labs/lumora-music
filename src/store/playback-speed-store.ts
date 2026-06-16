import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { audioEngine } from '@/services/audio-engine';
import type { PlaybackSpeedSettings } from '@/types/audio';

const SPEED_KEY = 'lumora-playback-speed';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

function loadSpeed(): PlaybackSpeedSettings {
  try {
    const raw = storage.getString(SPEED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { speed: 1.0, pitchCorrection: false };
}

function saveSpeed(settings: PlaybackSpeedSettings): void {
  try { storage.set(SPEED_KEY, JSON.stringify(settings)); } catch {}
}

interface SpeedState extends PlaybackSpeedSettings {
  setSpeed: (speed: number) => void;
  cycleSpeed: () => void;
  togglePitchCorrection: () => void;
}

export const usePlaybackSpeedStore = create<SpeedState>()(
  immer((set, get) => ({
    ...loadSpeed(),

    setSpeed: (speed) => {
      set((s) => { s.speed = speed; });
      saveSpeed(get());
    },

    cycleSpeed: () => {
      const current = get().speed;
      const idx = SPEED_OPTIONS.indexOf(current);
      const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
      set((s) => { s.speed = SPEED_OPTIONS[nextIdx]; });
      saveSpeed(get());
    },

    togglePitchCorrection: () => {
      set((s) => { s.pitchCorrection = !s.pitchCorrection; });
      saveSpeed(get());
    },
  })),
);

export { SPEED_OPTIONS };

try {
  usePlaybackSpeedStore.subscribe((state) => {
    try {
      audioEngine.setSpeed(state.speed);
      audioEngine.setPitchCorrection(state.pitchCorrection);
    } catch {}
  });
} catch {}
