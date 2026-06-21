import { useToastStore } from "@/store/toast-store";

const SILENT_ERRORS = new Set([
  "Failed to show notification",
  "Failed to hide notification",
  "Failed to cancel scheduled notification",
]);

export function reportError(context: string, error: unknown, userMessage?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message);

  if (userMessage && !SILENT_ERRORS.has(message)) {
    useToastStore.getState().showToast(userMessage || "Something went wrong");
  }
}

export function reportWarning(context: string, error: unknown, userMessage?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[${context}]`, message);

  if (userMessage) {
    useToastStore.getState().showToast(userMessage);
  }
}
