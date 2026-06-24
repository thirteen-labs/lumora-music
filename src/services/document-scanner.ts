import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { storage } from '@/services/mmkv';

const PERSISTED_URI_KEY = 'lumora-persisted-doc-uris';

// Re-export everything from the document engine
export {
  scanDocumentsFromSAF,
  scanAllPersistedDirectories,
  scanRootDirectories,
  categorizeAndCount,
  getDocCategory,
  formatFileSize,
  searchDocuments,
  sortDocuments,
  filterByCategory,
  isTextFile,
  getRootDocPaths,
  DOC_CATEGORIES,
  TEXT_EXTENSIONS,
} from './document-engine';

export type {
  DocFile,
  DocCategory,
  CategorizedResult,
  SortField,
  SortOrder,
} from './document-engine';

function loadPersistedUris(): string[] {
  try {
    const raw = storage.getString(PERSISTED_URI_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePersistedUris(uris: string[]): void {
  try { storage.set(PERSISTED_URI_KEY, JSON.stringify(uris)); } catch {}
}

let persistedDocumentUris: string[] = loadPersistedUris();

export function setPersistedDocumentUris(uris: string[]): void {
  persistedDocumentUris = uris;
  savePersistedUris(uris);
}

export function getPersistedDocumentUris(): string[] {
  return persistedDocumentUris;
}

export async function requestDocumentDirectoryPermission(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (result.granted) {
      const uri: string = result.directoryUri;
      if (!persistedDocumentUris.includes(uri)) {
        persistedDocumentUris.push(uri);
      }
      return uri;
    }
    return null;
  } catch (error) {
    console.error('[DocScanner] Failed to request SAF permission:', error);
    return null;
  }
}

export async function openDocument(uri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream' });
  }
}