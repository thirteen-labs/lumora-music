import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import { StorageAccessFramework, getInfoAsync } from 'expo-file-system/legacy';
import { useSettingsStore } from '@/store/settings-store';
import { getCachedDirectory, setCachedDirectory, invalidateCache } from '@/services/directory-cache';

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  modificationTime: number;
}

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

export function getMediaType(name: string): 'audio' | null {
  return AUDIO_EXTENSIONS.includes(getExtension(name)) ? 'audio' : null;
}

export interface MediaFolderItem extends FileItem {
  mediaCount: { audio: number };
}

export async function countMediaFiles(uri: string, filterType?: 'audio'): Promise<{ audio: number }> {
  const entries = await listDirectory(uri);
  let audio = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const type = getMediaType(entry.name);
    if (filterType && type !== filterType) continue;
    if (type === 'audio') audio++;
  }
  return { audio };
}

export async function listMediaContents(uri: string, filterType?: 'audio'): Promise<{
  mediaFiles: FileItem[];
  mediaFolders: MediaFolderItem[];
}> {
  const entries = await listDirectory(uri);

  const folders: FileItem[] = [];
  const mediaFiles: FileItem[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      folders.push(entry);
    } else if (getMediaType(entry.name)) {
      if (!filterType || getMediaType(entry.name) === filterType) {
        mediaFiles.push(entry);
      }
    }
  }

  const results = await Promise.all(
    folders.map(async (folder) => {
      const count = await countMediaFiles(folder.uri, filterType);
      return { folder, count };
    })
  );

  const mediaFolders: MediaFolderItem[] = [];
  for (const { folder, count } of results) {
    if (count.audio > 0) {
      mediaFolders.push({ ...folder, mediaCount: count });
    }
  }

  return { mediaFiles, mediaFolders };
}

export async function listDirectory(uri: string): Promise<FileItem[]> {
  const showHidden = useSettingsStore.getState().showSystemHiddenFiles;

  const cached = getCachedDirectory(uri, showHidden);
  if (cached) return cached;

  let items: FileItem[];
  if (uri.startsWith('content://')) {
    items = await listDirectorySAF(uri, showHidden);
  } else {
    items = await listDirectoryLegacy(uri, showHidden);
  }

  setCachedDirectory(uri, items, showHidden);
  return items;
}

async function listDirectorySAF(uri: string, showHidden: boolean): Promise<FileItem[]> {
  try {
    const entries = await StorageAccessFramework.readDirectoryAsync(uri);
    const results: FileItem[] = [];

    for (const entry of entries) {
      try {
        const info = await getInfoAsync(entry);
        if (!info.exists) continue;

        let name = entry.split('/').pop()?.split('%2F').pop()?.split('/').pop() ?? '';
        if (!name) {
          const lastSegment = entry.split('%2F').pop() ?? entry.split('/').pop() ?? '';
          name = decodeURIComponent(lastSegment);
        }

        if (!showHidden && name.startsWith('.')) continue;

        if (info.isDirectory) {
          results.push({
            name,
            uri: entry,
            isDirectory: true,
            size: 0,
            modificationTime: info.modificationTime ?? 0,
          });
        } else {
          results.push({
            name,
            uri: entry,
            isDirectory: false,
            size: info.size ?? 0,
            modificationTime: info.modificationTime ?? 0,
          });
        }
      } catch {
        continue;
      }
    }

    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (error) {
    console.warn('[FileBrowser] SAF listDirectory failed:', uri, error);
    return [];
  }
}

async function listDirectoryLegacy(uri: string, showHidden: boolean): Promise<FileItem[]> {
  try {
    const dir = new Directory(uri);
    const entries = await dir.list();
    const results: FileItem[] = [];

    for (const entry of entries) {
      const name = entry.name;
      if (!showHidden && name.startsWith('.')) continue;

      try {
        if (entry instanceof Directory) {
          results.push({
            name,
            uri: entry.uri,
            isDirectory: true,
            size: 0,
            modificationTime: 0,
          });
        } else if (entry instanceof File) {
          const info = await entry.info();
          results.push({
            name,
            uri: entry.uri,
            isDirectory: false,
            size: info.size ?? 0,
            modificationTime: 'modificationTime' in info ? (info as any).modificationTime ?? 0 : 0,
          });
        }
      } catch {
        continue;
      }
    }

    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (error) {
    console.warn('[FileBrowser] Legacy listDirectory failed:', uri, error);
    return [];
  }
}

export function getRootPath(): string {
  if (Platform.OS === 'android') {
    return '/storage/emulated/0/';
  }
  return Paths.document.uri ?? Paths.cache.uri ?? '/';
}

export async function getAccessibleRootPath(): Promise<string> {
  if (Platform.OS === 'android') {
    const storagePath = '/storage/emulated/0/';
    try {
      const dir = new Directory(storagePath);
      const entries = await dir.list();
      if (entries.length > 0) return storagePath;
    } catch {
      // Fall through to SAF
    }
    try {
      const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (result.granted) {
        return result.directoryUri;
      }
    } catch (error) {
      console.warn('[FileBrowser] SAF fallback also failed:', error);
    }
    const docUri = Paths.document.uri;
    if (docUri) return docUri;
  }
  return getRootPath();
}

export function getParentPath(uri: string): string | null {
  const cleaned = uri.replace(/\/$/, '');
  const lastSlash = cleaned.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  return cleaned.substring(0, lastSlash + 1);
}