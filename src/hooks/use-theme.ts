import { useThemeContext } from '@/theme/context';
import { useThemeStore } from '@/store/theme-store';

export function useTheme() {
  const theme = useThemeContext();
  const setTheme = useThemeStore((s) => s.setTheme);

  return {
    ...theme,
    setTheme,
  };
}
