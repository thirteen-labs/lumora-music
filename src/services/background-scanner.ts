import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { scanMediaLibrary, getCachedSongs } from '@/services/scanner';
import { storage } from '@/services/mmkv';

const BACKGROUND_SCAN_TASK = 'lumora-background-scan';
const LAST_BG_SCAN_KEY = 'lumora-last-bg-scan';
const BG_SCAN_ENABLED_KEY = 'lumora-bg-scan-enabled';

export function isBackgroundScanEnabled(): boolean {
  try {
    return storage.getBoolean(BG_SCAN_ENABLED_KEY) ?? true;
  } catch {
    return true;
  }
}

export function setBackgroundScanEnabled(enabled: boolean): void {
  try {
    storage.set(BG_SCAN_ENABLED_KEY, enabled);
  } catch {}
}

function getLastBgScanTime(): number {
  try {
    return Number(storage.getString(LAST_BG_SCAN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setLastBgScanTime(time: number): void {
  try {
    storage.set(LAST_BG_SCAN_KEY, String(time));
  } catch {}
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_SCAN_TASK, async () => {
    try {
      const cached = getCachedSongs();
      const lastScan = getLastBgScanTime();
      const hoursSinceLastScan = (Date.now() - lastScan) / (1000 * 60 * 60);

      if (cached.length > 0 && hoursSinceLastScan < 1) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      await scanMediaLibrary();
      setLastBgScanTime(Date.now());
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundScan(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!isBackgroundScanEnabled()) return;

  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SCAN_TASK, {
      minimumInterval: 60 * 15,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('Background scan registration failed:', e);
  }
}

export async function unregisterBackgroundScan(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SCAN_TASK);
  } catch {}
}

export async function initBackgroundScan(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      setBackgroundScanEnabled(false);
      return;
    }
  } catch {}

  await registerBackgroundScan();
}
