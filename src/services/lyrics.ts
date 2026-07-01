import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';

const LYRICS_API = "https://api.lyrics.ovh/v1";
const LRCLIB_API = "https://lrclib.net/api";
const LYRICS_CACHE_KEY = "lumora-lyrics-fetch-cache";

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export interface SyncedLine {
  time: number;
  text: string;
}

export interface LyricsResult {
  lyrics: string;
  synced: SyncedLine[];
  source: string;
  raw: string;
}

let cache = new Map<string, LyricsResult | null>();
const CACHE_MAX_SIZE = 200;
const inflightRequests = new Map<string, Promise<LyricsResult | null>>();
let persistenceTimer: ReturnType<typeof setTimeout> | null = null;

function persistCacheToMMKV(): void {
  if (cache.size === 0) return;
  try {
    const obj: Record<string, LyricsResult | null> = {};
    cache.forEach((v, k) => { obj[k] = v; });
    storage.set(LYRICS_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

function schedulePersist(): void {
  if (persistenceTimer) clearTimeout(persistenceTimer);
  persistenceTimer = setTimeout(() => {
    persistCacheToMMKV();
    persistenceTimer = null;
  }, 3000);
}

function loadPersistedCache(): void {
  try {
    const raw = storage.getString(LYRICS_CACHE_KEY);
    if (!raw) return;
    const obj: Record<string, LyricsResult | null> = JSON.parse(raw);
    const keys = Object.keys(obj);
    if (keys.length > CACHE_MAX_SIZE) {
      const limited = keys.slice(keys.length - CACHE_MAX_SIZE);
      for (const k of limited) cache.set(k, obj[k]);
    } else {
      for (const k of keys) cache.set(k, obj[k]);
    }
  } catch {
    try { storage.remove(LYRICS_CACHE_KEY); } catch {}
  }
}

loadPersistedCache();

function cleanArtist(artist: string): string {
  return artist.replace(/[-–—].*$/, "").trim();
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s*\[.*?\]\s*/g, "")
    .trim();
}

function cacheKey(artist: string, title: string): string {
  return `${cleanArtist(artist)}|||${cleanTitle(title)}`.toLowerCase();
}

function trimCache(): void {
  if (cache.size > CACHE_MAX_SIZE) {
    const keys = [...cache.keys()];
    const toDelete = keys.slice(0, keys.length - CACHE_MAX_SIZE);
    for (const key of toDelete) cache.delete(key);
  }
}

function parseLRC(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]\s*(.*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

function stripLRCMetadata(lrc: string): string {
  return lrc
    .replace(/\[ti:.*?\]\s*/g, "")
    .replace(/\[ar:.*?\]\s*/g, "")
    .replace(/\[al:.*?\]\s*/g, "")
    .replace(/\[by:.*?\]\s*/g, "")
    .replace(/\[offset:.*?\]\s*/g, "")
    .replace(/\[\d{2}:\d{2}(?:[.:]\d{2,3})?\]\s*/g, "")
    .trim();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function retryFetch(url: string, timeoutMs: number, maxRetries: number): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (response.ok) return response;
      if (response.status === 404) return response;
    } catch {
      if (attempt === maxRetries) return null;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  return null;
}

async function fetchFromLrclib(
  artist: string,
  title: string,
): Promise<LyricsResult | null> {
  try {
    const url = `${LRCLIB_API}/get?artist_name=${encodeURIComponent(cleanArtist(artist))}&track_name=${encodeURIComponent(cleanTitle(title))}`;
    const response = await retryFetch(url, FETCH_TIMEOUT_MS, MAX_RETRIES);
    if (!response || !response.ok) return null;

    const data = await response.json();
    const syncedLrc = data.syncedLyrics;
    const plainLyrics = data.plainLyrics;

    if (syncedLrc) {
      const synced = parseLRC(syncedLrc);
      const plainText = stripLRCMetadata(syncedLrc);
      return { lyrics: plainText, synced, source: "lrclib", raw: syncedLrc };
    }

    if (plainLyrics) {
      return { lyrics: plainLyrics, synced: [], source: "lrclib", raw: plainLyrics };
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchFromLyricsOvh(
  artist: string,
  title: string,
): Promise<LyricsResult | null> {
  try {
    const url = `${LYRICS_API}/${encodeURIComponent(cleanArtist(artist))}/${encodeURIComponent(cleanTitle(title))}`;
    const response = await retryFetch(url, FETCH_TIMEOUT_MS, MAX_RETRIES);
    if (!response || !response.ok) return null;

    const data = await response.json();
    const original: string = data.lyrics ?? "";
    const synced = parseLRC(original);
    const plainText = stripLRCMetadata(original);

    return {
      lyrics: plainText,
      synced,
      source: "lyrics.ovh",
      raw: original,
    };
  } catch {
    return null;
  }
}

export async function fetchLyrics(
  artist: string,
  title: string,
  force = false,
): Promise<LyricsResult | null> {
  if (!artist || !title) return null;
  const key = cacheKey(artist, title);

  if (!force) {
    if (cache.has(key)) return cache.get(key) ?? null;
    const inFlight = inflightRequests.get(key);
    if (inFlight) return inFlight;
  }

  const promise = doFetch(artist, title, key);
  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
}

async function doFetch(
  artist: string,
  title: string,
  key: string,
): Promise<LyricsResult | null> {
  try {
    const [lrclibResult, ovhResult] = await Promise.all([
      fetchFromLrclib(artist, title),
      fetchFromLyricsOvh(artist, title),
    ]);

    const result = lrclibResult ?? ovhResult;
    cache.set(key, result);
    trimCache();
    schedulePersist();
    return result;
  } catch (e) {
    reportWarning('Lyrics', e);
    return null;
  }
}

export function parseSyncedLyrics(lrcContent: string): LyricsResult {
  const synced = parseLRC(lrcContent);
  const plainText = stripLRCMetadata(lrcContent);
  return { lyrics: plainText, synced, source: "local", raw: lrcContent };
}

export function hasCachedLyrics(artist: string, title: string): boolean | null {
  if (!artist || !title) return false;
  const key = cacheKey(artist, title);
  if (!cache.has(key)) return null;
  return cache.get(key) !== null;
}
