import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

let hydrated = false;

export function useColorScheme() {
  const isHydrated = useSyncExternalStore(
    (callback) => {
      if (!hydrated) {
        hydrated = true;
        callback();
      }
      return () => {};
    },
    () => hydrated,
    () => false,
  );

  const colorScheme = useRNColorScheme();
  return isHydrated ? colorScheme : 'light';
}
