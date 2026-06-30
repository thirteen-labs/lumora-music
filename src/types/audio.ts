export interface EqualizerBand {
  frequency: number;
  gain: number;
}

export type EqualizerPreset = 'flat' | 'bass_boost' | 'treble_boost' | 'vocal' | 'rock' | 'electronic' | 'classical' | 'jazz' | 'pop' | 'custom';

export interface EqualizerSettings {
  enabled: boolean;
  preset: EqualizerPreset;
  bands: EqualizerBand[];
  bassBoost: number;
  balance: number;
}

export interface SleepTimerSettings {
  active: boolean;
  minutesRemaining: number;
  totalMinutes: number;
  endTime: number;
  stopAtEndOfTrack: boolean;
}

export interface PlaybackSpeedSettings {
  speed: number;
  pitchCorrection: boolean;
}

export interface ReplayGainSettings {
  enabled: boolean;
  preamp: number;
  trackGain: boolean;
  albumGain: boolean;
}

export interface SmartPlaylistRule {
  field: 'genre' | 'artist' | 'album' | 'year' | 'duration' | 'playCount' | 'lastPlayed' | 'dateAdded' | 'rating';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: string | number;
  value2?: number;
}

export interface SmartPlaylist {
  id: string;
  name: string;
  icon: string;
  rules: SmartPlaylistRule[];
  matchAll: boolean;
  limit: number;
  sortBy: 'title' | 'dateAdded' | 'duration' | 'playCount' | 'lastPlayed';
  sortOrder: 'asc' | 'desc';
  createdAt: number;
}

export interface TrackStats {
  songId: string;
  playCount: number;
  skipCount: number;
  lastPlayed: number;
  totalPlayTime: number;
}

export interface ListeningStats {
  totalPlayTime: number;
  totalTracksPlayed: number;
  topArtists: { name: string; count: number }[];
  topAlbums: { name: string; count: number }[];
  topSongs: { name: string; count: number }[];
  weeklyMinutes: number[];
}

export interface StorageInfo {
  totalSongs: number;
  totalAudioSize: number;
  largestFiles: { name: string; size: number; type: 'audio' }[];
  genreBreakdown: { genre: string; count: number; size: number }[];
}

export interface QueuedTrack {
  song: import('./media').Song;
  addedAt: number;
}
