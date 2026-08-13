export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  accent: string;
  primary: string;
  secondary: string;
  border: string;
  card: string;
  notification: string;
  success: string;
  warning: string;
  info: string;
  error: string;
  textSecondary: string;
  textMuted: string;
  pageBackground: string;
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

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark: boolean;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
}

export type ThemeId = string;
