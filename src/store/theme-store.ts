import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { ThemeId } from '@/types/theme';
import { logger } from '@/utils/logger';
import { DEFAULT_THEME_ID } from '@/theme/themes';

const THEME_STORAGE_KEY = 'lumora-theme-id';

function loadThemeId(): ThemeId {
  try {
    const stored = storage.getString(THEME_STORAGE_KEY);
    return stored ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

function saveThemeId(id: ThemeId): void {
  try {
    storage.set(THEME_STORAGE_KEY, id);
  } catch (e) { logger.warn('Failed to save theme:', e); }
}

interface ThemeState {
  currentThemeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  immer((set) => ({
    currentThemeId: loadThemeId(),
    setTheme: (id) => {
      set((state) => {
        state.currentThemeId = id;
      });
      saveThemeId(id);
    },
  })),
);
