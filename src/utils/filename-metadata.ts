export interface FilenameMetadata {
  title: string;
  artist: string | null;
  album: string | null;
}

/**
 * Matches a leading track number followed by a strong separator
 * (dash, underscore, dot or closing paren). A bare space is intentionally
 * excluded so titles like "21 Guns" or "50 Cent - Candy Shop" are not mangled.
 */
const TRACK_PREFIX = /^(?:track\s*)?\d{1,4}\s*[-–—._)]\s*/i;

const ARTIST_TITLE_SEPARATOR = /^(.*?)\s+[-–—]\s+(.+)$/;

export function stripAudioExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Returns the last path segment as a candidate album name, if any. */
export function parseAlbumFromPath(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;
  const segments = trimmed.split('/');
  const folder = segments[segments.length - 1]?.trim();
  return folder && folder.length > 0 ? folder : null;
}

export function cleanString(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function tryParseArtistTitle(value: string): { title: string; artist: string | null } | null {
  const match = value.match(ARTIST_TITLE_SEPARATOR);
  if (!match) return null;
  const artist = cleanString(match[1]);
  const title = cleanString(match[2]);
  if (!artist || !title || artist.length < 2 || title.length < 2) return null;
  return { title, artist };
}

/**
 * Derives title/artist from an audio filename.
 * Handles "Artist - Title", "Track 01 - Artist - Title", plain titles and
 * numbered prefixes. Album is never derivable from a bare filename.
 */
export function parseFilenameMetadata(filename: string): FilenameMetadata {
  const base = stripAudioExtension(filename).trim();
  if (!base) return { title: filename, artist: null, album: null };

  const direct = tryParseArtistTitle(base);
  if (direct) {
    // Some files are numbered ("01 - Artist - Title", "01. Artist - Title").
    // A bare space is left untouched so artist names like "50 Cent" survive.
    const strippedArtist = direct.artist
      .replace(/^(?:track\s*)?\d{1,4}\s*$/, '')
      .replace(TRACK_PREFIX, '');
    return { title: direct.title, artist: cleanString(strippedArtist), album: null };
  }

  const withoutTrack = base.replace(TRACK_PREFIX, '').trim();
  if (withoutTrack !== base) {
    const parsed = tryParseArtistTitle(withoutTrack);
    if (parsed) return { title: parsed.title, artist: parsed.artist, album: null };
    return { title: withoutTrack, artist: null, album: null };
  }

  return { title: base, artist: null, album: null };
}
