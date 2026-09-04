/**
 * Compatibility shim — legacy audio-engine API now backed by react-native-track-player.
 * Keeps equalizer/balance/replay-gain stores from crashing while we run on the
 * native Media3/AVFoundation player. DSP features are stubbed with warning (TP
 * does not expose parametric EQ; add native equalizer later if needed).
 */
import TrackPlayer, { Event, State } from "react-native-track-player";
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
    // track-player's setupPlayer already called by PlayerProvider
    try {
      const { setupPlayer } = await import("@/services/track-player");
      await setupPlayer();
    } catch {}
  }
  async ensureAlive(): Promise<boolean> {
    try {
      const s = await TrackPlayer.getPlaybackState();
      return s.state !== State.None;
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
    const sub1 = TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
      cb({
        playing: state === State.Playing,
        currentTime: getPlayer().currentTime,
        duration: getPlayer().duration,
        isBuffering: state === State.Buffering,
        isLoaded: state !== State.None,
        currentTrackUri: getPlayer().currentTrackUri,
      });
    });
    const sub2 = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
      cb({
        playing: getPlayer().playing,
        currentTime: position,
        duration,
        isBuffering: false,
        isLoaded: true,
        currentTrackUri: getPlayer().currentTrackUri,
      });
    });
    return () => { try{ sub1.remove(); }catch{} try{ sub2.remove(); }catch{} };
  }
  onTrackEnded(cb: () => void): () => void {
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => cb());
    const sub2 = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
      // when last track ends, TP emits queue ended — also cover single-track end
    });
    return () => { try{ sub.remove(); }catch{} try{ sub2.remove(); }catch{} };
  }
  onDecodeError(cb: (uri: string) => void): () => void {
    const sub = TrackPlayer.addEventListener(Event.PlaybackError, (e: unknown) => {
      const uri = (e as { track?: { url?: string } })?.track?.url ?? "";
      cb(uri);
    });
    return () => { try{ sub.remove(); }catch{} };
  }

  // ---- legacy graph controls (no-ops, keep store alive) ----
  private warnOnceLogged = new Set<string>();
  private warnOnce(key: string, msg: string) {
    if (this.warnOnceLogged.has(key)) return;
    this.warnOnceLogged.add(key);
    logger.warn(`[AudioEngineCompat] ${msg}`);
  }
  buildProcessingChain() {}
  setVolume(v: number) { this._volume = v; TrackPlayer.setVolume(v).catch(()=>{}); }
  setSpeed(s: number) { this._speed = s; TrackPlayer.setRate(s).catch((e)=>reportWarning("AudioEngine", e)); }
  setPitchCorrection(_v: boolean) { this.warnOnce("pitch","Pitch correction not supported on TrackPlayer — stores rate only"); }
  setEqEnabled(_v: boolean) { this.warnOnce("eq","EQ stubbed — TrackPlayer has no parametric EQ yet"); }
  setBandGain(_i: number, _g: number) {}
  setBandGains(_b: unknown[]) {}
  setBassBoost(_v: number) {}
  setBalance(_v: number) {}
  setLoudnessEnabled(_v: boolean) {}
  setLoudnessLevel(_v: number) {}
  applyReplayGainSettings(_o: unknown) { this.warnOnce("rg","ReplayGain stubbed on TrackPlayer"); }
  setCurrentTrackReplayGain(_t: unknown) {}
  setGaplessEnabled(_v: boolean) {}
  isGaplessEnabled() { return false; }
  setGaplessNextTrack(_u: string | null, _r?: unknown) {}
  preloadTrack(_u: string, _d?: number) {}
  getBufferPoolStats() { return { size: 0, maxCount: 0, hitRate: 0, avgDecodeMs: 0, totalBytes: 0 }; }
  async loadTrack(uri: string) { this._currentUri = uri; const { loadTrack } = await import("@/services/track-player"); await loadTrack({ id: uri, uri, title: uri.split("/").pop()||uri, artist: "", album: "", albumId: "", duration: 0, fileSize: 0, dateAdded: 0, artwork: null, genre: null, bitrate: null, sampleRate: null, channels: null, codec: null } as never); }
  play() { TrackPlayer.play().catch(()=>{}); }
  pause() { TrackPlayer.pause().catch(()=>{}); }
  stop() { TrackPlayer.stop().catch(()=>{}); }
  seekTo(p: number) { TrackPlayer.seekTo(p).catch(()=>{}); }
  isCrossfading() { return false; }
  async startCrossfade(_u: string, _d: number) { this.warnOnce("xfade","Crossfade stubbed — will be re-implemented with queue"); }
  isDucked() { return false; }
}

export const audioEngine = new AudioEngineCompat();
