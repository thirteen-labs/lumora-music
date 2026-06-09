import { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { setupPlayer } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';

function PlayerSync() {
  useTrackPlayerSync();
  return null;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setupPlayer().then(() => setReady(true));
  }, []);

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
