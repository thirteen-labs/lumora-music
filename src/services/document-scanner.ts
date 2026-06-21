import { Directory, File } from 'expo-file-system';
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

const extToCategory = new Map<string, DocCategory>();
for (const cat of DOC_CATEGORIES) {
  for (const ext of cat.extensions) {
    extToCategory.set(ext, cat);
  }
}

export function getDocCategory(name: string): DocCategory | null {
  return extToCategory.get(getExtension(name)) ?? null;
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
    return [
      '/storage/emulated/0/Download',
      '/storage/emulated/0/Documents',
      '/storage/emulated/0/DCIM',
      '/storage/emulated/0/Android/media',
    ];
  }
  return [];
}

async function scanDirRecursive(dirUri: string, maxDepth = 5): Promise<DocFile[]> {
  if (maxDepth <= 0) return [];
  try {
    const dir = new Directory(dirUri);
    const entries = await dir.list();
    if (entries.length === 0) return [];

    const dirs: Directory[] = [];
    const docFiles: File[] = [];

    for (const entry of entries) {
      if (entry instanceof Directory) {
        dirs.push(entry);
      } else if (entry instanceof File) {
        const ext = getExtension(entry.name);
        if (extToCategory.has(ext)) {
          docFiles.push(entry);
        }
      }
    }

    const [nestedResults, fileResults] = await Promise.all([
      Promise.all(dirs.map((d) => scanDirRecursive(d.uri, maxDepth - 1))),
      batchFileInfo(docFiles),
    ]);

    const results: DocFile[] = fileResults;
    for (const nr of nestedResults) {
      results.push(...nr);
    }
    return results;
  } catch {
    return [];
  }
}

async function batchFileInfo(files: File[]): Promise<DocFile[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const info = await file.info();
        return {
          name: file.name,
          uri: file.uri,
          size: info.size ?? 0,
          modificationTime: (info as any).modificationTime ?? 0,
        } as DocFile;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is DocFile => r !== null);
}

export async function scanRootDirectories(): Promise<DocFile[]> {
  const paths = getRootDocPaths();
  const results = await Promise.all(
    paths.map(async (rootPath) => {
      try {
        return await scanDirRecursive(rootPath);
      } catch (error) {
        console.warn('[DocScanner] Failed to scan root path:', rootPath, error);
        return [] as DocFile[];
      }
    })
  );
  const seen = new Set<string>();
  const unique: DocFile[] = [];
  for (const docs of results) {
    for (const doc of docs) {
      if (!seen.has(doc.uri)) {
        seen.add(doc.uri);
        unique.push(doc);
      }
    }
  }
  unique.sort((a, b) => a.name.localeCompare(b.name));
  return unique;
}

export interface CategorizedResult {
  categorized: Record<string, DocFile[]>;
  counts: Record<string, number>;
}

export function categorizeAndCount(docs: DocFile[]): CategorizedResult {
  const categorized: Record<string, DocFile[]> = {};
  const counts: Record<string, number> = {};
  for (const cat of DOC_CATEGORIES) {
    categorized[cat.id] = [];
    counts[cat.id] = 0;
  }
  for (const doc of docs) {
    const cat = getDocCategory(doc.name);
    const id = cat?.id ?? 'other';
    if (!categorized[id]) categorized[id] = [];
    categorized[id].push(doc);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return { categorized, counts };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}