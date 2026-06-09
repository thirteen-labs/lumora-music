import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import TrackPlayer, {
  Track as RntpTrack,
  RepeatMode as RntpRepeatMode,
} from 'react-native-track-player';
import type { Song } from '@/types/media';
import type { RepeatMode } from '@/types/player';
import { mapRepeatMode } from '@/services/track-player';

function songToTrack(song: Song): RntpTrack {
  return {
    id: song.id,
    url: song.uri,
    title: song.title,
    artist: song.artist,
    artwork: song.artwork ?? undefined,
    duration: song.duration,
    album: song.album,
    genre: song.genre ?? undefined,
  };
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
  play: (track: Song, queue?: Song[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (mode: RepeatMode) => Promise<void>;
  addToQueue: (track: Song) => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  showFullPlayer: () => void;
  hideFullPlayer: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  syncFromPlayer: () => Promise<void>;
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

    play: async (track, queue) => {
      const state = get();
      const isFirstPlay = !state.currentTrack;

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

      try {
        if (queue && queue.length > 0) {
          const tracks = queue.map(songToTrack);
          await TrackPlayer.reset();
          await TrackPlayer.add(tracks);

          const idx = queue.findIndex((t) => t.id === track.id);
          if (idx > 0) {
            await TrackPlayer.skip(idx);
          }
        }

        if (state.repeat !== 'off') {
          await TrackPlayer.setRepeatMode(mapRepeatMode(state.repeat));
        }

        await TrackPlayer.play();
      } catch {}
    },

    pause: async () => {
      set((s) => { s.isPlaying = false; });
      try { await TrackPlayer.pause(); } catch {}
    },

    resume: async () => {
      set((s) => { s.isPlaying = true; });
      try { await TrackPlayer.play(); } catch {}
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
      const { queue, shuffle } = get();
      if (queue.length === 0) return;
      try {
        await TrackPlayer.skipToNext();
      } catch {}
    },

    previous: async () => {
      try {
        await TrackPlayer.skipToPrevious();
      } catch {}
    },

    seekTo: async (position) => {
      set((s) => { s.position = position; });
      try { await TrackPlayer.seekTo(position); } catch {}
    },

    setShuffle: (shuffle) => { set((s) => { s.shuffle = shuffle; }); },

    setRepeat: async (mode) => {
      set((s) => { s.repeat = mode; });
      try {
        await TrackPlayer.setRepeatMode(mapRepeatMode(mode));
      } catch {}
    },

    addToQueue: async (track) => {
      set((s) => { s.queue.push(track); });
      try {
        await TrackPlayer.add(songToTrack(track));
      } catch {}
    },

    removeFromQueue: async (index) => {
      set((state) => {
        state.queue.splice(index, 1);
        if (index < state.queueIndex) state.queueIndex--;
      });
      try {
        await TrackPlayer.remove(index);
      } catch {}
    },

    reorderQueue: async (fromIndex, toIndex) => {
      set((state) => {
        const [item] = state.queue.splice(fromIndex, 1);
        state.queue.splice(toIndex, 0, item);
        if (fromIndex === state.queueIndex) {
          state.queueIndex = toIndex;
        }
      });
      try {
        await TrackPlayer.move(fromIndex, toIndex);
      } catch {}
    },

    showMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = true; }); },
    hideMiniPlayer: () => { set((s) => { s.isMiniPlayerVisible = false; }); },
    showFullPlayer: () => { set((s) => { s.isFullPlayerVisible = true; }); },
    hideFullPlayer: () => { set((s) => { s.isFullPlayerVisible = false; }); },
    setPosition: (position) => { set((s) => { s.position = position; }); },
    setDuration: (duration) => { set((s) => { s.duration = duration; }); },

    syncFromPlayer: async () => {
      try {
        const [track, position, duration, playbackState, repeatMode, queue] =
          await Promise.all([
            TrackPlayer.getActiveTrack(),
            TrackPlayer.getPosition(),
            TrackPlayer.getDuration(),
            TrackPlayer.getPlaybackState(),
            TrackPlayer.getRepeatMode(),
            TrackPlayer.getQueue(),
          ]);

        set((s) => {
          s.isPlaying = playbackState.state === 'playing';
          s.position = position;
          s.duration = duration;

          if (repeatMode === RntpRepeatMode.Off) s.repeat = 'off';
          else if (repeatMode === RntpRepeatMode.Queue) s.repeat = 'all';
          else if (repeatMode === RntpRepeatMode.Track) s.repeat = 'one';

          if (track) {
            const trackIndex = queue.findIndex((t) => t.id === track.id);
            if (trackIndex >= 0) s.queueIndex = trackIndex;
          }
        });
      } catch {}
    },
  })),
);
