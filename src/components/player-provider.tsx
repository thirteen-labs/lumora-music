import { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { setupPlayer, setCrossfadeEnabled } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { initializeNotifications } from '@/services/notifications';

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

      if (Platform.OS !== 'web') {
        try {
          const { requestPermissionsAsync: requestMediaPermissions } = await import('expo-media-library');
          await requestMediaPermissions();
        } catch (e) {
          console.warn('Media permissions request failed:', e);
        }
      }

      try {
        await initializeNotifications();
      } catch (e) {
        console.warn('Notification setup failed:', e);
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
