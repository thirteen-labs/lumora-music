const LYRICS_API = 'https://api.lyrics.ovh/v1';
const LRCLIB_API = 'https://lrclib.net/api';

export interface SyncedLine {
  time: number;
  text: string;
}

export interface LyricsResult {
  lyrics: string;
  synced: SyncedLine[];
  source: string;
}

let cache = new Map<string, LyricsResult | null>();

function cacheKey(artist: string, title: string): string {
  return `${artist}|||${title}`.toLowerCase().trim();
}

function parseLRC(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

function stripLRCMetadata(lrc: string): string {
  return lrc
    .replace(/\[ti:.*?\]\s*/g, '')
    .replace(/\[ar:.*?\]\s*/g, '')
    .replace(/\[al:.*?\]\s*/g, '')
    .replace(/\[by:.*?\]\s*/g, '')
    .replace(/\[offset:.*?\]\s*/g, '')
    .trim();
}

export function getSyncedLine(synced: SyncedLine[], position: number): number {
  if (!synced.length) return -1;
  let idx = -1;
  for (let i = 0; i < synced.length; i++) {
    if (position >= synced[i].time) idx = i;
    else break;
  }
  return idx;
}

async function fetchFromLrclib(artist: string, title: string): Promise<LyricsResult | null> {
  try {
    const cleanArtist = artist.replace(/[-–—].*$/, '').trim();
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();

    const response = await fetch(
      `${LRCLIB_API}/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const syncedLrc = data.syncedLyrics;
    const plainLyrics = data.plainLyrics;

    if (syncedLrc) {
      const synced = parseLRC(syncedLrc);
      const plainText = stripLRCMetadata(syncedLrc);
      return { lyrics: plainText, synced, source: 'lrclib' };
    }

    if (plainLyrics) {
      return { lyrics: plainLyrics, synced: [], source: 'lrclib' };
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchFromLyricsOvh(artist: string, title: string): Promise<LyricsResult | null> {
  try {
    const cleanArtist = artist.replace(/[-–—].*$/, '').trim();
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();

    const response = await fetch(
      `${LYRICS_API}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const raw: string = data.lyrics ?? '';
    const synced = parseLRC(raw);
    const plainText = stripLRCMetadata(raw);

    return {
      lyrics: plainText,
      synced,
      source: 'lyrics.ovh',
    };
  } catch {
    return null;
  }
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const key = cacheKey(artist, title);
  if (cache.has(key)) return cache.get(key) ?? null;

  const lrclibResult = await fetchFromLrclib(artist, title);
  if (lrclibResult) {
    cache.set(key, lrclibResult);
    return lrclibResult;
  }

  const ovhResult = await fetchFromLyricsOvh(artist, title);
  if (ovhResult) {
    cache.set(key, ovhResult);
    return ovhResult;
  }

  cache.set(key, null);
  return null;
}

export function parseSyncedLyrics(lrcContent: string): LyricsResult {
  const synced = parseLRC(lrcContent);
  const plainText = stripLRCMetadata(lrcContent);
  return { lyrics: plainText, synced, source: 'local' };
}

export function clearLyricsCache(): void {
  cache.clear();
}
