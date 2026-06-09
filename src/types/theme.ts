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
  textSecondary: string;
  textMuted: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark: boolean;
}

export type ThemeId = string;
