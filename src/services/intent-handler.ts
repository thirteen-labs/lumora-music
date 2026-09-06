import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Song } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';
import { saveSongArtworkFile } from '@/services/artwork-cache';
import { logger } from '@/utils/logger';

const AUDIO_EXT_RE = /\.(mp3|flac|wav|aac|ogg|oga|m4a|m4b|wma|opus|amr|3gp|mid|midi|aif|aiff|weba)$/i;

export function isFileUri(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('content://') || url.startsWith('file://');
}

export function looksLikeAudioUri(url: string): boolean {
  const clean = url.split('?')[0];
  if (AUDIO_EXT_RE.test(clean)) return true;
  // MediaStore audio URIs: content://media/external/audio/media/<id>
  return /^content:\/\/media\/.*\/audio\//i.test(clean);
}

function filenameFromUri(uri: string): string {
  try {
    const withoutQuery = uri.split('?')[0];
    const last = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

function titleFromFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.substring(0, dot) : name;
  const dash = base.indexOf(' - ');
  return dash > 0 ? base.substring(dash + 3).trim() : base.trim();
}

function artistFromFilename(name: string): string | null {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.substring(0, dot) : name;
  const dash = base.indexOf(' - ');
  return dash > 0 ? base.substring(0, dash).trim() : null;
}

async function buildSongFromUri(uri: string): Promise<Song> {
  let meta: {
    title?: string | null; artist?: string | null; albumTitle?: string | null;
    genre?: string | null; duration?: number | null; bitrate?: number | null;
    sampleRate?: number | null; channelCount?: number | null;
  } = {};

  // Prefer latest MediaStore extraction (Android: MediaExtractor, iOS: AVAsset).
  // When it yields nothing, filename parsing below provides the fallback.
  let found = false;
  try {
    const ms = await import('@obsidian_north/react-native-mediastore');
    if (ms.getMetadata) {
      const res = await (ms as unknown as { getMetadata: (u: string, o?: unknown) => Promise<unknown> }).getMetadata(uri, { level: 'full' });
      const payload = res as { metadata?: Record<string, unknown>; status?: string } | Record<string, unknown> | null;
      const m: Record<string, unknown> | null = payload && typeof payload === 'object' && 'metadata' in (payload as Record<string, unknown>) && (payload as { metadata?: Record<string, unknown> }).metadata
        ? (payload as { metadata: Record<string, unknown> }).metadata
        : (payload as Record<string, unknown>) ?? null;
      if (m) {
        const audio = m['audio'] as Record<string, unknown> | undefined;
        meta = {
          title: (audio?.['title'] ?? m['title']) as string | null | undefined,
          artist: (audio?.['artist'] ?? m['artist']) as string | null | undefined,
          albumTitle: (audio?.['album'] ?? m['albumTitle'] ?? m['album']) as string | null | undefined,
          genre: (audio?.['genre'] ?? m['genre']) as string | null | undefined,
          duration: (m['durationMs'] ?? m['duration'] ?? audio?.['durationMs']) as number | null | undefined,
          bitrate: (audio?.['bitrate'] ?? m['bitrate']) as number | null | undefined,
          sampleRate: (audio?.['sampleRate'] ?? m['sampleRate']) as number | null | undefined,
          channelCount: (audio?.['channels'] ?? m['channels'] ?? m['channelCount']) as number | null | undefined,
        };
        // Consider success if any tag or technical field was populated or status != failed
        const status = (payload as { status?: string })?.status;
        if (status !== 'failed' && (meta.title || meta.artist || meta.bitrate || meta.duration)) found = true;
      }
    }
    if (!found && ms.getDetailedMetadataByUri) {
      const detail = await ms.getDetailedMetadataByUri(uri) as unknown as Record<string, unknown> | null;
      if (detail) {
        const audio = detail['audio'] as Record<string, unknown> | undefined;
        if (audio || detail['mimeType']) {
          meta = {
            title: (audio?.['title'] ?? detail['title']) as string | null | undefined,
            artist: (audio?.['artist'] ?? detail['artist']) as string | null | undefined,
            albumTitle: (audio?.['album'] ?? detail['albumTitle'] ?? detail['album']) as string | null | undefined,
            genre: (audio?.['genre'] ?? detail['genre']) as string | null | undefined,
            duration: (detail['durationMs'] ?? audio?.['durationMs']) as number | null | undefined,
            bitrate: (audio?.['bitrate']) as number | null | undefined,
            sampleRate: (audio?.['sampleRate']) as number | null | undefined,
            channelCount: (audio?.['channels']) as number | null | undefined,
          };
          if (meta.title || meta.bitrate || meta.duration) found = true;
        }
      }
    }
    // Try URI catalog lookup as last MediaStore resort (provides title/album/artist without opening file)
    if (!found && ms.getByUri) {
      try {
        const item = await ms.getByUri(uri) as unknown as Record<string, unknown> | null;
        if (item && (item['title'] || item['artist'])) {
          meta = {
            title: item['title'] as string | null,
            artist: item['artist'] as string | null,
            albumTitle: (item['album'] as string | null) ?? null,
            genre: item['genre'] as string | null | undefined,
            duration: item['duration'] as number | null | undefined,
            bitrate: item['bitrate'] as number | null | undefined,
            sampleRate: item['sampleRate'] as number | null | undefined,
            channelCount: item['channels'] as number | null | undefined,
          };
          found = true;
        }
      } catch { /* getByUri optional */ }
    }
  } catch (e) {
    logger.warn('[IntentHandler] MediaStore metadata extraction failed:', e);
  }

  let artwork: string | null = null;
  try { artwork = await saveSongArtworkFile(uri); } catch { /* artwork optional */ }

  const filename = filenameFromUri(uri);
  const durationMs = Number(meta.duration ?? 0);

  return {
    id: `intent:${uri}`,
    uri,
    title: (meta.title && String(meta.title).trim()) || titleFromFilename(filename) || 'Unknown Title',
    artist: (meta.artist && String(meta.artist).trim()) || artistFromFilename(filename) || 'Unknown Artist',
    album: (meta.albumTitle && String(meta.albumTitle).trim()) || 'Unknown Album',
    albumId: `intent-album:${uri}`,
    duration: Math.round(durationMs / 1000),
    fileSize: 0,
    dateAdded: Math.floor(Date.now() / 1000),
    artwork,
    genre: (meta.genre && String(meta.genre).trim()) || null,
    bitrate: meta.bitrate ? Number(meta.bitrate) : null,
    sampleRate: meta.sampleRate ? Number(meta.sampleRate) : null,
    channels: meta.channelCount ? Number(meta.channelCount) : null,
    codec: null,
  };
}

const handledUris = new Set<string>();

export async function handleAudioIntent(url: string): Promise<boolean> {
  if (!isFileUri(url)) return false;
  if (!looksLikeAudioUri(url)) return false;
  if (handledUris.has(url)) return true;
  handledUris.add(url);

  try {
    const song = await buildSongFromUri(url);
    await usePlayerStore.getState().play(song, [song]);
    logger.log('[IntentHandler] playing from external intent:', song.title);
    return true;
  } catch (e) {
    handledUris.delete(url);
    logger.warn('[IntentHandler] failed to play from intent:', e);
    return false;
  }
}

export function resetHandledIntents(): void {
  handledUris.clear();
}

export function watchForAudioIntents(): () => void {
  if (Platform.OS === 'web') return () => {};

  let cancelled = false;

  (async () => {
    try {
      const initial = await Linking.getInitialURL();
      if (!cancelled && initial) {
        await handleAudioIntent(initial);
      }
    } catch (e) {
      logger.warn('[IntentHandler] getInitialURL failed:', e);
    }

    if (cancelled) return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleAudioIntent(url).catch((e) =>
        logger.warn('[IntentHandler] url event failed:', e)
      );
    });

    const checkCancelled = setInterval(() => {
      if (cancelled) {
        sub.remove();
        clearInterval(checkCancelled);
      }
    }, 1000);
  })();

  return () => { cancelled = true; };
}
