import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import {
  registerBackgroundScan,
  isBackgroundScanRegistered,
  isBackgroundScanEnabled,
} from '@/services/background-scanner';
import { scanMediaLibrary } from '@/services/scanner';
import { updateKnownFiles } from '@/scanner/enhanced-scanner';

export function useScanManager() {
  const scan = useMusicStore((s) => s.scan);
  const songs = useMusicStore((s) => s.songs);
  const scanVideos = useVideoStore((s) => s.scanVideos);

  useEffect(() => {
    const setup = async () => {
      if (isBackgroundScanEnabled()) {
        const registered = await isBackgroundScanRegistered();
        if (!registered) {
          await registerBackgroundScan();
        }
      }
    };
    setup();
  }, []);

  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const result = await scanMediaLibrary();
        if (result.songs.length > 0) {
          updateKnownFiles(result.songs);
          scanVideos();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription?.remove();
  }, [scanVideos]);

  const manualScan = useCallback(async () => {
    await scan();
    scanVideos();
  }, [scan, scanVideos]);

  return {
    manualScan,
    songCount: songs.length,
  };
}
