/* eslint-disable @typescript-eslint/no-require-imports */
import { storage } from './mmkv';

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
      try {
        const { scanMediaLibrary } = require('./scanner');
        const { updateKnownFiles } = require('../scanner/enhanced-scanner');

        const enabled = storage.getString(BG_SCAN_ENABLED_KEY);
        if (enabled === 'false') {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        console.log('[BackgroundScanner] Starting background scan');
        const result = await scanMediaLibrary();
        console.log('[BackgroundScanner] Media scan complete:', result.songs.length, 'songs,', result.videos.length, 'videos');

        if (result.songs.length > 0) {
          updateKnownFiles(result.songs);
        }

        const { scanRootDirectories } = require('./document-scanner');
        const docs = await scanRootDirectories();
        console.log('[BackgroundScanner] Document scan complete:', docs.length, 'documents');

        if (docs.length > 0) {
          try {
            const storage = require('./mmkv').storage;
            storage.set('lumora-documents', JSON.stringify(docs));
            storage.set('lumora-documents-time', new Date().toISOString());
          } catch {}
        }

        storage.set(LAST_BG_SCAN_KEY, Date.now());

        const hasData = result.songs.length > 0 || result.videos.length > 0 || docs.length > 0;
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
    console.warn('Failed to define background scan task:', e);
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
    console.error('[BackgroundScanner] Failed to register background scan:', error);
  }
}

export async function unregisterBackgroundScan(): Promise<void> {
  ensureTaskDefined();
  try {
    const BackgroundFetch = require('expo-background-fetch');
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SCAN_TASK);
    console.log('[BackgroundScanner] Unregistered successfully');
  } catch (error) {
    console.error('[BackgroundScanner] Failed to unregister background scan:', error);
  }
}

export async function isBackgroundScanRegistered(): Promise<boolean> {
  ensureTaskDefined();
  try {
    const TaskManager = require('expo-task-manager');
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SCAN_TASK);
  } catch {
    return false;
  }
}

export function getScanInterval(): number {
  const stored = storage.getString(SCAN_INTERVAL_KEY);
  return stored ? parseInt(stored, 10) || 360 : 360;
}

export function setScanInterval(minutes: number): void {
  storage.set(SCAN_INTERVAL_KEY, minutes.toString());
  unregisterBackgroundScan().then(() => registerBackgroundScan()).catch(() => {});
}

export function isBackgroundScanEnabled(): boolean {
  const stored = storage.getString(BG_SCAN_ENABLED_KEY);
  return stored !== 'false';
}

export function setBackgroundScanEnabled(enabled: boolean): void {
  storage.set(BG_SCAN_ENABLED_KEY, enabled.toString());
  if (enabled) {
    registerBackgroundScan();
  } else {
    unregisterBackgroundScan();
  }
}

export function getLastBackgroundScanTime(): number {
  const stored = storage.getString(LAST_BG_SCAN_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}
