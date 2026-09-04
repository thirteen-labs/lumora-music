import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Headless playback service for react-native-track-player.
 * Runs in a separate JS context (Android headless task + iOS background).
 * Do NOT import zustand stores directly — use events + TrackPlayer API only.
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await TrackPlayer.skipToPrevious();
  });

  // Supports Android seek bar + iOS lock-screen scrub
  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    await TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
    const pos = await TrackPlayer.getPosition();
    const dur = await TrackPlayer.getDuration();
    await TrackPlayer.seekTo(Math.min(pos + interval, dur));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(pos - interval, 0));
  });
}
