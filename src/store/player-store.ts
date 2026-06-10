import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Song } from '@/types/media';
import type { RepeatMode } from '@/types/player';
import {
  loadTrack,
  pausePlayback,
  resumePlayback,
  seekTo as serviceSeekTo,
  getPlayer,
} from '@/services/track-player';

function shuffleArray(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
  shuffledOrder: number[];
  play: (track: Song, queue?: Song[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (mode: RepeatMode) => void;
  addToQueue: (track: Song) => Promise<void>;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  showFullPlayer: () => void;
  hideFullPlayer: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  syncFromPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  immer((set, get) => ({
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
    shuffledOrder: [],

    play: async (track, queue) => {
      set((s) => {
        s.currentTrack = track;
        s.isPlaying = true;
        s.position = 0;
        s.isMiniPlayerVisible = true;
        if (queue) {
          s.queue = queue;
          s.queueIndex = queue.findIndex((t) => t.id === track.id);
        }
      });

      await loadTrack(track);
    },

    pause: async () => {
      set((s) => { s.isPlaying = false; });
      await pausePlayback();
    },

    resume: async () => {
      set((s) => { s.isPlaying = true; });
      await resumePlayback();
    },

    togglePlay: async () => {
      const { isPlaying } = get();
      if (isPlaying) {
        await get().pause();
      } else {
        await get().resume();
      }
    },

    next: async () => {
      const { queue, shuffle, shuffledOrder, repeat } = get();
      if (queue.length === 0) return;

      let nextOriginalIndex: number;

      if (shuffle) {
        const currentShuffledIdx = shuffledOrder.indexOf(get().queueIndex);
        const nextShuffledIdx = currentShuffledIdx + 1;

        if (nextShuffledIdx >= shuffledOrder.length) {
          if (repeat === 'all') {
            const newOrder = shuffleArray(queue.length);
            set((s) => { s.shuffledOrder = newOrder; });
            nextOriginalIndex = newOrder[0];
          } else {
            set((s) => { s.isPlaying = false; });
            return;
          }
        } else {
          nextOriginalIndex = shuffledOrder[nextShuffledIdx];
        }
      } else {
        nextOriginalIndex = get().queueIndex + 1;

        if (nextOriginalIndex >= queue.length) {
          if (repeat === 'all') {
            nextOriginalIndex = 0;
          } else {
            set((s) => { s.isPlaying = false; });
            return;
          }
        }
      }

      const nextTrack = queue[nextOriginalIndex];
      if (nextTrack) {
        set((s) => { s.queueIndex = nextOriginalIndex; });
        await loadTrack(nextTrack);
      }
    },

    previous: async () => {
      const { queue, shuffle, shuffledOrder, position } = get();
      if (queue.length === 0) return;

      if (position > 3) {
        await serviceSeekTo(0);
        set((s) => { s.position = 0; });
        return;
      }

      let prevOriginalIndex: number;

      if (shuffle) {
        const currentShuffledIdx = shuffledOrder.indexOf(get().queueIndex);
        const prevShuffledIdx = currentShuffledIdx - 1;

        if (prevShuffledIdx < 0) {
          prevOriginalIndex = shuffledOrder[shuffledOrder.length - 1];
        } else {
          prevOriginalIndex = shuffledOrder[prevShuffledIdx];
        }
      } else {
        prevOriginalIndex = get().queueIndex - 1;
        if (prevOriginalIndex < 0) {
          prevOriginalIndex = queue.length - 1;
        }
      }

      const prevTrack = queue[prevOriginalIndex];
      if (prevTrack) {
        set((s) => { s.queueIndex = prevOriginalIndex; });
        await loadTrack(prevTrack);
      }
    },

    seekTo: async (position) => {
      set((s) => { s.position = position; });
      await serviceSeekTo(position);
    },

    setShuffle: (shuffle) => {
      set((s) => { s.shuffle = shuffle; });

      const state = get();
      if (!state.currentTrack || state.queue.length === 0) return;

      if (shuffle) {
        const order = shuffleArray(state.queue.length);
        set((s) => { s.shuffledOrder = order; });
      } else {
        set((s) => { s.shuffledOrder = []; });
      }
    },

    setRepeat: (mode) => {
      set((s) => { s.repeat = mode; });
    },

    addToQueue: async (track) => {
      set((s) => { s.queue.push(track); });
    },

    removeFromQueue: (index) => {
      set((state) => {
        state.queue.splice(index, 1);
        if (index < state.queueIndex) state.queueIndex--;
        if (state.shuffle) {
          state.shuffledOrder = state.shuffledOrder.filter((i) => i !== index);
        }
      });
    },

    reorderQueue: (fromIndex, toIndex) => {
      set((state) => {
        const [item] = state.queue.splice(fromIndex, 1);
        state.queue.splice(toIndex, 0, item);
        if (fromIndex === state.queueIndex) {
          state.queueIndex = toIndex;
        } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
          state.queueIndex--;
        } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
          state.queueIndex++;
        }
      });
    },

    showMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = true; }); },
    hideMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = false; }); },
    showFullPlayer: () => { set((s) => { s.isFullPlayerVisible = true; }); },
    hideFullPlayer: () => { set((s) => { s.isFullPlayerVisible = false; }); },
    setPosition: (position) => { set((s) => { s.position = position; }); },
    setDuration: (duration) => { set((s) => { s.duration = duration; }); },

    syncFromPlayer: () => {
      const playerState = getPlayerState();

      set((s) => {
        s.isPlaying = playerState.playing;
        s.position = playerState.currentTime;
        s.duration = playerState.duration;
      });
    },
  })),
);

function getPlayerState() {
  const player = getPlayer();
  if (!player) {
    return { playing: false, currentTime: 0, duration: 0, isBuffering: false, isLoaded: false };
  }
  return {
    playing: player.playing,
    currentTime: player.currentTime,
    duration: player.duration,
    isBuffering: player.isBuffering,
    isLoaded: player.isLoaded,
  };
}
