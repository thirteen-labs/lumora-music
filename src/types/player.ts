export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: import('./media').Song | null;
  queue: import('./media').Song[];
  queueIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isMiniPlayerVisible: boolean;
  isFullPlayerVisible: boolean;
}
