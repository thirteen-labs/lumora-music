import { useEffect, useCallback, useRef } from 'react';
import { extractColorsFromImage } from '@/services/color-extraction';
import { useColorAwareStore } from '@/store/color-aware-store';
import { useSettingsStore } from '@/store/settings-store';
import { usePlayerStore } from '@/store/player-store';

export function useColorAware() {
  const { setExtractedColors, clearColors } = useColorAwareStore();
  const colorAware = useSettingsStore((s) => s.colorAware);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const lastUriRef = useRef<string | null>(null);

  const extractFromUri = useCallback(async (uri: string) => {
    if (lastUriRef.current === uri) return;
    lastUriRef.current = uri;
    const colors = await extractColorsFromImage(uri);
    setExtractedColors(colors, uri);
  }, [setExtractedColors]);

  useEffect(() => {
    if (currentTrack?.artwork) {
      extractFromUri(currentTrack.artwork);
    } else if (colorAware && backgroundImage) {
      extractFromUri(backgroundImage);
    } else {
      clearColors();
      lastUriRef.current = null;
    }
  }, [currentTrack?.artwork, colorAware, backgroundImage, extractFromUri, clearColors]);
}
