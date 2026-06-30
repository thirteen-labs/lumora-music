import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusicStore } from '@/store/music-store';
import {
  registerBackgroundScan,
  isBackgroundScanRegistered,
  isBackgroundScanEnabled,
} from '@/services/background-scanner';
import { reportWarning } from '@/utils/error-handler';

const FOREGROUND_SCAN_COOLDOWN = 15000;
const INITIAL_SCAN_COOLDOWN = 3000;

export function useScanManager() {
  const scan = useMusicStore((s) => s.scan);
  const songs = useMusicStore((s) => s.songs);
  const scanStatus = useMusicStore((s) => s.scanStatus);
  const lastForegroundScan = useRef(0);

  async function runWithInterval<T>(fn: () => Promise<T>, label: string): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      reportWarning('ScanManager', e, `${label} scan failed`);
      return undefined;
    }
  }

  const runSafeScans = useCallback(async () => {
    await runWithInterval(scan, 'Music');
  }, [scan]);

  useEffect(() => {
    const setup = async () => {
      try {
        if (isBackgroundScanEnabled()) {
          const registered = await isBackgroundScanRegistered();
          if (!registered) {
            await registerBackgroundScan();
          }
        }
      } catch (e) {
        reportWarning('ScanManager', e, 'Failed to setup background scan');
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
        await runSafeScans();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription?.remove();
  }, [runSafeScans]);

  useEffect(() => {
    if (songs.length > 0) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (!cancelled && scanStatus !== 'scanning') {
        await runSafeScans();
      }
    }, INITIAL_SCAN_COOLDOWN);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualScan = useCallback(async () => {
    await runSafeScans();
  }, [runSafeScans]);

  return {
    manualScan,
    songCount: songs.length,
  };
}
