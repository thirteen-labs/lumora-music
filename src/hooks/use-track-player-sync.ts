import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePlayerStore } from '@/store/player-store';
import { getPlayer, isCrossfadeEnabled, getCrossfadeDuration, preloadNextTrack } from '@/services/track-player';
import { showNowPlayingNotification, updateNotificationPlaybackState, dismissNowPlayingNotification, preloadArtworkForTrack, preloadColorsForTrack } from '@/services/notifications';
import { useSleepTimerStore } from '@/store/sleep-timer-store';
import { useStatsStore } from '@/store/stats-store';
import { useQueuePersistStore } from '@/store/queue-persist-store';
import { useToastStore } from '@/store/toast-store';
import { useSettingsStore } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { generateUpNext } from '@/player/recommendations';
import { reportWarning } from '@/utils/error-handler';
import { audioEngine } from '@/services/audio-engine';

/** Consecutive decode failures across rapid skips. Reset whenever a track
 *  actually plays, so we don't loop forever through a batch of corrupt files. */
let decodeErrorStreak = 0;

export function useTrackPlayerSync() {
  const syncFromPlayerRef = useRef(usePlayerStore.getState().syncFromPlayer);
  const wasPlayingRef = useRef(false);
  const trackEndedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const crossfadeTriggeredRef = useRef(false);
  const advancingRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const playTimeAccumRef = useRef(0);
  const lastQueueSaveRef = useRef(0);
  const lastNotifUpdateRef = useRef(0);
  const lastZeroVolNotifRef = useRef(0);
  const lastMilestonePosRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const consecutiveSyncFailsRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    syncFromPlayerRef.current = usePlayerStore.getState().syncFromPlayer;
  }, []);

  function isTransitioning(): boolean {
    const player = getPlayer();
    if (!player) return true;
    const state = usePlayerStore.getState();
    return state.isPlaying && !player.isLoaded && !player.playing;
  }

  /**
   * Single authoritative queue-advance decision. Every track-end / crossfade
   * trigger (native onEnded, engine onStateChange, the 250ms poll, and the
   * crossfade timer) routes through here. `advancingRef` guarantees that, no
   * matter how many triggers fire for the same track end, only ONE transition
   * happens. The repeat + autoplay logic lives in exactly one place.
   */
  function advancePlayback(): void {
    if (advancingRef.current) return;
    if (isTransitioning()) return;
    const state = usePlayerStore.getState();
    const player = getPlayer();
    if (!player) return;

    advancingRef.current = true;
    try {
      switch (state.repeat) {
        case 'one':
          player.seekTo(0);
          player.play();
          return;
        case 'all':
          state.next();
          return;
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
          } else if (!ensureAutoplayFill()) {
            player.pause();
            usePlayerStore.setState({ isPlaying: false });
          }
          return;
        }
      }
    } finally {
      advancingRef.current = false;
    }
  }

  function handleTrackEnd() {
    advancePlayback();
  }

  function ensureAutoplayFill(): boolean {
    const state = usePlayerStore.getState();
    if (!state.currentTrack) return false;
    if (!useSettingsStore.getState().autoplay) return false;

    const allSongs = useMusicStore.getState().songs;
    if (allSongs.length === 0) return false;

    const exclude = new Set(state.queue.map((s) => s.id));
    const recs = generateUpNext(state.currentTrack, allSongs, exclude);
    if (recs.length === 0) return false;

    usePlayerStore.getState().appendAutoplayTracks(recs);
    useToastStore.getState().showToast(`${recs.length} similar tracks added — Up Next`, 'music');

    const after = usePlayerStore.getState();
    if (after.queueIndex + 1 < after.queue.length) {
      after.next();
      return true;
    }
    return false;
  }

  function handleCrossfade() {
    if (isTransitioning()) return;
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
      /* Delegate the actual transition to the single authoritative path so
         crossfade and end-of-track never produce divergent/duplicate advances. */
      advancePlayback();
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
        state.isPlaying,
        state.priorityQueue,
      );
    }
  }

  const handleCrossfadeRef = useRef(handleCrossfade);
  const handleTrackEndRef = useRef(handleTrackEnd);

  useEffect(() => {
    handleCrossfadeRef.current = handleCrossfade;
    handleTrackEndRef.current = handleTrackEnd;
  });

  useEffect(() => {
    mountedRef.current = true;
    function tick() {
      if (!mountedRef.current) return;
      const player = getPlayer();
      if (!player) {
        consecutiveSyncFailsRef.current++;
        if (consecutiveSyncFailsRef.current > 10) {
          reportWarning('TrackPlayerSync', 'Player unreachable for 2.5s');
          consecutiveSyncFailsRef.current = 0;
        }
        return;
      }
      consecutiveSyncFailsRef.current = 0;

      syncFromPlayerRef.current();

      const state = usePlayerStore.getState();
      const isNowPlaying = player.playing;
      const currentTime = player.currentTime;
      const duration = player.duration;
      const now = Date.now();

      /* Detect gapless / crossfade track transitions:
         The engine may have switched to a new track without the store knowing.
         Compare the engine's currentTrackUri with the store's currentTrack.uri. */
      const engineUri = player.currentTrackUri;
      if (engineUri && state.currentTrack && engineUri !== state.currentTrack.uri) {
        const idx = state.queue.findIndex((t) => t.uri === engineUri);
        if (idx >= 0 && state.queue[idx].id !== state.currentTrack.id) {
          const newTrack = state.queue[idx];
          usePlayerStore.setState({
            currentTrack: newTrack,
            queueIndex: idx,
            position: currentTime,
            duration,
          });
          lastTrackIdRef.current = newTrack.id;
          playTimeAccumRef.current = 0;
          lastMilestonePosRef.current = 0;
          preloadArtworkForTrack(newTrack);
          preloadColorsForTrack(newTrack.artwork);
          showNowPlayingNotification(newTrack, isNowPlaying, currentTime);
          lastNotifUpdateRef.current = now;
          /* Reset track-end state so the new track can end properly */
          wasPlayingRef.current = isNowPlaying;
          trackEndedRef.current = false;
          crossfadeTriggeredRef.current = false;
        }
      }

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
          lastMilestonePosRef.current = 0;
          preloadArtworkForTrack(state.currentTrack);
          preloadColorsForTrack(state.currentTrack.artwork);
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

      if (isCrossfadeEnabled() && isNowPlaying) {
        handleCrossfadeRef.current();
      }

      if (isNowPlaying && duration > 0 && state.currentTrack) {
        const pct = currentTime / duration;
        /* Preload next track at 60% for better readiness */
        if (pct > 0.6 && pct < 0.99) {
          const queue = state.queue;
          const nextIdx = state.queueIndex + 1;
          if (nextIdx < queue.length) {
            preloadNextTrack(queue[nextIdx]);
            preloadArtworkForTrack(queue[nextIdx]);
            preloadColorsForTrack(queue[nextIdx].artwork);
          }
        }
      }

      if (
        wasPlayingRef.current &&
        !isNowPlaying &&
        duration > 0 &&
        currentTime >= duration - Math.min(0.5, duration * 0.1)
      ) {
        if (!trackEndedRef.current) {
          trackEndedRef.current = true;
          handleTrackEndRef.current();
        }
      }

      /* Also detect track end while still playing (for edge cases where onEnded fires late) */
      if (
        isNowPlaying &&
        duration > 0 &&
        currentTime >= duration - 0.1 &&
        !trackEndedRef.current
      ) {
        trackEndedRef.current = true;
        handleTrackEndRef.current();
      }

      handleSleepTimer();

      if (isNowPlaying && state.currentTrack) {
        recordPlayTime(currentTime, lastTimeRef.current, true, state.currentTrack.id);
      }

      /* Save queue every 2s for better crash resilience */
      if ((isNowPlaying || state.currentTrack) && now - lastQueueSaveRef.current >= 2000) {
        saveQueueState();
        lastQueueSaveRef.current = now;
      }

      /* Save on position milestones (every ~10s progress) for precise resume after crash */
      if (isNowPlaying && state.currentTrack && duration > 0) {
        const milestoneDelta = Math.abs(currentTime - lastMilestonePosRef.current);
        if (milestoneDelta >= 10) {
          saveQueueState();
          lastQueueSaveRef.current = now;
          lastMilestonePosRef.current = currentTime;
        }
      }

      if (isNowPlaying) {
        wasPlayingRef.current = true;
        trackEndedRef.current = false;
        decodeErrorStreak = 0;
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
      if (nextState === 'background' || nextState === 'inactive') {
        saveQueueState();
      }
    });

    startInterval();

    /* Register a state-change callback on the audio engine so that track-end
       and gapless transitions are handled immediately, even when the JS
       setInterval is throttled (e.g. background on iOS). */
    const unsubEngine = audioEngine.onStateChange((engineState) => {
      if (!mountedRef.current) return;

      /* Immediate track-end handling: when the engine signals that playback
         stopped at the end of a track, fire handleTrackEnd right away
         instead of waiting for the next 250ms tick. */
      if (
        !engineState.playing &&
        engineState.duration > 0 &&
        engineState.currentTime >= engineState.duration - Math.min(0.5, engineState.duration * 0.1) &&
        !trackEndedRef.current
      ) {
        trackEndedRef.current = true;
        handleTrackEndRef.current();
      }
    });

    /* Native "track ended" signal from the AudioBufferSourceNode onEnded
       (dispatched on the native audio thread). This drives auto-advance even
       when the app is backgrounded and the JS setInterval is throttled, so a
       queue keeps playing after the app leaves the foreground. */
    const unsubTrackEnded = audioEngine.onTrackEnded(() => {
      if (!mountedRef.current) return;
      if (!trackEndedRef.current) {
        trackEndedRef.current = true;
        handleTrackEndRef.current();
      }
    });

    /* A track failed to decode (corrupt/unsupported/missing). Skip to the next
       playable track instead of leaving playback stuck on a dead buffer, but
       guard against an infinite skip-loop through many bad files. */
    const unsubDecodeError = audioEngine.onDecodeError((uri) => {
      if (!mountedRef.current) return;
      reportWarning('TrackPlayerSync', `Decode failed: ${uri?.slice(0, 80)}`);
      decodeErrorStreak += 1;
      if (decodeErrorStreak > 8) {
        usePlayerStore.getState().pause();
        useToastStore.getState().showToast('Multiple tracks could not be played', 'alert');
        decodeErrorStreak = 0;
        return;
      }
      useToastStore.getState().showToast('Track could not be played — skipping', 'alert');
      const st = usePlayerStore.getState();
      if (st.currentTrack && st.currentTrack.uri === uri) {
        st.next();
      }
    });

    return () => {
      mountedRef.current = false;
      stopInterval();
      unsubEngine();
      unsubTrackEnded();
      unsubDecodeError();
      /* Final save before unmount */
      saveQueueState();
      appStateSub.remove();
    };
  }, []);
}
