const LYRICS_API = 'https://api.lyrics.ovh/v1';

export interface LyricsResult {
  lyrics: string;
  source: string;
}

let cache = new Map<string, LyricsResult | null>();

function cacheKey(artist: string, title: string): string {
  return `${artist}|||${title}`.toLowerCase().trim();
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const key = cacheKey(artist, title);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const cleanArtist = artist.replace(/[-–—].*$/, '').trim();
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();

    const response = await fetch(
      `${LYRICS_API}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
    );

    if (!response.ok) {
      cache.set(key, null);
      return null;
    }

    const data = await response.json();
    const lyrics: LyricsResult = {
      lyrics: data.lyrics ?? '',
      source: 'lyrics.ovh',
    };

    cache.set(key, lyrics);
    return lyrics;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export function clearLyricsCache(): void {
  cache.clear();
}
