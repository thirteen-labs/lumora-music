import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getCachedJSON, setCachedJSON } from '@/services/mmkv';
import { writePlayStart, writeListenTime, writeSkip } from '@/db/listening-repository';
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
    setCachedJSON(STATS_KEY, _pendingTrackStats);
    _pendingTrackStats = null;
  }
  if (_pendingDaily) {
    setCachedJSON(DAILY_KEY, _pendingDaily);
    _pendingDaily = null;
  }
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSaves, 500);
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyStats = { songId: '', playCount: 0, skipCount: 0, lastPlayed: 0, totalPlayTime: 0 };

interface StatsState {
  trackStats: Record<string, TrackStats>;
  dailyListening: DailyListening;
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
    trackStats: getCachedJSON(STATS_KEY, {} as Record<string, TrackStats>),
    dailyListening: getCachedJSON(DAILY_KEY, {} as DailyListening),

    recordPlay: (songId) => {
      set((s) => {
        const existing = s.trackStats[songId] || { ...emptyStats, songId };
        existing.playCount++;
        existing.lastPlayed = Date.now();
        s.trackStats[songId] = { ...existing };
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
      writePlayStart({ songId });
    },

    recordSkip: (songId) => {
      set((s) => {
        const existing = s.trackStats[songId] || { ...emptyStats, songId };
        existing.skipCount++;
        s.trackStats[songId] = { ...existing };
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
      writeSkip(songId);
    },

    addPlayTime: (songId, seconds) => {
      set((s) => {
        const existing = s.trackStats[songId] || { ...emptyStats, songId };
        existing.totalPlayTime += seconds;
        s.trackStats[songId] = { ...existing };
      });
      _pendingTrackStats = get().trackStats;
      scheduleSave();
      writeListenTime(songId, Math.round(seconds * 1000));
    },

    recordDailyListening: (seconds) => {
      set((s) => {
        const key = getTodayKey();
        s.dailyListening[key] = (s.dailyListening[key] || 0) + seconds;
      });
      _pendingDaily = get().dailyListening;
      scheduleSave();
    },

    getTrackStats: (songId) => {
      return get().trackStats[songId] || { ...emptyStats, songId };
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
      const daily = get().dailyListening;
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

      const topSongsList = Object.entries(songCounts)
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

      return { totalPlayTime, totalTracksPlayed, topArtists, topAlbums, topSongs: topSongsList, weeklyMinutes };
    },

    getTotalPlayCount: () => {
      const stats: Record<string, { playCount: number; totalPlayTime: number }> = (get() as any).trackStats;
      return Object.values(stats).reduce((sum, s) => sum + s.playCount, 0);
    },

    getTotalListenTime: () => {
      const stats: Record<string, { playCount: number; totalPlayTime: number }> = (get() as any).trackStats;
      return Object.values(stats).reduce((sum, s) => sum + s.totalPlayTime, 0);
    },
  })),
);
