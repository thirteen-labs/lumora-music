import { getDatabase } from './database';
import { logger } from '@/utils/logger';

function safe<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  return fn().catch((e) => {
    logger.warn(`[ListeningRepo] ${label} failed:`, e);
    return undefined;
  });
}

export interface PlayStartInput {
  songId: string;
  startedAt?: number;
}

export interface ListenedRow {
  song_id: string;
  started_at: number;
  ms_listened: number;
}

export interface ListenStatRow {
  song_id: string;
  play_count: number;
  skip_count: number;
  total_play_ms: number;
  last_played: number;
}

/** Record a track starting to play: new history entry + stats upsert. */
export function writePlayStart(input: PlayStartInput): Promise<void | undefined> {
  return safe('writePlayStart', async () => {
    const db = getDatabase();
    if (!db) return;
    const startedAt = input.startedAt ?? Date.now();
    await db.runAsync(
      'INSERT INTO listening_history (song_id, started_at, ms_listened) VALUES (?, ?, 0)',
      input.songId,
      startedAt,
    );
    await db.runAsync(
      `INSERT INTO listen_stats (song_id, play_count, skip_count, total_play_ms, last_played)
       VALUES (?, 1, 0, 0, ?)
       ON CONFLICT(song_id) DO UPDATE SET
         play_count = play_count + 1,
         last_played = excluded.last_played`,
      input.songId,
      startedAt,
    );
  });
}

/** Accumulate listening time for a track (called from the stats heartbeats). */
export function writeListenTime(songId: string, ms: number): Promise<void | undefined> {
  return safe('writeListenTime', async () => {
    const db = getDatabase();
    if (!db || ms <= 0) return;
    await db.runAsync(
      `INSERT INTO listen_stats (song_id, play_count, skip_count, total_play_ms, last_played)
       VALUES (?, 0, 0, ?, 0)
       ON CONFLICT(song_id) DO UPDATE SET total_play_ms = total_play_ms + excluded.total_play_ms`,
      songId,
      ms,
    );
    await db.runAsync(
      'UPDATE listening_history SET ms_listened = ms_listened + ? WHERE id = (SELECT MAX(id) FROM listening_history WHERE song_id = ?)',
      ms,
      songId,
    );
  });
}

/** Record a manual skip. */
export function writeSkip(songId: string): Promise<void | undefined> {
  return safe('writeSkip', async () => {
    const db = getDatabase();
    if (!db) return;
    await db.runAsync(
      `INSERT INTO listen_stats (song_id, play_count, skip_count, total_play_ms, last_played)
       VALUES (?, 0, 1, 0, 0)
       ON CONFLICT(song_id) DO UPDATE SET skip_count = skip_count + 1`,
      songId,
    );
  });
}

export function getRecentlyPlayedRows(limit = 20): Promise<ListenedRow[] | undefined> {
  return safe('getRecentlyPlayedRows', async () => {
    const db = getDatabase();
    if (!db) return [];
    return db.getAllAsync<ListenedRow>(
      'SELECT song_id, started_at, ms_listened FROM listening_history ORDER BY started_at DESC LIMIT ?',
      limit,
    );
  });
}

export function getMostPlayedStats(limit = 20): Promise<ListenStatRow[] | undefined> {
  return safe('getMostPlayedStats', async () => {
    const db = getDatabase();
    if (!db) return [];
    return db.getAllAsync<ListenStatRow>(
      'SELECT song_id, play_count, skip_count, total_play_ms, last_played FROM listen_stats ORDER BY total_play_ms DESC, play_count DESC LIMIT ?',
      limit,
    );
  });
}

export function getPlayCounts(): Promise<Pick<ListenStatRow, 'song_id' | 'play_count' | 'total_play_ms'>[] | undefined> {
  return safe('getPlayCounts', async () => {
    const db = getDatabase();
    if (!db) return [];
    return db.getAllAsync<Pick<ListenStatRow, 'song_id' | 'play_count' | 'total_play_ms'>>(
      'SELECT song_id, play_count, total_play_ms FROM listen_stats WHERE play_count > 0 OR total_play_ms > 0',
    );
  });
}