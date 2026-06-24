import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storage } from "@/services/mmkv";

const PROGRESS_KEY = "lumora-video-progress";

interface VideoProgress {
  videoId: string;
  position: number;
  duration: number;
  updatedAt: number;
}

interface VideoProgressState {
  progresses: Record<string, VideoProgress>;
  getProgress: (videoId: string) => VideoProgress | null;
  setProgress: (videoId: string, position: number, duration: number) => void;
  removeProgress: (videoId: string) => void;
  clearAll: () => void;
}

function loadProgresses(): Record<string, VideoProgress> {
  try {
    const raw = storage.getString(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgresses(progresses: Record<string, VideoProgress>): void {
  try {
    storage.set(PROGRESS_KEY, JSON.stringify(progresses));
  } catch (e) {
    console.warn("[VideoProgressStore] Failed to save:", e);
  }
}

export const useVideoProgressStore = create<VideoProgressState>()(
  immer((set, get) => ({
    progresses: loadProgresses(),

    getProgress: (videoId: string) => {
      return get().progresses[videoId] ?? null;
    },

    setProgress: (videoId: string, position: number, duration: number) => {
      set((state) => {
        state.progresses[videoId] = {
          videoId,
          position,
          duration,
          updatedAt: Date.now(),
        };
        saveProgresses(state.progresses);
      });
    },

    removeProgress: (videoId: string) => {
      set((state) => {
        delete state.progresses[videoId];
        saveProgresses(state.progresses);
      });
    },

    clearAll: () => {
      set((state) => {
        state.progresses = {};
        saveProgresses({});
      });
    },
  })),
);
