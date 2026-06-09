import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Song } from '@/types/media';
import type { RepeatMode } from '@/types/player';

interface PlayerState {
  currentTrack: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isMiniPlayerVisible: boolean;
  isFullPlayerVisible: boolean;
  play: (track: Song, queue?: Song[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (position: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (mode: RepeatMode) => void;
  addToQueue: (track: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  showFullPlayer: () => void;
  hideFullPlayer: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  immer((set) => ({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
    isMiniPlayerVisible: false,
    isFullPlayerVisible: false,

    play: (track, queue) => {
      set((state) => {
        state.currentTrack = track;
        state.isPlaying = true;
        state.position = 0;
        state.isMiniPlayerVisible = true;
        if (queue) {
          state.queue = queue;
          state.queueIndex = queue.findIndex((t) => t.id === track.id);
        }
      });
    },

    pause: () => { set((s) => { s.isPlaying = false; }); },
    resume: () => { set((s) => { s.isPlaying = true; }); },
    togglePlay: () => { set((s) => { s.isPlaying = !s.isPlaying; }); },

    next: () => {
      set((state) => {
        if (state.queue.length === 0) return;
        const nextIndex = state.shuffle
          ? Math.floor(Math.random() * state.queue.length)
          : (state.queueIndex + 1) % state.queue.length;
        state.queueIndex = nextIndex;
        state.currentTrack = state.queue[nextIndex];
        state.position = 0;
        state.isPlaying = true;
      });
    },

    previous: () => {
      set((state) => {
        if (state.queue.length === 0) return;
        const prevIndex = state.queueIndex === 0 ? state.queue.length - 1 : state.queueIndex - 1;
        state.queueIndex = prevIndex;
        state.currentTrack = state.queue[prevIndex];
        state.position = 0;
        state.isPlaying = true;
      });
    },

    seekTo: (position) => { set((s) => { s.position = position; }); },
    setShuffle: (shuffle) => { set((s) => { s.shuffle = shuffle; }); },
    setRepeat: (mode) => { set((s) => { s.repeat = mode; }); },

    addToQueue: (track) => {
      set((s) => { s.queue.push(track); });
    },

    removeFromQueue: (index) => {
      set((state) => {
        state.queue.splice(index, 1);
        if (index < state.queueIndex) state.queueIndex--;
      });
    },

    reorderQueue: (fromIndex, toIndex) => {
      set((state) => {
        const [item] = state.queue.splice(fromIndex, 1);
        state.queue.splice(toIndex, 0, item);
        if (fromIndex === state.queueIndex) {
          state.queueIndex = toIndex;
        }
      });
    },

    showMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = true; }); },
    hideMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = false; }); },
    showFullPlayer: () => { set((s) => { s.isFullPlayerVisible = true; }); },
    hideFullPlayer: () => { set((s) => { s.isFullPlayerVisible = false; }); },
    setPosition: (position) => { set((s) => { s.position = position; }); },
    setDuration: (duration) => { set((s) => { s.duration = duration; }); },
  })),
);
