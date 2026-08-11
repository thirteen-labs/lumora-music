import { usePlayerStore } from '@/store/player-store';
import { useSettingsStore } from '@/store/settings-store';
import { useToastStore } from '@/store/toast-store';
import type { Song } from '@/types/media';
import type { RepeatMode } from '@/types/player';

/**
 * Centralized player action dispatcher.
 *
 * UI must route every playback mutation through this boundary instead of
 * calling the Zustand store directly. This is the single point that
 * orchestrates queue + engine + persistence, keeping components free of
 * playback logic (see app-flow.md §21).
 */
export const playerActions = {
  play: (track: Song, queue?: Song[]) => usePlayerStore.getState().play(track, queue),
  playNow: (track: Song, queue?: Song[]) => usePlayerStore.getState().play(track, queue),
  playNext: (track: Song) => {
    usePlayerStore.getState().playNext(track);
    useToastStore.getState().showToast('Playing next', 'check');
  },
  addToQueue: (track: Song) => {
    usePlayerStore.getState().addToQueue(track);
    useToastStore.getState().showToast('Added to queue', 'check');
  },
  clearPriorityQueue: () => {
    usePlayerStore.getState().clearPriorityQueue();
    useToastStore.getState().showToast('Play Next queue cleared', 'check');
  },
  clearQueue: () => {
    usePlayerStore.setState({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      priorityQueue: [],
      shuffledOrder: [],
      isPlaying: false,
    });
  },
  playQueueFromIndex: (index: number) => {
    const state = usePlayerStore.getState();
    const track = state.queue[index];
    if (track) state.play(track, state.queue);
  },
  togglePlay: () => usePlayerStore.getState().togglePlay(),
  pause: () => usePlayerStore.getState().pause(),
  resume: () => usePlayerStore.getState().resume(),
  stop: () => usePlayerStore.getState().stop(),
  next: () => usePlayerStore.getState().next(),
  previous: () => usePlayerStore.getState().previous(),
  seekTo: (position: number) => usePlayerStore.getState().seekTo(position),
  setShuffle: (enabled: boolean) => usePlayerStore.getState().setShuffle(enabled),
  setRepeat: (mode: RepeatMode) => usePlayerStore.getState().setRepeat(mode),
  removeFromQueue: (index: number) => usePlayerStore.getState().removeFromQueue(index),
  reorderQueue: (fromIndex: number, toIndex: number) =>
    usePlayerStore.getState().reorderQueue(fromIndex, toIndex),
  showMiniPlayer: () => usePlayerStore.getState().showMiniPlayer(),
  hideMiniPlayer: () => usePlayerStore.getState().hideMiniPlayer(),
  showFullPlayer: () => usePlayerStore.getState().showFullPlayer(),
  hideFullPlayer: () => usePlayerStore.getState().hideFullPlayer(),
  setPosition: (position: number) => usePlayerStore.getState().setPosition(position),
  setDuration: (duration: number) => usePlayerStore.getState().setDuration(duration),
  getAutoplayEnabled: () => useSettingsStore.getState().autoplay,
};