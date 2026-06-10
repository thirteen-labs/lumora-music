import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { Song } from '@/types/media';

let player: AudioPlayer | null = null;
let crossfadePlayer: AudioPlayer | null = null;
let crossfadeEnabled = false;
let crossfadeDuration = 5;
let currentVolume = 1;
let crossfadeCancelled = false;

export function getPlayer(): AudioPlayer | null {
  return player;
}

export function getCrossfadePlayer(): AudioPlayer | null {
  return crossfadePlayer;
}

export function setCrossfadeEnabled(enabled: boolean): void {
  crossfadeEnabled = enabled;
}

export function setCrossfadeDuration(seconds: number): void {
  crossfadeDuration = seconds;
}

export function isCrossfadeEnabled(): boolean {
  return crossfadeEnabled;
}

export function getCrossfadeDuration(): number {
  return crossfadeDuration;
}

export function getCurrentVolume(): number {
  return currentVolume;
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

  if (crossfadeEnabled && player.playing) {
    await crossfadeToTrack(track);
    return;
  }

  player.replace(track.uri);
  player.play();
  player.volume = 1;
  currentVolume = 1;
  setLockScreenMetadata(track);
}

async function crossfadeToTrack(track: Song): Promise<void> {
  if (!player) return;

  crossfadeCancelled = false;

  if (!crossfadePlayer) {
    crossfadePlayer = createAudioPlayer(null, { updateInterval: 250 });
  }

  crossfadePlayer.replace(track.uri);
  crossfadePlayer.volume = 0;
  crossfadePlayer.play();
  setLockScreenMetadata(track);

  const fadeSteps = 20;
  const stepDuration = (crossfadeDuration * 1000) / fadeSteps;

  for (let i = 1; i <= fadeSteps; i++) {
    if (crossfadeCancelled) return;

    const progress = i / fadeSteps;
    const fadeOut = 1 - progress;
    const fadeIn = progress;

    try {
      player.volume = fadeOut;
      crossfadePlayer.volume = fadeIn;
    } catch {}

    currentVolume = fadeIn;
    await new Promise((resolve) => setTimeout(resolve, stepDuration));
  }

  if (crossfadeCancelled) return;

  player.pause();
  player.seekTo(0);

  const temp = player;
  player = crossfadePlayer;
  crossfadePlayer = temp;

  player.volume = 1;
  currentVolume = 1;
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

export async function setVolume(volume: number): Promise<void> {
  if (player) {
    player.volume = volume;
    currentVolume = volume;
  }
}

export function setLockScreenMetadata(track: Song): void {
  if (!player) return;

  player.setActiveForLockScreen(true, {
    title: track.title,
    artist: track.artist,
    albumTitle: track.album,
    artworkUrl: track.artwork ?? undefined,
  }, {
    showSeekForward: true,
    showSeekBackward: true,
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
  crossfadeCancelled = true;
  if (player) {
    player.clearLockScreenControls();
    player.remove();
    player = null;
  }
  if (crossfadePlayer) {
    crossfadePlayer.remove();
    crossfadePlayer = null;
  }
}
