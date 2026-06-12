import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

const VIDEO_PROGRESS_KEY = 'lumora-video-progress';

interface VideoProgress {
  [videoId: string]: {
    position: number;
    duration: number;
    lastPlayed: number;
  };
}

function loadProgress(): VideoProgress {
  try {
    const raw = storage.getString(VIDEO_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: VideoProgress): void {
  try {
    storage.set(VIDEO_PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
}

interface VideoProgressState {
  progress: VideoProgress;
  saveVideoPosition: (videoId: string, position: number, duration: number) => void;
  getVideoPosition: (videoId: string) => number;
  getVideoDuration: (videoId: string) => number;
  hasResumePoint: (videoId: string) => boolean;
  clearVideoProgress: (videoId: string) => void;
  getResumeVideos: () => { videoId: string; position: number; duration: number; lastPlayed: number }[];
}

export const useVideoProgressStore = create<VideoProgressState>()(
  immer((set, get) => ({
    progress: loadProgress(),

    saveVideoPosition: (videoId, position, duration) => {
      set((s) => {
        s.progress[videoId] = {
          position,
          duration,
          lastPlayed: Date.now(),
        };
        saveProgress(s.progress);
      });
    },

    getVideoPosition: (videoId) => {
      return get().progress[videoId]?.position ?? 0;
    },

    getVideoDuration: (videoId) => {
      return get().progress[videoId]?.duration ?? 0;
    },

    hasResumePoint: (videoId) => {
      const p = get().progress[videoId];
      if (!p) return false;
      const percentComplete = p.duration > 0 ? p.position / p.duration : 0;
      return percentComplete > 0.05 && percentComplete < 0.95;
    },

    clearVideoProgress: (videoId) => {
      set((s) => {
        delete s.progress[videoId];
        saveProgress(s.progress);
      });
    },

    getResumeVideos: () => {
      const progress = get().progress;
      return Object.entries(progress)
        .filter(([_, p]) => {
          const percent = p.duration > 0 ? p.position / p.duration : 0;
          return percent > 0.05 && percent < 0.95;
        })
        .map(([videoId, p]) => ({ videoId, ...p }))
        .sort((a, b) => b.lastPlayed - a.lastPlayed);
    },
  })),
);
