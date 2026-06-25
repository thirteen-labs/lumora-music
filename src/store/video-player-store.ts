import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storage } from "@/services/mmkv";
import type { Video } from "@/types/media";

export type ScaleMode = '16:9' | 'fill' | 'fit' | '4:3';
export type PlayMode = 'loop-one' | 'loop-all' | 'pause-after-play';

const SCALE_MODE_KEY = "lumora-video-scale-mode";
const PLAY_MODE_KEY = "lumora-video-play-mode";

interface VideoPlayerState {
  currentVideo: Video | null;
  queue: Video[];
  queueIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isControlsLocked: boolean;
  isPortrait: boolean;
  isAudioOnly: boolean;
  scaleMode: ScaleMode;
  playMode: PlayMode;
  isFloatingWindow: boolean;
  play: (video: Video, queue?: Video[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  next: () => void;
  previous: () => void;
  lockControls: () => void;
  unlockControls: () => void;
  setOrientation: (portrait: boolean) => void;
  toggleAudioOnly: () => void;
  setScaleMode: (mode: ScaleMode) => void;
  setPlayMode: (mode: PlayMode) => void;
  toggleFloatingWindow: () => void;
  addToQueue: (video: Video) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (fromIndex: number, toIndex: number) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
  immer((set, get) => ({
    currentVideo: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    playbackSpeed: 1.0,
    isControlsLocked: false,
    isPortrait: true,
    isAudioOnly: false,
    scaleMode: (() => {
      try { return (storage.getString(SCALE_MODE_KEY) as ScaleMode) ?? 'fit'; } catch { return 'fit'; }
    })(),
    playMode: (() => {
      try { return (storage.getString(PLAY_MODE_KEY) as PlayMode) ?? 'loop-all'; } catch { return 'loop-all'; }
    })(),
    isFloatingWindow: false,

    play: (video, queue) => {
      set((s) => {
        s.currentVideo = video;
        s.isPlaying = true;
        if (queue) {
          s.queue = queue;
          const idx = queue.findIndex((v) => v.id === video.id);
          s.queueIndex = idx >= 0 ? idx : 0;
        } else {
          s.queue = [video];
          s.queueIndex = 0;
        }
      });
    },

    pause: () => {
      set((s) => {
        s.isPlaying = false;
      });
    },

    resume: () => {
      set((s) => {
        s.isPlaying = true;
      });
    },

    togglePlay: () => {
      set((s) => {
        s.isPlaying = !s.isPlaying;
      });
    },

    setSpeed: (speed) => {
      set((s) => {
        s.playbackSpeed = speed;
      });
    },

    next: () => {
      const { queue, queueIndex } = get();
      if (queue.length === 0) return;
      const nextIndex = (queueIndex + 1) % queue.length;
      set((s) => {
        s.queueIndex = nextIndex;
        s.currentVideo = queue[nextIndex];
        s.isPlaying = true;
      });
    },

    previous: () => {
      const { queue, queueIndex } = get();
      if (queue.length === 0) return;
      const prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1;
      set((s) => {
        s.queueIndex = prevIndex;
        s.currentVideo = queue[prevIndex];
        s.isPlaying = true;
      });
    },

    lockControls: () => {
      set((s) => {
        s.isControlsLocked = true;
      });
    },

    unlockControls: () => {
      set((s) => {
        s.isControlsLocked = false;
      });
    },

    setOrientation: (portrait) => {
      set((s) => {
        s.isPortrait = portrait;
      });
    },

    toggleAudioOnly: () => {
      set((s) => {
        s.isAudioOnly = !s.isAudioOnly;
      });
    },

    setScaleMode: (mode) => {
      set((s) => {
        s.scaleMode = mode;
      });
      try { storage.set(SCALE_MODE_KEY, mode); } catch {}
    },

    setPlayMode: (mode) => {
      set((s) => {
        s.playMode = mode;
      });
      try { storage.set(PLAY_MODE_KEY, mode); } catch {}
    },

    toggleFloatingWindow: () => {
      set((s) => {
        s.isFloatingWindow = !s.isFloatingWindow;
      });
    },

    addToQueue: (video) => {
      set((s) => {
        s.queue.push(video);
      });
    },

    removeFromQueue: (index) => {
      set((s) => {
        s.queue.splice(index, 1);
        if (index < s.queueIndex) {
          s.queueIndex--;
        } else if (index === s.queueIndex) {
          if (s.queue.length === 0) {
            s.currentVideo = null;
            s.queueIndex = 0;
          } else if (s.queueIndex >= s.queue.length) {
            s.queueIndex = s.queue.length - 1;
            s.currentVideo = s.queue[s.queueIndex];
          } else {
            s.currentVideo = s.queue[s.queueIndex];
          }
        }
      });
    },

    moveInQueue: (fromIndex, toIndex) => {
      set((s) => {
        const [item] = s.queue.splice(fromIndex, 1);
        s.queue.splice(toIndex, 0, item);
        if (fromIndex === s.queueIndex) {
          s.queueIndex = toIndex;
        } else if (fromIndex < s.queueIndex && toIndex >= s.queueIndex) {
          s.queueIndex--;
        } else if (fromIndex > s.queueIndex && toIndex <= s.queueIndex) {
          s.queueIndex++;
        }
      });
    },
  })),
);
