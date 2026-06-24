import { useToastStore } from "@/store/toast-store";
import { Platform } from "react-native";

const SILENT_ERRORS = new Set([
  "Failed to show notification",
  "Failed to hide notification",
  "Failed to cancel scheduled notification",
  "Player setup failed",
]);

type ErrorLevel = 'error' | 'warning' | 'info';

interface ErrorLogEntry {
  context: string;
  message: string;
  timestamp: number;
  level: ErrorLevel;
}

// Maintain a ring buffer of recent errors for diagnostics
const MAX_ERROR_LOG = 50;
const errorLog: ErrorLogEntry[] = [];

function addToErrorLog(context: string, message: string, level: ErrorLevel): void {
  errorLog.push({ context, message, timestamp: Date.now(), level });
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...errorLog];
}

export function clearErrorLog(): void {
  errorLog.length = 0;
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

// Global JS error handler for uncaught exceptions & promise rejections
let globalErrorHandlerInstalled = false;

export function installGlobalErrorHandler(): void {
  if (globalErrorHandlerInstalled) return;
  globalErrorHandlerInstalled = true;

  // Handle uncaught synchronous exceptions
  try {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      reportError('UnhandledException', error, isFatal ? 'Fatal error occurred' : undefined);
      defaultHandler(error, isFatal);
    });
  } catch (e) {
    console.warn('[ErrorHandler] Failed to install sync handler:', e);
  }

  // Handle unhandled promise rejections (leading cause of native crashes)
  try {
    if (globalThis?.addEventListener) {
      globalThis.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        reportError('UnhandledRejection', reason, 'A background task failed');
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
