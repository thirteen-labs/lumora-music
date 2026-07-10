import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ExtractedColors } from '@/services/color-extraction';
import type { ThemeColors } from '@/types/theme';
import { isLight, hexToRgba } from '@/utils/color';

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
        if (colors?.background) {
          const light = isLight(colors.background);
          const textColor = light ? '#1A1A1A' : '#F0F0F0';
          state.dynamicThemeColors = {
            background: colors.background,
            surface: colors.surface,
            primary: colors.primary,
            secondary: colors.secondary,
            accent: colors.accent,
            text: textColor,
            card: colors.surface,
            border: `${colors.primary}33`,
            textSecondary: hexToRgba(textColor, 0.6),
            textMuted: hexToRgba(textColor, 0.4),
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
