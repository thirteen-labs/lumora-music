export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHigh: string;
  surfaceMuted: string;
  text: string;
  accent: string;
  accentMuted: string;
  accentSoft: string;
  primary: string;
  secondary: string;
  border: string;
  borderLight: string;
  card: string;
  cardElevated: string;
  notification: string;
  success: string;
  warning: string;
  info: string;
  error: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  pageBackground: string;
  overlay: string;
  scrim: string;
  glass: string;
  glassBorder: string;
  surfaceGlass: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  full: number;
}

export interface ThemeShadows {
  sm: { boxShadow: string };
  md: { boxShadow: string };
  lg: { boxShadow: string };
}

export interface ThemeGradients {
  background: string[];
  card: string[];
  accent: string[];
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  gradients: ThemeGradients;
  isDark: boolean;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
}

export type ThemeId = string;
