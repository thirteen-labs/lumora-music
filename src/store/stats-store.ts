import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { TrackStats, ListeningStats } from '@/types/audio';
import type { Song } from '@/types/media';

const STATS_KEY = 'lumora-track-stats';
const DAILY_KEY = 'lumora-daily-listening';

interface DailyListening {
  [date: string]: number;
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingTrackStats: Record<string, TrackStats> | null = null;
let _pendingDaily: DailyListening | null = null;

function flushSaves() {
  _saveTimer = null;
  if (_pendingTrackStats) {
    try { storage.set(STATS_KEY, JSON.stringify(_pendingTrackStats)); } catch {}
    _pendingTrackStats = null;
  }
  if (_pendingDaily) {
    try { storage.set(DAILY_KEY, JSON.stringify(_pendingDaily)); } catch {}
    _pendingDaily = null;
  }
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSaves, 500);
}

function loadStats(): Record<string, TrackStats> {
  try {
    const raw = storage.getString(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadDailyListening(): DailyListening {
  try {
    const raw = storage.getString(DAILY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface StatsState {
  trackStats: Record<string, TrackStats>;
  recordPlay: (songId: string) => void;
  recordSkip: (songId: string) => void;
  addPlayTime: (songId: string, seconds: number) => void;
  recordDailyListening: (seconds: number) => void;
  getTrackStats: (songId: string) => TrackStats;
  getMostPlayed: (songs: Song[], limit?: number) => Song[];
  getNeverPlayed: (songs: Song[]) => Song[];
  getRecentlyPlayed: (songs: Song[], limit?: number) => Song[];
  getListeningStats: (songs: Song[]) => ListeningStats;
  getTopSongs: (songs: Song[], limit?: number) => { song: Song; count: number }[];
  getTotalPlayCount: () => number;
  getTotalListenTime: () => number;
}

export const useStatsStore = create<StatsState>()(
  immer((set, get) => ({
    trackStats: loadStats(),

    recordPlay: (songId) => {
      set((s) => {
        const existing = s.trackStats[songId] || {
          songId, playCount: 0, skipCount: 0, lastPlayed: 0, totalPlayTime: 0,
        };
        existing.playCount++;
        existing.lastPlayed = Date.now();
        s.trackStats[songId] = existing;
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
    },

    recordSkip: (songId) => {
      set((s) => {
        const existing = s.trackStats[songId] || {
          songId, playCount: 0, skipCount: 0, lastPlayed: 0, totalPlayTime: 0,
        };
        existing.skipCount++;
        s.trackStats[songId] = existing;
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
    },

    addPlayTime: (songId, seconds) => {
      set((s) => {
        const existing = s.trackStats[songId] || {
          songId, playCount: 0, skipCount: 0, lastPlayed: 0, totalPlayTime: 0,
        };
        existing.totalPlayTime += seconds;
        s.trackStats[songId] = existing;
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
    },

    recordDailyListening: (seconds) => {
      if (!_pendingDaily) _pendingDaily = loadDailyListening();
      const key = getTodayKey();
      _pendingDaily[key] = (_pendingDaily[key] || 0) + seconds;
      scheduleSave();
    },

    getTrackStats: (songId) => {
      return get().trackStats[songId] || {
        songId, playCount: 0, skipCount: 0, lastPlayed: 0, totalPlayTime: 0,
      };
    },

    getMostPlayed: (songs, limit = 20) => {
      const stats = get().trackStats;
      return [...songs]
        .sort((a, b) => (stats[b.id]?.playCount || 0) - (stats[a.id]?.playCount || 0))
        .slice(0, limit);
    },

    getNeverPlayed: (songs) => {
      const stats = get().trackStats;
      return songs.filter((s) => !stats[s.id] || stats[s.id].playCount === 0);
    },

    getRecentlyPlayed: (songs, limit = 20) => {
      const stats = get().trackStats;
      return [...songs]
        .filter((s) => stats[s.id]?.lastPlayed)
        .sort((a, b) => (stats[b.id]?.lastPlayed || 0) - (stats[a.id]?.lastPlayed || 0))
        .slice(0, limit);
    },

    getTopSongs: (songs, limit = 10) => {
      const stats = get().trackStats;
      return songs
        .map((song) => ({ song, count: stats[song.id]?.playCount || 0 }))
        .filter((e) => e.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },

    getListeningStats: (songs) => {
      const stats = get().trackStats;
      const daily = loadDailyListening();
      let totalPlayTime = 0;
      let totalTracksPlayed = 0;
      const artistCounts: Record<string, number> = {};
      const albumCounts: Record<string, number> = {};
      const songCounts: Record<string, number> = {};

      for (const song of songs) {
        const s = stats[song.id];
        if (s && s.playCount > 0) {
          totalPlayTime += s.totalPlayTime;
          totalTracksPlayed += s.playCount;
          artistCounts[song.artist] = (artistCounts[song.artist] || 0) + s.playCount;
          albumCounts[song.album] = (albumCounts[song.album] || 0) + s.playCount;
          songCounts[song.title] = (songCounts[song.title] || 0) + s.playCount;
        }
      }

      const topArtists = Object.entries(artistCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topAlbums = Object.entries(albumCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topSongs = Object.entries(songCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const weeklyMinutes: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        weeklyMinutes.push(Math.round((daily[key] || 0) / 60));
      }

      return { totalPlayTime, totalTracksPlayed, topArtists, topAlbums, topSongs, weeklyMinutes };
    },

    getTotalPlayCount: () => {
      const stats = get().trackStats;
      return Object.values(stats).reduce((sum, s) => sum + s.playCount, 0);
    },

    getTotalListenTime: () => {
      const stats = get().trackStats;
      return Object.values(stats).reduce((sum, s) => sum + s.totalPlayTime, 0);
    },
  })),
);
