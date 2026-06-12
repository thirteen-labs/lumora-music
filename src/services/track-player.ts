import type { Song } from '@/types/media';
import { audioEngine } from '@/services/audio-engine';
import { setAudioModeAsync } from 'expo-audio';
import {
  showNowPlayingNotification,
} from '@/services/notifications';

let crossfadeEnabled = false;
let crossfadeDuration = 5;
let currentVolume = 1;
let crossfadeCancelled = false;

const playerAdapter = {
  get playing(): boolean {
    return audioEngine.getState().playing;
  },
  get currentTime(): number {
    return audioEngine.getState().currentTime;
  },
  get duration(): number {
    return audioEngine.getState().duration;
  },
  get isBuffering(): boolean {
    return audioEngine.getState().isBuffering;
  },
  get isLoaded(): boolean {
    return audioEngine.getState().isLoaded;
  },
  get playbackRate(): number {
    return audioEngine.getState().playing ? 1 : 1;
  },
  set playbackRate(rate: number) {
    audioEngine.setSpeed(rate);
  },
  get volume(): number {
    return currentVolume;
  },
  set volume(v: number) {
    currentVolume = v;
    audioEngine.setVolume(v);
  },
  play() {
    audioEngine.play();
  },
  pause() {
    audioEngine.pause();
  },
  seekTo(position: number) {
    audioEngine.seekTo(position);
  },
  replace(_uri: string) {},
  remove() {},
  setActiveForLockScreen(_active: boolean, _meta: unknown, _opts: unknown) {},
  clearLockScreenControls() {},
};

export function getPlayer() {
  return playerAdapter;
}

export function getCrossfadePlayer() {
  return null;
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
  try {
    await audioEngine.init();
  } catch (e) {
    console.warn('Audio engine init failed:', e);
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  } catch {}
}

export async function loadTrack(track: Song): Promise<void> {
  if (crossfadeEnabled && audioEngine.getState().playing) {
    await crossfadeToTrack(track);
    return;
  }

  await audioEngine.loadTrack(track.uri);
  audioEngine.setSpeed(
    (await import('@/store/playback-speed-store')).usePlaybackSpeedStore.getState().speed
  );
  audioEngine.play();
  audioEngine.setVolume(1);
  currentVolume = 1;
  setLockScreenMetadata(track);
}

async function crossfadeToTrack(track: Song): Promise<void> {
  crossfadeCancelled = false;

  const fadeSteps = 20;
  const stepDuration = (crossfadeDuration * 1000) / fadeSteps;

  for (let i = 1; i <= fadeSteps; i++) {
    if (crossfadeCancelled) return;
    const progress = i / fadeSteps;
    audioEngine.setVolume(1 - progress);
    currentVolume = progress;
    await new Promise((resolve) => setTimeout(resolve, stepDuration));
  }

  if (crossfadeCancelled) return;

  await audioEngine.loadTrack(track.uri);
  audioEngine.setVolume(1);
  currentVolume = 1;
  audioEngine.play();
}

export async function pausePlayback(): Promise<void> {
  audioEngine.pause();
}

export async function resumePlayback(): Promise<void> {
  audioEngine.play();
}

export async function seekTo(position: number): Promise<void> {
  audioEngine.seekTo(position);
}

export async function setVolume(volume: number): Promise<void> {
  audioEngine.setVolume(volume);
  currentVolume = volume;
}

export function setLockScreenMetadata(track: Song): void {
  showNowPlayingNotification(track, audioEngine.getState().playing);
}

export function clearLockScreenControls(): void {}

export function getPlayerState() {
  const state = audioEngine.getState();
  return {
    playing: state.playing,
    currentTime: state.currentTime,
    duration: state.duration,
    isBuffering: state.isBuffering,
    isLoaded: state.isLoaded,
  };
}

export function destroyPlayer(): void {
  crossfadeCancelled = true;
  audioEngine.destroy();
}
