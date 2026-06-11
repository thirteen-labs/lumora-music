import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useColorAwareStore } from '@/store/color-aware-store';
import { useSettingsStore } from '@/store/settings-store';
import { getThemeById } from '@/theme/themes';
import { ThemeContext } from '@/theme/context';
import type { Theme, ThemeColors } from '@/types/theme';
import { Image } from 'expo-image';

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
  const baseTheme = useMemo(() => getThemeById(currentThemeId), [currentThemeId]);

  const theme: Theme = useMemo(() => {
    if (colorAware && dynamicThemeColors) {
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          ...dynamicThemeColors,
        },
      };
    }
    return baseTheme;
  }, [baseTheme, dynamicThemeColors, colorAware]);

  useEffect(() => {
    setCssVariables(theme.colors);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        {backgroundImage ? (
          <Image
            source={{ uri: backgroundImage }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.15,
            }}
            contentFit="cover"
            blurRadius={20}
          />
        ) : null}
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
