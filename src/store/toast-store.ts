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
    set((s) => ({ toasts: [...s.toasts, { id, message, icon }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 2200);
  },
  dismissToast: (id: string) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
