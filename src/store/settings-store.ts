import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { RepeatMode } from '@/types/player';

const SETTINGS_KEYS = {
  defaultShuffle: 'lumora-setting-shuffle',
  defaultRepeat: 'lumora-setting-repeat',
  crossfade: 'lumora-setting-crossfade',
  colorAware: 'lumora-setting-color-aware',
  backgroundImage: 'lumora-setting-bg-image',
} as const;

function loadBool(key: string, fallback: boolean): boolean {
  try { return storage.getBoolean(key) ?? fallback; } catch { return fallback; }
}
function loadString(key: string, fallback: string): string {
  try { return storage.getString(key) ?? fallback; } catch { return fallback; }
}

interface SettingsState {
  defaultShuffle: boolean;
  defaultRepeat: RepeatMode;
  crossfade: boolean;
  colorAware: boolean;
  backgroundImage: string | null;
  setDefaultShuffle: (v: boolean) => void;
  setDefaultRepeat: (v: RepeatMode) => void;
  setCrossfade: (v: boolean) => void;
  setColorAware: (v: boolean) => void;
  setBackgroundImage: (path: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    defaultShuffle: loadBool(SETTINGS_KEYS.defaultShuffle, false),
    defaultRepeat: loadString(SETTINGS_KEYS.defaultRepeat, 'off') as RepeatMode,
    crossfade: loadBool(SETTINGS_KEYS.crossfade, false),
    colorAware: loadBool(SETTINGS_KEYS.colorAware, false),
    backgroundImage: loadString(SETTINGS_KEYS.backgroundImage, ''),

    setDefaultShuffle: (v) => {
      set((s) => { s.defaultShuffle = v; });
      try { storage.set(SETTINGS_KEYS.defaultShuffle, v); } catch {}
    },
    setDefaultRepeat: (v) => {
      set((s) => { s.defaultRepeat = v; });
      try { storage.set(SETTINGS_KEYS.defaultRepeat, v); } catch {}
    },
    setCrossfade: (v) => {
      set((s) => { s.crossfade = v; });
      try { storage.set(SETTINGS_KEYS.crossfade, v); } catch {}
    },
    setColorAware: (v) => {
      set((s) => { s.colorAware = v; });
      try { storage.set(SETTINGS_KEYS.colorAware, v); } catch {}
    },
    setBackgroundImage: (path) => {
      set((s) => { s.backgroundImage = path; });
      try {
        if (path) storage.set(SETTINGS_KEYS.backgroundImage, path);
        else storage.set(SETTINGS_KEYS.backgroundImage, '');
      } catch {}
    },
  })),
);
