import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePlayerStore } from '@/store/player-store';
import { getPlayer, isCrossfadeEnabled, getCrossfadeDuration, preloadNextTrack } from '@/services/track-player';
import { showNowPlayingNotification, updateNotificationPlaybackState, dismissNowPlayingNotification } from '@/services/notifications';
import { useSleepTimerStore } from '@/store/sleep-timer-store';
import { useStatsStore } from '@/store/stats-store';
import { useQueuePersistStore } from '@/store/queue-persist-store';
import { useToastStore } from '@/store/toast-store';

export function useTrackPlayerSync() {
  const syncFromPlayerRef = useRef(usePlayerStore.getState().syncFromPlayer);
  const wasPlayingRef = useRef(false);
  const trackEndedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const crossfadeTriggeredRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const playTimeAccumRef = useRef(0);
  const lastQueueSaveRef = useRef(0);
  const lastNotifUpdateRef = useRef(0);
  const lastZeroVolNotifRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    syncFromPlayerRef.current = usePlayerStore.getState().syncFromPlayer;
  }, []);

  function handleTrackEnd() {
    const state = usePlayerStore.getState();
    const player = getPlayer();
    if (!player) return;

    switch (state.repeat) {
      case 'one':
        player.seekTo(0);
        player.play();
        break;
      case 'all':
        state.next();
        break;
      case 'off':
      default: {
        const { queue, shuffle, shuffledOrder, queueIndex } = state;
        let hasNext = false;

        if (shuffle) {
          const currentShuffledIdx = shuffledOrder.indexOf(queueIndex);
          hasNext = currentShuffledIdx + 1 < shuffledOrder.length;
        } else {
          hasNext = queueIndex + 1 < queue.length;
        }

        if (hasNext) {
          state.next();
        } else {
          player.pause();
          usePlayerStore.setState({ isPlaying: false });
        }
        break;
      }
    }
  }

  function handleCrossfade() {
    const state = usePlayerStore.getState();
    if (!state.isPlaying || crossfadeTriggeredRef.current) return;

    const player = getPlayer();
    if (!player) return;

    const duration = player.duration;
    const currentTime = player.currentTime;
    const crossfadeDur = getCrossfadeDuration();
    const remaining = duration - currentTime;

    if (remaining <= crossfadeDur && remaining > 0 && duration > 0) {
      crossfadeTriggeredRef.current = true;
      if (state.repeat === 'one') {
        player.seekTo(0);
        player.play();
      } else {
        state.next();
      }
    }
  }

  function handleSleepTimer() {
    const timer = useSleepTimerStore.getState();
    if (timer.active) {
      const expired = timer.tick();
      if (expired) {
        const state = usePlayerStore.getState();
        state.pause();
      }
    }
  }

  function recordPlayTime(currentTime: number, lastTime: number, isPlaying: boolean, trackId: string | null) {
    if (!isPlaying || !trackId) return;
    const delta = currentTime - lastTime;
    if (delta > 0 && delta < 2) {
      playTimeAccumRef.current += delta;
      if (playTimeAccumRef.current >= 5) {
        const seconds = Math.floor(playTimeAccumRef.current);
        useStatsStore.getState().addPlayTime(trackId, seconds);
        useStatsStore.getState().recordDailyListening(seconds);
        playTimeAccumRef.current = 0;
      }
    }
  }

  function saveQueueState() {
    const state = usePlayerStore.getState();
    if (state.currentTrack) {
      useQueuePersistStore.getState().saveQueue(
        state.currentTrack,
        state.queue,
        state.queueIndex,
        state.shuffle,
        state.repeat,
        state.position,
      );
    }
  }

  const crossfadeEnabled = isCrossfadeEnabled();

  useEffect(() => {
    function tick() {
      const player = getPlayer();
      if (!player) return;

      syncFromPlayerRef.current();

      const state = usePlayerStore.getState();
      const isNowPlaying = player.playing;
      const currentTime = player.currentTime;
      const duration = player.duration;
      const now = Date.now();

      if (isNowPlaying && player.volume === 0) {
        if (now - lastZeroVolNotifRef.current > 12000) {
          lastZeroVolNotifRef.current = now;
          useToastStore.getState().showToast("Volume is muted — turn it up", "volume");
        }
      }

      if (now - lastNotifUpdateRef.current >= 1000) {
        if (state.currentTrack && state.currentTrack.id !== lastTrackIdRef.current) {
          lastTrackIdRef.current = state.currentTrack.id;
          playTimeAccumRef.current = 0;
          showNowPlayingNotification(state.currentTrack, isNowPlaying, currentTime);
          lastNotifUpdateRef.current = now;
        } else if (state.currentTrack && isNowPlaying !== wasPlayingRef.current) {
          updateNotificationPlaybackState(isNowPlaying, state.currentTrack, currentTime);
          lastNotifUpdateRef.current = now;
        }
      }

      if (!state.currentTrack && lastTrackIdRef.current) {
        lastTrackIdRef.current = null;
        dismissNowPlayingNotification();
      }

      if (crossfadeEnabled && isNowPlaying) {
        handleCrossfade();
      }

      if (isNowPlaying && duration > 0 && state.currentTrack) {
        const pct = currentTime / duration;
        if (pct > 0.8 && pct < 0.99) {
          const queue = state.queue;
          const nextIdx = state.queueIndex + 1;
          if (nextIdx < queue.length) {
            preloadNextTrack(queue[nextIdx]);
          }
        }
      }

      if (
        wasPlayingRef.current &&
        !isNowPlaying &&
        duration > 0 &&
        currentTime >= duration - 0.5
      ) {
        if (!trackEndedRef.current) {
          trackEndedRef.current = true;
          handleTrackEnd();
        }
      }

      handleSleepTimer();

      if (isNowPlaying && state.currentTrack) {
        recordPlayTime(currentTime, lastTimeRef.current, true, state.currentTrack.id);
      }

      if (isNowPlaying && currentTime - lastQueueSaveRef.current >= 10) {
        saveQueueState();
        lastQueueSaveRef.current = currentTime;
      }

      if (isNowPlaying) {
        wasPlayingRef.current = true;
        trackEndedRef.current = false;
        if (currentTime < 1) {
          crossfadeTriggeredRef.current = false;
        }
      }

      if (!isNowPlaying && currentTime < 1 && lastTimeRef.current > 1) {
        wasPlayingRef.current = false;
        trackEndedRef.current = false;
        crossfadeTriggeredRef.current = false;
      }

      lastTimeRef.current = currentTime;
    }

    function startInterval() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(tick, 250);
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active' || nextState === 'background') {
        startInterval();
      } else {
        stopInterval();
      }
      if (nextState === 'background') {
        saveQueueState();
      }
    });

    startInterval();

    return () => {
      stopInterval();
      appStateSub.remove();
    };
  }, [crossfadeEnabled]);
}
