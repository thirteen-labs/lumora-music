import type { Song } from "@/types/media";
import { reportWarning } from "@/utils/error-handler";
import { logger } from "@/utils/logger";
import { useTelemetryStore } from "@/store/telemetry-store";
import { storage } from "@/services/mmkv";

let _playing = false;
let _currentTime = 0;
let _duration = 0;
let _isLoaded = false;
let _currentTrackUri: string | null = null;
let _isSetup = false;
let _isBuffering = false; // track buffering state

let stateSub: any = null;
let progressSub: any = null;
let trackChangedSub: any = null;
let queueChangedSub: any = null;

function getObsidianMusicPlayer() {
  try {
    return (typeof window !== "undefined"
      ? (globalThis as any).ObsidianMusicPlayer
      : (require("react-native").NativeModules as any).ObsidianMusicPlayer) || null;
  } catch {
    return null;
  }
}

function parseSrc(json: any) {
  try {
    return JSON.parse(json ?? "null");
  } catch {
    return null;
  }
}

function songToMediaSource(song: Song) {
  return {
    id: song.id || crypto.randomUUID(),
    uri: song.uri,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumId: song.albumId || "",
    duration: song.duration || 0,
    fileSize: song.fileSize || 0,
    dateAdded: song.dateAdded || Date.now(),
    artwork: song.artwork ?? null,
    genre: song.genre ?? null,
    bitrate: song.bitrate ?? null,
    sampleRate: song.sampleRate ?? null,
    channels: song.channels ?? null,
    codec: song.codec ?? null,
    replayGainTrackGain: song.replayGainTrackGain,
    replayGainAlbumGain: song.replayGainAlbumGain,
    replayGainTrackPeak: song.replayGainTrackPeak,
    replayGainAlbumPeak: song.replayGainAlbumPeak,
  } as Song;
}

function subscribeToPlayerEvents() {
  try {
    stateSub?.remove();
    progressSub?.remove();
    trackChangedSub?.remove();
    queueChangedSub?.remove();
  } catch {}

  const player = getObsidianMusicPlayer();
  if (!player?.addListener) return;

  stateSub = player.addListener("onState", (e: any) => {
    const state = parseSrc(e?.stateJson);
    if (state?.status) {
      _playing = state.status === "playing";
      _isBuffering = state.status === "buffering";
      _isLoaded = state.status !== "idle" && state.status !== "stopped";
    }
  });

  progressSub = player.addListener("onProgress", (e: any) => {
    _currentTime = e?.position ?? _currentTime;
    _duration = e?.duration ?? _duration;
  });

  trackChangedSub = player.addListener("onTrackChange", () => {
    try {
      const queue = player.getCurrentQueue?.();
      const q = parseSrc(queue);
      let t: any = null;
      let idx = 0;
      if (q?.tracks && q.tracks[idx]) {
        t = q.tracks[idx];
        idx = q.index;
      }
      _currentTrackUri = t?.url ?? null;
      _isLoaded = true;
      _duration = q?.duration ?? _duration;
    } catch {}
  });

  queueChangedSub = player.addListener("onQueueChange", () => {
    // Queue changes handled via store state
  });
}

const playerAdapter: {
  get playing(): boolean;
  get currentTime(): number;
  get duration(): number;
  get isBuffering(): boolean;
  get isLoaded(): boolean;
  get currentTrackUri(): string | null;
  get playbackRate(): number;
  set playbackRate(rate: number);
  get volume(): number;
  set volume(v: number);
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  replace: (uri: string) => void;
  remove: () => Promise<void>;
  setActiveForLockScreen: (_active: boolean, _meta: { title?: string; artist?: string; artwork?: string } | null) => void;
  clearLockScreenControls: () => Promise<void>;
} = {
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
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.getCurrentState) return 1;
      const state = parseSrc(player.getCurrentState());
      return state?.rate || 1;
    } catch {
      return 1;
    }
  },
  set playbackRate(rate: number) {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.setRate) return;
      player.setRate(rate).catch((e) =>
        reportWarning("ObsidianMP", e, "setRate failed")
      );
    } catch {}
  },
  get volume(): number {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.getCurrentState) return 1;
      const state = parseSrc(player.getCurrentState());
      return state?.volume || 1;
    } catch {
      return 1;
    }
  },
  set volume(v: number) {
    const currentVolume = v;
    try {
      storage.set("lumora-volume", v);
    } catch (e) {
      logger.warn("Failed to save volume:", e);
    }
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.setVolume) return;
      player.setVolume(v).catch(() => {});
    } catch {}
  },
  async play(): Promise<void> {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.play) return;
      await player.play();
    } catch {}
    _playing = true;
  },
  async pause(): Promise<void> {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.pause) return;
      await player.pause();
    } catch {}
    _playing = false;
  },
  async seekTo(position: number): Promise<void> {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.seek) return;
      await player.seek(position);
    } catch {}
    _currentTime = position;
  },
  replace(uri: string) {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.setQueue) return;
      const src = songToMediaSource({
        id: "replace-" + Date.now(),
        uri,
        title: "Unknown",
        artist: "",
        album: "",
        albumId: "",
        duration: 0,
        fileSize: 0,
        dateAdded: Date.now(),
        artwork: null,
        genre: null,
        bitrate: null,
        sampleRate: null,
        channels: null,
        codec: null,
        replayGainTrackGain: undefined,
        replayGainAlbumGain: undefined,
        replayGainTrackPeak: undefined,
        replayGainAlbumPeak: undefined,
      });
      player.setQueue(JSON.stringify([src])).catch((e) =>
        reportWarning("ObsidianMP", e, "replace failed")
      );
    } catch {}
    _currentTrackUri = uri;
    _duration = 0;
    _isLoaded = true;
  },
  async remove(): Promise<void> {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.stop) return;
      await player.stop();
      await player.reset();
    } catch {}
    _isSetup = false;
    _playing = false;
    _isLoaded = false;
    _currentTrackUri = null;
  },
  setActiveForLockScreen(
    _active: boolean,
    _meta: { title?: string; artist?: string; artwork?: string } | null
  ) {
    // obsidian-media-player handles lock-screen natively — no-op
  },
  async clearLockScreenControls(): Promise<void> {
    // handled natively
    return Promise.resolve();
  },
};

export function getPlayer() {
  return playerAdapter;
}

export function setCrossfadeEnabled(enabled: boolean): void {
  // obsidian-media-player handles crossfade natively; flag kept for store compat
}

export function setCrossfadeDuration(seconds: number): void {
  // no-op — native crossfade
}

export function isCrossfadeEnabled(): boolean {
  return false;
}

export function getCrossfadeDuration(): number {
  return 5;
}

export function setGaplessEnabled(enabled: boolean): void {
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.setBackgroundEnabled) return;
    player.setBackgroundEnabled(enabled).catch(() => {});
  } catch {}
}

export function isGaplessEnabled(): boolean {
  return true;
}

export function setPlayTogetherEnabled(enabled: boolean): void {
  // handled by native audio session
}

export function isPlayTogetherEnabled(): boolean {
  return false;
}

export async function setupPlayer(): Promise<void> {
  if (_isSetup) {
    try {
      const player = getObsidianMusicPlayer();
      if (!player?.getCurrentState) return;
      const state = parseSrc(player.getCurrentState());
      if (state && state.status !== "idle") return;
    } catch {}
  }
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.setBackgroundEnabled) return;
    player.setBackgroundEnabled(true).catch(() => {});
    _isSetup = true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already") || msg.includes("initialized")) {
      _isSetup = true;
    } else {
      logger.warn("ObsidianMP setup failed:", e);
      throw e;
    }
  }

  try {
    const player = getObsidianMusicPlayer();
    if (!player?.setVolume) return;
    player.setVolume(1).catch(() => {});
    player.setRate(1).catch(() => {});
  } catch {}

  subscribeToPlayerEvents();
}

export async function loadTrack(track: Song): Promise<void> {
  const startTs = Date.now();
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.setQueue) return;
    player.setQueue(JSON.stringify([songToMediaSource(track)])).catch((e) => {
      useTelemetryStore.getState().recordError("loadTrack", String(e));
      throw e;
    });
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
    const { usePlaybackSpeedStore } = await import("@/store/playback-speed-store");
    const speedState = usePlaybackSpeedStore.getState();
    const player = getObsidianMusicPlayer();
    if (!player?.setRate) return;
    player.setRate(speedState.speed).catch(() => {});
  } catch {}

  try {
    const currentVolume = (() => {
      try {
        return storage.getNumber("lumora-volume") ?? 1;
      } catch {
        return 1;
      }
    })();
    const player = getObsidianMusicPlayer();
    if (!player?.setVolume) return;
    player.setVolume(currentVolume).catch(() => {});
  } catch {}

  try {
    const player = getObsidianMusicPlayer();
    if (!player?.play) return;
    await player.play();
    _playing = true;
  } catch (e) {
    reportWarning("ObsidianMP", e, "play after load failed");
  }
}

export async function preloadNextTrack(track: Song): Promise<void> {
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.getCurrentQueue) return;
    const q = player.getCurrentQueue();
    const qParsed = parseSrc(q);
    const exists = (qParsed?.tracks || []).some(
      (t: any) => t?.url === track.uri
    );
    if (!exists) {
      const player = getObsidianMusicPlayer();
      if (!player?.addTracks) return;
      player.addTracks(JSON.stringify([songToMediaSource(track)])).catch(() => {});
      const after = player.getCurrentQueue?.();
      const afterParsed = parseSrc(after);
      if ((afterParsed?.tracks || []).length > 2) {
        for (let i = afterParsed.tracks.length - 1; i >= 2; i--)
          player.removeTrack?.(i.toString()).catch(() => {});
      }
    }
  } catch {}
}

export async function pausePlayback(): Promise<void> {
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.pause) return;
    await player.pause();
  } catch {}
  _playing = false;
}

export async function resumePlayback(): Promise<void> {
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.play) return;
    await player.play();
  } catch {}
  _playing = true;
}

export async function seekTo(position: number): Promise<void> {
  const player = getObsidianMusicPlayer();
  if (!player?.seek) return;
  player.seek(position);
  _currentTime = position;
}

export function clearLockScreenControls(): void {
  // obsidian-media-player handles this natively
}

export function destroyPlayer(): void {
  try {
    stateSub?.remove();
    progressSub?.remove();
    trackChangedSub?.remove();
    queueChangedSub?.remove();
  } catch {}
  stateSub = progressSub = trackChangedSub = queueChangedSub = null;
  _isSetup = false;
  _playing = false;
  _isLoaded = false;
  _currentTrackUri = null;
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.setBackgroundEnabled) return;
    player.setBackgroundEnabled(false).catch(() => {});
  } catch {}
}

export async function ensurePlayerAlive(): Promise<boolean> {
  useTelemetryStore.getState().recordEnsureAlive();
  try {
    const player = getObsidianMusicPlayer();
    if (!player?.getCurrentState) return false;
    const state = parseSrc(player.getCurrentState());
    return state?.status !== "idle";
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