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
  preloadNextTrack,
  isGaplessEnabled,
} from "@/services/track-player";
import { useStatsStore } from "@/store/stats-store";
import { preloadArtworkForTrack, preloadColorsForTrack } from "@/services/notifications";
import { reportWarning } from "@/utils/error-handler";

function shuffleArray(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  _shuffledPositionMap.clear();
  for (let i = 0; i < arr.length; i++) {
    _shuffledPositionMap.set(arr[i], i);
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
  priorityQueue: Song[];
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
  playNext: (track: Song) => void;
  addToQueue: (track: Song) => Promise<void>;
  addToPriorityQueue: (track: Song) => void;
  appendAutoplayTracks: (tracks: Song[]) => void;
  removeFromQueue: (index: number) => void;
  clearPriorityQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  showFullPlayer: () => void;
  hideFullPlayer: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  syncFromPlayer: () => void;
}

let _shuffledPositionMap = new Map<number, number>();

let trackChangeChain: Promise<void> = Promise.resolve();

async function serializedTrackChange(fn: () => Promise<void>): Promise<void> {
  const result = trackChangeChain.then(
    () => fn(),
    () => fn(),
  );
  trackChangeChain = result.then(() => {}, () => {});
  return result;
}

async function guardedLoadTrack(track: Song): Promise<void> {
  const currentId = usePlayerStore.getState().currentTrack?.id;
  await serializedTrackChange(async () => {
    if (usePlayerStore.getState().currentTrack?.id !== currentId) return;
    try {
      await loadTrack(track);
    } catch (e) {
      reportWarning('PlayerStore', e, 'Failed to load track');
      throw e;
    }
  });
}

export const usePlayerStore = create<PlayerState>()(
  immer((set, get) => ({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    priorityQueue: [],
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

      try { useStatsStore.getState().recordPlay(track.id); } catch (e) { reportWarning('PlayerStore', e, 'Failed to record play'); }

      preloadArtworkForTrack(track);
      preloadColorsForTrack(track.artwork);
      const stateAfter = get();
      if (stateAfter.queue.length > 0) {
        const nextIdx = stateAfter.queueIndex + 1;
        if (nextIdx < stateAfter.queue.length) {
          preloadArtworkForTrack(stateAfter.queue[nextIdx]);
          preloadColorsForTrack(stateAfter.queue[nextIdx].artwork);
        }
      }

      try {
        await guardedLoadTrack(track);
      } catch (e) {
        reportWarning('PlayerStore', e, 'Failed to load track');
        set((s) => { s.isPlaying = false; });
      }

      if (isGaplessEnabled()) {
        const stateNow = get();
        const nextIdx = stateNow.queueIndex + 1;
        if (nextIdx < stateNow.queue.length) {
          preloadNextTrack(stateNow.queue[nextIdx]);
        }
      }
    },

    pause: async () => {
      set((s) => {
        s.isPlaying = false;
      });
      await pausePlayback();
    },

    stop: async () => {
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
      const { queue, priorityQueue, shuffle, shuffledOrder, repeat } = get();

      if (priorityQueue.length > 0) {
        const priorityTrack = priorityQueue[0];
        set((s) => {
          s.priorityQueue = s.priorityQueue.slice(1);
        });
        const mainIdx = queue.findIndex((t) => t.id === priorityTrack.id);
        if (mainIdx >= 0) {
          set((s) => {
            s.queueIndex = mainIdx;
            s.currentTrack = priorityTrack;
            s.position = 0;
            s.duration = 0;
            s.isPlaying = true;
          });
          preloadArtworkForTrack(priorityTrack);
          preloadColorsForTrack(priorityTrack.artwork);
        try {
          await guardedLoadTrack(priorityTrack);
        } catch (e) {
          reportWarning('PlayerStore', e, 'Failed to load priority track');
          set((s) => { s.isPlaying = false; });
        }

        if (isGaplessEnabled()) {
          const st = get();
          const nxt = st.queueIndex + 1;
          if (nxt < st.queue.length) preloadNextTrack(st.queue[nxt]);
        }
        }
        return;
      }

      if (queue.length === 0) return;

      const currentTrack = get().currentTrack;
      if (currentTrack) {
        try { useStatsStore.getState().recordSkip(currentTrack.id); } catch (e) { reportWarning('PlayerStore', e, 'Failed to record skip'); }
      }

      let nextOriginalIndex: number;

      if (shuffle) {
        const currentShuffledIdx = _shuffledPositionMap.get(get().queueIndex) ?? shuffledOrder.indexOf(get().queueIndex);
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
        /* Preload artwork for notification */
        preloadArtworkForTrack(nextTrack);
        preloadColorsForTrack(nextTrack.artwork);
        try {
          await guardedLoadTrack(nextTrack);
        } catch (e) {
          reportWarning('PlayerStore', e, 'Failed to load next track');
          set((s) => { s.isPlaying = false; });
        }

        if (isGaplessEnabled()) {
          const st = get();
          const nxt = st.queueIndex + 1;
          if (nxt < st.queue.length) preloadNextTrack(st.queue[nxt]);
        }
      }
    },

    previous: async () => {
      const { queue, shuffle, shuffledOrder, position } = get();
      if (queue.length === 0) return;

      if (position > 3) {
        await serviceSeekTo(0);
        set((s) => {
          s.position = 0;
        });
        return;
      }

      let prevOriginalIndex: number;

      if (shuffle) {
        const currentShuffledIdx = _shuffledPositionMap.get(get().queueIndex) ?? shuffledOrder.indexOf(get().queueIndex);
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
        /* Preload artwork for notification */
        preloadArtworkForTrack(prevTrack);
        preloadColorsForTrack(prevTrack.artwork);
        try {
          await guardedLoadTrack(prevTrack);
        } catch (e) {
          reportWarning('PlayerStore', e, 'Failed to load previous track');
          set((s) => { s.isPlaying = false; });
        }

        if (isGaplessEnabled()) {
          const st = get();
          const nxt = st.queueIndex + 1;
          if (nxt < st.queue.length) preloadNextTrack(st.queue[nxt]);
        }
      }
    },

    seekTo: async (position) => {
      try { await serviceSeekTo(position); } catch (e) { reportWarning('PlayerStore', e, 'Seek failed'); }
      set((s) => {
        s.position = position;
      });
    },

    setShuffle: (shuffle) => {
      const state = get();
      if (shuffle === state.shuffle) return;

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
          s.shuffle = true;
          s.shuffledOrder = order;
          s.queueIndex = order[0] ?? 0;
        });
      } else {
        set((s) => {
          s.shuffle = false;
          s.shuffledOrder = [];
        });
      }
    },

    setRepeat: (mode) => {
      set((s) => {
        s.repeat = mode;
      });
    },

    playNext: (track) => {
      const state = get();
      if (!state.currentTrack) {
        get().play(track);
        return;
      }
      get().addToPriorityQueue(track);
    },

    addToQueue: async (track) => {
      set((s) => {
        s.queue.push(track);
      });
    },

    addToPriorityQueue: (track) => {
      set((s) => {
        if (!s.priorityQueue.find((t) => t.id === track.id)) {
          s.priorityQueue.push(track);
        }
      });
    },

    clearPriorityQueue: () => {
      set((s) => {
        s.priorityQueue = [];
      });
    },

    appendAutoplayTracks: (tracks) => {
      set((s) => {
        const existing = new Set(s.queue.map((t) => t.id));
        const fresh = tracks.filter((t) => !existing.has(t.id));
        if (fresh.length === 0) return;
        const base = s.queue.length;
        s.queue.push(...fresh);
        if (s.shuffle && s.shuffledOrder.length > 0) {
          const tail = fresh.map((_, i) => base + i);
          for (let i = tail.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tail[i], tail[j]] = [tail[j], tail[i]];
          }
          s.shuffledOrder.push(...tail);
        }
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
