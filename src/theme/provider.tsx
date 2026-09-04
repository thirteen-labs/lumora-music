import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useColorAwareStore } from '@/store/color-aware-store';
import { useSettingsStore } from '@/store/settings-store';
import { getThemeById } from '@/theme/themes';
import { ThemeContext } from '@/theme/context';
import type { Theme, ThemeColors } from '@/types/theme';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { hexToRgba, lighten, glassColor } from '@/utils/color';

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
    let merged: Theme = { ...baseTheme, colors: { ...baseTheme.colors }, gradients: { ...baseTheme.gradients, background: [...baseTheme.gradients.background], card: [...baseTheme.gradients.card], accent: [...baseTheme.gradients.accent] } };
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
      const accentSoft = hexToRgba(accentOverride, 0.14);
      const accentMuted = hexToRgba(accentOverride, 0.22);
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          accent: accentOverride,
          primary: accentOverride,
          secondary: merged.isDark ? lighten(accentOverride, 38) : '#6B7280',
          accentSoft,
          accentMuted,
          glassBorder: hexToRgba(accentOverride, 0.18),
        },
        gradients: {
          ...merged.gradients,
          accent: [accentOverride, lighten(accentOverride, 18)],
        },
      };
    }
    if (backgroundImage) {
      // Premium translucent layers when image background is active
      const bgAlpha = 0.78;
      const surfAlpha = 0.62;
      const cardAlpha = 0.58;
      const glassAlpha = 0.42;
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          background: hexToRgba(merged.colors.background, bgAlpha),
          surface: hexToRgba(merged.colors.surface, surfAlpha),
          surfaceHigh: hexToRgba(merged.colors.surfaceHigh, surfAlpha),
          surfaceMuted: hexToRgba(merged.colors.surfaceMuted, 0.52),
          card: hexToRgba(merged.colors.card, cardAlpha),
          cardElevated: hexToRgba(merged.colors.cardElevated, cardAlpha),
          glass: glassColor(merged.colors.surface, glassAlpha, merged.isDark),
          surfaceGlass: glassColor(merged.colors.surface, 0.36, merged.isDark),
          pageBackground: 'transparent',
          scrim: merged.isDark ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.46)',
          overlay: merged.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.32)',
          border: merged.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
          borderLight: merged.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
        },
      };
    } else {
      merged = {
        ...merged,
        colors: {
          ...merged.colors,
          pageBackground: merged.colors.background,
          scrim: merged.colors.scrim,
          overlay: merged.colors.overlay,
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
      const opacity = ((100 - backgroundBrightness) / 100) * 0.62;
      return { backgroundColor: '#000', opacity };
    }
    if (backgroundBrightness > 100) {
      const opacity = ((backgroundBrightness - 100) / 100) * 0.38;
      return { backgroundColor: '#fff', opacity };
    }
    return null;
  }, [backgroundBrightness, backgroundImage]);

  const hueOverlay = useMemo(() => {
    if (!backgroundImage || backgroundHue === 0) return null;
    const r = Math.round(Math.sin((backgroundHue * Math.PI) / 180) * 127 + 128);
    const g = Math.round(Math.sin(((backgroundHue + 120) * Math.PI) / 180) * 127 + 128);
    const b = Math.round(Math.sin(((backgroundHue + 240) * Math.PI) / 180) * 127 + 128);
    return { backgroundColor: `rgba(${r},${g},${b},0.14)` };
  }, [backgroundHue, backgroundImage]);

  const hasBackground = !!backgroundImage;
  const blurIntensity = useMemo(() => {
    if (!hasBackground) return 0;
    return Math.min(100, Math.max(0, backgroundBlur * 1.6));
  }, [hasBackground, backgroundBlur]);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={StyleSheet.absoluteFill}>
        {/* Layer 0: Base solid */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]} />

        {/* Layer 1: Image Background with premium treatment */}
        {hasBackground ? (
          <>
            <Image
              source={{ uri: backgroundImage! }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={backgroundBlur > 30 ? 2 : 0}
              cachePolicy="memory-disk"
              transition={400}
            />
            {/* Slight desaturation + depth scrim */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.10)' }]} />
            {/* Vignette edges */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  shadowColor: '#000',
                  shadowOpacity: 0.22,
                },
              ]}
            />
            {/* Brightness scrim */}
            {brightnessOverlay && <View style={[StyleSheet.absoluteFill, brightnessOverlay]} />}
            {/* Hue tint */}
            {hueOverlay && <View style={[StyleSheet.absoluteFill, hueOverlay]} />}
            {/* Top gradient scrim for status bar / header legibility */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: theme.isDark ? 'rgba(0,0,0,0.26)' : 'rgba(255,255,255,0.18)',
                  opacity: 0.9,
                },
              ]}
              pointerEvents="none"
            />
            {/* Subtle blur veil when blur slider > 0 */}
            {blurIntensity > 4 && (
              <BlurView
                intensity={blurIntensity}
                tint={theme.isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )}
            {/* Final scrim to ensure text contrast */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim, opacity: 0.72 }]} />
          </>
        ) : (
          <>
            {/* No image: subtle radial glow from accent for premium depth */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'transparent',
                  opacity: theme.isDark ? 0.14 : 0.07,
                },
              ]}
            />
            <View
              style={{
                position: 'absolute',
                top: -120,
                left: -80,
                width: 420,
                height: 420,
                borderRadius: 210,
                backgroundColor: theme.colors.accent,
                opacity: theme.isDark ? 0.09 : 0.06,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -100,
                right: -60,
                width: 360,
                height: 360,
                borderRadius: 180,
                backgroundColor: theme.colors.secondary,
                opacity: theme.isDark ? 0.06 : 0.04,
              }}
            />
          </>
        )}

        {/* Layer 2: Content */}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </ThemeContext.Provider>
  );
}
