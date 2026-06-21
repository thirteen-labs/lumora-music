import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { reportWarning } from '@/utils/error-handler';
import type { CloudProviderId } from '@/services/cloud-backup';
import {
  getProviders,
  setGoogleClientId,
  setDropboxAppKey,
  getGoogleClientId,
  getDropboxAppKey,
  refreshProviders,
} from '@/services/cloud-providers';

const LAST_BACKUP_KEY = 'lumora-last-backup';
const AUTO_BACKUP_KEY = 'lumora-auto-backup';
const AUTO_BACKUP_INTERVAL_KEY = 'lumora-auto-backup-interval';

export type AutoBackupInterval = 'daily' | 'weekly' | 'monthly' | 'off';

function loadLastBackup(): number | null {
  try {
    const val = storage.getNumber(LAST_BACKUP_KEY);
    return val ?? null;
  } catch (e) {
    reportWarning('Cloud', e);
    return null;
  }
}

function loadAutoBackup(): boolean {
  try {
    return storage.getBoolean(AUTO_BACKUP_KEY) ?? false;
  } catch (e) {
    reportWarning('Cloud', e);
    return false;
  }
}

function loadAutoBackupInterval(): AutoBackupInterval {
  try {
    return (storage.getString(AUTO_BACKUP_INTERVAL_KEY) as AutoBackupInterval) ?? 'weekly';
  } catch (e) {
    reportWarning('Cloud', e);
    return 'weekly';
  }
}

interface CloudState {
  googleClientId: string;
  dropboxAppKey: string;
  lastBackupTimestamp: number | null;
  autoBackup: boolean;
  autoBackupInterval: AutoBackupInterval;
  connectedProviders: CloudProviderId[];
  setGoogleCredentials: (clientId: string) => void;
  setDropboxCredentials: (appKey: string) => void;
  setLastBackup: (timestamp: number) => void;
  setAutoBackup: (enabled: boolean) => void;
  setAutoBackupInterval: (interval: AutoBackupInterval) => void;
  refreshConnectionStatus: () => CloudProviderId[];
  isConnected: (id: CloudProviderId) => boolean;
}

export const useCloudStore = create<CloudState>()(
  immer((set, get) => ({
    googleClientId: getGoogleClientId(),
    dropboxAppKey: getDropboxAppKey(),
    lastBackupTimestamp: loadLastBackup(),
    autoBackup: loadAutoBackup(),
    autoBackupInterval: loadAutoBackupInterval(),
    connectedProviders: [],

    setGoogleCredentials: (clientId) => {
      setGoogleClientId(clientId);
      set((s) => { s.googleClientId = clientId; });
      refreshProviders();
      get().refreshConnectionStatus();
    },

    setDropboxCredentials: (appKey) => {
      setDropboxAppKey(appKey);
      set((s) => { s.dropboxAppKey = appKey; });
      refreshProviders();
      get().refreshConnectionStatus();
    },

    setLastBackup: (timestamp) => {
      set((s) => { s.lastBackupTimestamp = timestamp; });
      try { storage.set(LAST_BACKUP_KEY, timestamp); } catch (e) { reportWarning('Cloud', e); }
    },

    setAutoBackup: (enabled) => {
      set((s) => { s.autoBackup = enabled; });
      try { storage.set(AUTO_BACKUP_KEY, enabled); } catch (e) { reportWarning('Cloud', e); }
    },

    setAutoBackupInterval: (interval) => {
      set((s) => { s.autoBackupInterval = interval; });
      try { storage.set(AUTO_BACKUP_INTERVAL_KEY, interval); } catch (e) { reportWarning('Cloud', e); }
    },

    refreshConnectionStatus: () => {
      const providers = getProviders();
      const connected = providers
        .filter((p) => p.isConnected())
        .map((p) => p.id as CloudProviderId);
      set((s) => { s.connectedProviders = connected; });
      return connected;
    },

    isConnected: (id) => {
      return get().connectedProviders.includes(id);
    },
  })),
);
