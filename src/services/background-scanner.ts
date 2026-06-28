/* eslint-disable @typescript-eslint/no-require-imports */
import { storage } from './mmkv';
import { reportWarning } from '@/utils/error-handler';

const BACKGROUND_SCAN_TASK = 'lumora-background-scan';
const SCAN_INTERVAL_KEY = 'lumora-bg-scan-interval';
const BG_SCAN_ENABLED_KEY = 'lumora-bg-scan-enabled';
const LAST_BG_SCAN_KEY = 'lumora-last-bg-scan';

let taskDefined = false;

function ensureTaskDefined(): void {
  if (taskDefined) return;
  try {
    const TaskManager = require('expo-task-manager');
    const BackgroundFetch = require('expo-background-fetch');

    TaskManager.defineTask(BACKGROUND_SCAN_TASK, async () => {
      let hasData = false;
      try {
        const { scanMediaLibrary } = require('./scanner');
        const { fetchVideos } = require('./video-fetcher');
        const { updateKnownFiles } = require('../scanner/enhanced-scanner');

        const enabled = storage.getString(BG_SCAN_ENABLED_KEY);
        if (enabled === 'false') {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const bgIntervalMs = 2000;

        try {
          const r = await scanMediaLibrary(undefined, undefined);
          if (r.songs.length > 0) {
            updateKnownFiles(r.songs);
            hasData = true;
          }
        } catch (e) {
          reportWarning('BackgroundScanner', e, 'Music scan failed');
        }

        await new Promise((r) => setTimeout(r, bgIntervalMs));

        try {
          const v = await fetchVideos();
          if (v.length > 0) hasData = true;
        } catch (e) {
          reportWarning('BackgroundScanner', e, 'Video scan failed');
        }

        storage.set(LAST_BG_SCAN_KEY, Date.now());
        return hasData
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('[BackgroundScanner] Background scan failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    taskDefined = true;
  } catch (e) {
    reportWarning('BackgroundScanner', e, 'Failed to define background scan task');
  }
}

export async function registerBackgroundScan(): Promise<void> {
  ensureTaskDefined();
  try {
    const BackgroundFetch = require('expo-background-fetch');
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SCAN_TASK, {
      minimumFetchInterval: getScanInterval(),
      stopOnTerminate: false,
      startOnBoot: true,
      enableWakeLock: true,
    });
  } catch (error) {
    reportWarning('BackgroundScanner', error, 'Failed to register background scan');
  }
}

export async function unregisterBackgroundScan(): Promise<void> {
  ensureTaskDefined();
  try {
    const BackgroundFetch = require('expo-background-fetch');
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SCAN_TASK);
  } catch (error) {
    reportWarning('BackgroundScanner', error, 'Failed to unregister background scan');
  }
}

export async function isBackgroundScanRegistered(): Promise<boolean> {
  ensureTaskDefined();
  try {
    const TaskManager = require('expo-task-manager');
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SCAN_TASK);
  } catch (e) {
    reportWarning('BackgroundScanner', e);
    return false;
  }
}

export function getScanInterval(): number {
  const stored = storage.getString(SCAN_INTERVAL_KEY);
  return stored ? parseInt(stored, 10) || 360 : 360;
}

export function setScanInterval(minutes: number): void {
  storage.set(SCAN_INTERVAL_KEY, minutes.toString());
  unregisterBackgroundScan()
    .then(() => registerBackgroundScan())
    .catch((e) => reportWarning('BackgroundScanner', e, 'Failed to re-register background scan'));
}

export function isBackgroundScanEnabled(): boolean {
  const stored = storage.getString(BG_SCAN_ENABLED_KEY);
  return stored !== 'false';
}

export function setBackgroundScanEnabled(enabled: boolean): void {
  storage.set(BG_SCAN_ENABLED_KEY, enabled.toString());
  if (enabled) {
    registerBackgroundScan().catch((e) => reportWarning('BackgroundScanner', e, 'Failed to enable background scan'));
  } else {
    unregisterBackgroundScan().catch((e) => reportWarning('BackgroundScanner', e, 'Failed to disable background scan'));
  }
}

export function getLastBackgroundScanTime(): number {
  const stored = storage.getString(LAST_BG_SCAN_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}
