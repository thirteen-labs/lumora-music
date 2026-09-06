import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getDatabase, initDatabase } from '@/db/database';
import { reportWarning } from '@/utils/error-handler';
import { logger } from '@/utils/logger';
import { storage } from '@/services/mmkv';

const THUMB_DIR = `${FileSystem.cacheDirectory}thumbnails/`;
const MAX_CACHE_BYTES = 120 * 1024 * 1024; // 120 MB
const MAX_CACHE_FILES = 800;

// Legacy MMKV keys to migrate once
const LEGACY_KEYS = ['lumora-artwork-preview-cache', 'lumora-song-artwork', 'lumora-album-artwork'];

let dirReady = false;

async function ensureDir(): Promise<void> {
  if (dirReady) return;
  try {
    const info = await FileSystem.getInfoAsync(THUMB_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true });
    dirReady = true;
  } catch (e) {
    logger.warn('[ThumbCache] ensureDir failed', e);
  }
}

function hashUri(uri: string): string {
  let h = 0;
  for (let i = 0; i < uri.length; i++) h = ((h << 5) - h + uri.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36) + '_' + uri.length.toString(36);
}

function filePathFor(sourceUri: string): string {
  // keep extension hint if present
  const ext = sourceUri.includes('.jpg') || sourceUri.includes('content://') ? 'jpg' : 'jpg';
  return `${THUMB_DIR}${hashUri(sourceUri)}.${ext}`;
}

// ---------------------------------------------------------------------------
// SQLite schema — added at runtime (no migration needed, IF NOT EXISTS)
// ---------------------------------------------------------------------------
const THUMB_SCHEMA = `
CREATE TABLE IF NOT EXISTS thumbnail_cache (
  source_uri TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_access INTEGER NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_thumb_last_access ON thumbnail_cache(last_access);
`;

let schemaReady = false;
async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await initDatabase();
  const db = getDatabase();
  if (!db) return;
  try {
    await db.execAsync(THUMB_SCHEMA);
    schemaReady = true;
  } catch (e) {
    reportWarning('ThumbCache', e, 'ensureSchema failed');
  }
}

// One-time migration from MMKV maps to SQLite rows (keeps files if they exist)
let migrated = false;
async function migrateLegacyIfNeeded(): Promise<void> {
  if (migrated) return;
  migrated = true;
  try {
    const now = Date.now();
    for (const key of LEGACY_KEYS) {
      const raw = storage.getString(key);
      if (!raw) continue;
      let map: Record<string, string> = {};
      try { map = JSON.parse(raw); } catch { continue; }
      for (const [source, path] of Object.entries(map)) {
        if (!source || !path) continue;
        const info = await FileSystem.getInfoAsync(path).catch(() => null);
        const exists = (info as { exists?: boolean })?.exists;
        if (!exists) continue;
        await putEntry(source, path, now, false);
      }
    }
  } catch (e) {
    logger.warn('[ThumbCache] migrateLegacy failed', e);
  }
}

async function putEntry(sourceUri: string, filePath: string, now = Date.now(), touchAccess = true): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  if (!db) return;
  try {
    const info = await FileSystem.getInfoAsync(filePath).catch(() => null);
    const bytes = (info as { size?: number })?.size ?? 0;
    await db.runAsync(
      `INSERT OR REPLACE INTO thumbnail_cache (source_uri, file_path, created_at, last_access, bytes)
       VALUES (?, ?, COALESCE((SELECT created_at FROM thumbnail_cache WHERE source_uri=?), ?), ?, ?)`,
      [sourceUri, filePath, sourceUri, now, touchAccess ? now : now, bytes]
    );
  } catch (e) {
    reportWarning('ThumbCache', e, 'putEntry failed');
  }
}

async function touchAccess(sourceUri: string): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  try {
    await db.runAsync(`UPDATE thumbnail_cache SET last_access=? WHERE source_uri=?`, [Date.now(), sourceUri]);
  } catch {}
}

// Evict oldest by last_access when over limits (bytes or count)
async function evictIfNeeded(): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  try {
    const rows = await db.getAllAsync(`SELECT file_path, bytes FROM thumbnail_cache ORDER BY last_access ASC`) as Array<{ file_path: string; bytes: number }>;
    let totalBytes = rows.reduce((s, r) => s + (r.bytes || 0), 0);
    let count = rows.length;
    if (totalBytes <= MAX_CACHE_BYTES && count <= MAX_CACHE_FILES) return;
    for (const row of rows) {
      if (totalBytes <= MAX_CACHE_BYTES * 0.8 && count <= MAX_CACHE_FILES * 0.8) break;
      try { await FileSystem.deleteAsync(row.file_path, { idempotent: true }); } catch {}
      await db.runAsync(`DELETE FROM thumbnail_cache WHERE file_path=?`, [row.file_path]);
      totalBytes -= row.bytes || 0;
      count--;
    }
  } catch (e) {
    logger.warn('[ThumbCache] evict failed', e);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a durable `file://` path for a thumbnail if cached and file still
 * exists. Updates last_access. Returns null on miss.
 */
export async function getThumbnail(sourceUri: string): Promise<string | null> {
  if (!sourceUri) return null;
  await ensureSchema();
  await migrateLegacyIfNeeded();
  await ensureDir();
  const db = getDatabase();
  if (!db) return null;
  try {
    const row = await db.getFirstAsync(`SELECT file_path FROM thumbnail_cache WHERE source_uri=?`, [sourceUri]) as { file_path?: string } | null;
    if (!row?.file_path) return null;
    const info = await FileSystem.getInfoAsync(row.file_path);
    if (!info.exists) {
      await db.runAsync(`DELETE FROM thumbnail_cache WHERE source_uri=?`, [sourceUri]);
      return null;
    }
    await touchAccess(sourceUri);
    return row.file_path;
  } catch (e) {
    reportWarning('ThumbCache', e, 'getThumbnail failed');
    return null;
  }
}

/**
 * Persist an artwork URI as a thumbnail file.
 * - `content://` / `file://` : copied into THUMB_DIR
 * - `http(s)://` : downloaded into THUMB_DIR
 * Returns the durable file path or null.
 * Safe to call concurrently; deduped by sourceUri.
 */
export async function persistThumbnail(sourceUri: string): Promise<string | null> {
  if (!sourceUri) return null;
  if (Platform.OS === 'web') return null;

  const cached = await getThumbnail(sourceUri);
  if (cached) return cached;

  await ensureDir();
  await ensureSchema();

  // content/file/http all handled via FS copy/download
  const dest = filePathFor(sourceUri);
  try {
    if (sourceUri.startsWith('content://') || sourceUri.startsWith('file://')) {
      // Avoid self-copy
      if (sourceUri === dest) return dest;
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
    } else if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
      const res = await FileSystem.downloadAsync(sourceUri, dest) as unknown as { uri: string; status?: number };
      if (res.status != null && res.status !== 200) throw new Error(`HTTP ${res.status}`);
    } else {
      return null;
    }
    await putEntry(sourceUri, dest, Date.now(), true);
    await evictIfNeeded();
    return dest;
  } catch (e) {
    reportWarning('ThumbCache', e, `persistThumbnail failed: ${sourceUri.slice(0, 80)}`);
    try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}
    return null;
  }
}

/**
 * For TrackPlayer: returns a file-scheme URI guaranteed to stay valid
 * across restarts (copies content:// to persistent thumb file).
 */
export async function resolveArtworkForPlayer(sourceUri: string | null | undefined): Promise<string | undefined> {
  if (!sourceUri) return undefined;
  if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) return sourceUri;
  // file:// artwork URIs are already durable, but still index them
  if (sourceUri.startsWith('file://')) {
    await putEntry(sourceUri, sourceUri).catch(() => {});
    return sourceUri;
  }
  if (sourceUri.startsWith('content://')) {
    const persisted = await persistThumbnail(sourceUri);
    return persisted ?? undefined;
  }
  return sourceUri;
}

/** Remove entries for songs/artworks no longer in library. */
export async function pruneThumbnails(validSourceUris: Set<string>): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  if (!db) return;
  try {
    const rows = await db.getAllAsync(`SELECT source_uri, file_path FROM thumbnail_cache`) as Array<{ source_uri: string; file_path: string }>;
    for (const r of rows) {
      if (!validSourceUris.has(r.source_uri)) {
        try { await FileSystem.deleteAsync(r.file_path, { idempotent: true }); } catch {}
        await db.runAsync(`DELETE FROM thumbnail_cache WHERE source_uri=?`, [r.source_uri]);
      }
    }
  } catch (e) {
    reportWarning('ThumbCache', e, 'prune failed');
  }
}

export async function getCacheStats(): Promise<{ count: number; bytes: number }> {
  await ensureSchema();
  const db = getDatabase();
  if (!db) return { count: 0, bytes: 0 };
  try {
    const row = await db.getFirstAsync(`SELECT COUNT(*) as count, COALESCE(SUM(bytes),0) as bytes FROM thumbnail_cache`) as { count: number; bytes: number } | null;
    return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
  } catch {
    return { count: 0, bytes: 0 };
  }
}
