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
  private volumeGain: GainNode | null = null;
  private replayGainNode: GainNode | null = null;
  private balancePanner: StereoPannerNode | null = null;
  private crossfadeGain: GainNode | null = null;
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
  private _currentTrackUri: string | null = null;
  private _crossfading = false;
  private _crossfadeInterval: ReturnType<typeof setInterval> | null = null;
  private loudnessFilters: BiquadFilterNode[] = [];
  private _loudnessEnabled = false;
  private _loudnessLevel = 6;

  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private positionInterval: ReturnType<typeof setInterval> | null = null;
  private loadingLock = false;
  private interruptionSubscription: AudioEventSubscription | null = null;
  private _watchdogTimer: ReturnType<typeof setInterval> | null = null;

  /** Bounded buffer pool for decoded audio */
  private bufferPool = new AudioBufferPool(6);

  /** Preloaded buffer awaiting activation */
  private preloadedUri: string | null = null;
  private preloadedBuffer: AudioBuffer | null = null;

  async init(): Promise<void> {
    if (this.context) {
      if (this.context.state === 'closed') {
        console.warn('[AudioEngine] Context was closed, creating new one');
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
          if (this._playing) {
            this.context?.suspend();
            this._paused = true;
            this._playing = false;
            this.stopPositionTracking();
            this.emitState();
          }
        } else if (event.type === 'ended' && event.shouldResume) {
          if (this._paused && !this._playing) {
            this.context?.resume();
            this._playing = true;
            this._paused = false;
            this.startPositionTracking();
            this.emitState();
          }
        }
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

      this.volumeGain = this.context.createGain();
      this.volumeGain.gain.value = 1.0;

      this.replayGainNode = this.context.createGain();
      this.replayGainNode.gain.value = 1.0;

      this.balancePanner = this.context.createStereoPanner();
      this.balancePanner.pan.value = 0;

      this.mainGain = this.context.createGain();
      this.mainGain.gain.value = 1.0;

      this.crossfadeGain = this.context.createGain();
      this.crossfadeGain.gain.value = 0;

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
      this.replayGainNode.connect(this.volumeGain);

      if (this.loudnessFilters.length > 0) {
        this.volumeGain.connect(this.loudnessFilters[0]);
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
        this.volumeGain.connect(this.balancePanner);
      }

      this.balancePanner.connect(this.mainGain);
      this.mainGain.connect(this.context.destination);
    } catch (e) {
      console.warn('[AudioEngine] Failed to build processing chain:', e);
    }
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    let consecutiveFailures = 0;
    this._watchdogTimer = setInterval(() => {
      if (this.context && this._playing && !this._paused) {
        try {
          if (this.context.state === 'closed') {
            console.warn('[AudioEngine] Watchdog: context was closed, triggering recovery');
            this.ensureAlive().catch((e) => reportWarning('AudioEngine', e, 'Watchdog: ensureAlive failed'));
            return;
          }
          if (this.context.state !== 'running') {
            console.warn('[AudioEngine] Watchdog: context not running, attempting resume');
            this.context.resume().catch((e) => reportWarning('AudioEngine', e, 'Watchdog: context resume failed'));
          }
          consecutiveFailures = 0;
        } catch (e) {
          consecutiveFailures++;
          console.warn('[AudioEngine] Watchdog health check failed:', e);
          if (consecutiveFailures >= 3) {
            console.warn('[AudioEngine] Watchdog: too many failures, triggering full recovery');
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
        console.warn('[AudioEngine] loadTrack lock timeout, proceeding anyway');
        this.loadingLock = false;
      }
    }
    this.loadingLock = true;

    try {
      await this.init();
      if (!this.context) return;

      this.cancelCrossfade();
      this.stopCurrentSource();

      const pooled = this.bufferPool.get(uri);
      if (pooled) {
        this.currentBuffer = pooled;
        this._currentTrackUri = uri;
        this._duration = pooled.duration;
        this._currentTime = 0;
        this._startOffset = 0;
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
        this.emitState();
        return;
      }

      this._currentTrackUri = uri;

      const startTs = Date.now();
      let buffer: AudioBuffer;
      try {
        buffer = await decodeWithTimeout(this.context, uri, DECODE_TIMEOUT_MS);
      } catch (decodeError) {
        console.warn('[AudioEngine] Decode failed for', uri.slice(0, 80), ':', decodeError);
        this._currentTrackUri = null;
        this.currentBuffer = null;
        this._duration = 0;
        this.emitState();
        return;
      }
      this.bufferPool.set(uri, buffer, Date.now() - startTs);
      this.currentBuffer = buffer;
      this._duration = buffer.duration;
      this._currentTime = 0;
      this._startOffset = 0;
      this.emitState();
    } catch (e) {
      console.warn('[AudioEngine] loadTrack error:', e);
      this.currentBuffer = null;
      this._duration = 0;
      this._currentTrackUri = null;
      this.emitState();
    } finally {
      this.loadingLock = false;
    }
  }

  /** Pre-decode a track into the buffer pool so a subsequent loadTrack is instant. */
  async preloadTrack(uri: string): Promise<void> {
    if (this._crossfading) return;
    if (this.loadingLock) return;
    if (this.bufferPool.has(uri)) return;
    if (this.preloadedUri === uri && this.preloadedBuffer) return;
    if (!this.context) await this.init();
    if (!this.context) return;
    try {
      const startTs = Date.now();
      const buffer = await decodeWithTimeout(this.context!, uri, DECODE_TIMEOUT_MS);
      const elapsed = Date.now() - startTs;
      this.bufferPool.set(uri, buffer, elapsed);
      this.preloadedUri = uri;
      this.preloadedBuffer = buffer;
    } catch (e) {
      console.warn('[AudioEngine] Preload failed for', uri.slice(0, 80), e);
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
      console.warn('[AudioEngine] Failed to create source:', e);
      return null;
    }
  }

  play(): void {
    if (!this.context || !this.currentBuffer) return;

    if (this._paused && this.currentSource) {
      this.context.resume().catch((e) => reportWarning('AudioEngine', e, 'Play: context resume failed'));
      this._paused = false;
      this._playing = true;
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
        this.emitState();
      }
    };
    this.currentSource.start(0, this._currentTime);
    this._playing = true;
    this._paused = false;
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
    this.stopPositionTracking();
    this.emitState();
  }

  stop(): void {
    this.stopCurrentSource();
    this._playing = false;
    this._paused = false;
    this._currentTime = 0;
    this.stopPositionTracking();
    this.emitState();
  }

  private cancelCrossfade(): void {
    this._crossfading = false;
    if (this._crossfadeInterval) {
      clearInterval(this._crossfadeInterval);
      this._crossfadeInterval = null;
    }
    if (this.crossfadeSource) {
      try {
        this.crossfadeSource.onEnded = null;
        this.crossfadeSource.disconnect();
        this.crossfadeSource.stop();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.crossfadeSource = null;
    }
    this.crossfadeBuffer = null;
    if (this.crossfadeGain) {
      try {
        this.crossfadeGain.gain.value = 0;
      } catch {
        this.crossfadeGain = null;
      }
    }
  }

  private stopCurrentSource(): void {
    if (this.currentSource) {
      try {
        this.currentSource.onEnded = null;
        this.currentSource.disconnect();
        this.currentSource.stop();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.currentSource = null;
    }
    this.cancelCrossfade();
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
    if (this.mainGain) {
      this.mainGain.gain.setValueAtTime(volume, this.context?.currentTime ?? 0);
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
    }
  }

  setBandGain(index: number, gain: number): void {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.setValueAtTime(
        gain,
        this.context?.currentTime ?? 0
      );
    }
  }

  setBandGains(bands: EqualizerBand[]): void {
    bands.forEach((band, i) => {
      if (this.eqFilters[i]) {
        this.eqFilters[i].gain.setValueAtTime(
          band.gain,
          this.context?.currentTime ?? 0
        );
      }
    });
  }

  setBassBoost(value: number): void {
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.setValueAtTime(
        value,
        this.context?.currentTime ?? 0
      );
    }
  }

  setBalance(value: number): void {
    if (this.balancePanner) {
      this.balancePanner.pan.setValueAtTime(
        value / 10,
        this.context?.currentTime ?? 0
      );
    }
  }

  setReplayGainVolume(volume: number): void {
    if (this.replayGainNode) {
      this.replayGainNode.gain.setValueAtTime(
        volume,
        this.context?.currentTime ?? 0
      );
    }
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

  async startCrossfade(newUri: string, durationSec: number): Promise<void> {
    if (!this.context || !this.currentBuffer || !this.currentSource) return;
    if (this._crossfading || this.loadingLock) return;

    this._crossfading = true;

    try {
      const newBuffer = await this.context.decodeAudioData(newUri);
      if (!newBuffer || !this.context) {
        this._crossfading = false;
        return;
      }
      if (!this._crossfading) {
        this._crossfading = false;
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
      this.crossfadeGain = newGain;

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

            if (this.currentSource) {
              this.currentSource.onEnded = () => {
                if (this._playing) {
                  this._playing = false;
                  this._currentTime = this._duration;
                  this.stopPositionTracking();
                  this.emitState();
                }
              };
            }

            this.emitState();
          }
        } catch (e) {
          reportWarning('AudioEngine', e, 'Crossfade interval error');
          this.cancelCrossfade();
        }
      }, stepMs);
    } catch (e) {
      console.warn('Crossfade failed:', e);
      this._crossfading = false;
    }
  }

  isCrossfading(): boolean {
    return this._crossfading;
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
      console.warn('[AudioEngine] ensureAlive failed:', e);
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
        console.warn('[AudioEngine] restorePlayback failed:', e);
      }
    }
    return this.context !== null;
  }

  destroy(): void {
    this.stopWatchdog();
    this.stopPositionTracking();
    this.stopCurrentSource();
    if (this.interruptionSubscription) {
      try {
        this.interruptionSubscription.remove();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.interruptionSubscription = null;
    }
    if (this.context) {
      try {
        this.context.close();
      } catch (e) {
        reportWarning('AudioEngine', e);
      }
      this.context = null;
    }
    this.eqFilters = [];
    this.bassBoostFilter = null;
    this.volumeGain = null;
    this.replayGainNode = null;
    this.balancePanner = null;
    this.mainGain = null;
    this.crossfadeGain = null;
    this.currentBuffer = null;
    this.crossfadeBuffer = null;
    this.preloadedBuffer = null;
    this.preloadedUri = null;
    this.loudnessFilters = [];
    this.stateCallbacks.clear();
    this.loadingLock = false;
    this.bufferPool.clear();
  }
}

export const audioEngine = new AudioEngine();
