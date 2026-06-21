import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { CloudProviderId } from '@/services/cloud-backup';

const CLOUD_KEY = 'lumora-cloud-providers';
const LAST_BACKUP_KEY = 'lumora-last-backup';
const AUTO_BACKUP_KEY = 'lumora-auto-backup';
const AUTO_BACKUP_INTERVAL_KEY = 'lumora-auto-backup-interval';

export type AutoBackupInterval = 'daily' | 'weekly' | 'monthly' | 'off';

function loadConnectedProviders(): CloudProviderId[] {
  try {
    const raw = storage.getString(CLOUD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLastBackup(): number | null {
  try {
    const val = storage.getNumber(LAST_BACKUP_KEY);
    return val ?? null;
  } catch {
    return null;
  }
}

function loadAutoBackup(): boolean {
  try {
    return storage.getBoolean(AUTO_BACKUP_KEY) ?? false;
  } catch {
    return false;
  }
}

function loadAutoBackupInterval(): AutoBackupInterval {
  try {
    return (storage.getString(AUTO_BACKUP_INTERVAL_KEY) as AutoBackupInterval) ?? 'weekly';
  } catch {
    return 'weekly';
  }
}

interface CloudState {
  connectedProviders: CloudProviderId[];
  lastBackupTimestamp: number | null;
  autoBackup: boolean;
  autoBackupInterval: AutoBackupInterval;
  isConnecting: boolean;
  connectProvider: (id: CloudProviderId) => void;
  disconnectProvider: (id: CloudProviderId) => void;
  isConnected: (id: CloudProviderId) => boolean;
  setLastBackup: (timestamp: number) => void;
  setAutoBackup: (enabled: boolean) => void;
  setAutoBackupInterval: (interval: AutoBackupInterval) => void;
  clearAllConnections: () => void;
}

export const useCloudStore = create<CloudState>()(
  immer((set, get) => ({
    connectedProviders: loadConnectedProviders(),
    lastBackupTimestamp: loadLastBackup(),
    autoBackup: loadAutoBackup(),
    autoBackupInterval: loadAutoBackupInterval(),
    isConnecting: false,

    connectProvider: (id) => {
      set((s) => {
        if (!s.connectedProviders.includes(id)) {
          s.connectedProviders.push(id);
        }
        s.isConnecting = false;
      });
      try { storage.set(CLOUD_KEY, JSON.stringify(get().connectedProviders)); } catch {}
    },

    disconnectProvider: (id) => {
      set((s) => {
        s.connectedProviders = s.connectedProviders.filter((p) => p !== id);
      });
      try { storage.set(CLOUD_KEY, JSON.stringify(get().connectedProviders)); } catch {}
    },

    isConnected: (id) => get().connectedProviders.includes(id),

    setLastBackup: (timestamp) => {
      set((s) => { s.lastBackupTimestamp = timestamp; });
      try { storage.set(LAST_BACKUP_KEY, timestamp); } catch {}
    },

    setAutoBackup: (enabled) => {
      set((s) => { s.autoBackup = enabled; });
      try { storage.set(AUTO_BACKUP_KEY, enabled); } catch {}
    },

    setAutoBackupInterval: (interval) => {
      set((s) => { s.autoBackupInterval = interval; });
      try { storage.set(AUTO_BACKUP_INTERVAL_KEY, interval); } catch {}
    },

    clearAllConnections: () => {
      set((s) => {
        s.connectedProviders = [];
        s.lastBackupTimestamp = null;
        s.autoBackup = false;
      });
      try { storage.set(CLOUD_KEY, JSON.stringify([])); } catch {}
    },
  })),
);
