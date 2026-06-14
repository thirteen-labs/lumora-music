import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

const LYRICS_STORAGE_KEY = 'lumora-lyrics';

function loadLyrics(): Record<string, string> {
  try {
    const raw = storage.getString(LYRICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLyricsMap(map: Record<string, string>): void {
  try { storage.set(LYRICS_STORAGE_KEY, JSON.stringify(map)); } catch {}
}

interface LyricsState {
  lyricsMap: Record<string, string>;
  getLyrics: (songId: string) => string | undefined;
  saveLyrics: (songId: string, text: string) => void;
}

export const useLyricsStore = create<LyricsState>()(
  immer((set, get) => ({
    lyricsMap: loadLyrics(),

    getLyrics: (songId) => get().lyricsMap[songId],

    saveLyrics: (songId, text) => {
      set((state) => {
        state.lyricsMap[songId] = text;
      });
      saveLyricsMap(get().lyricsMap);
    },
  })),
);
