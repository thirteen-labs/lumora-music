import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { scanSystemFolders, groupFilesBySubstring, type ScannedFile, type FileGroup } from '@/services/system-scanner';

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

export const useSystemHiddenStore = create<SystemHiddenState>()(
  immer((set, get) => ({
    files: [],
    groups: [],
    status: 'idle',
    error: null,
    lastScanTime: null,

    scan: async () => {
      set((s) => {
        s.status = 'scanning';
        s.error = null;
      });

      try {
        const files = await scanSystemFolders();
        const groups = groupFilesBySubstring(files);

        set((s) => {
          s.files = files;
          s.groups = groups;
          s.status = 'complete';
          s.lastScanTime = Date.now();
        });
      } catch (e: any) {
        set((s) => {
          s.status = 'error';
          s.error = e?.message ?? 'Scan failed';
        });
      }
    },

    clear: () => {
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
