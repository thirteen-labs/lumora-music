import { Platform } from 'react-native';
import {
  PlaybackNotificationManager,
} from 'react-native-audio-api';
import * as ExpoNotifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import type { Song } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';
import { useQueuePersistStore } from '@/store/queue-persist-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useSettingsStore } from '@/store/settings-store';
import { extractColorsFromImage } from '@/services/color-extraction';
import { reportWarning } from '@/utils/error-handler';

let initialized = false;
const colorCache = new Map<string, number | null>();
const COLOR_CACHE_MAX = 50;
const ARTWORK_URI_CACHE_MAX = 50;
let preloadRequestId = 0;

const SCAN_CHANNEL = 'media-scan';
const SLEEP_TIMER_CHANNEL = 'sleep-timer';
const RESUME_WATCHING_CHANNEL = 'resume-watching';

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

async function ensureChannel(channelId: string, channelName: string, importance: ExpoNotifications.AndroidImportance = ExpoNotifications.AndroidImportance.LOW): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const existing = await ExpoNotifications.getNotificationChannelAsync(channelId);
    if (existing) return;
    await ExpoNotifications.setNotificationChannelAsync(channelId, {
      name: channelName,
      importance,
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
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Notifications] Notification permission not granted:', status);
      }
    } catch (e) {
      reportWarning('Notifications', e, 'Failed to request notification permissions');
    }
  }

  const wrapHandler = (fn: () => void) => {
    try { fn(); } catch (e) { reportWarning('Notifications', e); }
  };

  const addListener = (event: string, handler: () => void) => {
    try {
      (PlaybackNotificationManager.addEventListener as (event: string, handler: () => void) => void)(event, handler);
    } catch (e) {
      reportWarning('Notifications', e, `Failed to register listener: ${event}`);
    }
  };

  addListener('playbackNotificationPlay', () => wrapHandler(() => { usePlayerStore.getState().resume(); }));
  addListener('playbackNotificationPause', () => wrapHandler(() => { usePlayerStore.getState().pause(); }));
  addListener('playbackNotificationNextTrack', () => wrapHandler(() => { usePlayerStore.getState().next(); }));
  addListener('playbackNotificationPreviousTrack', () => wrapHandler(() => { usePlayerStore.getState().previous(); }));

  addListener('playbackNotificationSeekForward', () => wrapHandler(() => {
    const state = usePlayerStore.getState();
    state.seekTo(Math.min(state.position + 10, state.duration));
  }));

  addListener('playbackNotificationSeekBackward', () => wrapHandler(() => {
    const state = usePlayerStore.getState();
    state.seekTo(Math.max(state.position - 10, 0));
  }));

  addListener('playbackNotificationStop', () => wrapHandler(() => { usePlayerStore.getState().stop(); }));

  addListener('playbackNotificationFavorite', () => wrapHandler(() => {
    const state = usePlayerStore.getState();
    const track = state.currentTrack;
    if (track) {
      useFavoritesStore.getState().toggleSongFavorite(track);
      preloadColorsForTrack(track.artwork);
      showNowPlayingNotification(track, state.isPlaying);
    }
  }));

  addListener('playbackNotificationClose', () => wrapHandler(() => {
    const state = usePlayerStore.getState();
    if (state.currentTrack) {
      try {
        useQueuePersistStore.getState().saveQueue(
          state.currentTrack, state.queue, state.queueIndex,
          state.shuffle, state.repeat, state.position,
          false,
        );
      } catch {}
    }
    state.pause();
    dismissNowPlayingNotification();
  }));

  addListener('playbackNotificationDismiss', () => wrapHandler(() => {
    const state = usePlayerStore.getState();
    state.pause();
    try {
      const s = usePlayerStore.getState();
      if (s.currentTrack) {
        useQueuePersistStore.getState().saveQueue(
          s.currentTrack, s.queue, s.queueIndex,
          s.shuffle, s.repeat, s.position,
          false,
        );
      }
    } catch {}
    dismissNowPlayingNotification();
  }));

  /* Dismiss any stale notification from prior session */
  try {
    await PlaybackNotificationManager.hide();
  } catch {}

  await Promise.all([
    ensureChannel(SCAN_CHANNEL, 'Media Scan'),
    ensureChannel(SLEEP_TIMER_CHANNEL, 'Sleep Timer'),
    ensureChannel(RESUME_WATCHING_CHANNEL, 'Resume Watching', ExpoNotifications.AndroidImportance.HIGH),
  ]);
}

const ARTWORK_CACHE_DIR = `${FileSystem.cacheDirectory}notification-artwork/`;

async function ensureCacheDir(): Promise<void> {
  try {
    const dir = await FileSystem.getInfoAsync(ARTWORK_CACHE_DIR);
    if (!dir.exists) {
      await FileSystem.makeDirectoryAsync(ARTWORK_CACHE_DIR, { intermediates: true });
    }
  } catch {}
}

const ARTWORK_CACHE_SIZE_LIMIT = 50 * 1024 * 1024;

async function cleanArtworkCacheIfNeeded(): Promise<void> {
  try {
    const dir = await FileSystem.getInfoAsync(ARTWORK_CACHE_DIR);
    if (!dir.exists || typeof dir.size !== 'number') return;
    if (dir.size > ARTWORK_CACHE_SIZE_LIMIT) {
      await FileSystem.deleteAsync(ARTWORK_CACHE_DIR, { idempotent: true });
    }
  } catch {}
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
    await cleanArtworkCacheIfNeeded();
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

function resolveArtworkUri(artwork: string | null): string | undefined {
  if (!artwork) return undefined;
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

/** Preload artwork for an upcoming track into the local cache in background.
 *  Call this before play starts to avoid blocking the notification display. */
export async function preloadArtworkForTrack(track: Song): Promise<void> {
  if (!track.artwork) return;
  const requestId = ++preloadRequestId;
  try {
    const resolved = resolveArtworkUri(track.artwork);
    if (!resolved) return;
    let needsCache = false;
    if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
      if (!artworkUriCache.has(resolved)) needsCache = true;
    } else if (resolved.startsWith('content://')) {
      needsCache = true;
    }
    if (needsCache) {
      const cached = await cacheRemoteArtwork(resolved);
      if (requestId === preloadRequestId) {
        cacheArtworkUri(resolved, cached);
      }
    }
  } catch {}
}

/** Preload artwork for multiple upcoming tracks in the background.
 *  Useful for preloading the next few tracks in the queue. */
export async function preloadArtworkForQueue(tracks: Song[], startIndex: number, count = 3): Promise<void> {
  const toPreload = tracks.slice(startIndex, startIndex + count);
  await Promise.allSettled(toPreload.map((t) => preloadArtworkForTrack(t)));
}

/** Extract and cache artwork colors in background for a given track. */
export async function preloadColorsForTrack(artworkUri: string | null): Promise<void> {
  if (!artworkUri || colorCache.has(artworkUri)) return;
  try {
    const resolved = resolveArtworkUri(artworkUri);
    if (!resolved) return;
    const cacheUri = artworkUriCache.get(resolved) ?? resolved;
    if (!colorCache.has(cacheUri)) {
      const extracted = await extractColorsFromImage(cacheUri);
      if (extracted?.background) {
        cacheArtworkColor(cacheUri, hexToNumber(extracted.background));
      } else {
        cacheArtworkColor(cacheUri, null);
      }
    }
  } catch {}
}

export async function showNowPlayingNotification(
  track: Song,
  isPlaying: boolean,
  position?: number,
): Promise<void> {
  try {
    const isFav = useFavoritesStore.getState().isSongFavorite(track.id);
    let artwork = resolveArtworkUri(track.artwork);
    if (track.artwork && artwork) {
      if (artwork.startsWith('http://') || artwork.startsWith('https://')) {
        let cached = artworkUriCache.get(artwork);
        if (!cached) {
          cached = await cacheRemoteArtwork(artwork);
          cacheArtworkUri(artwork, cached);
        }
        artwork = cached;
      } else if (artwork.startsWith('content://')) {
        let cached = artworkUriCache.get(artwork);
        if (!cached) {
          cached = await cacheRemoteArtwork(artwork);
          cacheArtworkUri(artwork, cached);
        }
        artwork = cached;
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

    if (artwork) {
      if (!colorCache.has(artwork)) {
        try {
          const extracted = await extractColorsFromImage(artwork);
          if (extracted?.background) {
            cacheArtworkColor(artwork, hexToNumber(extracted.background));
          } else {
            cacheArtworkColor(artwork, null);
          }
        } catch {
          cacheArtworkColor(artwork, null);
        }
      }
      const color = colorCache.get(artwork);
      if (color != null) {
        info.color = color;
        info.colorized = true;
      }
    }

    await (PlaybackNotificationManager.show as (data: Record<string, unknown>) => Promise<void>)(info);
    await Promise.all([
      PlaybackNotificationManager.enableControl('previousTrack', true),
      PlaybackNotificationManager.enableControl('nextTrack', true),
      PlaybackNotificationManager.enableControl('play', true),
      PlaybackNotificationManager.enableControl('pause', true),
      (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('rewind', true),
      (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('fastForward', true),
      (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('stop', true),
      (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('favorite', true),
      (PlaybackNotificationManager.enableControl as (name: string, enabled: boolean) => Promise<void>)('close', true),
    ]);
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

/** Call on app death to ensure notification is removed cleanly and any stale
 *  notification from a previous session is dismissed on next launch. */
export async function cleanupOnAppExit(): Promise<void> {
  try {
    const state = usePlayerStore.getState();
    if (state.currentTrack) {
      const { saveQueue } = useQueuePersistStore.getState();
      saveQueue(
        state.currentTrack, state.queue, state.queueIndex,
        state.shuffle, state.repeat, state.position,
        state.isPlaying,
      );
    }
  } catch {}
  await dismissNowPlayingNotification();
  try {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  } catch {}
  initialized = false;
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
      try {
        await ExpoNotifications.cancelScheduledNotificationAsync(sleepTimerNotificationId);
      } catch {}
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
