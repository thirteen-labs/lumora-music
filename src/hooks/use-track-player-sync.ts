import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/player-store';
import { getPlayer, isCrossfadeEnabled, getCrossfadeDuration } from '@/services/track-player';
import { showNowPlayingNotification, updateNotificationPlaybackState, dismissNowPlayingNotification } from '@/services/notifications';
import { useSleepTimerStore } from '@/store/sleep-timer-store';
import { useStatsStore } from '@/store/stats-store';
import { useQueuePersistStore } from '@/store/queue-persist-store';

export function useTrackPlayerSync() {
  const syncFromPlayer = usePlayerStore((s) => s.syncFromPlayer);
  const wasPlayingRef = useRef(false);
  const trackEndedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const crossfadeTriggeredRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const playTimeAccumRef = useRef(0);

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
      state.next();
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

  useEffect(() => {
    const interval = setInterval(() => {
      const player = getPlayer();
      if (!player) return;

      syncFromPlayer();

      const state = usePlayerStore.getState();
      const isNowPlaying = player.playing;
      const currentTime = player.currentTime;
      const duration = player.duration;

      // Notification handling
      if (state.currentTrack && state.currentTrack.id !== lastTrackIdRef.current) {
        lastTrackIdRef.current = state.currentTrack.id;
        showNowPlayingNotification(state.currentTrack, isNowPlaying);
      } else if (state.currentTrack && isNowPlaying !== wasPlayingRef.current) {
        updateNotificationPlaybackState(isNowPlaying, state.currentTrack);
      }

      if (!state.currentTrack && lastTrackIdRef.current) {
        lastTrackIdRef.current = null;
        dismissNowPlayingNotification();
      }

      // Crossfade
      if (isCrossfadeEnabled() && isNowPlaying) {
        handleCrossfade();
      }

      // Track end
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

      // Sleep timer
      handleSleepTimer();

      // Play time recording
      if (isNowPlaying && state.currentTrack) {
        recordPlayTime(currentTime, lastTimeRef.current, true, state.currentTrack.id);
      }

      // Periodic queue save (every 10 seconds)
      if (isNowPlaying && Math.floor(currentTime) % 10 === 0 && currentTime !== lastTimeRef.current) {
        saveQueueState();
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
    }, 250);

    return () => clearInterval(interval);
  }, [syncFromPlayer]);
}
