import { Theme } from '@/types/theme';
import { hexToRgba, lighten, darken, mix, glassColor } from '@/utils/color';

function makeTheme(
  id: string,
  name: string,
  bg: string,
  surface: string,
  text: string,
  accent: string,
  isDark: boolean,
): Theme {
  const surfaceHigh = isDark ? lighten(surface, 14) : darken(surface, 4);
  const surfaceMuted = isDark ? lighten(surface, 4) : darken(surface, 2);
  const card = isDark ? lighten(surface, 10) : darken(surface, 6);
  const cardElevated = isDark ? lighten(surface, 18) : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const borderLight = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const textSecondary = hexToRgba(text, isDark ? 0.68 : 0.65);
  const textMuted = hexToRgba(text, isDark ? 0.45 : 0.5);
  const textFaint = hexToRgba(text, 0.32);
  const accentSoft = hexToRgba(accent, 0.14);
  const accentMuted = hexToRgba(accent, 0.22);
  const glass = glassColor(surface, isDark ? 0.72 : 0.84, isDark);
  const surfaceGlass = glassColor(surface, isDark ? 0.58 : 0.72, isDark);
  const glassBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const overlay = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';
  const scrim = isDark ? 'rgba(0,0,0,0.62)' : 'rgba(255,255,255,0.72)';

  const theme: Theme = {
    id,
    name,
    isDark,
    colors: {
      background: bg,
      surface,
      surfaceHigh,
      surfaceMuted,
      text,
      accent,
      accentMuted,
      accentSoft,
      primary: accent,
      secondary: isDark ? lighten(accent, 38) : darken(accent, 18),
      border,
      borderLight,
      card,
      cardElevated,
      notification: '#EF4444',
      success: '#22C55E',
      warning: '#F59E0B',
      info: '#3B82F6',
      error: '#EF4444',
      textSecondary,
      textMuted,
      textFaint,
      pageBackground: bg,
      overlay,
      scrim,
      glass,
      glassBorder,
      surfaceGlass,
    },
    gradients: {
      background: [bg, mix(bg, surface, 0.5), surface],
      card: [card, cardElevated],
      accent: [accent, mix(accent, '#ffffff', isDark ? 0.18 : 0.0)],
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    },
    borderRadius: {
      sm: 6,
      md: 10,
      lg: 14,
      xl: 18,
      '2xl': 22,
      '3xl': 28,
      full: 9999,
    },
    shadows: isDark
      ? {
          sm: { boxShadow: '0 1px 2px rgba(0,0,0,0.22)' },
          md: { boxShadow: '0 8px 24px rgba(0,0,0,0.32)' },
          lg: { boxShadow: '0 16px 40px rgba(0,0,0,0.42)' },
        }
      : {
          sm: { boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
          md: { boxShadow: '0 8px 20px rgba(0,0,0,0.08)' },
          lg: { boxShadow: '0 16px 36px rgba(0,0,0,0.10)' },
        },
  };
  return theme;
}

export const themes: Theme[] = [
  makeTheme('obsidian', 'Obsidian', '#070A12', '#0F111A', '#F0F2FA', '#7C82F8', true),
  makeTheme('nebula', 'Nebula', '#0B0719', '#16112A', '#F0EEFF', '#7C3AED', true),
  makeTheme('aurora', 'Aurora', '#051410', '#0A1F19', '#EEFFF8', '#10B981', true),
  makeTheme('sunset', 'Sunset', '#1A0E08', '#2A1810', '#FFF5EE', '#F97316', true),
  makeTheme('rose', 'Rose', '#1A0814', '#2A1020', '#FFF0F8', '#EC4899', true),
  makeTheme('ocean', 'Ocean', '#05101A', '#0A1A2A', '#EEF5FF', '#06B6D4', true),
  makeTheme('midnight', 'Midnight', '#070714', '#10102A', '#EEEEFF', '#6366F1', true),
  makeTheme('forest', 'Forest', '#081408', '#0E2012', '#EEFFEE', '#22C55E', true),
  makeTheme('lavender', 'Lavender', '#0F0A1A', '#1A1428', '#F5EEFF', '#A78BFA', true),
  makeTheme('crimson', 'Crimson', '#1A0808', '#2A1010', '#FFF0F0', '#EF4444', true),
  makeTheme('slate', 'Slate', '#0A0A0C', '#14141A', '#F0F0F4', '#94A3B8', true),
  makeTheme('amber', 'Amber', '#141006', '#241C0E', '#FFF8EE', '#EAB308', true),
  makeTheme('teal', 'Teal', '#061412', '#0C221E', '#EFFFFC', '#14B8A6', true),
  makeTheme('plum', 'Plum', '#140A14', '#201020', '#FFF0FF', '#D946EF', true),
  makeTheme('coral', 'Coral', '#1A0E0E', '#2A1818', '#FFF5F0', '#FB923C', true),
  makeTheme('ice', 'Ice', '#080C16', '#101B30', '#F0F4FF', '#38BDF8', true),

  makeTheme('light', 'Light', '#F8F9FC', '#FFFFFF', '#1A1A2E', '#6366F1', false),
  makeTheme('warm-light', 'Warm Light', '#FEFCF8', '#FFFFFF', '#2D1B00', '#F59E0B', false),
  makeTheme('cool-light', 'Cool Light', '#F0F5FF', '#FFFFFF', '#0F172A', '#0EA5E9', false),
];

export const DEFAULT_THEME_ID = 'obsidian';

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
