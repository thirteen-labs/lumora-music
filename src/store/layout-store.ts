import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

type FileSizeTheme = 'small' | 'medium' | 'big';

const FILE_SIZE_KEY = 'lumora-file-size-theme';

function loadFileSize(): FileSizeTheme {
  try {
    return (storage.getString(FILE_SIZE_KEY) as FileSizeTheme) ?? 'medium';
  } catch { return 'medium'; }
}

interface LayoutState {
  fileSizeTheme: FileSizeTheme;
  setFileSizeTheme: (theme: FileSizeTheme) => void;
}

export const useLayoutStore = create<LayoutState>()(
  immer((set) => ({
    fileSizeTheme: loadFileSize(),
    setFileSizeTheme: (theme) => {
      set((s) => { s.fileSizeTheme = theme; });
      try { storage.set(FILE_SIZE_KEY, theme); } catch {}
    },
  })),
);
