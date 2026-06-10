import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/player-store';
import { getPlayer } from '@/services/track-player';

export function useTrackPlayerSync() {
  const syncFromPlayer = usePlayerStore((s) => s.syncFromPlayer);
  const repeat = usePlayerStore((s) => s.repeat);
  const queue = usePlayerStore((s) => s.queue);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const wasPlayingRef = useRef(false);
  const trackEndedRef = useRef(false);
  const lastTimeRef = useRef(0);

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

  useEffect(() => {
    const interval = setInterval(() => {
      const player = getPlayer();
      if (!player) return;

      syncFromPlayer();

      const isNowPlaying = player.playing;
      const currentTime = player.currentTime;
      const duration = player.duration;

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

      if (isNowPlaying) {
        wasPlayingRef.current = true;
        trackEndedRef.current = false;
      }

      if (!isNowPlaying && currentTime < 1 && lastTimeRef.current > 1) {
        wasPlayingRef.current = false;
        trackEndedRef.current = false;
      }

      lastTimeRef.current = currentTime;
    }, 250);

    return () => clearInterval(interval);
  }, [syncFromPlayer, repeat, queue.length, shuffle]);
}
