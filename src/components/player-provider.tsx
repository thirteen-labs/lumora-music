import { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { setupPlayer, setCrossfadeEnabled } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { requestNotificationPermissionsAsync } from 'expo-audio';

function PlayerSync() {
  useTrackPlayerSync();
  return null;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const crossfade = useSettingsStore((s) => s.crossfade);

  useEffect(() => {
    setupPlayer().then(async () => {
      if (Platform.OS === 'android') {
        try {
          await requestNotificationPermissionsAsync();
        } catch {}
      }
      setReady(true);
    });
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
