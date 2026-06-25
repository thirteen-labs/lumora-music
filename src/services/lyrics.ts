const LYRICS_API = "https://api.lyrics.ovh/v1";
const LRCLIB_API = "https://lrclib.net/api";

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
  const regex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]\s*(.*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, "0"), 10);
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
    .replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]\s*/g, "")
    .trim();
}

async function fetchFromLrclib(
  artist: string,
  title: string,
): Promise<LyricsResult | null> {
  try {
    const response = await fetch(
      `${LRCLIB_API}/get?artist_name=${encodeURIComponent(cleanArtist(artist))}&track_name=${encodeURIComponent(cleanTitle(title))}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) return null;

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
    const response = await fetch(
      `${LYRICS_API}/${encodeURIComponent(cleanArtist(artist))}/${encodeURIComponent(cleanTitle(title))}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) return null;

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
): Promise<LyricsResult | null> {
  if (!artist || !title) return null;
  const key = cacheKey(artist, title);
  if (cache.has(key)) return cache.get(key) ?? null;

  // Deduplicate concurrent requests for the same song
  const inFlight = inflightRequests.get(key);
  if (inFlight) return inFlight;

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
  const lrclibResult = await fetchFromLrclib(artist, title);
  if (lrclibResult) {
    cache.set(key, lrclibResult);
    trimCache();
    return lrclibResult;
  }

  const ovhResult = await fetchFromLyricsOvh(artist, title);
  if (ovhResult) {
    cache.set(key, ovhResult);
    trimCache();
    return ovhResult;
  }

  cache.set(key, null);
  trimCache();
  return null;
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
