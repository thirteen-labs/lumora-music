import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { useDocumentStore } from '@/store/document-store';
import {
  registerBackgroundScan,
  isBackgroundScanRegistered,
  isBackgroundScanEnabled,
} from '@/services/background-scanner';

export function useScanManager() {
  const scan = useMusicStore((s) => s.scan);
  const songs = useMusicStore((s) => s.songs);
  const scanVideos = useVideoStore((s) => s.scanVideos);
  const scanDocuments = useDocumentStore((s) => s.scanDocuments);
  const docFiles = useDocumentStore((s) => s.files);

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
        await scanDocuments();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription?.remove();
  }, [scan, scanVideos, scanDocuments]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await Promise.all([scan(), scanVideos(), scanDocuments()]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualScan = useCallback(async () => {
    await scan();
    await scanVideos();
    await scanDocuments();
  }, [scan, scanVideos, scanDocuments]);

  return {
    manualScan,
    songCount: songs.length,
    docCount: docFiles.length,
  };
}
