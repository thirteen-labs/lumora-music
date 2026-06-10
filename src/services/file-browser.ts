import { Paths, File, Directory } from 'expo-file-system';

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

    for (const entry of entries) {
      const name = entry.name;
      if (name.startsWith('.')) continue;

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
            modificationTime: (info as any).modificationTime ?? 0,
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
  return Paths.document.uri ?? Paths.cache.uri ?? '/';
}

export function getParentPath(uri: string): string | null {
  const cleaned = uri.replace(/\/$/, '');
  const lastSlash = cleaned.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  return cleaned.substring(0, lastSlash + 1);
}
