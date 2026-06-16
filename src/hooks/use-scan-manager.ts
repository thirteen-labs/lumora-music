import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import {
  registerBackgroundScan,
  isBackgroundScanRegistered,
  isBackgroundScanEnabled,
} from '@/services/background-scanner';

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
        await scan();
        await scanVideos();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription?.remove();
  }, [scan, scanVideos]);

  useEffect(() => {
    if (songs.length === 0) {
      scan();
      scanVideos();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const manualScan = useCallback(async () => {
    await scan();
    scanVideos();
  }, [scan, scanVideos]);

  return {
    manualScan,
    songCount: songs.length,
  };
}
