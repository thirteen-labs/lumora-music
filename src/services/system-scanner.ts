import { Directory, File } from 'expo-file-system';

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const MAX_DEPTH = 4;

export interface ScannedFile {
  name: string;
  uri: string;
  size: number;
  modificationTime: number;
  sourcePath: string;
}

export interface FileGroup {
  name: string;
  files: ScannedFile[];
  type: 'audio';
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'with', 'file', 'new', 'old', 'tmp', 'temp', 'test', 'backup', 'copy']);

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

function isMediaFile(name: string): boolean {
  return AUDIO_EXTENSIONS.includes(getExtension(name));
}

const SYSTEM_PATHS: string[] = [
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Videos',
];

// NOTE: Direct filesystem paths may fail on Android 11+ (Scoped Storage).
// The primary scanner (services/scanner.ts) uses MediaStore queries which work on all Android versions.
// This fallback scanner is used for the "Deep Files" feature with SAF permissions.

async function scanDirectoryRecursive(dirUri: string, depth: number, seen: Set<string>): Promise<ScannedFile[]> {
  if (depth > MAX_DEPTH || seen.has(dirUri)) return [];
  seen.add(dirUri);

  try {
    const dir = new Directory(dirUri);
    const entries = await dir.list();
    const results: ScannedFile[] = [];

    for (const entry of entries) {
      try {
        const name = entry.name;
        if (name.startsWith('.')) continue;

        if (entry instanceof Directory) {
          const sub = await scanDirectoryRecursive(entry.uri, depth + 1, seen);
          results.push(...sub);
        } else if (entry instanceof File) {
          if (isMediaFile(name)) {
            const info = await entry.info();
            results.push({
              name,
              uri: entry.uri,
              size: info.size ?? 0,
              modificationTime: 'modificationTime' in info ? (info as { modificationTime?: number }).modificationTime ?? 0 : 0,
              sourcePath: dirUri,
            });
          }
        }
      } catch {
        continue;
      }
    }

    return results;
  } catch {
    return [];
  }
}

export async function scanSystemFolders(): Promise<ScannedFile[]> {
  const allFiles: ScannedFile[] = [];
  const seen = new Set<string>();

  for (const path of SYSTEM_PATHS) {
    try {
      const dir = new Directory(path);
      await dir.list();
      const files = await scanDirectoryRecursive(path, 0, seen);
      allFiles.push(...files);
    } catch {
      continue;
    }
  }

  return allFiles;
}

function tokenize(name: string): string[] {
  const base = name.replace(/\.[^.]+$/, '');
  return base
    .split(/[_\-. ()[\]{}]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

export function groupFilesBySubstring(files: ScannedFile[]): FileGroup[] {
  if (files.length === 0) return [];

  const fileTokens = new Map<string, string[]>();
  for (const file of files) {
    const tokens = tokenize(file.name);
    fileTokens.set(file.uri, tokens);
  }

  const tokenCount = new Map<string, number>();
  for (const tokens of fileTokens.values()) {
    const seen = new Set<string>();
    for (const token of tokens) {
      if (!seen.has(token)) {
        tokenCount.set(token, (tokenCount.get(token) ?? 0) + 1);
        seen.add(token);
      }
    }
  }

  const groups = new Map<string, ScannedFile[]>();
  for (const file of files) {
    const tokens = fileTokens.get(file.uri) ?? [];
    const assigned = new Set<string>();
    for (const token of tokens) {
      if ((tokenCount.get(token) ?? 0) >= 2 && !assigned.has(token)) {
        if (!groups.has(token)) groups.set(token, []);
        groups.get(token)!.push(file);
        assigned.add(token);
      }
    }
  }

  const typedGroups = new Map<string, { files: ScannedFile[]; type: 'audio' }>();
  for (const [token, groupFiles] of groups) {
    if (groupFiles.length < 2) continue;
    typedGroups.set(token, { files: groupFiles, type: 'audio' });
  }

  return [...typedGroups.entries()]
    .map(([name, { files, type }]) => ({
      name,
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
      type,
    }))
    .sort((a, b) => {
      if (b.files.length !== a.files.length) return b.files.length - a.files.length;
      return a.name.localeCompare(b.name);
    });
}


