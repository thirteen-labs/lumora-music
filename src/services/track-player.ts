import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { Song } from '@/types/media';

let player: AudioPlayer | null = null;

export function getPlayer(): AudioPlayer | null {
  return player;
}

export async function setupPlayer(): Promise<void> {
  if (player) return;

  player = createAudioPlayer(null, {
    updateInterval: 250,
  });

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
}

export async function loadTrack(track: Song): Promise<void> {
  if (!player) return;

  player.replace(track.uri);
  player.play();
  setLockScreenMetadata(track);
}

export async function pausePlayback(): Promise<void> {
  player?.pause();
}

export async function resumePlayback(): Promise<void> {
  player?.play();
}

export async function seekTo(position: number): Promise<void> {
  player?.seekTo(position);
}

export function setLockScreenMetadata(track: Song): void {
  if (!player) return;

  player.setActiveForLockScreen(true, {
    title: track.title,
    artist: track.artist,
    albumTitle: track.album,
    artworkUrl: track.artwork ?? undefined,
  });
}

export function clearLockScreenControls(): void {
  player?.clearLockScreenControls();
}

export function getPlayerState() {
  if (!player) {
    return {
      playing: false,
      currentTime: 0,
      duration: 0,
      isBuffering: false,
      isLoaded: false,
    };
  }

  return {
    playing: player.playing,
    currentTime: player.currentTime,
    duration: player.duration,
    isBuffering: player.isBuffering,
    isLoaded: player.isLoaded,
  };
}

export function destroyPlayer(): void {
  if (player) {
    player.clearLockScreenControls();
    player.remove();
    player = null;
  }
}
