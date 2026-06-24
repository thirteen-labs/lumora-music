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

        console.log('[BackgroundScanner] Starting background scan');

        const results = await Promise.allSettled([
          (async () => {
            const r = await scanMediaLibrary(undefined, undefined);
            if (r.songs.length > 0) {
              updateKnownFiles(r.songs);
              hasData = true;
            }
            return r;
          })(),
          (async () => {
            const v = await fetchVideos();
            if (v.length > 0) hasData = true;
            return v;
          })(),
          (async () => {
            const { scanRootDirectories } = require('./document-scanner');
            const docs = await scanRootDirectories();
            if (docs.length > 0) {
              hasData = true;
              try {
                const storage = require('./mmkv').storage;
                storage.set('lumora-documents', JSON.stringify(docs));
                storage.set('lumora-documents-time', new Date().toISOString());
              } catch (e) {
                reportWarning('BackgroundScanner', e, 'Failed to persist document scan results');
              }
            }
            return docs;
          })(),
        ]);

        for (const result of results) {
          if (result.status === 'rejected') {
            reportWarning('BackgroundScanner', result.reason, 'Background scan sub-task failed');
          }
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
    console.log('[BackgroundScanner] Registered successfully');
  } catch (error) {
    reportWarning('BackgroundScanner', error, 'Failed to register background scan');
  }
}

export async function unregisterBackgroundScan(): Promise<void> {
  ensureTaskDefined();
  try {
    const BackgroundFetch = require('expo-background-fetch');
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SCAN_TASK);
    console.log('[BackgroundScanner] Unregistered successfully');
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
