import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Song } from "@/types/media";
import type { RepeatMode } from "@/types/player";
import {
  loadTrack,
  pausePlayback,
  resumePlayback,
  seekTo as serviceSeekTo,
  getPlayer,
  clearLockScreenControls,
} from "@/services/track-player";
import { useStatsStore } from "@/store/stats-store";
import { useQueuePersistStore } from "@/store/queue-persist-store";
import { reportWarning } from "@/utils/error-handler";

function shuffleArray(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRandomQueue(track: Song, allSongs: Song[], maxSize = 50): Song[] {
  const others = allSongs.filter((s) => s.id !== track.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const count = Math.min(maxSize - 1, others.length);
  return [track, ...others.slice(0, count)];
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
  stop: () => Promise<void>;
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

let trackLoadingLock = false;

async function guardedLoadTrack(track: Song): Promise<void> {
  if (trackLoadingLock) {
    reportWarning('PlayerStore', 'loadTrack called while already loading, queuing');
    // Small yield to let current load finish
    await new Promise(r => setTimeout(r, 100));
    if (trackLoadingLock) {
      reportWarning('PlayerStore', 'loadTrack still locked after wait, forcing release');
      trackLoadingLock = false;
    }
  }
  trackLoadingLock = true;
  try {
    await loadTrack(track);
  } finally {
    trackLoadingLock = false;
  }
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
    repeat: "off",
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
          const idx = queue.findIndex((t) => t.id === track.id);
          s.queueIndex = idx >= 0 ? idx : 0;
        }
      });

      try { useStatsStore.getState().recordPlay(track.id); } catch {}
      const state = get();
      try {
        useQueuePersistStore.getState().saveQueue(track, state.queue, state.queueIndex, state.shuffle, state.repeat, 0);
      } catch {}

      try {
        await guardedLoadTrack(track);
      } catch (e) {
        reportWarning('PlayerStore', e, 'Failed to load track');
        set((s) => { s.isPlaying = false; });
      }
    },

    pause: async () => {
      const state = get();
      if (state.currentTrack) {
        try {
          useQueuePersistStore.getState().saveQueue(
            state.currentTrack, state.queue, state.queueIndex,
            state.shuffle, state.repeat, state.position,
          );
        } catch {}
      }
      set((s) => {
        s.isPlaying = false;
      });
      await pausePlayback();
    },

    stop: async () => {
      const state = get();
      if (state.currentTrack) {
        try {
          useQueuePersistStore.getState().saveQueue(
            state.currentTrack, state.queue, state.queueIndex,
            state.shuffle, state.repeat, state.position,
          );
        } catch {}
      }
      set((s) => {
        s.isPlaying = false;
        s.currentTrack = null;
        s.isMiniPlayerVisible = false;
      });
      await pausePlayback();
      clearLockScreenControls();
    },

    resume: async () => {
      set((s) => {
        s.isPlaying = true;
      });
      await resumePlayback();
    },

    togglePlay: async () => {
      const { isPlaying } = get();
      try {
        if (isPlaying) {
          await get().pause();
        } else {
          await get().resume();
        }
      } catch (e) {
        reportWarning('PlayerStore', e, 'Failed to toggle playback');
      }
    },

    next: async () => {
      const { queue, shuffle, shuffledOrder, repeat } = get();
      if (queue.length === 0) return;

      const currentTrack = get().currentTrack;
      if (currentTrack) {
        try { useStatsStore.getState().recordSkip(currentTrack.id); } catch {}
      }

      /* Save position before moving on */
      const preState = get();
      if (preState.currentTrack && preState.isPlaying) {
        try {
          useQueuePersistStore.getState().saveQueue(
            preState.currentTrack, preState.queue, preState.queueIndex,
            preState.shuffle, preState.repeat, preState.position,
          );
        } catch {}
      }

      let nextOriginalIndex: number;

      if (shuffle) {
        const currentShuffledIdx = shuffledOrder.indexOf(get().queueIndex);
        const nextShuffledIdx = currentShuffledIdx + 1;

        if (nextShuffledIdx >= shuffledOrder.length) {
          if (repeat === "all") {
            const newOrder = queue.length > 0 ? shuffleArray(queue.length) : [];
            set((s) => {
              s.shuffledOrder = newOrder;
            });
            nextOriginalIndex = newOrder[0] ?? 0;
          } else {
            set((s) => {
              s.isPlaying = false;
            });
            return;
          }
        } else {
          nextOriginalIndex = shuffledOrder[nextShuffledIdx];
        }
      } else {
        nextOriginalIndex = get().queueIndex + 1;

        if (nextOriginalIndex >= queue.length) {
          if (repeat === "all") {
            nextOriginalIndex = 0;
          } else {
            set((s) => {
              s.isPlaying = false;
            });
            return;
          }
        }
      }

      const nextTrack = queue[nextOriginalIndex];
      if (nextTrack) {
        set((s) => {
          s.queueIndex = nextOriginalIndex;
          s.currentTrack = nextTrack;
          s.position = 0;
          s.duration = 0;
          s.isPlaying = true;
        });
        try {
          await guardedLoadTrack(nextTrack);
        } catch (e) {
          reportWarning('PlayerStore', e, 'Failed to load next track');
          set((s) => { s.isPlaying = false; });
        }
        const s = get();
        try {
          useQueuePersistStore.getState().saveQueue(nextTrack, s.queue, nextOriginalIndex, s.shuffle, s.repeat, 0);
        } catch {}
      }
    },

    previous: async () => {
      const { queue, shuffle, shuffledOrder, position } = get();
      if (queue.length === 0) return;

      /* Save position before moving on */
      const preState = get();
      if (preState.currentTrack && preState.isPlaying) {
        try {
          useQueuePersistStore.getState().saveQueue(
            preState.currentTrack, preState.queue, preState.queueIndex,
            preState.shuffle, preState.repeat, preState.position,
          );
        } catch {}
      }

      if (position > 3) {
        await serviceSeekTo(0);
        set((s) => {
          s.position = 0;
        });
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
        set((s) => {
          s.queueIndex = prevOriginalIndex;
          s.currentTrack = prevTrack;
          s.position = 0;
          s.duration = 0;
          s.isPlaying = true;
        });
        try {
          await guardedLoadTrack(prevTrack);
        } catch (e) {
          reportWarning('PlayerStore', e, 'Failed to load previous track');
          set((s) => { s.isPlaying = false; });
        }
        const s = get();
        try {
          useQueuePersistStore.getState().saveQueue(prevTrack, s.queue, prevOriginalIndex, s.shuffle, s.repeat, 0);
        } catch {}
      }
    },

    seekTo: async (position) => {
      try { await serviceSeekTo(position); } catch {}
      set((s) => {
        s.position = position;
      });
    },

    setShuffle: (shuffle) => {
      set((s) => {
        s.shuffle = shuffle;
      });

      const state = get();
      if (!state.currentTrack || state.queue.length === 0) return;

      if (shuffle) {
        if (state.queue.length === 0) return;
        const order = shuffleArray(state.queue.length);
        const currentQueueIdx = state.queueIndex;
        const currentShuffledIdx = order.indexOf(currentQueueIdx);
        if (currentShuffledIdx > 0) {
          const tmp = order[0];
          order[0] = order[currentShuffledIdx];
          order[currentShuffledIdx] = tmp;
        }
        set((s) => {
          s.shuffledOrder = order;
          s.queueIndex = order[0] ?? 0;
        });
      } else {
        set((s) => {
          s.shuffledOrder = [];
        });
      }
    },

    setRepeat: (mode) => {
      set((s) => {
        s.repeat = mode;
      });
    },

    addToQueue: async (track) => {
      set((s) => {
        s.queue.push(track);
      });
    },

    removeFromQueue: (index) => {
      const wasCurrent = index === get().queueIndex;

      set((state) => {
        state.queue.splice(index, 1);
        if (index < state.queueIndex) {
          state.queueIndex--;
        } else if (index === state.queueIndex) {
          if (state.queue.length === 0) {
            state.currentTrack = null;
            state.queueIndex = 0;
          } else if (state.queueIndex >= state.queue.length) {
            state.queueIndex = state.queue.length - 1;
            state.currentTrack = state.queue[state.queueIndex];
          } else {
            state.currentTrack = state.queue[state.queueIndex];
          }
        }
        if (state.shuffle) {
          state.shuffledOrder = state.shuffledOrder
            .filter((i) => i !== index)
            .map((i) => (i > index ? i - 1 : i));
        }
      });

      if (wasCurrent) {
        const newState = get();
        if (newState.currentTrack) {
          guardedLoadTrack(newState.currentTrack).catch((e) => reportWarning('Player', e, 'Failed to load next track after queue removal'));
        } else {
          pausePlayback().catch((e) => reportWarning('Player', e, 'Failed to pause after queue removal'));
        }
      }
    },

    reorderQueue: (fromIndex, toIndex) => {
      set((state) => {
        const [item] = state.queue.splice(fromIndex, 1);
        state.queue.splice(toIndex, 0, item);
        if (fromIndex === state.queueIndex) {
          state.queueIndex = toIndex;
        } else if (
          fromIndex < state.queueIndex &&
          toIndex >= state.queueIndex
        ) {
          state.queueIndex--;
        } else if (
          fromIndex > state.queueIndex &&
          toIndex <= state.queueIndex
        ) {
          state.queueIndex++;
        }
        if (state.shuffle) {
          state.shuffledOrder = state.shuffledOrder.map((i) => {
            if (i === fromIndex) return toIndex;
            if (fromIndex < toIndex && i > fromIndex && i <= toIndex)
              return i - 1;
            if (fromIndex > toIndex && i >= toIndex && i < fromIndex)
              return i + 1;
            return i;
          });
        }
      });
    },

    showMiniPlayer: () => {
      set((s) => {
        s.isMiniPlayerVisible = true;
      });
    },
    hideMiniPlayer: () => {
      set((s) => {
        s.isMiniPlayerVisible = false;
      });
    },
    showFullPlayer: () => {
      set((s) => {
        s.isFullPlayerVisible = true;
      });
    },
    hideFullPlayer: () => {
      set((s) => {
        s.isFullPlayerVisible = false;
      });
    },
    setPosition: (position) => {
      set((s) => {
        s.position = position;
      });
    },
    setDuration: (duration) => {
      set((s) => {
        s.duration = duration;
      });
    },

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
    return {
      playing: false,
      currentTime: 0,
      duration: 0,
      isBuffering: false,
      isLoaded: false,
    };
  }
  return {
    playing: player.playing,
    currentTime: player.currentTime,
    duration: player.duration,
    isBuffering: player.isBuffering,
    isLoaded: player.isLoaded,
  };
}
