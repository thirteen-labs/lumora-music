import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { storage } from '@/services/mmkv';
import { usePlaylistStore } from '@/store/playlist-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useStatsStore } from '@/store/stats-store';
import { useThemeStore } from '@/store/theme-store';
import { useSettingsStore } from '@/store/settings-store';
import { useEqualizerStore } from '@/store/equalizer-store';
import { usePlaybackSpeedStore } from '@/store/playback-speed-store';
import { useLoudnessEnhancerStore } from '@/store/loudness-enhancer-store';
import { useSmartPlaylistStore } from '@/store/smart-playlist-store';
import type { Playlist, Song } from '@/types/media';
import type { SmartPlaylist, TrackStats } from '@/types/audio';
import type { ThemeId } from '@/types/theme';

const BACKUP_VERSION = 1;
const BACKUP_MIME_TYPE = 'application/json';

export interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

export type CloudProviderId = 'google-drive' | 'dropbox' | 'mega' | 'onedrive' | 'custom';

export const CLOUD_PROVIDERS: CloudProvider[] = [
  { id: 'google-drive', name: 'Google Drive', icon: 'HardDrive', color: '#4285F4', connected: false },
  { id: 'dropbox', name: 'Dropbox', icon: 'Cloud', color: '#0061FF', connected: false },
  { id: 'mega', name: 'MEGA', icon: 'FolderOpen', color: '#D90007', connected: false },
  { id: 'onedrive', name: 'OneDrive', icon: 'Cloud', color: '#0078D4', connected: false },
  { id: 'custom', name: 'Other Cloud', icon: 'Server', color: '#6B7280', connected: false },
];

export interface BackupMetadata {
  version: number;
  createdAt: number;
  appVersion: string;
  songCount: number;
  playlistCount: number;
  fileSize: number;
}

export interface BackupData {
  metadata: BackupMetadata;
  playlists: Playlist[];
  smartPlaylists: SmartPlaylist[];
  favoriteSongIds: string[];
  favoriteVideoIds: string[];
  trackStats: Record<string, TrackStats>;
  themeId: ThemeId;
  settings: Record<string, string | boolean | number | null>;
  equalizer: {
    enabled: boolean;
    preset: string;
    bands: { frequency: number; gain: number }[];
    bassBoost: number;
    balance: number;
  };
  playbackSpeed: { speed: number; pitchCorrection: boolean };
  loudnessEnhancer: { enabled: boolean; level: number };
}

function getSettingsSnapshot(): Record<string, string | boolean | number | null> {
  const s = useSettingsStore.getState();
  return {
    defaultShuffle: s.defaultShuffle,
    defaultRepeat: s.defaultRepeat,
    crossfade: s.crossfade,
    crossfadeDuration: s.crossfadeDuration,
    colorAware: s.colorAware,
    language: s.language,
    fontFamily: s.fontFamily,
    showSystemHiddenFiles: s.showSystemHiddenFiles,
    audioQuality: s.audioQuality,
    videoQuality: s.videoQuality,
    gaplessPlayback: s.gaplessPlayback,
    playTogether: s.playTogether,
    newMediaNotification: s.newMediaNotification,
    pushNotification: s.pushNotification,
    nowPlayingLayout: s.nowPlayingLayout,
  };
}

export async function collectBackupData(songs: Song[]): Promise<BackupData> {
  const eq = useEqualizerStore.getState();
  const speed = usePlaybackSpeedStore.getState();
  const loudness = useLoudnessEnhancerStore.getState();

  const data: BackupData = {
    metadata: {
      version: BACKUP_VERSION,
      createdAt: Date.now(),
      appVersion: '1.0.0',
      songCount: songs.length,
      playlistCount: usePlaylistStore.getState().playlists.length,
      fileSize: 0,
    },
    playlists: usePlaylistStore.getState().playlists,
    smartPlaylists: useSmartPlaylistStore.getState().playlists,
    favoriteSongIds: useFavoritesStore.getState().favoriteSongIds,
    favoriteVideoIds: useFavoritesStore.getState().favoriteVideoIds,
    trackStats: useStatsStore.getState().trackStats,
    themeId: useThemeStore.getState().currentThemeId,
    settings: getSettingsSnapshot(),
    equalizer: {
      enabled: eq.enabled,
      preset: eq.preset,
      bands: eq.bands.map((b) => ({ frequency: b.frequency, gain: b.gain })),
      bassBoost: eq.bassBoost,
      balance: eq.balance,
    },
    playbackSpeed: { speed: speed.speed, pitchCorrection: speed.pitchCorrection },
    loudnessEnhancer: { enabled: loudness.enabled, level: loudness.level },
  };

  data.metadata.fileSize = new Blob([JSON.stringify(data)]).size;
  return data;
}

export async function exportBackup(data: BackupData): Promise<boolean> {
  try {
    const json = JSON.stringify(data, null, 2);
    const fileName = `lumora-backup-${new Date().toISOString().split('T')[0]}.json`;
    const cacheDir = Paths.cache.uri;
    const fileUri = `${cacheDir}${fileName}`;

    const file = new File(fileUri);
    await file.write(json);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: BACKUP_MIME_TYPE,
        dialogTitle: 'Save Lumora Backup',
        UTI: 'public.json',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function importBackup(): Promise<BackupData | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: BACKUP_MIME_TYPE,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const fileUri = result.assets[0].uri;
    const file = new File(fileUri);
    const json = await file.text();

    const data: BackupData = JSON.parse(json);

    if (!data.metadata || data.metadata.version !== BACKUP_VERSION) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function restoreFromBackup(data: BackupData): Promise<boolean> {
  try {
    if (data.playlists) {
      storage.set('lumora-playlists', JSON.stringify(data.playlists));
      usePlaylistStore.getState().loadPlaylists();
    }

    if (data.smartPlaylists) {
      storage.set('lumora-smart-playlists', JSON.stringify(data.smartPlaylists));
    }

    if (data.favoriteSongIds) {
      storage.set('lumora-fav-songs', JSON.stringify(data.favoriteSongIds));
    }
    if (data.favoriteVideoIds) {
      storage.set('lumora-fav-videos', JSON.stringify(data.favoriteVideoIds));
    }

    if (data.trackStats) {
      storage.set('lumora-track-stats', JSON.stringify(data.trackStats));
    }

    if (data.themeId) {
      storage.set('lumora-theme-id', data.themeId);
    }

    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        const storageKey = `lumora-setting-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        if (typeof value === 'boolean') {
          storage.set(storageKey, value);
        } else if (typeof value === 'number') {
          storage.set(storageKey, String(value));
        } else if (value !== null && value !== undefined) {
          storage.set(storageKey, String(value));
        }
      }
    }

    if (data.equalizer) {
      storage.set('lumora-eq-settings', JSON.stringify(data.equalizer));
    }

    if (data.playbackSpeed) {
      storage.set('lumora-playback-speed', JSON.stringify(data.playbackSpeed));
    }

    if (data.loudnessEnhancer) {
      storage.set('lumora-loudness-enhancer', data.loudnessEnhancer.enabled);
      storage.set('lumora-loudness-level', data.loudnessEnhancer.level);
    }

    return true;
  } catch {
    return false;
  }
}
