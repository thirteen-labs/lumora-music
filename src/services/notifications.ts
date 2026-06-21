import {
  PlaybackNotificationManager,
} from 'react-native-audio-api';
import type { Song } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';
import { extractColorsFromImage } from '@/services/color-extraction';

let initialized = false;
const colorCache = new Map<string, number | null>();

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export async function initializeNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPlay',
    () => {
      usePlayerStore.getState().resume();
    },
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPause',
    () => {
      usePlayerStore.getState().pause();
    },
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationNextTrack',
    () => {
      usePlayerStore.getState().next();
    },
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPreviousTrack',
    () => {
      usePlayerStore.getState().previous();
    },
  );
}

function resolveArtworkUri(
  artwork: string | null,
): string | { uri: string } | undefined {
  if (!artwork) return undefined;
  if (
    artwork.startsWith('http://') ||
    artwork.startsWith('https://') ||
    artwork.startsWith('file://') ||
    artwork.startsWith('content://')
  ) {
    return artwork;
  }
  return { uri: `file://${artwork}` };
}

function getArtworkUri(artwork: string | null): string | null {
  if (!artwork) return null;
  if (
    artwork.startsWith('http://') ||
    artwork.startsWith('https://') ||
    artwork.startsWith('file://') ||
    artwork.startsWith('content://')
  ) {
    return artwork;
  }
  return `file://${artwork}`;
}

export async function showNowPlayingNotification(
  track: Song,
  isPlaying: boolean,
): Promise<void> {
  try {
    const info: Record<string, unknown> = {
      title: track.title,
      artist: track.artist ?? undefined,
      album: track.album ?? undefined,
      artwork: resolveArtworkUri(track.artwork),
      duration: track.duration,
      elapsedTime: Math.floor(track.duration * 0),
      speed: 1,
      state: isPlaying ? 'playing' : 'paused',
    };

    if (track.artwork) {
      const uri = getArtworkUri(track.artwork);
      if (uri) {
        if (!colorCache.has(uri)) {
          const extracted = await extractColorsFromImage(uri);
          colorCache.set(uri, extracted ? hexToNumber(extracted.background) : null);
        }
        const color = colorCache.get(uri);
        if (color != null) {
          info.color = color;
          info.colorized = true;
        }
      }
    }

    await (PlaybackNotificationManager.show as (data: Record<string, unknown>) => Promise<void>)(info);
    await PlaybackNotificationManager.enableControl('previousTrack', true);
    await PlaybackNotificationManager.enableControl('nextTrack', true);
  } catch (e) {
    console.warn('Failed to show notification:', e);
  }
}

export async function updateNotificationPlaybackState(
  isPlaying: boolean,
  track: Song | null,
): Promise<void> {
  if (!track) return;
  await showNowPlayingNotification(track, isPlaying);
}

export async function dismissNowPlayingNotification(): Promise<void> {
  try {
    await PlaybackNotificationManager.hide();
  } catch {}
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await PlaybackNotificationManager.hide();
  } catch {}
}
