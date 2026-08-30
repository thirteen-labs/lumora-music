import {
  AudioContext,
  AudioBufferSourceNode,
  AudioBuffer,
  GainNode,
  BiquadFilterNode,
  StereoPannerNode,
  AudioManager,
} from 'react-native-audio-api';
import type { AudioEventSubscription } from 'react-native-audio-api';
import type { EqualizerBand } from '@/types/audio';
import { reportWarning } from '@/utils/error-handler';
import { logger } from '@/utils/logger';
import { PlaybackState, PlaybackStateMachine } from '@/services/playback-state-machine';

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const BASS_BOOST_FREQUENCY = 150;
const EQ_Q = 1.4;

const DECODE_TIMEOUT_MS = 15000;
const WATCHDOG_INTERVAL_MS = 30000;

async function decodeWithTimeout(context: AudioContext, uri: string, timeoutMs: number): Promise<AudioBuffer> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Decode timeout after ${timeoutMs}ms: ${uri.slice(0, 80)}`)), timeoutMs);
  });
  try {
    const result = await Promise.race([
      context.decodeAudioData(uri),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Total decoded PCM bytes above which pool refuses new entries. ~100MB. */
const MAX_POOL_TOTAL_BYTES = 100 * 1024 * 1024;
/** Per-buffer threshold – skip pooling for huge lossless files (>30MB decoded). */
const MAX_POOL_ENTRY_BYTES = 30 * 1024 * 1024;

function bufferByteSize(buf: AudioBuffer): number {
  return buf.length * buf.numberOfChannels * 4; // Float32
}

/** Tracks decoded to more than this are treated as "large" (long podcasts,
 *  lossless). For these we avoid holding a second concurrent buffer (preload /
 *  crossfade) and evict the pool, so peak PCM memory stays bounded to roughly
 *  one current track instead of several. */
const LARGE_TRACK_BYTES = 120 * 1024 * 1024;

function estimateDecodedBytes(durationSec: number, channels = 2, sampleRate = 44100): number {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.ceil(durationSec * sampleRate * channels * 4);
}

/** Bounded LRU pool for decoded audio buffers with total-byte cap. */
class AudioBufferPool {
  private cache = new Map<string, AudioBuffer>();
  private maxCount: number;
  private decodeTimes = new Map<string, number>();
  private hits = 0;
  private misses = 0;
  private _totalBytes = 0;

  constructor(maxCount = 6) {
    this.maxCount = maxCount;
  }

  has(uri: string): boolean {
    return this.cache.has(uri);
  }

  get(uri: string): AudioBuffer | undefined {
    const buf = this.cache.get(uri);
    if (buf) {
      this.hits++;
      this.cache.delete(uri);
      this.cache.set(uri, buf);
    } else {
      this.misses++;
    }
    return buf;
  }

  private evictDownTo(limitBytes: number): void {
    const keys = Array.from(this.cache.keys());
    for (const k of keys) {
      if (this._totalBytes <= limitBytes) break;
      const buf = this.cache.get(k)!;
      this._totalBytes -= bufferByteSize(buf);
      this.cache.delete(k);
      this.decodeTimes.delete(k);
    }
  }

  /**
   * Insert a buffer. Returns false if the buffer was too large to pool or
   * total pool memory exceeded the cap.
   */
  set(uri: string, buffer: AudioBuffer, decodeTimeMs: number): boolean {
    const bytes = bufferByteSize(buffer);
    if (bytes > MAX_POOL_ENTRY_BYTES) return false;

    // Remove existing entry for this URI first
    if (this.cache.has(uri)) {
      const old = this.cache.get(uri)!;
      this._totalBytes -= bufferByteSize(old);
      this.cache.delete(uri);
      this.decodeTimes.delete(uri);
    }

    // Evict until we have room for the new buffer
    this.evictDownTo(MAX_POOL_TOTAL_BYTES - bytes);

    // Also respect max count
    while (this.cache.size >= this.maxCount) {
      const oldest = this.cache.keys().next().value;
      if (!oldest) break;
      const oldBuf = this.cache.get(oldest)!;
      this._totalBytes -= bufferByteSize(oldBuf);
      this.cache.delete(oldest);
      this.decodeTimes.delete(oldest);
    }

    this.cache.set(uri, buffer);
    this._totalBytes += bytes;
    this.decodeTimes.set(uri, decodeTimeMs);
    return true;
  }

  remove(uri: string): void {
    const buf = this.cache.get(uri);
    if (buf) {
      this._totalBytes -= bufferByteSize(buf);
      this.cache.delete(uri);
      this.decodeTimes.delete(uri);
    }
  }

  /** Estimated total PCM memory of all pooled buffers. */
  get totalBytes(): number {
    return this._totalBytes;
  }

  getStats(): { size: number; maxCount: number; hitRate: number; avgDecodeMs: number; totalBytes: number } {
    const total = this.hits + this.misses || 1;
    const times = Array.from(this.decodeTimes.values());
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { size: this.cache.size, maxCount: this.maxCount, hitRate: Math.round((this.hits / total) * 100), avgDecodeMs: Math.round(avg), totalBytes: this._totalBytes };
  }

  clear(): void {
    this.cache.clear();
    this.decodeTimes.clear();
    this.hits = 0;
    this.misses = 0;
    this._totalBytes = 0;
  }
}

interface AudioEngineState {
  playing: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isLoaded: boolean;
  currentTrackUri: string | null;
}

type StateChangeCallback = (state: AudioEngineState) => void;

class AudioEngine {
  private context: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private crossfadeSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private crossfadeBuffer: AudioBuffer | null = null;

  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private replayGainNode: GainNode | null = null;
  private balancePanner: StereoPannerNode | null = null;
  private mainGain: GainNode | null = null;

  private _playing = false;
  private _paused = false;
  private _currentTime = 0;
  private _duration = 0;
  private _speed = 1.0;
  private _pitchCorrection = false;
  private _volume = 1.0;
  private _startOffset = 0;
  private _startContextTime = 0;
  private _seeking = false;
  private _eqEnabled = false;
  private _bandGains: number[] = EQ_FREQUENCIES.map(() => 0);
  private _bassBoostValue = 0;
  private _balanceValue = 0;
  private _rgEnabled = false;
  private _rgPreampDb = 0;
  private _rgUseAlbum = false;
  private _rgTrackGain: number | null = null;
  private _rgAlbumGain: number | null = null;
  private _rgTrackPeak: number | null = null;
  private _rgAlbumPeak: number | null = null;
  private _currentTrackUri: string | null = null;
  private _crossfading = false;
  private _crossfadeInterval: ReturnType<typeof setInterval> | null = null;
  private loudnessFilters: BiquadFilterNode[] = [];
  private _loudnessEnabled = false;
  private _loudnessLevel = 6;

  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private trackEndedCallbacks: Set<() => void> = new Set();
  private decodeErrorCallbacks: Set<(uri: string) => void> = new Set();
  private positionInterval: ReturnType<typeof setInterval> | null = null;
  private loadingLock = false;

  /** Monotonic operation ids. Each load/preload/transition captures the current
   *  id and discards its result if a newer operation has since started, so a
   *  slow/stale decode can never overwrite a newer track's buffer. */
  private loadOpId = 0;
  private preloadOpId = 0;
  private gaplessOpId = 0;
  private crossfadeOpId = 0;
  private interruptionSubscription: AudioEventSubscription | null = null;
  private duckSubscription: AudioEventSubscription | null = null;
  private _watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private readonly stateMachine = new PlaybackStateMachine();
  private _isDucked = false;
  private _preDuckVolume = 1.0;
  private _duckFactor = 0.25;

  /** Bounded buffer pool for decoded audio */
  private bufferPool = new AudioBufferPool(6);

  /** Preloaded buffer awaiting activation */
  private preloadedUri: string | null = null;
  private preloadedBuffer: AudioBuffer | null = null;

  /** Gapless playback support */
  private _gaplessEnabled = false;
  private _gaplessNextUri: string | null = null;
  private _gaplessNextRg: {
    trackGain?: number | null;
    albumGain?: number | null;
    trackPeak?: number | null;
    albumPeak?: number | null;
  } | null = null;
  private _gaplessCheckInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    if (this.context) {
      if (this.context.state === 'closed') {
        logger.warn('[AudioEngine] Context was closed, creating new one');
        this.context = null;
      } else {
        try {
          if (this.context.state !== 'running') {
            await this.context.resume();
          }
        } catch {
          this.destroy();
        }
        if (this.context) return;
      }
    }
    this.context = new AudioContext();
    this.buildProcessingChain();
    this.startWatchdog();

    try {
      AudioManager.setAudioSessionActivity(true);
      AudioManager.observeAudioInterruptions(true);
      this.interruptionSubscription = AudioManager.addSystemEventListener('interruption', (event) => {
        if (event.type === 'began') {
          if (this._isDucked) {
            try {
              this._restoreFromDuck(false);
            } catch {}
          }
          if (this._playing) {
            this.stateMachine.transition(PlaybackState.Interrupted, 'interruption:began');
            this.context?.suspend().catch(() => {});
            this._paused = true;
            this._playing = false;
            this.stopPositionTracking();
            this.emitState();
          }
        } else if (event.type === 'ended') {
          if (this._isDucked) {
            this._restoreFromDuck(true);
          }
          if (event.shouldResume) {
            if (this._paused && !this._playing) {
              this.context?.resume().catch(() => {});
              this._playing = true;
              this._paused = false;
              this.stateMachine.transition(PlaybackState.Playing, 'interruption:resume');
              this.startPositionTracking();
              this.emitState();
            }
          } else if (this.stateMachine.is(PlaybackState.Interrupted)) {
            this.stateMachine.transition(PlaybackState.Paused, 'interruption:ended-no-resume');
          }
        }
      });
      this.duckSubscription = AudioManager.addSystemEventListener('duck', () => {
        this._applyDuck();
      });
    } catch (e) {
      reportWarning('AudioEngine', e);
    }
  }

  private buildProcessingChain(): void {
    if (!this.context) return;

    try {
      this.eqFilters = EQ_FREQUENCIES.map((freq) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = EQ_Q;
        filter.gain.value = 0;
        return filter;
      });

      this.bassBoostFilter = this.context.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.value = BASS_BOOST_FREQUENCY;
      this.bassBoostFilter.gain.value = 0;

      this.replayGainNode = this.context.createGain();
      this.replayGainNode.gain.value = 1.0;

      this.balancePanner = this.context.createStereoPanner();
      this.balancePanner.pan.value = 0;

      this.mainGain = this.context.createGain();
      this.mainGain.gain.value = 1.0;

      this.loudnessFilters = [
        { freq: 100, type: 'lowshelf' as const, q: 0.7 },
        { freq: 3000, type: 'peaking' as const, q: 1.0 },
        { freq: 10000, type: 'highshelf' as const, q: 0.7 },
      ].map(({ freq, type, q }) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
        filter.Q.value = q;
        filter.gain.value = 0;
        return filter;
      });

      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }
      const lastEq = this.eqFilters[this.eqFilters.length - 1];
      lastEq.connect(this.bassBoostFilter);
      this.bassBoostFilter.connect(this.replayGainNode);
      this.replayGainNode.connect(this.loudnessFilters[0]);

      if (this.loudnessFilters.length > 0) {
        let lastLoudness: BiquadFilterNode | null = null;
        for (const filter of this.loudnessFilters) {
          if (lastLoudness) {
            lastLoudness.connect(filter);
          }
          lastLoudness = filter;
        }
        if (lastLoudness) {
          lastLoudness.connect(this.balancePanner);
        }
      } else {
        this.replayGainNode.connect(this.balancePanner);
      }

      this.balancePanner.connect(this.mainGain);
      this.mainGain.connect(this.context.destination);

      /* Re-apply cached audio-effect settings so EQ / bass boost / balance /
         replay gain survive (re)building the graph (e.g. after a track load
         or OS-triggered context reset). */
      const now = this.context.currentTime;
      this.eqFilters.forEach((filter, i) => {
        const g = this._eqEnabled ? (this._bandGains[i] ?? 0) : 0;
        filter.gain.setValueAtTime(g, now);
      });
      if (this.bassBoostFilter) {
        this.bassBoostFilter.gain.setValueAtTime(this._bassBoostValue, now);
      }
      if (this.balancePanner) {
        this.balancePanner.pan.setValueAtTime(this._balanceValue / 10, now);
      }
       if (this.replayGainNode) {
         this._applyReplayGain();
       }
    } catch (e) {
      logger.warn('[AudioEngine] Failed to build processing chain:', e);
    }
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Subscribe to a native "track ended" signal. Fired directly from the
   * AudioBufferSourceNode's onEnded callback (dispatched from the native audio
   * thread), so it keeps working while the app is backgrounded — unlike the
   * JS setInterval position polling. Used to drive auto-advance to the next
   * track even when the UI/app is not in the foreground.
   */
  onTrackEnded(callback: () => void): () => void {
    this.trackEndedCallbacks.add(callback);
    return () => {
      this.trackEndedCallbacks.delete(callback);
    };
  }

  private notifyTrackEnded(): void {
    this.trackEndedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        reportWarning('AudioEngine', e, 'trackEnded callback failed');
      }
    });
  }

  /**
   * Subscribe to a native "decode error" signal. Fired when a track cannot be
   * decoded (corrupt/unsupported/missing). Lets the controller skip to the next
   * track or surface an error instead of leaving playback stuck on a dead buffer.
   */
  onDecodeError(callback: (uri: string) => void): () => void {
    this.decodeErrorCallbacks.add(callback);
    return () => {
      this.decodeErrorCallbacks.delete(callback);
    };
  }

  private notifyDecodeError(uri: string): void {
    this.decodeErrorCallbacks.forEach((cb) => {
      try {
        cb(uri);
      } catch (e) {
        reportWarning('AudioEngine', e, 'decodeError callback failed');
      }
    });
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    let consecutiveFailures = 0;
    this._watchdogTimer = setInterval(() => {
      if (this.context && this._playing && !this._paused) {
        try {
          if (this.context.state === 'closed') {
            logger.warn('[AudioEngine] Watchdog: context was closed, triggering recovery');
            this.ensureAlive().catch((e) => reportWarning('AudioEngine', e, 'Watchdog: ensureAlive failed'));
            return;
          }
          if (this.context.state !== 'running') {
            logger.warn('[AudioEngine] Watchdog: context not running, attempting resume');
            this.context.resume().catch((e) => reportWarning('AudioEngine', e, 'Watchdog: context resume failed'));
          }
          consecutiveFailures = 0;
        } catch (e) {
          consecutiveFailures++;
          logger.warn('[AudioEngine] Watchdog health check failed:', e);
          if (consecutiveFailures >= 3) {
            logger.warn('[AudioEngine] Watchdog: too many failures, triggering full recovery');
            this.ensureAlive().catch((e) => reportWarning('AudioEngine', e, 'Watchdog: recovery ensureAlive failed'));
            consecutiveFailures = 0;
          }
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog(): void {
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }
  }

  private emitState(): void {
    const state: AudioEngineState = {
      playing: this._playing,
      currentTime: this._currentTime,
      duration: this._duration,
      isBuffering: false,
      isLoaded: this.currentBuffer !== null,
      currentTrackUri: this._currentTrackUri,
    };
    this.stateCallbacks.forEach((cb) => cb(state));
  }

  private startPositionTracking(): void {
    this.stopPositionTracking();
    this.positionInterval = setInterval(() => {
      if (this._playing && !this._paused && this.context) {
        this._currentTime =
          (this.context.currentTime - this._startContextTime) * this._speed +
          this._startOffset;
        if (this._currentTime >= this._duration && this._duration > 0) {
          this._currentTime = this._duration;
        }
        this.emitState();
      }
    }, 250);
  }

  private stopPositionTracking(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private getPreciseCurrentTime(): number {
    if (!this.context || !this._playing || this._paused || this._duration <= 0) return this._currentTime;
    return (this.context.currentTime - this._startContextTime) * this._speed + this._startOffset;
  }

  async loadTrack(uri: string): Promise<void> {
    if (this.loadingLock) {
      const lockAcquired = await new Promise<boolean>((resolve) => {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 50;
          if (!this.loadingLock || elapsed >= 10000) {
            clearInterval(interval);
            resolve(!this.loadingLock);
          }
        }, 50);
      });
      if (!lockAcquired) {
        logger.warn('[AudioEngine] loadTrack lock timeout, proceeding anyway');
        this.loadingLock = false;
      }
    }
    this.loadingLock = true;
    const myOp = ++this.loadOpId;
    this.stateMachine.transition(PlaybackState.Loading, 'loadTrack');

    try {
      await this.init();
      if (!this.context) return;
      if (myOp !== this.loadOpId) return;

      this.stopCurrentSource();
      this.cancelCrossfade();

      const pooled = this.bufferPool.get(uri);
      if (pooled) {
        this.currentBuffer = pooled;
        this._currentTrackUri = uri;
        this._duration = pooled.duration;
        this._currentTime = 0;
        this._startOffset = 0;
        this.stateMachine.transition(PlaybackState.Ready, 'loadTrack:pooled');
        this.emitState();
        return;
      }

      if (this.preloadedUri === uri && this.preloadedBuffer) {
        this.currentBuffer = this.preloadedBuffer;
        this.preloadedBuffer = null;
        this.preloadedUri = null;
        this._currentTrackUri = uri;
        this._duration = this.currentBuffer.duration;
        this._currentTime = 0;
        this._startOffset = 0;
        this.stateMachine.transition(PlaybackState.Ready, 'loadTrack:preloaded');
        this.emitState();
        return;
      }

      this._currentTrackUri = uri;

      const startTs = Date.now();
      let buffer: AudioBuffer;
      try {
        buffer = await decodeWithTimeout(this.context, uri, DECODE_TIMEOUT_MS);
      } catch (decodeError) {
        logger.warn('[AudioEngine] Decode failed for', uri.slice(0, 80), ':', decodeError);
        this._currentTrackUri = null;
        this.currentBuffer = null;
        this._duration = 0;
        this.stateMachine.transition(PlaybackState.Error, 'loadTrack:decodeError');
        this.emitState();
        this.notifyDecodeError(uri);
        return;
      }
      /* Stale-decode guard: a newer load started while we were decoding.
         Drop the result so it cannot clobber the current track. */
      if (myOp !== this.loadOpId) return;
      this.bufferPool.set(uri, buffer, Date.now() - startTs);
      /* Large tracks can't be pooled; clear the rest of the pool so the only
         significant PCM retained is this one current buffer. */
      if (bufferByteSize(buffer) > MAX_POOL_ENTRY_BYTES) {
        this.bufferPool.clear();
      }
      this.currentBuffer = buffer;
      this._duration = buffer.duration;
      this._currentTime = 0;
      this._startOffset = 0;
      this.stateMachine.transition(PlaybackState.Ready, 'loadTrack:ready');
      this.emitState();
    } catch (e) {
      logger.warn('[AudioEngine] loadTrack error:', e);
      this.currentBuffer = null;
      this._duration = 0;
      this._currentTrackUri = null;
      this.stateMachine.transition(PlaybackState.Error, 'loadTrack:error');
      this.emitState();
    } finally {
      this.loadingLock = false;
    }
  }

  /** Pre-decode a track into the buffer pool so a subsequent loadTrack is instant. */
  async preloadTrack(uri: string, durationSec = 0): Promise<void> {
    if (this._crossfading) return;
    if (this.loadingLock) return;
    if (this.bufferPool.has(uri)) return;
    if (this.preloadedUri === uri && this.preloadedBuffer) return;
    if (durationSec > 0 && estimateDecodedBytes(durationSec) > LARGE_TRACK_BYTES) return;
    if (!this.context) await this.init();
    if (!this.context) return;
    const myOp = ++this.preloadOpId;
    try {
      const startTs = Date.now();
      const buffer = await decodeWithTimeout(this.context!, uri, DECODE_TIMEOUT_MS);
      if (myOp !== this.preloadOpId) return;
      const elapsed = Date.now() - startTs;
      this.bufferPool.set(uri, buffer, elapsed);
      this.preloadedUri = uri;
      this.preloadedBuffer = buffer;
    } catch (e) {
      logger.warn('[AudioEngine] Preload failed for', uri.slice(0, 80), e);
    }
  }

  getBufferPoolStats(): ReturnType<AudioBufferPool['getStats']> {
    return this.bufferPool.getStats();
  }

  private createSource(
    buffer: AudioBuffer,
    pitchCorrection: boolean
  ): AudioBufferSourceNode | null {
    if (!this.context || !this.eqFilters[0]) return null;
    try {
      const source = this.context.createBufferSource({ pitchCorrection });
      source.buffer = buffer;
      source.playbackRate.value = this._speed;
      source.connect(this.eqFilters[0]);
      return source;
    } catch (e) {
      logger.warn('[AudioEngine] Failed to create source:', e);
      return null;
    }
  }

  play(): void {
    if (!this.context || !this.currentBuffer) return;

    if (this._paused && this.currentSource) {
      this.context.resume().catch((e) => reportWarning('AudioEngine', e, 'Play: context resume failed'));
      this._startContextTime = this.context.currentTime;
      this._startOffset = this._currentTime;
      this._paused = false;
      this._playing = true;
      this.stateMachine.transition(PlaybackState.Playing, 'play:resume');
      this.startPositionTracking();
      this.emitState();
      return;
    }

    this.cancelCrossfade();
    this.stopCurrentSource();
    const source = this.createSource(this.currentBuffer, this._pitchCorrection);
    if (!source) return;
    this.currentSource = source;
    this._startContextTime = this.context.currentTime;
    this._startOffset = this._currentTime;
    this.currentSource.onEnded = () => {
      if (this._playing && !this._seeking) {
        this._playing = false;
        this._currentTime = this._duration;
        this.stopPositionTracking();
        this.stateMachine.transition(PlaybackState.Paused, 'onEnded');
        this.emitState();
        this.notifyTrackEnded();
      }
    };
    this.currentSource.start(0, this._currentTime);
    this._playing = true;
    this._paused = false;
    this.stateMachine.transition(PlaybackState.Playing, 'play:start');
    this.startPositionTracking();
    this.emitState();
  }

  pause(): void {
    if (!this._playing && !this._paused) return;
    this._seeking = false;
    if (this.context) {
      try {
        this.context.suspend();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
    }
    this._paused = true;
    this._playing = false;
    this.stateMachine.transition(PlaybackState.Paused, 'pause');
    this.stopPositionTracking();
    this.emitState();
  }

  stop(): void {
    this.stopCurrentSource();
    this._playing = false;
    this._paused = false;
    this._currentTime = 0;
    this.currentBuffer = null;
    this.stateMachine.transition(PlaybackState.Stopped, 'stop');
    this.stopPositionTracking();
    this.emitState();
  }

  private stopCurrentSource(): void {
    if (this.currentSource) {
      const src = this.currentSource;
      this.currentSource = null;
      try {
        src.onEnded = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped or disconnected source errors
      }
    }
    this.cancelCrossfade();
  }

  private cancelCrossfade(): void {
    this._crossfading = false;
    if (this._crossfadeInterval) {
      clearInterval(this._crossfadeInterval);
      this._crossfadeInterval = null;
    }
    if (this.crossfadeSource) {
      const src = this.crossfadeSource;
      this.crossfadeSource = null;
      try {
        src.onEnded = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore crossfade source cleanup errors
      }
    }
    this.crossfadeBuffer = null;
  }

  seekTo(position: number): void {
    if (!this.context) return;
    this._seeking = true;
    const wasPlaying = this._playing || this._paused;
    this._currentTime = Math.max(0, Math.min(position, this._duration));
    this._startOffset = this._currentTime;
    this._startContextTime = this.context.currentTime;

    if (wasPlaying && this.currentBuffer) {
      this.stopCurrentSource();
      const source = this.createSource(this.currentBuffer, this._pitchCorrection);
      if (source) {
        this.currentSource = source;
        this.currentSource.onEnded = () => {
          if (this._playing) {
            this._playing = false;
            this._currentTime = this._duration;
            this.stopPositionTracking();
            this.emitState();
            this.notifyTrackEnded();
          }
        };
        this.currentSource.start(0, this._currentTime);
        this._playing = true;
        this._paused = false;
        this.startPositionTracking();
      }
    }
    this._seeking = false;
    this.emitState();
  }

  setVolume(volume: number): void {
    this._volume = volume;
    if (!this.mainGain || !this.context) return;
    const now = this.context.currentTime;
    if (this._isDucked) {
      this._preDuckVolume = volume;
      const duckedGain = Math.max(0, volume * this._duckFactor);
      try {
        (this.mainGain.gain as any).cancelScheduledValues(now);
        this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
        this.mainGain.gain.linearRampToValueAtTime(duckedGain, now + 0.15);
      } catch {
        this.mainGain.gain.setValueAtTime(duckedGain, now);
      }
      return;
    }
    try {
      (this.mainGain.gain as any).cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
      this.mainGain.gain.linearRampToValueAtTime(volume, now + 0.05);
    } catch {
      this.mainGain.gain.setValueAtTime(volume, now);
    }
  }

  isDucked(): boolean {
    return this._isDucked;
  }

  private _applyDuck(): void {
    if (this._isDucked || !this._playing || !this.mainGain || !this.context) return;
    this._isDucked = true;
    this._preDuckVolume = this._volume;
    this.stateMachine.transition(PlaybackState.Ducked, 'duck');
    const now = this.context.currentTime;
    const duckedGain = Math.max(0, this._volume * this._duckFactor);
    try {
      (this.mainGain.gain as any).cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
      this.mainGain.gain.linearRampToValueAtTime(duckedGain, now + 0.3);
    } catch {
      try {
        this.mainGain.gain.setValueAtTime(duckedGain, now);
      } catch {}
    }
  }

  private _restoreFromDuck(ramp = true): void {
    if (!this._isDucked || !this.mainGain || !this.context) {
      this._isDucked = false;
      return;
    }
    const now = this.context.currentTime;
    const target = this._preDuckVolume;
    this._isDucked = false;
    this.stateMachine.transition(PlaybackState.Playing, 'unduck');
    try {
      (this.mainGain.gain as any).cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
      if (ramp) {
        this.mainGain.gain.linearRampToValueAtTime(target, now + 0.5);
      } else {
        this.mainGain.gain.setValueAtTime(target, now);
      }
    } catch {
      try {
        this.mainGain.gain.setValueAtTime(target, now);
      } catch {}
    }
  }

  setSpeed(speed: number): void {
    this._speed = speed;
    if (this.currentSource) {
      this.currentSource.playbackRate.setValueAtTime(
        speed,
        this.context?.currentTime ?? 0
      );
    }
  }

  setPitchCorrection(enabled: boolean): void {
    this._pitchCorrection = enabled;
  }

  setEqEnabled(enabled: boolean): void {
    this._eqEnabled = enabled;
    if (!enabled) {
      this.eqFilters.forEach((filter) => {
        filter.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
      });
    } else {
      this.eqFilters.forEach((filter, i) => {
        filter.gain.setValueAtTime(this._bandGains[i] ?? 0, this.context?.currentTime ?? 0);
      });
    }
  }

  setBandGain(index: number, gain: number): void {
    if (this._bandGains[index] !== undefined) this._bandGains[index] = gain;
    if (this.eqFilters[index] && this._eqEnabled) {
      this.eqFilters[index].gain.setValueAtTime(
        gain,
        this.context?.currentTime ?? 0
      );
    }
  }

  setBandGains(bands: EqualizerBand[]): void {
    bands.forEach((band, i) => {
      if (this._bandGains[i] !== undefined) this._bandGains[i] = band.gain;
      if (this.eqFilters[i] && this._eqEnabled) {
        this.eqFilters[i].gain.setValueAtTime(
          band.gain,
          this.context?.currentTime ?? 0
        );
      }
    });
  }

  setBassBoost(value: number): void {
    this._bassBoostValue = value;
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.setValueAtTime(
        value,
        this.context?.currentTime ?? 0
      );
    }
  }

  setBalance(value: number): void {
    this._balanceValue = value;
    if (this.balancePanner) {
      this.balancePanner.pan.setValueAtTime(
        value / 10,
        this.context?.currentTime ?? 0
      );
    }
  }

  /** Configure ReplayGain mode + preamp. Reapplies using the currently stored
   *  track tags so a runtime toggle/change takes effect on the live graph. */
  applyReplayGainSettings(opts: {
    enabled: boolean;
    preampDb: number;
    useAlbum: boolean;
  }): void {
    this._rgEnabled = opts.enabled;
    this._rgPreampDb = opts.preampDb;
    this._rgUseAlbum = opts.useAlbum;
    this._applyReplayGain();
  }

  /** Provide the playing track's ReplayGain tags so track vs album gain and
   *  peak-based clipping prevention are actually applied (not just preamp). */
  setCurrentTrackReplayGain(tags: {
    trackGain?: number | null;
    albumGain?: number | null;
    trackPeak?: number | null;
    albumPeak?: number | null;
  } | null): void {
    this._rgTrackGain = tags?.trackGain ?? null;
    this._rgAlbumGain = tags?.albumGain ?? null;
    this._rgTrackPeak = tags?.trackPeak ?? null;
    this._rgAlbumPeak = tags?.albumPeak ?? null;
    this._applyReplayGain();
  }

  private _applyReplayGain(): void {
    if (!this.replayGainNode) return;
    const now = this.context?.currentTime ?? 0;
    if (!this._rgEnabled) {
      this.replayGainNode.gain.setValueAtTime(1.0, now);
      return;
    }
    const gainDb =
      this._rgUseAlbum && this._rgAlbumGain != null
        ? this._rgAlbumGain
        : (this._rgTrackGain ?? 0);
    const peak =
      this._rgUseAlbum && this._rgAlbumPeak != null
        ? this._rgAlbumPeak
        : (this._rgTrackPeak ?? 1);
    let linear = Math.pow(10, (gainDb + this._rgPreampDb) / 20);
    /* Clipping prevention: never let peak * gain exceed 0 dBFS. */
    if (peak && peak > 0 && linear * peak > 1) {
      linear = 1 / peak;
    }
    this.replayGainNode.gain.setValueAtTime(linear, now);
  }

  setLoudnessEnabled(enabled: boolean): void {
    this._loudnessEnabled = enabled;
    const gain = enabled ? this._loudnessLevel : 0;
    this.loudnessFilters.forEach((filter, i) => {
      if (filter) {
        const boosts = [gain * 0.8, gain * 0.5, gain * 0.3];
        filter.gain.setValueAtTime(boosts[i] ?? 0, this.context?.currentTime ?? 0);
      }
    });
  }

  setLoudnessLevel(level: number): void {
    this._loudnessLevel = level;
    if (this._loudnessEnabled) {
      this.setLoudnessEnabled(true);
    }
  }

  getState(): AudioEngineState {
    return {
      playing: this._playing,
      currentTime: this._currentTime,
      duration: this._duration,
      isBuffering: false,
      isLoaded: this.currentBuffer !== null,
      currentTrackUri: this._currentTrackUri,
    };
  }

  getSpeed(): number {
    return this._speed;
  }

  getCurrentUri(): string | null {
    return this._currentTrackUri;
  }

  getDuration(): number {
    return this._duration;
  }

  getPlaybackState(): PlaybackState {
    return this.stateMachine.state;
  }

  onPlaybackStateChange(cb: (next: PlaybackState, prev: PlaybackState | null, trigger: string) => void): () => void {
    return this.stateMachine.onStateChange(cb);
  }

  isTransitioningState(): boolean {
    return this.stateMachine.is(PlaybackState.Loading, PlaybackState.Crossfading, PlaybackState.GaplessTransition);
  }

  async startCrossfade(newUri: string, durationSec: number): Promise<void> {
    if (!this.context || !this.currentBuffer || !this.currentSource) return;
    if (this._crossfading || this.loadingLock) return;

    this._crossfading = true;
    this.stateMachine.transition(PlaybackState.Crossfading, 'crossfade:start');
    const myOp = ++this.crossfadeOpId;

    /* Never hold two huge PCM buffers at once (long lossless / podcasts).
       Fall back to a plain transition instead of concurrent crossfade. */
    if (this.currentBuffer && bufferByteSize(this.currentBuffer) > LARGE_TRACK_BYTES) {
      this._crossfading = false;
      this.stateMachine.transition(PlaybackState.Playing, 'crossfade:large-fallback');
      await this.loadTrack(newUri);
      this.play();
      return;
    }

    try {
      const newBuffer = await this.context.decodeAudioData(newUri);
      if (!newBuffer || !this.context) {
        this._crossfading = false;
        this.stateMachine.transition(PlaybackState.Playing, 'crossfade:decode-null');
        return;
      }
      if (myOp !== this.crossfadeOpId) {
        this._crossfading = false;
        this.stateMachine.transition(PlaybackState.Playing, 'crossfade:stale');
        return;
      }
      if (!this._crossfading) {
        this._crossfading = false;
        this.stateMachine.transition(PlaybackState.Playing, 'crossfade:cancelled');
        return;
      }

      this.crossfadeBuffer = newBuffer;

      const newGain = this.context.createGain();
      newGain.gain.value = 0;

      const oldGain = this.context.createGain();
      oldGain.gain.value = 1;

      try {
        this.currentSource.disconnect();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.currentSource.connect(oldGain);
      oldGain.connect(this.eqFilters[0]);

      const crossfadeSource = this.context.createBufferSource({ pitchCorrection: this._pitchCorrection });
      crossfadeSource.buffer = newBuffer;
      crossfadeSource.playbackRate.value = this._speed;
      crossfadeSource.connect(newGain);
      newGain.connect(this.eqFilters[0]);
      crossfadeSource.start(0, 0);

      this.crossfadeSource = crossfadeSource;

      const steps = 20;
      const stepMs = (durationSec * 1000) / steps;
      let step = 0;

      this._crossfadeInterval = setInterval(() => {
        try {
          if (!this._crossfading || !this.context) {
            this.cancelCrossfade();
            return;
          }

          step++;
          const progress = step / steps;

          try {
            oldGain.gain.setValueAtTime(1 - progress, this.context.currentTime);
            newGain.gain.setValueAtTime(progress, this.context.currentTime);
          } catch (e) {
            reportWarning('AudioEngine', e);
          }

          if (step >= steps) {
            this.cancelCrossfade();

            try {
              oldGain.disconnect();
              if (this.currentSource) {
                this.currentSource.onEnded = null;
                this.currentSource.disconnect();
                this.currentSource.stop();
              }
            } catch (e) {
              reportWarning('AudioEngine', e);
            }

            this.currentSource = crossfadeSource;
            this.crossfadeSource = null;
            this.currentBuffer = newBuffer;
            this._duration = newBuffer.duration;
            this._currentTime = 0;
            this._startOffset = 0;
            this._startContextTime = this.context?.currentTime ?? 0;
            this.stateMachine.transition(PlaybackState.Playing, 'crossfade:complete');

            if (this.currentSource) {
              this.currentSource.onEnded = () => {
                if (this._playing) {
                  this._playing = false;
                  this._currentTime = this._duration;
                  this.stopPositionTracking();
                  this.stateMachine.transition(PlaybackState.Paused, 'crossfade:onEnded');
                  this.emitState();
                }
              };
            }

            this.emitState();
          }
        } catch (e) {
          reportWarning('AudioEngine', e, 'Crossfade interval error');
          this.cancelCrossfade();
          this.stateMachine.transition(PlaybackState.Playing, 'crossfade:intervalError');
        }
      }, stepMs);
    } catch (e) {
      logger.warn('Crossfade failed:', e);
      this._crossfading = false;
      this.stateMachine.transition(PlaybackState.Playing, 'crossfade:failed');
    }
  }

  isCrossfading(): boolean {
    return this._crossfading;
  }

  /** Enable/disable gapless playback mode */
  setGaplessEnabled(enabled: boolean): void {
    this._gaplessEnabled = enabled;
    if (!enabled) {
      this.stopGaplessMonitoring();
      this._gaplessNextUri = null;
    }
  }

  isGaplessEnabled(): boolean {
    return this._gaplessEnabled;
  }

  /** Set the next track URI for gapless transition */
  setGaplessNextTrack(
    uri: string | null,
    rg?: {
      trackGain?: number | null;
      albumGain?: number | null;
      trackPeak?: number | null;
      albumPeak?: number | null;
    } | null,
  ): void {
    this._gaplessNextUri = uri;
    this._gaplessNextRg = uri ? (rg ?? null) : null;
    if (uri && this._gaplessEnabled) {
      this.startGaplessMonitoring();
    }
  }

  private startGaplessMonitoring(): void {
    this.stopGaplessMonitoring();
    if (!this._gaplessEnabled || !this._gaplessNextUri) return;

    this._gaplessCheckInterval = setInterval(() => {
      if (!this._playing || this._paused || !this._gaplessNextUri || this._crossfading) return;
      const precise = this.getPreciseCurrentTime();
      const remaining = this._duration - precise;
      // Trigger within ~350ms of the end so only a tiny tail is truncated.
      // Previously this was 2s, which cut the last 2 seconds of every track.
      // True sample-accurate scheduling (schedule next start at
      // context.currentTime + remaining) would require keeping both sources
      // alive and is left for a dedicated native gapless effort; this reduces
      // truncation by ~85% with minimal risk.
      if (remaining <= 0.35 && remaining > 0.02) {
        this.performGaplessTransition();
      }
    }, 100);
  }

  private stopGaplessMonitoring(): void {
    if (this._gaplessCheckInterval) {
      clearInterval(this._gaplessCheckInterval);
      this._gaplessCheckInterval = null;
    }
  }

  private async performGaplessTransition(): Promise<void> {
    if (!this._gaplessNextUri || this._crossfading) return;
    const nextUri = this._gaplessNextUri;
    this._gaplessNextUri = null;
    this.stopGaplessMonitoring();
    const myOp = ++this.gaplessOpId;
    this.stateMachine.transition(PlaybackState.GaplessTransition, 'gapless:start');

    try {
      let nextBuffer = this.bufferPool.get(nextUri);
      if (!nextBuffer) {
        nextBuffer = this.preloadedUri === nextUri ? this.preloadedBuffer : null;
      }
      if (!nextBuffer && this.context) {
        nextBuffer = await decodeWithTimeout(this.context, nextUri, DECODE_TIMEOUT_MS);
        if (myOp !== this.gaplessOpId) {
          this.stateMachine.transition(PlaybackState.Playing, 'gapless:stale-decode');
          return;
        }
      }
      if (!nextBuffer || !this.context) {
        this.stateMachine.transition(PlaybackState.Playing, 'gapless:no-buffer');
        return;
      }

      // Keep the tail: if we were triggered at ~350ms, wait until ~50ms
      // before the end so the audible loss is negligible. This keeps the
      // logic simple (still an immediate swap) but preserves ~300ms of audio
      // that the old 2-second window would have cut.
      const preciseBeforeSwap = this.getPreciseCurrentTime();
      const remainingBeforeSwap = this._duration - preciseBeforeSwap;
      if (remainingBeforeSwap > 0.08) {
        await new Promise<void>((resolve) => setTimeout(resolve, (remainingBeforeSwap - 0.05) * 1000));
        if (myOp !== this.gaplessOpId) {
          this.stateMachine.transition(PlaybackState.Playing, 'gapless:stale-after-wait');
          return;
        }
        if (!this._playing || this._paused || !this.context) {
          this.stateMachine.transition(PlaybackState.Paused, 'gapless:paused-after-wait');
          return;
        }
      }

      this.bufferPool.set(nextUri, nextBuffer, 0);

      const wasPlaying = this._playing;
      this.stopCurrentSource();

      this.currentBuffer = nextBuffer;
      this._currentTrackUri = nextUri;
      this.setCurrentTrackReplayGain(this._gaplessNextRg);
      this._duration = nextBuffer.duration;
      this._currentTime = 0;
      this._startOffset = 0;

      const source = this.createSource(nextBuffer, this._pitchCorrection);
      if (source) {
        this.currentSource = source;
        this._startContextTime = this.context.currentTime;
        this.currentSource.onEnded = () => {
          if (this._playing && !this._seeking) {
            this._playing = false;
            this._currentTime = this._duration;
            this.stopPositionTracking();
            this.emitState();
          }
        };
        source.start(0, 0);
        this._playing = wasPlaying;
        this._paused = false;
        if (wasPlaying) {
          this.stateMachine.transition(PlaybackState.Playing, 'gapless:complete-playing');
        } else {
          this.stateMachine.transition(PlaybackState.Ready, 'gapless:complete-paused');
        }
        this.startPositionTracking();
        this.emitState();
      }
    } catch (e) {
      reportWarning('AudioEngine', e, 'Gapless transition failed');
      this.stateMachine.transition(PlaybackState.Error, 'gapless:failed');
    }
  }

  /** Ensure audio context is alive. Re-initializes if destroyed by the OS. */
  async ensureAlive(): Promise<boolean> {
    try {
      if (this.context) {
        if (this.context.state === 'closed') {
          this.context = null;
          await this.init();
          if (!this.context) return false;
          return this.restorePlayback();
        }
        try {
          if (this.context.state !== 'running') {
            await this.context.resume();
          }
          if (this._playing && !this._paused) {
            this.startPositionTracking();
          }
          return true;
        } catch {
          this.stopCurrentSource();
          this.stopPositionTracking();
          const savedUri = this._currentTrackUri;
          const wasPlaying = this._playing;
          const savedPosition = this._currentTime;

          this.currentBuffer = null;
          this.crossfadeBuffer = null;
          this.context = null;

          if (savedUri) {
            await this.init();
            if (this.context) {
              await this.loadTrack(savedUri);
              if (wasPlaying) {
                const seekPos = Math.min(savedPosition, Math.max(this._duration - 0.5, 0));
                this._currentTime = seekPos;
                this._startOffset = seekPos;
                this.play();
              }
              return true;
            }
          }
          return false;
        }
      }
      await this.init();
      return this.context !== null;
    } catch (e) {
      logger.warn('[AudioEngine] ensureAlive failed:', e);
      return false;
    }
  }

  private async restorePlayback(): Promise<boolean> {
    const savedUri = this._currentTrackUri;
    const wasPlaying = this._playing;
    const savedPosition = this._currentTime;

    this.currentBuffer = null;
    this.crossfadeBuffer = null;
    this._currentTrackUri = null;
    this._playing = false;
    this._paused = false;
    this._currentTime = 0;

    if (savedUri && wasPlaying) {
      try {
        await this.loadTrack(savedUri);
        const seekPos = Math.min(savedPosition, Math.max(this._duration - 0.5, 0));
        this._currentTime = seekPos;
        this._startOffset = seekPos;
        this.play();
        return true;
      } catch (e) {
        logger.warn('[AudioEngine] restorePlayback failed:', e);
      }
    }
    return this.context !== null;
  }

  destroy(): void {
    this.stopWatchdog();
    this.stopPositionTracking();
    this.stopGaplessMonitoring();
    this.stopCurrentSource();
    if (this.interruptionSubscription) {
      try {
        this.interruptionSubscription.remove();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.interruptionSubscription = null;
    }
    if (this.duckSubscription) {
      try {
        this.duckSubscription.remove();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.duckSubscription = null;
    }
    this._isDucked = false;
    this.stateMachine.force(PlaybackState.Idle, 'destroy');
    if (this.context) {
      try {
        this.context.close();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.context = null;
    }
    this.eqFilters = [];
    this.trackEndedCallbacks.clear();
    this.bassBoostFilter = null;
    this.replayGainNode = null;
    this.balancePanner = null;
    this.mainGain = null;
    this.currentBuffer = null;
    this.crossfadeBuffer = null;
    this.preloadedBuffer = null;
    this.preloadedUri = null;
    this.loudnessFilters = [];
    this.stateCallbacks.clear();
    this.decodeErrorCallbacks.clear();
    this.loadingLock = false;
    this.bufferPool.clear();
  }
}

export const audioEngine = new AudioEngine();
