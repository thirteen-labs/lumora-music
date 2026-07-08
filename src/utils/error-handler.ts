import { useToastStore } from "@/store/toast-store";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const SILENT_ERRORS = new Set([
  "Failed to show notification",
  "Failed to hide notification",
  "Failed to cancel scheduled notification",
  "Player setup failed",
  "Failed to load expo-media-library/legacy",
  "Failed to load expo-media-library",
  "Metadata parsing disabled",
  "Failed to load expo-file-system/legacy",
  "Media library module is required but failed to load",
]);

type ErrorLevel = 'error' | 'warning' | 'info';

interface ErrorLogEntry {
  context: string;
  message: string;
  timestamp: number;
  level: ErrorLevel;
}

const MAX_ERROR_LOG = 100;
const errorLog: ErrorLogEntry[] = [];
const MAX_CRASH_FILES = 5;

function addToErrorLog(context: string, message: string, level: ErrorLevel): void {
  errorLog.push({ context, message, timestamp: Date.now(), level });
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

export function reportError(context: string, error: unknown, userMessage?: string): void {
  const message = formatError(error);
  console.error(`[${context}]`, message, error instanceof Error ? error.stack : '');
  addToErrorLog(context, message, 'error');

  if (userMessage && !SILENT_ERRORS.has(message)) {
    useToastStore.getState().showToast(userMessage || "Something went wrong");
  }
}

export function reportWarning(context: string, error: unknown, userMessage?: string): void {
  const message = formatError(error);
  console.warn(`[${context}]`, message);
  addToErrorLog(context, message, 'warning');

  if (userMessage) {
    useToastStore.getState().showToast(userMessage);
  }
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...errorLog];
}

export async function persistCrashLog(name: string, error: Error): Promise<void> {
  try {
    const crashDir = `${FileSystem.cacheDirectory}crash-logs/`;
    const dir = await FileSystem.getInfoAsync(crashDir);
    if (!dir.exists) {
      await FileSystem.makeDirectoryAsync(crashDir, { intermediates: true });
    }
    const timestamp = Date.now();
    const filename = `${crashDir}${name}-${timestamp}.json`;
    await FileSystem.writeAsStringAsync(filename, JSON.stringify({
      error: { name: error.name, message: error.message, stack: error.stack },
      timestamp,
      platform: Platform.OS,
        memoryWarn: 'n/a',
    }, null, 2));

    const files = await FileSystem.readDirectoryAsync(crashDir);
    if (files.length > MAX_CRASH_FILES) {
      const sorted = files.sort();
      for (let i = 0; i < sorted.length - MAX_CRASH_FILES; i++) {
        await FileSystem.deleteAsync(`${crashDir}${sorted[i]}`, { idempotent: true });
      }
    }
  } catch {}
}

export async function getRecentCrashLogs(): Promise<string[]> {
  try {
    const crashDir = `${FileSystem.cacheDirectory}crash-logs/`;
    const dir = await FileSystem.getInfoAsync(crashDir);
    if (!dir.exists) return [];
    const files = await FileSystem.readDirectoryAsync(crashDir);
    return files.sort().reverse().map((f) => `${crashDir}${f}`);
  } catch {
    return [];
  }
}

export async function clearCrashLogs(): Promise<void> {
  try {
    const crashDir = `${FileSystem.cacheDirectory}crash-logs/`;
    const dir = await FileSystem.getInfoAsync(crashDir);
    if (dir.exists) {
      await FileSystem.deleteAsync(crashDir, { idempotent: true });
    }
  } catch {}
}

let globalErrorHandlerInstalled = false;

export function installGlobalErrorHandler(): void {
  if (globalErrorHandlerInstalled) return;
  globalErrorHandlerInstalled = true;

  try {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      reportError('UnhandledException', error, isFatal ? 'Fatal error occurred' : undefined);
      if (isFatal) {
        persistCrashLog('fatal', error);
      }
      defaultHandler(error, isFatal);
    });
  } catch (e) {
    console.warn('[ErrorHandler] Failed to install sync handler:', e);
  }

  try {
    if (globalThis?.addEventListener) {
      globalThis.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        reportError('UnhandledRejection', reason, 'A background task failed');
        if (reason instanceof Error) {
          persistCrashLog('unhandled-rejection', reason);
        }
        event.preventDefault();
      });
    }
  } catch (e) {
    console.warn('[ErrorHandler] Failed to install rejection handler:', e);
  }

  if (Platform.OS !== 'web') {
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (args[0]?.includes?.('[NativeAudio]')) return;
      originalConsoleWarn.apply(console, args);
    };
  }
}
