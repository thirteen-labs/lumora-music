import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { audioEngine } from '@/services/audio-engine';

const LOUDNESS_KEY = 'lumora-loudness-enhancer';
const LOUDNESS_LEVEL_KEY = 'lumora-loudness-level';

function loadEnabled(): boolean {
  try { return storage.getBoolean(LOUDNESS_KEY) ?? false; } catch { return false; }
}

function loadLevel(): number {
  try { return storage.getNumber(LOUDNESS_LEVEL_KEY) ?? 6; } catch { return 6; }
}

interface LoudnessEnhancerState {
  enabled: boolean;
  level: number;
  setEnabled: (enabled: boolean) => void;
  setLevel: (level: number) => void;
}

export const useLoudnessEnhancerStore = create<LoudnessEnhancerState>()(
  immer((set) => ({
    enabled: loadEnabled(),
    level: loadLevel(),

    setEnabled: (enabled) => {
      set((s) => { s.enabled = enabled; });
      try { storage.set(LOUDNESS_KEY, enabled); } catch {}
      syncLoudnessToEngine();
    },

    setLevel: (level) => {
      const clamped = Math.max(0, Math.min(12, level));
      set((s) => { s.level = clamped; });
      try { storage.set(LOUDNESS_LEVEL_KEY, clamped); } catch {}
      syncLoudnessToEngine();
    },
  })),
);

function syncLoudnessToEngine(): void {
  try {
    const state = useLoudnessEnhancerStore.getState();
    audioEngine.setLoudnessEnabled(state.enabled);
    audioEngine.setLoudnessLevel(state.level);
  } catch {}
}
