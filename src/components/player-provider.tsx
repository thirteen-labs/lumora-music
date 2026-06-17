import { useEffect, useState, useRef, ReactNode } from 'react';
import { View, ActivityIndicator, Platform, AppState } from 'react-native';
import { setupPlayer, setCrossfadeEnabled, setCrossfadeDuration, loadTrack, pausePlayback, seekTo as serviceSeekTo, ensurePlayerAlive } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useQueuePersistStore, reconstructQueue } from '@/store/queue-persist-store';
import { initializeNotifications } from '@/services/notifications';
import { syncEqualizerToEngine } from '@/store/equalizer-store';
import { syncReplayGainToEngine } from '@/store/replay-gain-store';
import { useLoudnessEnhancerStore } from '@/store/loudness-enhancer-store';
import { audioEngine } from '@/services/audio-engine';
import { useTheme } from '@/hooks/use-theme';

function PlayerSync() {
  useTrackPlayerSync();
  return null;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const crossfade = useSettingsStore((s) => s.crossfade);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const restoreAttemptedRef = useRef(false);

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

      try {
        await restoreQueue();
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

  // Retry queue restore when songs become available
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    if (!ready) return;

    const songs = useMusicStore.getState().songs;
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (songs.length > 0 && !currentTrack) {
      restoreQueue();
    }
  }, [ready]);

  async function restoreQueue() {
    const persisted = useQueuePersistStore.getState().loadQueue();
    if (!persisted || !persisted.currentTrackId) {
      restoreAttemptedRef.current = true;
      return;
    }

    const allSongs = useMusicStore.getState().songs;
    if (allSongs.length === 0) {
      // Songs not loaded yet - will retry via the songs watcher
      return;
    }

    const { track, queue, queueIndex } = reconstructQueue(persisted, allSongs);
    if (!track || queue.length === 0) {
      restoreAttemptedRef.current = true;
      return;
    }

    usePlayerStore.setState({
      currentTrack: track,
      queue,
      queueIndex,
      shuffle: persisted.shuffle,
      repeat: persisted.repeat as any,
      isMiniPlayerVisible: true,
      position: persisted.position,
      isPlaying: false,
    });

    // Load track into engine and seek to persisted position (stays paused)
    try {
      await loadTrack(track);
      if (persisted.position > 0) {
        await serviceSeekTo(persisted.position);
      }
      await pausePlayback();
    } catch (e) {
      console.warn('Failed to restore track position:', e);
    }

    restoreAttemptedRef.current = true;
  }

  // Ensure audio engine survives app background/foreground
  useEffect(() => {
    const handleAppState = async (nextState: string) => {
      if (nextState === 'active') {
        await ensurePlayerAlive();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // Re-check when music store songs change
  useEffect(() => {
    const unsub = useMusicStore.subscribe((state, prev) => {
      if (!restoreAttemptedRef.current && state.songs.length > 0 && prev.songs.length === 0) {
        restoreQueue();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    try {
      setCrossfadeEnabled(crossfade);
      setCrossfadeDuration(crossfadeDuration);
    } catch {}
  }, [crossfade, crossfadeDuration]);

  useEffect(() => {
    try {
      syncEqualizerToEngine();
      syncReplayGainToEngine();
      const le = useLoudnessEnhancerStore.getState();
      audioEngine.setLoudnessEnabled(le.enabled);
      audioEngine.setLoudnessLevel(le.level);
    } catch {}
  }, []);

  const { colors } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
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
