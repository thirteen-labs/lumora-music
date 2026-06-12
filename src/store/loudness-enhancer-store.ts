import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

const LOUDNESS_KEY = 'lumora-loudness-enhancer';

function loadEnabled(): boolean {
  try { return storage.getBoolean(LOUDNESS_KEY) ?? false; } catch { return false; }
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
    level: 6,

    setEnabled: (enabled) => {
      set((s) => { s.enabled = enabled; });
      try { storage.set(LOUDNESS_KEY, enabled); } catch {}
    },

    setLevel: (level) => {
      set((s) => { s.level = Math.max(0, Math.min(12, level)); });
    },
  })),
);
