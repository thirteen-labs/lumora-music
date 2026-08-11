import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { scanSystemFolders, groupFilesBySubstring, type ScannedFile, type FileGroup } from '@/services/system-scanner';

const HIDDEN_FILES_KEY = 'lumora-hidden-files';
const HIDDEN_GROUPS_KEY = 'lumora-hidden-groups';
const HIDDEN_LAST_SCAN_KEY = 'lumora-hidden-last-scan';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

interface SystemHiddenState {
  files: ScannedFile[];
  groups: FileGroup[];
  status: ScanStatus;
  error: string | null;
  lastScanTime: number | null;
  scan: () => Promise<void>;
  clear: () => void;
}

function loadPersistedFiles(): { files: ScannedFile[]; groups: FileGroup[]; lastScanTime: number | null } {
  try {
    const filesRaw = storage.getString(HIDDEN_FILES_KEY);
    const groupsRaw = storage.getString(HIDDEN_GROUPS_KEY);
    const lastScanRaw = storage.getString(HIDDEN_LAST_SCAN_KEY);
    return {
      files: filesRaw ? JSON.parse(filesRaw) : [],
      groups: groupsRaw ? JSON.parse(groupsRaw) : [],
      lastScanTime: lastScanRaw ? JSON.parse(lastScanRaw) : null,
    };
  } catch {
    return { files: [], groups: [], lastScanTime: null };
  }
}

const persisted = loadPersistedFiles();

export const useSystemHiddenStore = create<SystemHiddenState>()(
  immer((set) => ({
    files: persisted.files,
    groups: persisted.groups,
    status: persisted.files.length > 0 ? 'complete' : 'idle',
    error: null,
    lastScanTime: persisted.lastScanTime,

    scan: async () => {
      set((s) => {
        s.status = 'scanning';
        s.error = null;
      });

      try {
        const files = await scanSystemFolders();
        const groups = groupFilesBySubstring(files);
        const now = Date.now();

        storage.set(HIDDEN_FILES_KEY, JSON.stringify(files));
        storage.set(HIDDEN_GROUPS_KEY, JSON.stringify(groups));
        storage.set(HIDDEN_LAST_SCAN_KEY, JSON.stringify(now));

        set((s) => {
          s.files = files;
          s.groups = groups;
          s.status = 'complete';
          s.lastScanTime = now;
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        set((s) => {
          s.status = 'error';
          s.error = message;
        });
      }
    },

    clear: () => {
      storage.remove(HIDDEN_FILES_KEY);
      storage.remove(HIDDEN_GROUPS_KEY);
      storage.remove(HIDDEN_LAST_SCAN_KEY);

      set((s) => {
        s.files = [];
        s.groups = [];
        s.status = 'idle';
        s.error = null;
        s.lastScanTime = null;
      });
    },
  })),
);
