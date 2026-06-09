import { createContext, useContext } from 'react';
import { Theme } from '@/types/theme';
import { getThemeById } from './themes';

export const ThemeContext = createContext<Theme>(getThemeById('obsidian'));

export function useThemeContext(): Theme {
  return useContext(ThemeContext);
}
