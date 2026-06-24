import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const HIDDEN_SONGS_KEY = 'lumora-hidden-songs';
const HIDDEN_VIDEOS_KEY = 'lumora-hidden-videos';

function loadStringSet(key: string): Set<string> {
  try {
    const raw = storage.getString(key);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) { reportWarning('HiddenFiles', e); }
  return new Set();
}

function saveStringSet(key: string, set: Set<string>): void {
  try { storage.set(key, JSON.stringify([...set])); } catch (e) { reportWarning('HiddenFiles', e); }
}

interface HiddenFilesState {
  hiddenSongIds: Set<string>;
  hiddenVideoIds: Set<string>;
  hideSong: (id: string) => void;
  unhideSong: (id: string) => void;
  isSongHidden: (id: string) => boolean;
  hideVideo: (id: string) => void;
  unhideVideo: (id: string) => void;
  isVideoHidden: (id: string) => boolean;
}

export const useHiddenFilesStore = create<HiddenFilesState>()(
  immer((set, get) => ({
    hiddenSongIds: loadStringSet(HIDDEN_SONGS_KEY),
    hiddenVideoIds: loadStringSet(HIDDEN_VIDEOS_KEY),

    hideSong: (id) => {
      set((s) => { s.hiddenSongIds.add(id); });
      saveStringSet(HIDDEN_SONGS_KEY, get().hiddenSongIds);
    },
    unhideSong: (id) => {
      set((s) => { s.hiddenSongIds.delete(id); });
      saveStringSet(HIDDEN_SONGS_KEY, get().hiddenSongIds);
    },
    isSongHidden: (id) => get().hiddenSongIds.has(id),
    hideVideo: (id) => {
      set((s) => { s.hiddenVideoIds.add(id); });
      saveStringSet(HIDDEN_VIDEOS_KEY, get().hiddenVideoIds);
    },
    unhideVideo: (id) => {
      set((s) => { s.hiddenVideoIds.delete(id); });
      saveStringSet(HIDDEN_VIDEOS_KEY, get().hiddenVideoIds);
    },
    isVideoHidden: (id) => get().hiddenVideoIds.has(id),
  })),
);
