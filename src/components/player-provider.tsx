import { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { setupPlayer, setCrossfadeEnabled } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useQueuePersistStore, reconstructQueue } from '@/store/queue-persist-store';
import { initializeNotifications } from '@/services/notifications';
import { syncEqualizerToEngine } from '@/store/equalizer-store';
import { syncReplayGainToEngine } from '@/store/replay-gain-store';

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

      // Restore queue from persistence
      try {
        const persisted = useQueuePersistStore.getState().loadQueue();
        if (persisted && persisted.currentTrackId) {
          const allSongs = useMusicStore.getState().songs;
          if (allSongs.length > 0) {
            const { track, queue, queueIndex } = reconstructQueue(persisted, allSongs);
            if (track && queue.length > 0) {
              usePlayerStore.setState({
                currentTrack: track,
                queue,
                queueIndex,
                shuffle: persisted.shuffle,
                repeat: persisted.repeat as any,
                isMiniPlayerVisible: true,
                position: persisted.position,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Queue restore failed:', e);
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

  useEffect(() => {
    syncEqualizerToEngine();
    syncReplayGainToEngine();
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
