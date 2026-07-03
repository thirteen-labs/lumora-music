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

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
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
      secondary: isDark ? lighten(accent, 40) : darken(accent, 20),
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      card: isDark ? lighten(surface, 8) : darken(surface, 6),
      notification: '#EF4444',
      success: '#22C55E',
      warning: '#F59E0B',
      info: '#3B82F6',
      error: '#EF4444',
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
    shadows: isDark ? {
      sm: { boxShadow: '0 1px 2px rgba(0,0,0,0.2)' },
      md: { boxShadow: '0 2px 4px rgba(0,0,0,0.25)' },
      lg: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
    } : {
      sm: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
      md: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      lg: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
    },
  };
  return theme;
}

export const themes: Theme[] = [
  makeTheme('obsidian', 'Obsidian', '#080A0F', '#0F1117', '#F0F2F8', '#7C82F8', true),
  makeTheme('nebula', 'Nebula', '#0B0719', '#16112A', '#F0EEFF', '#7C3AED', true),
  makeTheme('aurora', 'Aurora', '#051410', '#0A1F19', '#EEFFF8', '#10B981', true),
  makeTheme('sunset', 'Sunset', '#1A0E08', '#2A1810', '#FFF5EE', '#F97316', true),
  makeTheme('rose', 'Rose', '#1A0814', '#2A1020', '#FFF0F8', '#EC4899', true),
  makeTheme('ocean', 'Ocean', '#05101A', '#0A1A2A', '#EEF5FF', '#06B6D4', true),
  makeTheme('midnight', 'Midnight', '#070714', '#0F0F24', '#EEEEFF', '#6366F1', true),
  makeTheme('forest', 'Forest', '#081408', '#0E200E', '#EEFFEE', '#22C55E', true),
  makeTheme('lavender', 'Lavender', '#0F0A1A', '#1A1428', '#F5EEFF', '#A78BFA', true),
  makeTheme('crimson', 'Crimson', '#1A0808', '#2A1010', '#FFF0F0', '#EF4444', true),
  makeTheme('slate', 'Slate', '#0A0A0C', '#14141A', '#F0F0F4', '#94A3B8', true),
  makeTheme('amber', 'Amber', '#141006', '#241C0E', '#FFF8EE', '#EAB308', true),
  makeTheme('teal', 'Teal', '#061412', '#0C221E', '#EFFFFC', '#14B8A6', true),
  makeTheme('plum', 'Plum', '#140A14', '#201020', '#FFF0FF', '#D946EF', true),
  makeTheme('coral', 'Coral', '#1A0E0E', '#2A1818', '#FFF5F0', '#FB923C', true),
  makeTheme('ice', 'Ice', '#080C16', '#0F1628', '#F0F4FF', '#38BDF8', true),

  makeTheme('light', 'Light', '#F8F9FC', '#FFFFFF', '#1A1A2E', '#6366F1', false),
  makeTheme('warm-light', 'Warm Light', '#FEFCF8', '#FFFFFF', '#2D1B00', '#F59E0B', false),
  makeTheme('cool-light', 'Cool Light', '#F0F5FF', '#FFFFFF', '#0F172A', '#0EA5E9', false),
];

export const DEFAULT_THEME_ID = 'obsidian';

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}