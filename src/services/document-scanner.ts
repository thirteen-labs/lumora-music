import { File, Directory } from 'expo-file-system';
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

export async function scanDocuments(rootUri: string): Promise<DocFile[]> {
  const results: DocFile[] = [];

  async function scanDir(dirUri: string): Promise<void> {
    try {
      const dir = new Directory(dirUri);
      const entries = await dir.list();
      for (const entry of entries) {
        try {
          if (entry instanceof Directory) {
            await scanDir(entry.uri);
          } else if (entry instanceof File) {
            const ext = getExtension(entry.name);
            const isDoc = DOC_CATEGORIES.some((cat) => cat.extensions.includes(ext));
            if (isDoc) {
              const info = await entry.info();
              results.push({
                name: entry.name,
                uri: entry.uri,
                size: info.size ?? 0,
                modificationTime: 'modificationTime' in info ? (info as any).modificationTime ?? 0 : 0,
              });
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  await scanDir(rootUri);
  results.sort((a, b) => b.modificationTime - a.modificationTime);
  return results;
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
