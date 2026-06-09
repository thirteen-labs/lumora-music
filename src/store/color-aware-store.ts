import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ExtractedColors } from '@/services/color-extraction';
import type { ThemeColors } from '@/types/theme';

interface ColorAwareState {
  extractedColors: ExtractedColors | null;
  dynamicThemeColors: Partial<ThemeColors> | null;
  sourceUri: string | null;
  setExtractedColors: (colors: ExtractedColors | null, sourceUri: string | null) => void;
  clearColors: () => void;
}

export const useColorAwareStore = create<ColorAwareState>()(
  immer((set) => ({
    extractedColors: null,
    dynamicThemeColors: null,
    sourceUri: null,

    setExtractedColors: (colors, sourceUri) => {
      set((state) => {
        state.extractedColors = colors;
        state.sourceUri = sourceUri;
        if (colors) {
          state.dynamicThemeColors = {
            background: colors.background,
            surface: colors.surface,
            primary: colors.primary,
            secondary: colors.secondary,
            accent: colors.accent,
            card: colors.surface,
            border: `${colors.primary}33`,
            textSecondary: 'rgba(255, 255, 255, 0.7)',
            textMuted: 'rgba(255, 255, 255, 0.5)',
          };
        } else {
          state.dynamicThemeColors = null;
        }
      });
    },

    clearColors: () => {
      set((state) => {
        state.extractedColors = null;
        state.dynamicThemeColors = null;
        state.sourceUri = null;
      });
    },
  })),
);
