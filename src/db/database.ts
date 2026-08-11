import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

const DB_NAME = 'lumora.db';

let db: SQLite.SQLiteDatabase | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS listening_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ms_listened INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_listening_history_song ON listening_history(song_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_started ON listening_history(started_at);

CREATE TABLE IF NOT EXISTS listen_stats (
  song_id TEXT PRIMARY KEY,
  play_count INTEGER NOT NULL DEFAULT 0,
  skip_count INTEGER NOT NULL DEFAULT 0,
  total_play_ms INTEGER NOT NULL DEFAULT 0,
  last_played INTEGER NOT NULL DEFAULT 0
);
`;

/**
 * Targeted SQLite layer (see app-flow.md §9): durable, queryable listening
 * history and per-track stats. MMKV remains the fast source of truth for the
 * library cache; this database mirrors listening activity so it can be queried
 * without loading the whole library JSON blob.
 */
export async function initDatabase(): Promise<void> {
  if (ready || db) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      if (Platform.OS === 'web') {
        logger.warn('[Database] SQLite not enabled on web, skipping');
        return;
      }
      db = SQLite.openDatabaseSync(DB_NAME);
      await db.execAsync(SCHEMA);
      ready = true;
    } catch (e) {
      logger.warn('[Database] Failed to initialize SQLite:', e);
      db = null;
      ready = false;
    }
  })();
  await initPromise;
}

export function isDatabaseReady(): boolean {
  return ready && db !== null;
}

export function getDatabase(): SQLite.SQLiteDatabase | null {
  return ready ? db : null;
}

export function resetDatabaseForTest(): void {
  db = null;
  ready = false;
  initPromise = null;
}