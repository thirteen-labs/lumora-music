import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { SmartPlaylist, SmartPlaylistRule } from '@/types/audio';
import type { Song } from '@/types/media';

const SMART_PLAYLISTS_KEY = 'lumora-smart-playlists';

function loadSmartPlaylists(): SmartPlaylist[] {
  try {
    const raw = storage.getString(SMART_PLAYLISTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSmartPlaylists(playlists: SmartPlaylist[]): void {
  try { storage.set(SMART_PLAYLISTS_KEY, JSON.stringify(playlists)); } catch {}
}

function evaluateRule(song: Song, rule: SmartPlaylistRule, stats: Record<string, any>): boolean {
  let fieldValue: any;

  switch (rule.field) {
    case 'genre': fieldValue = song.genre ?? ''; break;
    case 'artist': fieldValue = song.artist; break;
    case 'album': fieldValue = song.album; break;
    case 'year': fieldValue = new Date(song.dateAdded).getFullYear(); break;
    case 'duration': fieldValue = song.duration; break;
    case 'playCount': fieldValue = stats[song.id]?.playCount ?? 0; break;
    case 'lastPlayed': fieldValue = stats[song.id]?.lastPlayed ?? 0; break;
    case 'dateAdded': fieldValue = song.dateAdded; break;
    default: return true;
  }

  switch (rule.operator) {
    case 'equals': return String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
    case 'not_equals': return String(fieldValue).toLowerCase() !== String(rule.value).toLowerCase();
    case 'contains': return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
    case 'greater_than': return Number(fieldValue) > Number(rule.value);
    case 'less_than': return Number(fieldValue) < Number(rule.value);
    case 'between': return Number(fieldValue) >= Number(rule.value) && Number(fieldValue) <= Number(rule.value2 ?? 0);
    default: return true;
  }
}

function resolvePlaylist(songs: Song[], playlist: SmartPlaylist, stats: Record<string, any>): Song[] {
  let filtered = songs.filter((song) => {
    if (playlist.matchAll) {
      return playlist.rules.every((rule) => evaluateRule(song, rule, stats));
    } else {
      return playlist.rules.some((rule) => evaluateRule(song, rule, stats));
    }
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (playlist.sortBy) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
      case 'duration': cmp = a.duration - b.duration; break;
      case 'playCount': cmp = (stats[a.id]?.playCount ?? 0) - (stats[b.id]?.playCount ?? 0); break;
      case 'lastPlayed': cmp = (stats[a.id]?.lastPlayed ?? 0) - (stats[b.id]?.lastPlayed ?? 0); break;
    }
    return playlist.sortOrder === 'desc' ? -cmp : cmp;
  });

  if (playlist.limit > 0) {
    filtered = filtered.slice(0, playlist.limit);
  }

  return filtered;
}

interface SmartPlaylistState {
  playlists: SmartPlaylist[];
  addPlaylist: (playlist: Omit<SmartPlaylist, 'id' | 'createdAt'>) => void;
  updatePlaylist: (id: string, updates: Partial<SmartPlaylist>) => void;
  deletePlaylist: (id: string) => void;
  resolveSongs: (id: string, allSongs: Song[], trackStats: Record<string, any>) => Song[];
  getBuiltInPlaylists: () => SmartPlaylist[];
}

const BUILT_IN_PLAYLISTS: SmartPlaylist[] = [
  {
    id: '__recently_added', name: 'Recently Added', icon: 'clock',
    rules: [{ field: 'dateAdded', operator: 'greater_than', value: Date.now() - 7 * 24 * 60 * 60 * 1000 }],
    matchAll: true, limit: 50, sortBy: 'dateAdded', sortOrder: 'desc', createdAt: 0,
  },
  {
    id: '__recently_played', name: 'Recently Played', icon: 'history',
    rules: [{ field: 'lastPlayed', operator: 'greater_than', value: 0 }],
    matchAll: true, limit: 50, sortBy: 'lastPlayed', sortOrder: 'desc', createdAt: 0,
  },
  {
    id: '__favorites', name: 'Most Played', icon: 'trending-up',
    rules: [{ field: 'playCount', operator: 'greater_than', value: 0 }],
    matchAll: true, limit: 50, sortBy: 'playCount', sortOrder: 'desc', createdAt: 0,
  },
  {
    id: '__never_played', name: 'Never Played', icon: 'disc',
    rules: [{ field: 'playCount', operator: 'equals', value: 0 }],
    matchAll: true, limit: 0, sortBy: 'title', sortOrder: 'asc', createdAt: 0,
  },
];

export const useSmartPlaylistStore = create<SmartPlaylistState>()(
  immer((set, get) => ({
    playlists: loadSmartPlaylists(),

    addPlaylist: (playlist) => {
      const newPlaylist: SmartPlaylist = {
        ...playlist,
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      set((s) => { s.playlists.push(newPlaylist); });
      saveSmartPlaylists(get().playlists);
    },

    updatePlaylist: (id, updates) => {
      set((s) => {
        const idx = s.playlists.findIndex((p) => p.id === id);
        if (idx >= 0) Object.assign(s.playlists[idx], updates);
      });
      saveSmartPlaylists(get().playlists);
    },

    deletePlaylist: (id) => {
      set((s) => { s.playlists = s.playlists.filter((p) => p.id !== id); });
      saveSmartPlaylists(get().playlists);
    },

    resolveSongs: (id, allSongs, trackStats) => {
      const builtIn = BUILT_IN_PLAYLISTS.find((p) => p.id === id);
      if (builtIn) return resolvePlaylist(allSongs, builtIn, trackStats);

      const custom = get().playlists.find((p) => p.id === id);
      if (custom) return resolvePlaylist(allSongs, custom, trackStats);

      return [];
    },

    getBuiltInPlaylists: () => BUILT_IN_PLAYLISTS,
  })),
);

export { BUILT_IN_PLAYLISTS };
