import { getPlayer } from '@/services/track-player';

/**
 * Headless playback service for react-native-track-player.
 * Runs in a separate JS context (Android headless task + iOS background).
 * Do NOT import zustand stores directly — use events + TrackPlayer API only.
 */
export async function PlaybackService() {
  // The playback service is initialized via the TrackPlayer.registerPlaybackService
  // in index.js. This function can be used to set up any headless playback logic.

  // Subscribe to remote control events for headset/lock screen control
  const player = getPlayer();

  // We use the player adapter to handle remote commands
  // The actual event handling is done in use-track-player-sync hook and
  // the AudioEngineCompat in audio-engine.ts

  // Initialize volume from storage if available
  try {
    const volume = player.volume;
    // Volume is managed via the player adapter
  } catch {}

  return null;
}