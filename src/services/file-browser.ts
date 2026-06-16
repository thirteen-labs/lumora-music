import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
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
  try {
    const dir = new Directory(uri);
    const entries = await dir.list();
    const results: FileItem[] = [];
    const showHidden = useSettingsStore.getState().showSystemHiddenFiles;

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
  } catch {
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
    } catch {}
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
