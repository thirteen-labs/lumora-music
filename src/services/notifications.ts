import { Platform } from 'react-native';
import {
  PlaybackNotificationManager,
} from 'react-native-audio-api';
import * as ExpoNotifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import type { Song } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useSettingsStore } from '@/store/settings-store';
import { extractColorsFromImage } from '@/services/color-extraction';
import { reportWarning } from '@/utils/error-handler';

let initialized = false;
const colorCache = new Map<string, number | null>();
const COLOR_CACHE_MAX = 50;
const ARTWORK_URI_CACHE_MAX = 50;

const SCAN_CHANNEL = 'media-scan';
const SLEEP_TIMER_CHANNEL = 'sleep-timer';
const RESUME_WATCHING_CHANNEL = 'resume-watching';

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

async function ensureChannel(channelId: string, channelName: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await ExpoNotifications.setNotificationChannelAsync(channelId, {
      name: channelName,
      importance: ExpoNotifications.AndroidImportance.LOW,
      vibrationPattern: null,
      sound: null,
    });
  } catch (e) {
    reportWarning('Notifications', e, `Failed to create notification channel: ${channelName}`);
  }
}

export async function initializeNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (Platform.OS !== 'web') {
    try {
      await ExpoNotifications.requestPermissionsAsync();
    } catch (e) {
      reportWarning('Notifications', e, 'Failed to request notification permissions');
    }
  }

  const wrapHandler = (fn: () => void) => {
    try { fn(); } catch (e) { reportWarning('Notifications', e); }
  };

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPlay',
    () => wrapHandler(() => { usePlayerStore.getState().resume(); }),
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPause',
    () => wrapHandler(() => { usePlayerStore.getState().pause(); }),
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationNextTrack',
    () => wrapHandler(() => { usePlayerStore.getState().next(); }),
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPreviousTrack',
    () => wrapHandler(() => { usePlayerStore.getState().previous(); }),
  );

  (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(
    'playbackNotificationSeekForward',
    () => wrapHandler(() => {
      const state = usePlayerStore.getState();
      state.seekTo(Math.min(state.position + 10, state.duration));
    }),
  );

  (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(
    'playbackNotificationSeekBackward',
    () => wrapHandler(() => {
      const state = usePlayerStore.getState();
      state.seekTo(Math.max(state.position - 10, 0));
    }),
  );

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationStop',
    () => wrapHandler(() => { usePlayerStore.getState().stop(); }),
  );

  (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(
    'playbackNotificationFavorite',
    () => wrapHandler(() => {
      const state = usePlayerStore.getState();
      const track = state.currentTrack;
      if (track) {
        useFavoritesStore.getState().toggleSongFavorite(track);
        showNowPlayingNotification(track, state.isPlaying);
      }
    }),
  );

  (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(
    'playbackNotificationClose',
    () => wrapHandler(() => {
      const state = usePlayerStore.getState();
      state.pause();
      dismissNowPlayingNotification();
    }),
  );

  (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(
    'playbackNotificationDismiss',
    () => wrapHandler(() => {
      const state = usePlayerStore.getState();
      state.pause();
      dismissNowPlayingNotification();
    }),
  );

  await Promise.all([
    ensureChannel(SCAN_CHANNEL, 'Media Scan'),
    ensureChannel(SLEEP_TIMER_CHANNEL, 'Sleep Timer'),
    ensureChannel(RESUME_WATCHING_CHANNEL, 'Resume Watching'),
  ]);
}

const ARTWORK_CACHE_DIR = `${FileSystem.cacheDirectory}notification-artwork/`;

async function ensureCacheDir(): Promise<void> {
  const dir = await FileSystem.getInfoAsync(ARTWORK_CACHE_DIR);
  if (!dir.exists) {
    await FileSystem.makeDirectoryAsync(ARTWORK_CACHE_DIR, { intermediates: true });
  }
}

async function cacheRemoteArtwork(uri: string): Promise<string> {
  const isContent = uri.startsWith('content://');
  if (!uri.startsWith('http://') && !uri.startsWith('https://') && !isContent) return uri;
  const parts = uri.split('.');
  let ext = parts.length > 1 ? (parts.pop()?.split('?')[0] ?? 'jpg') : 'jpg';
  if (ext.length > 10 || ext.includes('/')) ext = 'jpg';
  const hash = uri.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const cachePath = `${ARTWORK_CACHE_DIR}${hash}.${ext}`;
  try {
    const info = await FileSystem.getInfoAsync(cachePath);
    if (info.exists) return cachePath;
    await ensureCacheDir();
    if (isContent) {
      await FileSystem.copyAsync({ from: uri, to: cachePath });
    } else {
      await FileSystem.downloadAsync(uri, cachePath);
    }
    return cachePath;
  } catch {
    return uri;
  }
}

function normalizeUri(value: string): string {
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('file://') ||
    value.startsWith('content://')
  ) {
    return value;
  }
  return `file://${value}`;
}

function resolveArtworkUri(
  artwork: string | null,
): string | { uri: string } | undefined {
  if (!artwork) return undefined;
  const uri = normalizeUri(artwork);
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return { uri };
  }
  return uri;
}

function getArtworkUri(artwork: string | null): string | null {
  if (!artwork) return null;
  return normalizeUri(artwork);
}

function cacheArtworkColor(uri: string, color: number | null): void {
  if (colorCache.size >= COLOR_CACHE_MAX) {
    const firstKey = colorCache.keys().next().value;
    if (firstKey) colorCache.delete(firstKey);
  }
  colorCache.set(uri, color);
}

const artworkUriCache = new Map<string, string>();

function cacheArtworkUri(key: string, value: string): void {
  if (artworkUriCache.size >= ARTWORK_URI_CACHE_MAX) {
    const firstKey = artworkUriCache.keys().next().value;
    if (firstKey) artworkUriCache.delete(firstKey);
  }
  artworkUriCache.set(key, value);
}

export async function showNowPlayingNotification(
  track: Song,
  isPlaying: boolean,
  position?: number,
): Promise<void> {
  try {
    const isFav = useFavoritesStore.getState().isSongFavorite(track.id);
    let artwork = resolveArtworkUri(track.artwork);
    if (track.artwork) {
      const rawUri = getArtworkUri(track.artwork);
      if (rawUri) {
        if (rawUri.startsWith('http://') || rawUri.startsWith('https://')) {
          let cached = artworkUriCache.get(rawUri);
          if (!cached) {
            cached = await cacheRemoteArtwork(rawUri);
            cacheArtworkUri(rawUri, cached);
          }
          artwork = { uri: cached };
        } else if (rawUri.startsWith('content://')) {
          const cached = await cacheRemoteArtwork(rawUri);
          artwork = { uri: cached };
        }
      }
    }
    const info: Record<string, unknown> = {
      title: track.title,
      artist: track.artist ?? undefined,
      album: track.album ?? undefined,
      artwork,
      duration: track.duration,
      elapsedTime: position != null ? Math.floor(position) : 0,
      speed: 1,
      state: isPlaying ? 'playing' : 'paused',
      stopWithApp: false,
      sticky: isPlaying,
      isFavorite: isFav,
    };

    if (track.artwork) {
      const uri = getArtworkUri(track.artwork);
      if (uri) {
        const cacheUri = uri.startsWith('content://')
          ? ((artwork as { uri: string })?.uri ?? uri)
          : uri;
        if (!colorCache.has(cacheUri)) {
          const extracted = await extractColorsFromImage(cacheUri);
          cacheArtworkColor(cacheUri, extracted ? hexToNumber(extracted.background) : null);
        }
        const color = colorCache.get(cacheUri);
        if (color != null) {
          info.color = color;
          info.colorized = true;
        }
      }
    }

    await (PlaybackNotificationManager.show as (data: Record<string, unknown>) => Promise<void>)(info);
    await PlaybackNotificationManager.enableControl('previousTrack', true);
    await PlaybackNotificationManager.enableControl('nextTrack', true);
    await PlaybackNotificationManager.enableControl('play', true);
    await PlaybackNotificationManager.enableControl('pause', true);
    await (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('rewind', true);
    await (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('fastForward', true);
    await (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('stop', true);
    await (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('favorite', true);
    await (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('close', true);
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

export async function updateNotificationPlaybackState(
  isPlaying: boolean,
  track: Song | null,
  position?: number,
): Promise<void> {
  if (!track) return;
  await showNowPlayingNotification(track, isPlaying, position);
}

export async function dismissNowPlayingNotification(): Promise<void> {
  try {
    await PlaybackNotificationManager.hide();
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await PlaybackNotificationManager.hide();
  } catch (e) {
    reportWarning('Notifications', e);
  }
  try {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

function shouldNotify(): boolean {
  try {
    return useSettingsStore.getState().newMediaNotification;
  } catch {
    return true;
  }
}

export async function showScanningNotification(): Promise<void> {
  if (!shouldNotify()) return;
  try {
    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: 'Scanning media...',
        body: 'Looking for songs',
        data: { type: 'scan' },
        ...(Platform.OS === 'android' ? { channelId: SCAN_CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

export async function showScanCompleteNotification(songCount: number): Promise<void> {
  if (!shouldNotify()) return;
  try {
    const body = songCount > 0 ? `${songCount} songs found` : 'No new media found';
    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: 'Scan Complete',
        body,
        data: { type: 'scan' },
        ...(Platform.OS === 'android' ? { channelId: SCAN_CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

let sleepTimerNotificationId: string | null = null;

export async function showSleepTimerNotification(minutesRemaining: number): Promise<void> {
  try {
    if (sleepTimerNotificationId) {
      await ExpoNotifications.cancelScheduledNotificationAsync(sleepTimerNotificationId);
    }
    const result = await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: 'Sleep Timer Active',
        body: `Music stops in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`,
        data: { type: 'sleep_timer' },
        ...(Platform.OS === 'android' ? { channelId: SLEEP_TIMER_CHANNEL } : {}),
      },
      trigger: null,
    });
    sleepTimerNotificationId = result;
  } catch (e) {
    reportWarning('Notifications', e);
  }
}

export async function dismissSleepTimerNotification(): Promise<void> {
  if (!sleepTimerNotificationId) return;
  try {
    await ExpoNotifications.cancelScheduledNotificationAsync(sleepTimerNotificationId);
  } catch (e) {
    reportWarning('Notifications', e);
  }
  sleepTimerNotificationId = null;
}


