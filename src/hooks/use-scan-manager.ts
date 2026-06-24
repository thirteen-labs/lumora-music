import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { useDocumentStore } from '@/store/document-store';
import {
  registerBackgroundScan,
  isBackgroundScanRegistered,
  isBackgroundScanEnabled,
} from '@/services/background-scanner';

const FOREGROUND_SCAN_COOLDOWN = 5000;

export function useScanManager() {
  const scan = useMusicStore((s) => s.scan);
  const songs = useMusicStore((s) => s.songs);
  const fetchVideos = useVideoStore((s) => s.fetchVideos);
  const videos = useVideoStore((s) => s.videos);
  const scanDocuments = useDocumentStore((s) => s.scanDocuments);
  const docFiles = useDocumentStore((s) => s.files);
  const lastForegroundScan = useRef(0);

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
        const now = Date.now();
        if (now - lastForegroundScan.current < FOREGROUND_SCAN_COOLDOWN) return;
        lastForegroundScan.current = now;
        await Promise.all([scan(), fetchVideos(), scanDocuments()]);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription?.remove();
  }, [scan, fetchVideos, scanDocuments]);

  useEffect(() => {
    if (songs.length > 0) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await Promise.all([scan(), fetchVideos(), scanDocuments()]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualScan = useCallback(async () => {
    await Promise.all([scan(), fetchVideos(), scanDocuments()]);
  }, [scan, fetchVideos, scanDocuments]);

  return {
    manualScan,
    songCount: songs.length,
    videoCount: videos.length,
    docCount: docFiles.length,
  };
}
