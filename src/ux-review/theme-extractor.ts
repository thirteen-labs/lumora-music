import * as fs from 'fs';
import * as path from 'path';
import type { ThemeProfile } from './types';

const THEME_COLORS: Record<string, string> = {
  background: '#080A0F',
  surface: '#0F1117',
  text: '#F0F2F8',
  accent: '#7C82F8',
  primary: '#7C82F8',
  secondary: '#A0A6F8',
  border: 'rgba(255,255,255,0.08)',
  card: '#171923',
  notification: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  textSecondary: 'rgba(240,242,248,0.6)',
  textMuted: 'rgba(240,242,248,0.4)',
};

const THEME_SPACING: Record<string, number> = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

const THEME_BORDER_RADIUS: Record<string, number> = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  full: 9999,
};

const THEME_FONT_SIZES: Record<string, number> = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export function extractTheme(projectRoot: string): ThemeProfile {
  const themesPath = path.join(projectRoot, 'src', 'theme', 'themes.ts');

  let colors = { ...THEME_COLORS };
  let spacing = { ...THEME_SPACING };
  let borderRadius = { ...THEME_BORDER_RADIUS };

  if (fs.existsSync(themesPath)) {
    const content = fs.readFileSync(themesPath, 'utf-8');

    const bgMatch = content.match(/makeTheme\([^,]+,[^,]+,\s*'([^']+)'/);
    if (bgMatch) colors.background = bgMatch[1];

    const surfaceMatch = content.match(/makeTheme\([^,]+,[^,]+,[^,]+,\s*'([^']+)'/);
    if (surfaceMatch) colors.surface = surfaceMatch[1];

    const textMatch = content.match(/makeTheme\([^,]+,[^,]+,[^,]+,[^,]+,\s*'([^']+)'/);
    if (textMatch) colors.text = textMatch[1];

    const accentMatch = content.match(/makeTheme\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*'([^']+)'/);
    if (accentMatch) colors.accent = accentMatch[1];

    const spacingMatch = content.match(/spacing:\s*\{([^}]+)\}/s);
    if (spacingMatch) {
      const entries = spacingMatch[1].matchAll(/(\w+):\s*(\d+)/g);
      for (const [, key, val] of entries) {
        spacing[key] = Number(val);
      }
    }

    const radiusMatch = content.match(/borderRadius:\s*\{([^}]+)\}/s);
    if (radiusMatch) {
      const entries = radiusMatch[1].matchAll(/(\w+):\s*(\d+)/g);
      for (const [, key, val] of entries) {
        borderRadius[key] = Number(val);
      }
    }
  }

  return { colors, spacing, borderRadius, fontSizes: THEME_FONT_SIZES };
}
