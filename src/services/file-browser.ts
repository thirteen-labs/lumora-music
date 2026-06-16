import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import { StorageAccessFramework, getInfoAsync } from 'expo-file-system/legacy';
import { useSettingsStore } from '@/store/settings-store';

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  modificationTime: number;
}

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.includes(getExtension(name));
}

function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.includes(getExtension(name));
}

export function getMediaType(name: string): 'audio' | 'video' | null {
  if (isAudioFile(name)) return 'audio';
  if (isVideoFile(name)) return 'video';
  return null;
}

export async function listDirectory(uri: string): Promise<FileItem[]> {
  const showHidden = useSettingsStore.getState().showSystemHiddenFiles;

  if (uri.startsWith('content://')) {
    return listDirectorySAF(uri, showHidden);
  }

  return listDirectoryLegacy(uri, showHidden);
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