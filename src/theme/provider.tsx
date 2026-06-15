import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useColorAwareStore } from '@/store/color-aware-store';
import { useSettingsStore } from '@/store/settings-store';
import { getThemeById } from '@/theme/themes';
import { ThemeContext } from '@/theme/context';
import type { Theme, ThemeColors } from '@/types/theme';
import { Image } from 'expo-image';

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface ThemeProviderProps {
  children: ReactNode;
}

function setCssVariables(colors: ThemeColors) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const root = document.documentElement;
    const entries = Object.entries(colors) as [string, string][];
    for (const [key, value] of entries) {
      root.style.setProperty(`--color-${key}`, value);
    }
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const currentThemeId = useThemeStore((s) => s.currentThemeId);
  const dynamicThemeColors = useColorAwareStore((s) => s.dynamicThemeColors);
  const colorAware = useSettingsStore((s) => s.colorAware);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const accentOverride = useSettingsStore((s) => s.accentOverride);
  const baseTheme = useMemo(() => getThemeById(currentThemeId), [currentThemeId]);

  const theme: Theme = useMemo(() => {
    let merged = { ...baseTheme };
    if (colorAware && dynamicThemeColors) {
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          ...dynamicThemeColors,
        },
      };
    }
    if (accentOverride) {
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          accent: accentOverride,
          primary: accentOverride,
          secondary: merged.isDark ? lighten(accentOverride, 40) : '#6B7280',
        },
      };
    }
    return merged;
  }, [baseTheme, dynamicThemeColors, colorAware, accentOverride]);

  useEffect(() => {
    setCssVariables(theme.colors);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={{ flex: 1 }}>
        {backgroundImage ? (
          <>
            <Image
              source={{ uri: backgroundImage }}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
              }}
              contentFit="cover"
            />
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: theme.colors.background,
                opacity: 0.72,
              }}
            />
          </>
        ) : (
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: theme.colors.background,
            }}
          />
        )}
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
