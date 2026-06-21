import {
  PlaybackNotificationManager,
} from 'react-native-audio-api';
import type { Song } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';

let initialized = false;

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

export async function showNowPlayingNotification(
  track: Song,
  isPlaying: boolean,
): Promise<void> {
  try {
    await PlaybackNotificationManager.show({
      title: track.title,
      artist: track.artist ?? undefined,
      album: track.album ?? undefined,
      artwork: resolveArtworkUri(track.artwork),
      duration: track.duration,
      elapsedTime: Math.floor(track.duration * 0),
      speed: 1,
      state: isPlaying ? 'playing' : 'paused',
    });
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
