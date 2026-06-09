import * as ImageColors from 'react-native-image-colors';
import type { ThemeColors } from '@/types/theme';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sortByLuminance(colors: string[]): string[] {
  return [...colors].sort((a, b) => luminance(a) - luminance(b));
}

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
}

export async function extractColorsFromImage(uri: string): Promise<ExtractedColors | null> {
  try {
    const result = await ImageColors.getColors(uri, {
      quality: 'high',
      pixelSpacing: 5,
    });

    const palette: string[] = [];

    if (result.platform === 'android') {
      if (result.vibrant) palette.push(result.vibrant);
      if (result.darkVibrant) palette.push(result.darkVibrant);
      if (result.lightVibrant) palette.push(result.lightVibrant);
      if (result.dominant) palette.push(result.dominant);
      if (result.muted) palette.push(result.muted);
      if (result.darkMuted) palette.push(result.darkMuted);
      if (result.lightMuted) palette.push(result.lightMuted);
    } else if (result.platform === 'ios') {
      if (result.primary) palette.push(result.primary);
      if (result.secondary) palette.push(result.secondary);
      if (result.detail) palette.push(result.detail);
      if (result.background) palette.push(result.background);
    } else {
      if (result.dominant) palette.push(result.dominant);
      if (result.vibrant) palette.push(result.vibrant);
      if (result.darkVibrant) palette.push(result.darkVibrant);
    }

    const unique = [...new Set(palette)].filter((c) => c && c.startsWith('#'));
    if (unique.length === 0) return null;

    const sorted = sortByLuminance(unique);

    const darkest = sorted[0] ?? '#0A0A0F';
    const midDark = sorted[Math.floor(sorted.length * 0.3)] ?? sorted[0] ?? '#141420';
    const vibrant = unique[0] ?? '#8B5CF6';
    const lightest = sorted[sorted.length - 1] ?? '#FFFFFF';

    return {
      primary: vibrant,
      secondary: midDark,
      accent: vibrant,
      background: darkest,
      surface: midDark,
    };
  } catch (error) {
    console.error('Color extraction error:', error);
    return null;
  }
}

export function extractedColorsToThemeColors(
  extracted: ExtractedColors,
): Partial<ThemeColors> {
  return {
    background: extracted.background,
    surface: extracted.surface,
    primary: extracted.primary,
    secondary: extracted.secondary,
    accent: extracted.accent,
    border: hexToRgba(extracted.primary, 0.2),
    card: hexToRgba(extracted.surface, 1.5),
    textSecondary: hexToRgba('#FFFFFF', 0.7),
    textMuted: hexToRgba('#FFFFFF', 0.5),
  };
}
