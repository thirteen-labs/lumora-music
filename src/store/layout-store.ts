import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';

type FileSizeTheme = 'small' | 'medium' | 'big';
export type LibraryViewMode = 'list' | 'grid';

const FILE_SIZE_KEY = 'lumora-file-size-theme';
const LIBRARY_VIEW_KEY = 'lumora-library-view';

function loadFileSize(): FileSizeTheme {
  try {
    return (storage.getString(FILE_SIZE_KEY) as FileSizeTheme) ?? 'medium';
  } catch { return 'medium'; }
}

function loadLibraryView(): LibraryViewMode {
  try {
    return (storage.getString(LIBRARY_VIEW_KEY) as LibraryViewMode) ?? 'list';
  } catch { return 'list'; }
}

interface LayoutState {
  fileSizeTheme: FileSizeTheme;
  libraryViewMode: LibraryViewMode;
  setFileSizeTheme: (theme: FileSizeTheme) => void;
  setLibraryViewMode: (mode: LibraryViewMode) => void;
}

export const useLayoutStore = create<LayoutState>()(
  immer((set) => ({
    fileSizeTheme: loadFileSize(),
    libraryViewMode: loadLibraryView(),
    setFileSizeTheme: (theme) => {
      set((s) => { s.fileSizeTheme = theme; });
      try { storage.set(FILE_SIZE_KEY, theme); } catch {}
    },
    setLibraryViewMode: (mode) => {
      set((s) => { s.libraryViewMode = mode; });
      try { storage.set(LIBRARY_VIEW_KEY, mode); } catch {}
    },
  })),
);
