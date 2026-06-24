import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import {
  scanRootDirectories,
  scanAllPersistedDirectories,
  categorizeAndCount,
  type DocFile,
  type CategorizedResult,
  DOC_CATEGORIES,
} from '@/services/document-engine';
import { getPersistedDocumentUris } from '@/services/document-scanner';

const DOC_CACHE_KEY = 'lumora-documents';
const DOC_CACHE_TIME_KEY = 'lumora-documents-time';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

interface DocumentState {
  files: DocFile[];
  scanStatus: ScanStatus;
  scanError: string | null;
  lastScanTime: number;
  categorized: CategorizedResult;
  categories: typeof DOC_CATEGORIES;
  scanDocuments: (force?: boolean) => Promise<void>;
  getCategoryCount: (id: string) => number;
}

function loadCached(): { files: DocFile[]; lastScanTime: number } {
  try {
    const raw = storage.getString(DOC_CACHE_KEY);
    const timeRaw = storage.getString(DOC_CACHE_TIME_KEY);
    return {
      files: raw ? JSON.parse(raw) : [],
      lastScanTime: timeRaw ? new Date(timeRaw).getTime() : 0,
    };
  } catch {
    return { files: [], lastScanTime: 0 };
  }
}

const cached = loadCached();

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    files: cached.files,
    scanStatus: cached.files.length > 0 ? 'complete' : 'idle',
    scanError: null,
    lastScanTime: cached.lastScanTime,
    categorized: categorizeAndCount(cached.files),
    categories: DOC_CATEGORIES,

    scanDocuments: async (force?: boolean) => {
      if (!force) {
        const existing = get().files;
        if (existing.length > 0) return;
      }

      set((s) => {
        s.scanStatus = 'scanning';
        s.scanError = null;
      });

      try {
        const persistedUris = getPersistedDocumentUris();
        let docs: DocFile[];
        if (persistedUris.length > 0) {
          docs = await scanAllPersistedDirectories(persistedUris);
          const rootDocs = await scanRootDirectories();
          const seen = new Set(docs.map((d) => d.uri));
          for (const doc of rootDocs) {
            if (!seen.has(doc.uri)) {
              docs.push(doc);
              seen.add(doc.uri);
            }
          }
        } else {
          docs = await scanRootDirectories();
        }

        storage.set(DOC_CACHE_KEY, JSON.stringify(docs));
        storage.set(DOC_CACHE_TIME_KEY, new Date().toISOString());

        set((s) => {
          s.files = docs;
          s.categorized = categorizeAndCount(docs);
          s.scanStatus = 'complete';
          s.lastScanTime = Date.now();
        });
      } catch (e: any) {
        set((s) => {
          s.scanStatus = 'error';
          s.scanError = e?.message ?? 'Document scan failed';
        });
      }
    },

    getCategoryCount: (id: string) => {
      return get().categorized.counts[id] ?? 0;
    },
  })),
);
