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
  return {
    id,
    name,
    isDark,
    colors: {
      background: bg,
      surface,
      text,
      accent,
      primary: accent,
      secondary: isDark ? lighten(accent, 40) : darken(accent, 40),
      border: isDark ? lighten(surface, 30) : darken(surface, 20),
      card: isDark ? lighten(surface, 15) : darken(surface, 10),
      notification: '#EF4444',
      success: '#22C55E',
      warning: '#F59E0B',
      info: '#3B82F6',
      textSecondary: hexToRgba(text, 0.7),
      textMuted: hexToRgba(text, 0.5),
    },
  };
}

export const themes: Theme[] = [
  makeTheme('obsidian', 'Obsidian', '#000000', '#121212', '#FFFFFF', '#00E5FF', true),
  makeTheme('midnight', 'Midnight', '#0B1220', '#111827', '#F9FAFB', '#3B82F6', true),
  makeTheme('phantom', 'Phantom', '#0A0A0A', '#1A1A1A', '#F5F5F5', '#8B5CF6', true),
  makeTheme('aurora', 'Aurora', '#071A1A', '#0F2E2E', '#F0FFFF', '#22D3EE', true),
  makeTheme('nebula', 'Nebula', '#140C1F', '#231338', '#F5EDFF', '#A855F7', true),
  makeTheme('oceanic', 'Oceanic', '#081B29', '#102A43', '#F0F9FF', '#38BDF8', true),
  makeTheme('ember', 'Ember', '#2B1200', '#402000', '#FFF7ED', '#F97316', true),
  makeTheme('forest', 'Forest', '#0A170D', '#112415', '#F0FDF4', '#22C55E', true),
  makeTheme('crimson', 'Crimson', '#19090A', '#2B1012', '#FFF5F5', '#EF4444', true),
  makeTheme('velvet', 'Velvet', '#2D1821', '#40222E', '#FFF1F5', '#FB7185', true),
  makeTheme('cyber-neon', 'Cyber Neon', '#050816', '#0F172A', '#E0F2FE', '#00F5D4', true),
  makeTheme('matrix', 'Matrix', '#020A02', '#071507', '#E6FFE6', '#00FF66', true),
  makeTheme('golden-hour', 'Golden Hour', '#2A1A00', '#3B2600', '#FFF8E7', '#FBBF24', true),
  makeTheme('royal', 'Royal', '#0F1029', '#191B45', '#F5F3FF', '#6366F1', true),
  makeTheme('rose-gold', 'Rose Gold', '#2B1D20', '#3C2A2E', '#FFF5F7', '#F472B6', true),
  makeTheme('slate', 'Slate', '#111827', '#1F2937', '#F9FAFB', '#94A3B8', true),
  makeTheme('glacier', 'Glacier', '#EAF4FF', '#FFFFFF', '#0F172A', '#2563EB', false),
  makeTheme('arctic', 'Arctic', '#F8FAFC', '#FFFFFF', '#0F172A', '#2563EB', false),
  makeTheme('paper', 'Paper', '#FAFAF9', '#FFFFFF', '#1C1917', '#EA580C', false),
  makeTheme('lavender', 'Lavender', '#F5F3FF', '#FFFFFF', '#312E81', '#8B5CF6', false),
];

export const DEFAULT_THEME_ID = 'obsidian';

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
