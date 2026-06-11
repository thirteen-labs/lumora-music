import { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { setupPlayer, setCrossfadeEnabled } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { requestPermissionsAsync as requestMediaPermissions } from 'expo-media-library';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function PlayerSync() {
  useTrackPlayerSync();
  return null;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const crossfade = useSettingsStore((s) => s.crossfade);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await setupPlayer();
      } catch (e) {
        console.warn('Player setup failed, continuing without audio:', e);
      }

      try {
        await requestMediaPermissions();
      } catch (e) {
        console.warn('Media permissions request failed:', e);
      }

      if (Platform.OS === 'android') {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          if (existingStatus !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        } catch (e) {
          console.warn('Notification permissions request failed:', e);
        }
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    init();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setCrossfadeEnabled(crossfade);
  }, [crossfade]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <>
      <PlayerSync />
      {children}
    </>
  );
}
