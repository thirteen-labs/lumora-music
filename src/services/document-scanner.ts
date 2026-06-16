import { StorageAccessFramework, getInfoAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface DocFile {
  name: string;
  uri: string;
  size: number;
  modificationTime: number;
}

export interface DocCategory {
  id: string;
  label: string;
  icon: string;
  extensions: string[];
  color: string;
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: 'pdf', label: 'PDF', icon: 'FileText', extensions: ['.pdf'], color: '#EF4444' },
  { id: 'word', label: 'Word', icon: 'FileText', extensions: ['.doc', '.docx'], color: '#3B82F6' },
  { id: 'excel', label: 'Excel', icon: 'Table', extensions: ['.xls', '.xlsx', '.csv'], color: '#10B981' },
  { id: 'powerpoint', label: 'PowerPoint', icon: 'Presentation', extensions: ['.ppt', '.pptx'], color: '#F59E0B' },
  { id: 'epub', label: 'ePub', icon: 'BookOpen', extensions: ['.epub'], color: '#8B5CF6' },
  { id: 'text', label: 'Text', icon: 'File', extensions: ['.txt', '.md', '.rtf', '.json', '.xml', '.log'], color: '#6B7280' },
  { id: 'other', label: 'Other', icon: 'FileArchive', extensions: ['.odt', '.ods', '.odp', '.pages', '.numbers', '.key'], color: '#EC4899' },
];

let persistedDocumentUris: string[] = [];

export function setPersistedDocumentUris(uris: string[]): void {
  persistedDocumentUris = uris;
}

export function getPersistedDocumentUris(): string[] {
  return persistedDocumentUris;
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

export function getDocCategory(name: string): DocCategory | null {
  const ext = getExtension(name);
  for (const cat of DOC_CATEGORIES) {
    if (cat.extensions.includes(ext)) return cat;
  }
  return null;
}

export async function scanDocumentsFromSAF(dirUri: string): Promise<DocFile[]> {
  const results: DocFile[] = [];

  async function scanDir(uri: string): Promise<void> {
    try {
      const entries = await StorageAccessFramework.readDirectoryAsync(uri);
      for (const entry of entries) {
        try {
          const info = await getInfoAsync(entry);
          if (!info.exists) continue;

          if (info.isDirectory) {
            await scanDir(entry);
          } else {
            const name = entry.split('/').pop()?.split('%2F').pop()?.split('/').pop() ?? '';
            const ext = getExtension(name);
            const isDoc = DOC_CATEGORIES.some((cat) => cat.extensions.includes(ext));
            if (isDoc && name) {
              results.push({
                name,
                uri: entry,
                size: info.size ?? 0,
                modificationTime: info.modificationTime ?? 0,
              });
            }
          }
        } catch (innerError) {
          console.warn('[DocScanner] Failed to process entry:', entry, innerError);
        }
      }
    } catch (dirError) {
      console.warn('[DocScanner] Failed to read directory:', uri, dirError);
    }
  }

  await scanDir(dirUri);
  results.sort((a, b) => b.modificationTime - a.modificationTime);
  return results;
}

export async function requestDocumentDirectoryPermission(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (result.granted) {
      const uri: string = result.directoryUri;
      console.log('[DocScanner] SAF permission granted for:', uri);
      if (!persistedDocumentUris.includes(uri)) {
        persistedDocumentUris.push(uri);
      }
      return uri;
    }
    console.warn('[DocScanner] SAF permission denied');
    return null;
  } catch (error) {
    console.error('[DocScanner] Failed to request SAF permission:', error);
    return null;
  }
}

export async function scanAllPersistedDirectories(): Promise<DocFile[]> {
  const allResults: DocFile[] = [];
  for (const uri of persistedDocumentUris) {
    try {
      const files = await scanDocumentsFromSAF(uri);
      allResults.push(...files);
    } catch (error) {
      console.error('[DocScanner] Failed to scan persisted directory:', uri, error);
    }
  }
  return allResults;
}

export async function openDocument(uri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream' });
  }
}

export function getRootDocPaths(): string[] {
  if (Platform.OS === 'android') {
    return ['/storage/emulated/0/Download', '/storage/emulated/0/Documents', '/storage/emulated/0'];
  }
  return [];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}