import type { Song } from "@/types/media";
import { audioEngine } from "@/services/audio-engine";
import { setAudioModeAsync } from "expo-audio";
import {
  showNowPlayingNotification,
  dismissNowPlayingNotification,
} from "@/services/notifications";
import { reportWarning } from "@/utils/error-handler";
import { logger } from "@/utils/logger";
import {
  useTelemetryStore,
} from "@/store/telemetry-store";
import { storage } from "@/services/mmkv";

let crossfadeEnabled = false;
let crossfadeDuration = 5;
let gaplessEnabled = false;
let playTogetherEnabled = false;
let currentVolume = (() => {
  try { return storage.getNumber('lumora-volume') ?? 1; } catch { return 1; }
})();
let crossfadeInProgress = false;

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
    try { storage.set('lumora-volume', v); } catch (e) { logger.warn('Failed to save volume:', e); }
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

export function setGaplessEnabled(enabled: boolean): void {
  gaplessEnabled = enabled;
  audioEngine.setGaplessEnabled(enabled);
}

export function isGaplessEnabled(): boolean {
  return gaplessEnabled;
}

export function setPlayTogetherEnabled(enabled: boolean): void {
  playTogetherEnabled = enabled;
  applyAudioMode();
}

export function isPlayTogetherEnabled(): boolean {
  return playTogetherEnabled;
}

async function applyAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: playTogetherEnabled ? 'mixWithOthers' : 'doNotMix',
    });
  } catch (e) {
    reportWarning('TrackPlayer', e, 'Failed to set audio mode');
  }
}

export async function setupPlayer(): Promise<void> {
  try {
    /* Destroy any existing context before init */
    audioEngine.destroy();
    await audioEngine.init();
  } catch (e) {
    logger.warn("Audio engine init failed:", e);
  }

  await applyAudioMode();
}

export async function loadTrack(track: Song): Promise<void> {
  if (crossfadeEnabled && audioEngine.getState().playing && !crossfadeInProgress) {
    useTelemetryStore.getState().record('crossfade', track.id);
    await crossfadeToTrack(track);
    return;
  }

  const startTs = Date.now();
  try {
    await audioEngine.loadTrack(track.uri);
  } catch (e) {
    useTelemetryStore.getState().recordError('loadTrack', String(e));
    throw e;
  }
  const elapsed = Date.now() - startTs;
  useTelemetryStore.getState().recordPlay(track.id, elapsed);

  const speedState = (
    await import("@/store/playback-speed-store")
  ).usePlaybackSpeedStore.getState();
  audioEngine.setSpeed(speedState.speed);
  audioEngine.setPitchCorrection(speedState.pitchCorrection);
  audioEngine.play();
  audioEngine.setVolume(currentVolume);
  setLockScreenMetadata(track);
}

function setLockScreenMetadata(track: Song): void {
  showNowPlayingNotification(track, audioEngine.getState().playing);
}

export async function preloadNextTrack(track: Song): Promise<void> {
  if (crossfadeInProgress) return;
  audioEngine.preloadTrack(track.uri);
  if (gaplessEnabled) {
    audioEngine.setGaplessNextTrack(track.uri);
  }
}



async function crossfadeToTrack(track: Song): Promise<void> {
  if (crossfadeInProgress) {
    await audioEngine.loadTrack(track.uri);
    audioEngine.play();
    setLockScreenMetadata(track);
    return;
  }
  crossfadeInProgress = true;
  try {
    await audioEngine.startCrossfade(track.uri, crossfadeDuration);
    setLockScreenMetadata(track);
  } finally {
    crossfadeInProgress = false;
  }
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



export function clearLockScreenControls(): void {
  dismissNowPlayingNotification();
}

export function destroyPlayer(): void {
  try {
    dismissNowPlayingNotification();
  } catch (e) {
    reportWarning('TrackPlayer', e, 'Failed to dismiss notification on destroy');
  }
  try {
    audioEngine.destroy();
  } catch (e) {
    reportWarning('TrackPlayer', e, 'Failed to destroy audio engine');
  }
}

export async function ensurePlayerAlive(): Promise<boolean> {
  useTelemetryStore.getState().recordEnsureAlive();
  return audioEngine.ensureAlive();
}
