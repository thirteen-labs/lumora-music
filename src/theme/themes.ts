import { Theme } from '@/types/theme';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function makeTheme(
  id: string,
  name: string,
  bg: string,
  surface: string,
  text: string,
  accent: string,
  isDark: boolean,
): Theme {
  const theme: Theme = {
    id,
    name,
    isDark,
    colors: {
      background: bg,
      surface,
      text,
      accent,
      primary: accent,
      secondary: isDark ? lighten(accent, 40) : '#6B7280',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      card: isDark ? lighten(surface, 8) : '#F8FAFC',
      notification: '#EF4444',
      success: '#22C55E',
      warning: '#F59E0B',
      info: '#3B82F6',
      textSecondary: hexToRgba(text, 0.6),
      textMuted: hexToRgba(text, 0.4),
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
    shadows: {
      sm: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      md: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      lg: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    },
  };
  return theme;
}

export const themes: Theme[] = [
  makeTheme('obsidian', 'Obsidian', '#080A0F', '#0F1117', '#F0F2F8', '#7C82F8', true),
];

export const DEFAULT_THEME_ID = 'obsidian';

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}