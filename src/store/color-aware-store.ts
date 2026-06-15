import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ExtractedColors } from '@/services/color-extraction';
import type { ThemeColors } from '@/types/theme';

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.5;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
