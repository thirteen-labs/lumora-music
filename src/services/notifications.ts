import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Song } from '@/types/media';

const NOTIFICATION_CHANNEL_ID = 'lumora-playback';
const NOTIFICATION_ID = 'lumora-now-playing';

let notificationInitialized = false;

export async function initializeNotifications(): Promise<void> {
  if (notificationInitialized) return;

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

  Notifications.addNotificationResponseReceivedListener((response) => {
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
}

export async function showNowPlayingNotification(track: Song, isPlaying: boolean): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: track.title,
      subtitle: track.artist,
      data: { action: '' },
      autoDismiss: false,
      sticky: true,
      ...(track.artwork ? { sound: undefined } : {}),
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
    } as any,
    trigger: null,
    identifier: NOTIFICATION_ID,
  });
}

export async function updateNotificationPlaybackState(isPlaying: boolean, track: Song | null): Promise<void> {
  if (Platform.OS !== 'android' || !track) return;

  await Notifications.scheduleNotificationAsync({
    content: {
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
    } as any,
    trigger: null,
    identifier: NOTIFICATION_ID,
  });
}

export async function dismissNowPlayingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
