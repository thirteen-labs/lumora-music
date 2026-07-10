import { useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, AppState } from 'react-native';
import { setupPlayer, setCrossfadeEnabled, setCrossfadeDuration, loadTrack, pausePlayback, seekTo as serviceSeekTo, ensurePlayerAlive, destroyPlayer } from '@/services/track-player';
import { useTrackPlayerSync } from '@/hooks/use-track-player-sync';
import { useSettingsStore } from '@/store/settings-store';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useQueuePersistStore, reconstructQueue } from '@/store/queue-persist-store';
import { initializeNotifications, dismissNowPlayingNotification } from '@/services/notifications';
import { syncEqualizerToEngine } from '@/store/equalizer-store';
import { syncReplayGainToEngine } from '@/store/replay-gain-store';
import { useLoudnessEnhancerStore } from '@/store/loudness-enhancer-store';
import { audioEngine } from '@/services/audio-engine';
import { useTheme } from '@/hooks/use-theme';
import { reportWarning, persistCrashLog } from '@/utils/error-handler';
import { checkStorageIntegrity } from '@/services/mmkv';
import type { RepeatMode } from '@/types/player';

const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY = 1000;
const QUEUE_RESTORE_TIMEOUT = 10000;

function PlayerSync() {
  useTrackPlayerSync();
  return null;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, label: string, maxRetries = MAX_INIT_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxRetries) {
        const delay = INIT_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`[PlayerProvider] Retry ${attempt + 1}/${maxRetries} for ${label} in ${delay}ms:`, e);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error(`All ${maxRetries + 1} attempts failed for ${label}`);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const crossfade = useSettingsStore((s) => s.crossfade);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const restoreAttemptedRef = useRef(false);
  const initAttemptedRef = useRef(false);
  const destroyedRef = useRef(false);
  const mountedRef = useRef(true);

  const saveStateBeforeExit = useCallback(() => {
    try {
      const state = usePlayerStore.getState();
      useQueuePersistStore.getState().saveQueue(
        state.currentTrack, state.queue, state.queueIndex,
        state.shuffle, state.repeat, state.position,
        state.isPlaying,
      );
    } catch (e) {
      reportWarning('PlayerProvider', e, 'Failed to save state before exit');
    }
  }, []);

  const cleanup = useCallback(() => {
    if (destroyedRef.current) return;
    destroyedRef.current = true;
    saveStateBeforeExit();
    dismissNowPlayingNotification();
    destroyPlayer();
  }, [saveStateBeforeExit]);

  const restoreQueue = useCallback(async () => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const persisted = useQueuePersistStore.getState().loadQueue();
    if (!persisted || !persisted.currentTrackId) {
      return;
    }

    const allSongs = useMusicStore.getState().songs;
    const { track, queue, queueIndex } = reconstructQueue(persisted, allSongs);
    if (!track) {
      return;
    }

    const wasPlaying = persisted.isPlaying === true;

    usePlayerStore.setState({
      currentTrack: track,
      queue,
      queueIndex,
      shuffle: persisted.shuffle,
      repeat: persisted.repeat as RepeatMode,
      isMiniPlayerVisible: true,
      position: persisted.position,
      isPlaying: wasPlaying,
    });

    try {
      await loadTrack(track);
      if (persisted.position > 0 && track.duration > 0) {
        const boundedPosition = Math.min(persisted.position, track.duration - 1);
        await serviceSeekTo(boundedPosition);
      }
      if (!wasPlaying) {
        await pausePlayback();
      }
    } catch (e) {
      reportWarning('PlayerProvider', e, 'Failed to restore track position after crash');
    }
  }, []);

  const restoreQueueWithTimeout = useCallback(async () => {
    try {
      const timer = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue restore timed out')), QUEUE_RESTORE_TIMEOUT)
      );
      await Promise.race([restoreQueue(), timer]);
    } catch (e) {
      reportWarning('PlayerProvider', e, 'Queue restore failed or timed out');
    }
  }, [restoreQueue]);

  useEffect(() => {
    mountedRef.current = true;
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    let cancelled = false;

    async function init() {
      checkStorageIntegrity();

      try {
        await retryWithBackoff(setupPlayer, 'setupPlayer');
      } catch (e) {
        reportWarning('PlayerProvider', e, 'Player setup failed, continuing without audio');
      }

      if (Platform.OS !== 'web') {
        try {
          if (Platform.OS === 'android') {
            const ms = await import('@obsidian_north/react-native-mediastore');
            await ms.requestPermissions();
          } else {
            const { requestPermissionsAsync: requestMediaPermissions } = await import('expo-media-library');
            await requestMediaPermissions();
          }
        } catch (e) {
          console.warn('[PlayerProvider] Media permissions request failed:', e);
        }
      }

      try {
        await retryWithBackoff(initializeNotifications, 'initializeNotifications');
      } catch (e) {
        reportWarning('PlayerProvider', e, 'Notification setup failed');
      }

      await restoreQueueWithTimeout();

      if (!cancelled && mountedRef.current) {
        setReady(true);
      }
    }

    init().catch((e) => {
      if (!cancelled && mountedRef.current) {
        reportWarning('PlayerProvider', e, 'Failed to initialize player');
        persistCrashLog('player-init', e instanceof Error ? e : new Error(String(e)));
        setInitError('Failed to initialize player');
        setReady(true);
      }
    });

    return () => { cancelled = true; cleanup(); mountedRef.current = false; };
  }, [cleanup, restoreQueueWithTimeout, retryCount]);

  /* Retry restore when music store populates after init */
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    if (!ready) return;

    const songs = useMusicStore.getState().songs;
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (songs.length > 0 && !currentTrack) {
      restoreQueue();
    }
  }, [ready, restoreQueue]);

  useEffect(() => {
    const handleAppState = async (nextState: string) => {
      if (nextState === 'active') {
        saveStateBeforeExit();
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const playerState = usePlayerStore.getState();
            const wasPlaying = playerState.isPlaying;
            const alive = await ensurePlayerAlive();
            if (alive) {
              if (wasPlaying) {
                const track = usePlayerStore.getState().currentTrack;
                if (track) {
                  try {
                    const { AudioManager } = await import('react-native-audio-api');
                    AudioManager.setAudioSessionActivity(true);
                  } catch {}
                }
              }
              return;
            }
            if (attempt < 2) {
              reportWarning('PlayerProvider', null, `Player recovery attempt ${attempt + 1} failed, retrying...`);
              await new Promise(r => setTimeout(r, 1000));
            } else {
              reportWarning('PlayerProvider', null, 'Player failed to recover after foreground');
            }
          } catch (e) {
            reportWarning('PlayerProvider', e, `Player recovery attempt ${attempt + 1} failed`);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        saveStateBeforeExit();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    /* Also save on beforeunload for web cleanup */
    let beforeUnloadCleanup: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleBeforeUnload = () => saveStateBeforeExit();
      window.addEventListener('beforeunload', handleBeforeUnload);
      beforeUnloadCleanup = () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      sub.remove();
      if (beforeUnloadCleanup) beforeUnloadCleanup();
    };
  }, [saveStateBeforeExit]);

  useEffect(() => {
    if (!ready) return;
    let healthCheckFails = 0;
    const interval = setInterval(async () => {
      try {
        const alive = await ensurePlayerAlive();
        if (alive) {
          healthCheckFails = 0;
        } else {
          healthCheckFails++;
        }
      } catch (e) {
        healthCheckFails++;
        if (healthCheckFails > 3) {
          reportWarning('PlayerProvider', e, 'Audio engine unreachable after multiple checks');
          healthCheckFails = 0;
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    const unsub = useMusicStore.subscribe((state, prev) => {
      if (!restoreAttemptedRef.current && state.songs.length > 0 && prev.songs.length === 0) {
        restoreQueue();
      }
    });
    return unsub;
  }, [restoreQueue]);

  useEffect(() => {
    try {
      setCrossfadeEnabled(crossfade);
      setCrossfadeDuration(crossfadeDuration);
    } catch (e) {
      reportWarning('PlayerProvider', e, 'Failed to set crossfade settings');
    }
  }, [crossfade, crossfadeDuration]);

  useEffect(() => {
    try {
      syncEqualizerToEngine();
      syncReplayGainToEngine();
      const le = useLoudnessEnhancerStore.getState();
      audioEngine.setLoudnessEnabled(le.enabled);
      audioEngine.setLoudnessLevel(le.level);
    } catch (e) {
      reportWarning('PlayerProvider', e, 'Failed to sync audio settings to engine');
    }
  }, []);

  const { colors } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>{initError}</Text>
        <Pressable
          onPress={async () => {
            setInitError(null);
            setReady(false);
            initAttemptedRef.current = false;
            destroyedRef.current = false;
            try {
              destroyPlayer();
              await setupPlayer();
              setRetryCount((c) => c + 1);
            } catch (e) {
              reportWarning('PlayerProvider', e, 'Retry failed');
              setInitError('Retry failed');
              setReady(true);
            }
          }}
          style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </Pressable>
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
