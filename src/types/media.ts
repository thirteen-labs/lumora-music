export interface Song {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number;
  fileSize: number;
  dateAdded: number;
  artwork: string | null;
  genre: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string | null;
  replayGainTrackGain?: number | null;
  replayGainAlbumGain?: number | null;
  replayGainTrackPeak?: number | null;
  replayGainAlbumPeak?: number | null;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  songCount: number;
  dateAdded: number;
}

export interface Artist {
  id: string;
  name: string;
  artwork: string | null;
  songCount: number;
  albumCount: number;
}

export interface Genre {
  id: string;
  name: string;
  songCount: number;
}

export type SortField = 'title' | 'artist' | 'dateAdded' | 'duration' | 'fileSize' | 'playCount' | 'lastPlayed';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'dateAdded', order: 'desc', label: 'Newest First' },
  { field: 'dateAdded', order: 'asc', label: 'Oldest First' },
  { field: 'title', order: 'asc', label: 'Name (A-Z)' },
  { field: 'title', order: 'desc', label: 'Name (Z-A)' },
  { field: 'duration', order: 'desc', label: 'Longest First' },
  { field: 'duration', order: 'asc', label: 'Shortest First' },
  { field: 'fileSize', order: 'desc', label: 'Largest First' },
  { field: 'fileSize', order: 'asc', label: 'Smallest First' },
  { field: 'playCount', order: 'desc', label: 'Most Played' },
  { field: 'playCount', order: 'asc', label: 'Least Played' },
  { field: 'lastPlayed', order: 'desc', label: 'Recently Played' },
  { field: 'lastPlayed', order: 'asc', label: 'Longest Unplayed' },
];

export type MediaScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  artwork: string | null;
}
