import { useEffect, useRef } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  RepeatMode as RntpRepeatMode,
} from 'react-native-track-player';
import { usePlayerStore } from '@/store/player-store';

export function useTrackPlayerSync() {
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(250);
  const activeTrack = useActiveTrack();
  const syncFromPlayer = usePlayerStore((s) => s.syncFromPlayer);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const prevTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (playbackState.state === State.Playing) {
      usePlayerStore.setState({ isPlaying: true });
    } else {
      usePlayerStore.setState({ isPlaying: false });
    }
  }, [playbackState.state]);

  useEffect(() => {
    setPosition(position);
    setDuration(duration);
  }, [position, duration, setPosition, setDuration]);

  useEffect(() => {
    if (activeTrack) {
      if (prevTrackId.current !== activeTrack.id) {
        prevTrackId.current = activeTrack.id;
        syncFromPlayer();
      }
    }
  }, [activeTrack, syncFromPlayer]);
}
