import type { Song } from "@/types/media";
import TrackPlayer, {
  Capability,
  Event,
  State,
  RepeatMode as TPRepeatMode,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import { setAudioModeAsync } from "expo-audio";
import { reportWarning } from "@/utils/error-handler";
import { logger } from "@/utils/logger";
import { useTelemetryStore } from "@/store/telemetry-store";
import { storage } from "@/services/mmkv";

// ---------------------------------------------------------------------------
// Flags kept for API compatibility — TP handles most natively
// ---------------------------------------------------------------------------
let crossfadeEnabled = false;
let crossfadeDuration = 5;
let gaplessEnabled = false;
let playTogetherEnabled = false;
let currentVolume = (() => {
  try {
    return storage.getNumber("lumora-volume") ?? 1;
  } catch {
    return 1;
  }
})();
let currentRate = 1;
let pitchCorrection = false; // TP uses pitchAlgorithm per-track, store for apply

// ---------------------------------------------------------------------------
// State cache — updated via TP events so sync getters stay instant
// ---------------------------------------------------------------------------
let _playing = false;
let _currentTime = 0;
let _duration = 0;
let _isLoaded = false;
let _isBuffering = false;
let _currentTrackUri: string | null = null;
let _isSetup = false;

let progressSub: ReturnType<typeof TrackPlayer.addEventListener> | null = null;
let stateSub: ReturnType<typeof TrackPlayer.addEventListener> | null = null;
let trackChangedSub: ReturnType<typeof TrackPlayer.addEventListener> | null = null;

async function songToTrack(song: Song) {
  let artwork = song.artwork ?? undefined;
  if (artwork) {
    try {
      const { resolveArtworkForPlayer } = await import('@/services/thumbnail-cache');
      const resolved = await resolveArtworkForPlayer(artwork);
      if (resolved) artwork = resolved;
    } catch {}
  }
  return {
    url: song.uri,
    title: song.title,
    artist: song.artist || "Unknown Artist",
    album: song.album || undefined,
    artwork,
    duration: song.duration || undefined,
  };
}

function subscribeToPlayerEvents() {
  try {
    stateSub?.remove();
    progressSub?.remove();
    trackChangedSub?.remove();
  } catch {}
  try {
    stateSub = TrackPlayer.addEventListener(Event.PlaybackState, ({ state: st }) => {
      _playing = st === State.Playing;
      _isBuffering = st === State.Buffering;
      _isLoaded = st !== State.None && st !== State.Stopped;
    });
    progressSub = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
      _currentTime = position;
      _duration = duration;
    });
    trackChangedSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (e) => {
      try {
        const track = e.track as unknown as { url?: string } | null;
        if (track?.url) _currentTrackUri = track.url;
        else if (e.index != null) {
          const q = await TrackPlayer.getQueue();
          const t = q[e.index] as { url?: string } | undefined;
          if (t?.url) _currentTrackUri = t.url;
        }
        _isLoaded = true;
        const d = await TrackPlayer.getDuration().catch(() => 0);
        if (d) _duration = d;
      } catch {}
    });
  } catch (e) {
    reportWarning("TrackPlayer", e, "Failed to subscribe to events");
  }
}

// ---------------------------------------------------------------------------
// Adapter — same shape player-store & hooks expect
// ---------------------------------------------------------------------------
const playerAdapter = {
  get playing(): boolean {
    return _playing;
  },
  get currentTime(): number {
    return _currentTime;
  },
  get duration(): number {
    return _duration;
  },
  get isBuffering(): boolean {
    return _isBuffering;
  },
  get isLoaded(): boolean {
    return _isLoaded;
  },
  get currentTrackUri(): string | null {
    return _currentTrackUri;
  },
  get playbackRate(): number {
    return currentRate;
  },
  set playbackRate(rate: number) {
    currentRate = rate;
    TrackPlayer.setRate(rate).catch((e) => reportWarning("TrackPlayer", e, "setRate failed"));
  },
  get volume(): number {
    return currentVolume;
  },
  set volume(v: number) {
    currentVolume = v;
    TrackPlayer.setVolume(v).catch((e) => reportWarning("TrackPlayer", e, "setVolume failed"));
    try {
      storage.set("lumora-volume", v);
    } catch (e) {
      logger.warn("Failed to save volume:", e);
    }
  },
  async play() {
    await TrackPlayer.play();
  },
  async pause() {
    await TrackPlayer.pause();
  },
  seekTo(position: number) {
    TrackPlayer.seekTo(position).catch((e) => reportWarning("TrackPlayer", e, "seekTo failed"));
  },
  replace(uri: string) {
    TrackPlayer.load({ url: uri, title: "Unknown" } as never).catch((e) =>
      reportWarning("TrackPlayer", e, "replace failed")
    );
  },
  remove() {
    TrackPlayer.stop().catch(() => {});
    TrackPlayer.reset().catch(() => {});
  },
  setActiveForLockScreen(
    _active: boolean,
    _meta: { title?: string; artist?: string; artwork?: string } | null
  ) {
    // TP manages lock-screen via track metadata — no-op for compatibility
  },
  clearLockScreenControls() {
    // TP clears on reset — no-op
  },
};

export function getPlayer() {
  return playerAdapter;
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------
export function setCrossfadeEnabled(enabled: boolean): void {
  crossfadeEnabled = enabled;
  if (enabled) logger.log("[TrackPlayer] Crossfade requested — TP native crossfade not yet enabled; will emulate via gapless queue in future");
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
  // TP is gapless by default when using queue; keep flag for store logic
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
export async function applyAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: playTogetherEnabled ? "mixWithOthers" : "doNotMix",
    });
  } catch (e) {
    reportWarning("TrackPlayer", e, "Failed to set audio mode");
  }
  // Also hint TP iOS category — best-effort
  try {
    await TrackPlayer.updateOptions({
      iosCategory: playTogetherEnabled ? "playback" : "playback",
      iosCategoryMode: playTogetherEnabled ? "mixWithOthers" : "default",
    } as never);
  } catch {}
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
export async function setupPlayer(): Promise<void> {
  if (_isSetup) {
    try {
      const st = await TrackPlayer.getPlaybackState();
      if (st.state !== State.None) return;
    } catch {}
  }
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    _isSetup = true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already") || msg.includes("initialized")) {
      _isSetup = true;
    } else {
      logger.warn("TrackPlayer setup failed:", e);
      throw e;
    }
  }

  try {
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      progressUpdateEventInterval: 0.25,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    } as never);
  } catch (e) {
    reportWarning("TrackPlayer", e, "updateOptions failed");
  }

  subscribeToPlayerEvents();
  await applyAudioMode();

  // Restore persisted volume/rate
  try {
    await TrackPlayer.setVolume(currentVolume);
    await TrackPlayer.setRate(currentRate);
  } catch {}
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------
export async function loadTrack(track: Song): Promise<void> {
  const startTs = Date.now();
  try {
    await TrackPlayer.reset();
    const tpTrack = await songToTrack(track);
    await TrackPlayer.add(tpTrack as never);
    _currentTrackUri = track.uri;
    _duration = track.duration || 0;
    _isLoaded = true;
  } catch (e) {
    useTelemetryStore.getState().recordError("loadTrack", String(e));
    throw e;
  }
  const elapsed = Date.now() - startTs;
  useTelemetryStore.getState().recordPlay(track.id, elapsed);

  try {
    const speedState = (await import("@/store/playback-speed-store")).usePlaybackSpeedStore.getState();
    await TrackPlayer.setRate(speedState.speed);
    currentRate = speedState.speed;
    pitchCorrection = speedState.pitchCorrection;
  } catch {}
  try {
    await TrackPlayer.setVolume(currentVolume);
  } catch {}
  try {
    await TrackPlayer.play();
    _playing = true;
  } catch (e) {
    reportWarning("TrackPlayer", e, "play after load failed");
  }
}

export async function preloadNextTrack(track: Song): Promise<void> {
  try {
    const q = await TrackPlayer.getQueue();
    const exists = (q as Array<{ url?: string }>).some((t) => t.url === track.uri);
    if (!exists) {
      const tpTrack = await songToTrack(track);
      await TrackPlayer.add(tpTrack as never);
      // If we added beyond gapless window, remove extra tail to keep queue size 2
      const after = await TrackPlayer.getQueue();
      if (after.length > 2) {
        // keep only [current, next]
        for (let i = after.length - 1; i >= 2; i--) await TrackPlayer.remove(i).catch(() => {});
      }
    }
  } catch {}
  // Gapless is native; no extra scheduling needed
}

export async function pausePlayback(): Promise<void> {
  await TrackPlayer.pause();
  _playing = false;
}

export async function resumePlayback(): Promise<void> {
  await TrackPlayer.play();
  _playing = true;
}

export async function seekTo(position: number): Promise<void> {
  await TrackPlayer.seekTo(position);
  _currentTime = position;
}

export function clearLockScreenControls(): void {
  // TP owns notification — reset clears it when stopped
}

export function destroyPlayer(): void {
  try {
    stateSub?.remove();
    progressSub?.remove();
    trackChangedSub?.remove();
  } catch {}
  stateSub = progressSub = trackChangedSub = null;
  TrackPlayer.reset().catch(() => {});
  _isSetup = false;
  _playing = false;
  _isLoaded = false;
}

export async function ensurePlayerAlive(): Promise<boolean> {
  useTelemetryStore.getState().recordEnsureAlive();
  try {
    const state = await TrackPlayer.getPlaybackState();
    return state.state !== State.None;
  } catch {
    try {
      await setupPlayer();
      return true;
    } catch {
      return false;
    }
  }
}

// Keep volume/rate shims for audio-engine consumers
export function setGaplessNextTrackCompat() {}
