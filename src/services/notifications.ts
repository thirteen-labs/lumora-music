import { Platform } from 'react-native';
import type { Song } from '@/types/media';

let Notifications: any = null;

async function loadNotifications(): Promise<boolean> {
  try {
    Notifications = await import('expo-notifications');
    return true;
  } catch {
    return false;
  }
}

let notificationsLoaded = false;
let notificationsLoadAttempted = false;

async function ensureNotificationsLoaded(): Promise<boolean> {
  if (notificationsLoaded) return true;
  if (!notificationsLoadAttempted) {
    notificationsLoadAttempted = true;
    notificationsLoaded = await loadNotifications();
  }
  return notificationsLoaded;
}

const NOTIFICATION_CHANNEL_ID = 'lumora-playback';
const NOTIFICATION_ID = 'lumora-now-playing';

let notificationInitialized = false;

export async function initializeNotifications(): Promise<void> {
  if (notificationInitialized) return;

  const loaded = await ensureNotificationsLoaded();
  if (!loaded || !Notifications) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Now Playing',
        importance: Notifications.AndroidImportance.LOW,
        showBadge: false,
        sound: undefined,
        vibrationPattern: undefined,
      });
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      }),
    });

    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const action = response.notification.request.content.data?.action
        ?? response.actionIdentifier;
      if (action === 'play-pause') {
        import('@/store/player-store').then(({ usePlayerStore }) => {
          usePlayerStore.getState().togglePlay();
        });
      } else if (action === 'next') {
        import('@/store/player-store').then(({ usePlayerStore }) => {
          usePlayerStore.getState().next();
        });
      } else if (action === 'previous') {
        import('@/store/player-store').then(({ usePlayerStore }) => {
          usePlayerStore.getState().previous();
        });
      }
    });

    notificationInitialized = true;
  } catch (e) {
    console.warn('Notification setup failed:', e);
  }
}

function resolveArtworkUri(artwork: string | null): string | null {
  if (!artwork) return null;
  if (artwork.startsWith('http://') || artwork.startsWith('https://') || artwork.startsWith('file://') || artwork.startsWith('content://')) {
    return artwork;
  }
  return `file://${artwork}`;
}

export async function showNowPlayingNotification(track: Song, isPlaying: boolean): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;

  try {
    const notificationContent: any = {
      title: track.title,
      subtitle: track.artist,
      data: { action: '' },
      autoDismiss: false,
      sticky: true,
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      ...(Platform.OS === 'android'
        ? {
            actions: [
              { identifier: 'previous', title: 'Previous' },
              { identifier: 'play-pause', title: isPlaying ? 'Pause' : 'Play' },
              { identifier: 'next', title: 'Next' },
            ],
          }
        : {}),
    };

    const artworkUri = resolveArtworkUri(track.artwork);
    if (artworkUri) {
      notificationContent.image = artworkUri;
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null,
      identifier: NOTIFICATION_ID,
    });
  } catch {}
}

export async function updateNotificationPlaybackState(isPlaying: boolean, track: Song | null): Promise<void> {
  if (Platform.OS !== 'android' || !track || !Notifications) return;

  try {
    const notificationContent: any = {
      title: track.title,
      subtitle: track.artist,
      data: { action: '' },
      autoDismiss: false,
      sticky: true,
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      ...(Platform.OS === 'android'
        ? {
            actions: [
              { identifier: 'previous', title: 'Previous' },
              { identifier: 'play-pause', title: isPlaying ? 'Pause' : 'Play' },
              { identifier: 'next', title: 'Next' },
            ],
          }
        : {}),
    };

    const artworkUri = resolveArtworkUri(track.artwork);
    if (artworkUri) {
      notificationContent.image = artworkUri;
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null,
      identifier: NOTIFICATION_ID,
    });
  } catch {}
}

export async function dismissNowPlayingNotification(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {}
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
