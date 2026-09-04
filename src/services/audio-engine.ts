/**
 * Compatibility shim — backed by obsidian-media-player via track-player adapter.
 * Keeps equalizer/balance/replay-gain stores from crashing while we run on the
 * native Media3/AVFoundation player. DSP features are stubbed with warning (obsidian
 * does not expose parametric EQ; add native equalizer later if needed).
 */
import { getPlayer } from "@/services/track-player";
import { reportWarning } from "@/utils/error-handler";
import { logger } from "@/utils/logger";

interface AudioEngineState {
  playing: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isLoaded: boolean;
  currentTrackUri: string | null;
}
type StateChangeCallback = (state: AudioEngineState) => void;

class AudioEngineCompat {
  private _volume = 1;
  private _speed = 1;
  private _currentUri: string | null = null;

  async init(): Promise<void> {
    try {
      const { setupPlayer } = await import("@/services/track-player");
      await setupPlayer();
    } catch {}
  }

  async ensureAlive(): Promise<boolean> {
    try {
      const s = await getPlayer();
      return !!(s && s.playing);
    } catch {
      return false;
    }
  }

  destroy() {
    // handled by track-player destroyPlayer
  }
  getState(): AudioEngineState {
    const p = getPlayer();
    return {
      playing: p.playing,
      currentTime: p.currentTime,
      duration: p.duration,
      isBuffering: p.isBuffering,
      isLoaded: p.isLoaded,
      currentTrackUri: p.currentTrackUri ?? this._currentUri,
    };
  }
  getCurrentUri() { return getPlayer().currentTrackUri ?? this._currentUri; }
  getDuration() { return getPlayer().duration; }
  getSpeed() { return this._speed; }
  getPlaybackState() { return getPlayer().playing ? 1 : 0; }
  isTransitioningState() { return false; }
  onPlaybackStateChange(cb: (next: number, prev: number | null, trigger: string) => void) {
    // stub
    return () => {};
  }
  onStateChange(cb: StateChangeCallback): () => void {
    const sub = getPlayer().currentTime; // placeholder - use use-track-player-sync instead
    return () => {};
  }
  onTrackEnded(cb: () => void): () => void {
    // stub - use use-track-player-sync for track end handling
    return () => {};
  }
  onDecodeError(cb: (uri: string) => void): () => void {
    // stub - use use-track-player-sync for decode error handling
    return () => {};
  }

  // ---- legacy graph controls (no-ops, keep store alive) ----
  private warnOnceLogged = new Set<string>();
  private warnOnce(key: string, msg: string) {
    if (this.warnOnceLogged.has(key)) return;
    this.warnOnceLogged.add(key);
    logger.warn(`[AudioEngineCompat] ${msg}`);
  }
  buildProcessingChain() {}
  setVolume(v: number) { this._volume = v; getPlayer().volume = v; }
  setSpeed(s: number) { this._speed = s; getPlayer().playbackRate = s; }
  setPitchCorrection(_v: boolean) { this.warnOnce("pitch","Pitch correction not supported on obsidian — stores rate only"); }
  setEqEnabled(_v: boolean) { this.warnOnce("eq","EQ stubbed — obsidian has no parametric EQ yet"); }
  setBandGain(_i: number, _g: number) {}
  setBandGains(_b: unknown[]) {}
  setBassBoost(_v: number) {}
  setBalance(_v: number) {}
  setLoudnessEnabled(_v: boolean) {}
  setLoudnessLevel(_v: number) {}
  applyReplayGainSettings(_o: unknown) { this.warnOnce("rg","ReplayGain stubbed on obsidian"); }
  setCurrentTrackReplayGain(_t: unknown) {}
  setGaplessEnabled(_v: boolean) {}
  isGaplessEnabled() { return false; }
  setGaplessNextTrack(_u: string | null, _r?: unknown) {}
  preloadTrack(_u: string, _d?: number) {}
  getBufferPoolStats() { return { size: 0, maxCount: 0, hitRate: 0, avgDecodeMs: 0, totalBytes: 0 }; }
  async loadTrack(uri: string) { this._currentUri = uri; const { loadTrack } = await import("@/services/track-player"); await loadTrack({ id: uri, uri, title: uri.split("/").pop()||uri, artist: "", album: "", albumId: "", duration: 0, fileSize: 0, dateAdded: 0, artwork: null, genre: null, bitrate: null, sampleRate: null, channels: null, codec: null } as never); }
  play() { getPlayer().play().catch(()=>{}); }
  pause() { getPlayer().pause().catch(()=>{}); }
  stop() { getPlayer().clearLockScreenControls().catch(()=>{}); }
  seekTo(p: number) { getPlayer().seekTo(p).catch(()=>{}); }
  isCrossfading() { return false; }
  async startCrossfade(_u: string, _d: number) { this.warnOnce("xfade","Crossfade stubbed — will be re-implemented with queue"); }
  isDucked() { return false; }
}

export const audioEngine = new AudioEngineCompat();