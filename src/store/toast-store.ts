import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  icon?: string;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, icon?: string) => void;
  dismissToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  showToast: (message: string, icon?: string) => {
    const id = `toast-${++counter}`;
    set((s) => {
      const next = [...s.toasts, { id, message, icon }];
      if (next.length > 5) next.splice(0, next.length - 5);
      return { toasts: next };
    });
    setTimeout(() => {
      try { get().dismissToast(id); } catch {}
    }, 2200);
  },
  dismissToast: (id: string) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
