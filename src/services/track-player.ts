import type { Song } from "@/types/media";
import { audioEngine } from "@/services/audio-engine";
import { setAudioModeAsync } from "expo-audio";
import {
  showNowPlayingNotification,
  dismissNowPlayingNotification,
} from "@/services/notifications";

let crossfadeEnabled = false;
let crossfadeDuration = 5;
let currentVolume = 1;

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
    return audioEngine.getSpeed();
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
  replace(uri: string) {
    audioEngine.loadTrack(uri);
  },
  remove() {
    audioEngine.stop();
  },
  setActiveForLockScreen(
    active: boolean,
    meta: { title?: string; artist?: string; artwork?: string } | null,
  ) {
    if (active && meta) {
      const fakeTrack: Song = {
        id: "lockscreen",
        title: meta.title ?? "",
        artist: meta.artist ?? "",
        artwork: meta.artwork ?? null,
        uri: "",
        duration: 0,
        album: "",
        albumId: "",
        fileSize: 0,
        dateAdded: 0,
        genre: null,
        bitrate: null,
        sampleRate: null,
      };
      showNowPlayingNotification(fakeTrack, audioEngine.getState().playing);
    } else {
      dismissNowPlayingNotification();
    }
  },
  clearLockScreenControls() {
    dismissNowPlayingNotification();
  },
};

export function getPlayer() {
  return playerAdapter;
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
    console.warn("Audio engine init failed:", e);
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  } catch {}
}

export async function loadTrack(track: Song): Promise<void> {
  if (crossfadeEnabled && audioEngine.getState().playing) {
    await crossfadeToTrack(track);
    return;
  }

  await audioEngine.loadTrack(track.uri);
  const speedState = (
    await import("@/store/playback-speed-store")
  ).usePlaybackSpeedStore.getState();
  audioEngine.setSpeed(speedState.speed);
  audioEngine.setPitchCorrection(speedState.pitchCorrection);
  audioEngine.play();
  audioEngine.setVolume(1);
  currentVolume = 1;
  setLockScreenMetadata(track);
}

async function crossfadeToTrack(track: Song): Promise<void> {
  await audioEngine.startCrossfade(track.uri, crossfadeDuration);
  setLockScreenMetadata(track);
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

export function clearLockScreenControls(): void {
  dismissNowPlayingNotification();
}

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
  audioEngine.destroy();
}

export async function ensurePlayerAlive(): Promise<boolean> {
  return audioEngine.ensureAlive();
}
