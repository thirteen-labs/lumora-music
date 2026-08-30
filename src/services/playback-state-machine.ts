import { logger } from '@/utils/logger';

declare const __DEV__: boolean | undefined;

export enum PlaybackState {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Playing = 'playing',
  Paused = 'paused',
  Stopped = 'stopped',
  Crossfading = 'crossfading',
  GaplessTransition = 'gaplessTransition',
  Ducked = 'ducked',
  Interrupted = 'interrupted',
  Error = 'error',
}

type TransitionRecord = {
  from: PlaybackState;
  to: PlaybackState;
  trigger: string;
  at: number;
};

const ALLOWED: Record<PlaybackState, Set<PlaybackState>> = {
  [PlaybackState.Idle]: new Set([
    PlaybackState.Loading,
    PlaybackState.Stopped,
    PlaybackState.Ready,
  ]),
  [PlaybackState.Loading]: new Set([
    PlaybackState.Ready,
    PlaybackState.Error,
    PlaybackState.Idle,
    PlaybackState.Loading,
    PlaybackState.Stopped,
  ]),
  [PlaybackState.Ready]: new Set([
    PlaybackState.Playing,
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Loading,
    PlaybackState.Idle,
    PlaybackState.Error,
  ]),
  [PlaybackState.Playing]: new Set([
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Loading,
    PlaybackState.Crossfading,
    PlaybackState.GaplessTransition,
    PlaybackState.Ducked,
    PlaybackState.Interrupted,
    PlaybackState.Error,
    PlaybackState.Ready,
    PlaybackState.Idle,
  ]),
  [PlaybackState.Paused]: new Set([
    PlaybackState.Playing,
    PlaybackState.Stopped,
    PlaybackState.Loading,
    PlaybackState.Idle,
    PlaybackState.Interrupted,
    PlaybackState.Ready,
  ]),
  [PlaybackState.Stopped]: new Set([
    PlaybackState.Idle,
    PlaybackState.Loading,
    PlaybackState.Ready,
    PlaybackState.Playing,
  ]),
  [PlaybackState.Crossfading]: new Set([
    PlaybackState.Playing,
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Error,
    PlaybackState.Loading,
    PlaybackState.Idle,
  ]),
  [PlaybackState.GaplessTransition]: new Set([
    PlaybackState.Playing,
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Error,
    PlaybackState.Loading,
    PlaybackState.Idle,
  ]),
  [PlaybackState.Ducked]: new Set([
    PlaybackState.Playing,
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Interrupted,
    PlaybackState.Error,
    PlaybackState.Idle,
  ]),
  [PlaybackState.Interrupted]: new Set([
    PlaybackState.Playing,
    PlaybackState.Paused,
    PlaybackState.Stopped,
    PlaybackState.Idle,
    PlaybackState.Error,
    PlaybackState.Ducked,
  ]),
  [PlaybackState.Error]: new Set([
    PlaybackState.Idle,
    PlaybackState.Loading,
    PlaybackState.Stopped,
    PlaybackState.Ready,
  ]),
};

export class PlaybackStateMachine {
  private _state: PlaybackState = PlaybackState.Idle;
  private _prev: PlaybackState | null = null;
  private _history: TransitionRecord[] = [];
  private _listeners = new Set<(next: PlaybackState, prev: PlaybackState | null, trigger: string) => void>();
  private readonly _maxHistory = 50;

  get state(): PlaybackState {
    return this._state;
  }

  get previous(): PlaybackState | null {
    return this._prev;
  }

  get history(): readonly TransitionRecord[] {
    return this._history;
  }

  canTransition(to: PlaybackState): boolean {
    if (to === this._state) return true;
    const allowed = ALLOWED[this._state];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * Attempt a transition. Returns true if it happened (or was already in
   * that state). Returns false and warns if the transition is illegal — the
   * caller should not proceed with the underlying operation in that case.
   */
  transition(to: PlaybackState, trigger = 'unknown'): boolean {
    if (to === this._state) return true;
    if (!this.canTransition(to)) {
      logger.warn(`[StateMachine] Illegal transition ${this._state} -> ${to} via ${trigger}. Allowed: ${Array.from(ALLOWED[this._state] ?? []).join(', ')}`);
      const isDev = typeof __DEV__ !== 'undefined' && (__DEV__ as boolean);
      if (!isDev) {
        return false;
      }
    }
    const prev = this._state;
    this._prev = prev;
    this._state = to;
    this._history.push({ from: prev, to, trigger, at: Date.now() });
    if (this._history.length > this._maxHistory) this._history.shift();
    this._listeners.forEach((cb) => {
      try {
        cb(to, prev, trigger);
      } catch {}
    });
    return true;
  }

  /**
   * Force a state without validation (for recovery / watchdog).
   */
  force(to: PlaybackState, trigger = 'force'): void {
    const prev = this._state;
    this._prev = prev;
    this._state = to;
    this._history.push({ from: prev, to, trigger, at: Date.now() });
    if (this._history.length > this._maxHistory) this._history.shift();
    this._listeners.forEach((cb) => {
      try {
        cb(to, prev, trigger);
      } catch {}
    });
  }

  onStateChange(cb: (next: PlaybackState, prev: PlaybackState | null, trigger: string) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  is(...states: PlaybackState[]): boolean {
    return states.includes(this._state);
  }

  reset(): void {
    this._state = PlaybackState.Idle;
    this._prev = null;
    this._history = [];
  }
}
