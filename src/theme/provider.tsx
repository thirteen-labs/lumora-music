import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useColorAwareStore } from '@/store/color-aware-store';
import { useSettingsStore } from '@/store/settings-store';
import { getThemeById } from '@/theme/themes';
import { ThemeContext } from '@/theme/context';
import type { Theme, ThemeColors } from '@/types/theme';
import { Image } from 'expo-image';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  const backgroundBrightness = useSettingsStore((s) => s.backgroundBrightness);
  const backgroundBlur = useSettingsStore((s) => s.backgroundBlur);
  const backgroundHue = useSettingsStore((s) => s.backgroundHue);
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
    if (backgroundImage) {
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          background: hexToRgba(merged.colors.background, 0.82),
          surface: hexToRgba(merged.colors.surface, 0.82),
          card: hexToRgba(merged.colors.card, 0.82),
        },
      };
    }
    return merged;
  }, [baseTheme, dynamicThemeColors, colorAware, accentOverride, backgroundImage]);

  useEffect(() => {
    setCssVariables(theme.colors);
  }, [theme]);

  const brightnessOverlay = useMemo(() => {
    if (!backgroundImage) return null;
    if (backgroundBrightness < 100) {
      const opacity = ((100 - backgroundBrightness) / 100) * 0.5;
      return { backgroundColor: '#000', opacity };
    }
    if (backgroundBrightness > 100) {
      const opacity = ((backgroundBrightness - 100) / 100) * 0.3;
      return { backgroundColor: '#fff', opacity };
    }
    return null;
  }, [backgroundBrightness, backgroundImage]);

  const hueOverlay = useMemo(() => {
    if (!backgroundImage || backgroundHue === 0) return null;
    const r = Math.round(Math.sin(backgroundHue * Math.PI / 180) * 127 + 128);
    const g = Math.round(Math.sin((backgroundHue + 120) * Math.PI / 180) * 127 + 128);
    const b = Math.round(Math.sin((backgroundHue + 240) * Math.PI / 180) * 127 + 128);
    return { backgroundColor: `rgba(${r},${g},${b},0.15)` };
  }, [backgroundHue, backgroundImage]);

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
                width: '100%', height: '100%',
              }}
              contentFit="cover"
              blurRadius={backgroundBlur}
            />
            {brightnessOverlay && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, ...brightnessOverlay }} />
            )}
            {hueOverlay && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, ...hueOverlay }} />
            )}
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
