import {
  AudioContext,
  AudioBufferSourceNode,
  AudioBuffer,
  GainNode,
  BiquadFilterNode,
  StereoPannerNode,
} from 'react-native-audio-api';
import type { EqualizerBand } from '@/types/audio';

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const BASS_BOOST_FREQUENCY = 150;
const EQ_Q = 1.4;

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

  async init(): Promise<void> {
    if (this.context) return;
    this.context = new AudioContext();
    this.buildProcessingChain();
  }

  private buildProcessingChain(): void {
    if (!this.context) return;

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
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
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
    await this.init();
    if (!this.context) return;

    this.stopCurrentSource();
    this._currentTrackUri = uri;

    try {
      const buffer = await this.context.decodeAudioData(uri);
      this.currentBuffer = buffer;
      this._duration = buffer.duration;
      this._currentTime = 0;
      this._startOffset = 0;
      this.emitState();
    } catch (e) {
      console.warn('Failed to decode audio data:', e);
      this.currentBuffer = null;
      this._duration = 0;
      this.emitState();
    }
  }

  private createSource(
    buffer: AudioBuffer,
    pitchCorrection: boolean
  ): AudioBufferSourceNode {
    if (!this.context) throw new Error('AudioContext not initialized');
    const source = this.context.createBufferSource({ pitchCorrection });
    source.buffer = buffer;
    source.playbackRate.value = this._speed;
    source.connect(this.eqFilters[0]);
    return source;
  }

  play(): void {
    if (!this.context || !this.currentBuffer) return;

    if (this._paused && this.currentSource) {
      this.context.resume();
      this._paused = false;
      this._playing = true;
      this.startPositionTracking();
      this.emitState();
      return;
    }

    this.stopCurrentSource();
    this.currentSource = this.createSource(this.currentBuffer, this._pitchCorrection);
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
    if (!this._playing) return;
    this._seeking = false;
    if (this.context) {
      this.context.suspend();
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

  private stopCurrentSource(): void {
    if (this.currentSource) {
      try {
        this.currentSource.onEnded = null;
        this.currentSource.disconnect();
        this.currentSource.stop();
      } catch {}
      this.currentSource = null;
    }
    if (this.crossfadeSource) {
      try {
        this.crossfadeSource.onEnded = null;
        this.crossfadeSource.disconnect();
        this.crossfadeSource.stop();
      } catch {}
      this.crossfadeSource = null;
    }
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
      this.currentSource = this.createSource(this.currentBuffer, this._pitchCorrection);
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
    if (this._crossfading) return;

    this._crossfading = true;

    try {
      const newBuffer = await this.context.decodeAudioData(newUri);
      if (!newBuffer || !this.context) {
        this._crossfading = false;
        return;
      }

      this.crossfadeBuffer = newBuffer;

      const newGain = this.context.createGain();
      newGain.gain.value = 0;
      this.crossfadeGain = newGain;

      const oldGain = this.context.createGain();
      oldGain.gain.value = 1;

      this.currentSource.disconnect();
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
        step++;
        const progress = step / steps;

        if (this.context) {
          oldGain.gain.setValueAtTime(1 - progress, this.context.currentTime);
          newGain.gain.setValueAtTime(progress, this.context.currentTime);
        }

        if (step >= steps) {
          if (this._crossfadeInterval) {
            clearInterval(this._crossfadeInterval);
            this._crossfadeInterval = null;
          }

          try {
            oldGain.disconnect();
            this.currentSource?.onEnded && (this.currentSource.onEnded = null);
            this.currentSource?.disconnect();
            this.currentSource?.stop();
          } catch {}

          this.currentSource = this.crossfadeSource;
          this.crossfadeSource = null;
          this.currentBuffer = newBuffer;
          this._duration = newBuffer.duration;
          this._currentTime = 0;
          this._startOffset = 0;
          this._startContextTime = this.context?.currentTime ?? 0;
          this._crossfading = false;

          this.currentSource!.onEnded = () => {
            if (this._playing && !this._seeking) {
              this._playing = false;
              this._currentTime = this._duration;
              this.stopPositionTracking();
              this.emitState();
            }
          };

          this.emitState();
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
        try {
          await this.context.resume();
          this.startPositionTracking();
          return true;
        } catch {
          // Context is dead, will re-create below
          this.context = null;
          this.currentBuffer = null;
          this.currentSource = null;
        }
      }
      await this.init();
      if (this._currentTrackUri) {
        await this.loadTrack(this._currentTrackUri);
        if (this._playing || this._paused) {
          this._currentTime = this._startOffset;
          this.play();
        }
      }
      return this.context !== null;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.stopCurrentSource();
    this.stopPositionTracking();
    if (this._crossfadeInterval) {
      clearInterval(this._crossfadeInterval);
      this._crossfadeInterval = null;
    }
    this._crossfading = false;
    if (this.context) {
      this.context.close();
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
    this.loudnessFilters = [];
    this.stateCallbacks.clear();
  }
}

export const audioEngine = new AudioEngine();
