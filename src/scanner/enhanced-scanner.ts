import { storage } from '@/services/mmkv';
import type { Song } from '@/types/media';

const SCAN_HISTORY_KEY = 'lumora-scan-history';
const KNOWN_FILES_KEY = 'lumora-known-files';

interface ScanHistory {
  lastFullScan: number;
  lastIncrementalScan: number;
  fileCount: number;
}

export function getScanHistory(): ScanHistory {
  try {
    const raw = storage.getString(SCAN_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('[EnhancedScanner] Failed to parse scan history:', error);
  }
  return { lastFullScan: 0, lastIncrementalScan: 0, fileCount: 0 };
}

export function saveScanHistory(history: ScanHistory): void {
  try {
    storage.set(SCAN_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[EnhancedScanner] Failed to save scan history:', error);
  }
}

export function getKnownFiles(): Record<string, number> {
  try {
    const raw = storage.getString(KNOWN_FILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('[EnhancedScanner] Failed to parse known files:', error);
  }
  return {};
}

export function saveKnownFiles(files: Record<string, number>): void {
  try {
    storage.set(KNOWN_FILES_KEY, JSON.stringify(files));
  } catch (error) {
    console.warn('[EnhancedScanner] Failed to save known files:', error);
  }
}

export function findNewFiles(currentUris: string[]): string[] {
  const known = getKnownFiles();
  return currentUris.filter((uri) => !known[uri]);
}

export function findRemovedFiles(currentUris: string[]): string[] {
  const known = getKnownFiles();
  const currentSet = new Set(currentUris);
  return Object.keys(known).filter((uri) => !currentSet.has(uri));
}

export function updateKnownFiles(songs: Song[]): void {
  const known = getKnownFiles();
  for (const song of songs) {
    known[song.uri] = Date.now();
  }
  saveKnownFiles(known);
}

export function findDuplicateSongs(songs: Song[]): { song: Song; duplicates: Song[] }[] {
  const byTitle = new Map<string, Song[]>();
  for (const song of songs) {
    const key = `${song.title.toLowerCase()}_${song.artist.toLowerCase()}_${song.duration}`;
    const existing = byTitle.get(key) || [];
    existing.push(song);
    byTitle.set(key, existing);
  }

  const duplicates: { song: Song; duplicates: Song[] }[] = [];
  for (const group of byTitle.values()) {
    if (group.length > 1) {
      duplicates.push({ song: group[0], duplicates: group.slice(1) });
    }
  }
  return duplicates;
}

export function pickBestSong(songs: Song[]): Song {
  return songs.reduce((best, s) => {
    const bestScore = (best.bitrate ?? 0) + (best.fileSize / 1048576);
    const sScore = (s.bitrate ?? 0) + (s.fileSize / 1048576);
    return sScore > bestScore ? s : best;
  });
}

export function removeDuplicateGroup(
  group: { song: Song; duplicates: Song[] },
  keepIndex: number
): { kept: Song; removed: Song[] } {
  const all = [group.song, ...group.duplicates];
  const kept = all[keepIndex] ?? group.song;
  const removed = all.filter((_, i) => i !== keepIndex);
  return { kept, removed };
}

export function keepBestAndRemoveDuplicates(
  group: { song: Song; duplicates: Song[] }
): { kept: Song; removed: Song[] } {
  const all = [group.song, ...group.duplicates];
  const best = pickBestSong(all);
  const removed = all.filter((s) => s !== best);
  return { kept: best, removed };
}

export function findMissingFiles(songs: Song[], knownUris: Set<string>): Song[] {
  return songs.filter((song) => !knownUris.has(song.uri));
}

export function calculateStorageInfo(songs: Song[], videos: { fileSize: number; title: string }[]) {
  const totalAudioSize = songs.reduce((sum, s) => sum + s.fileSize, 0);
  const totalVideoSize = videos.reduce((sum, v) => sum + v.fileSize, 0);

  const allFiles = [
    ...songs.map((s) => ({ name: s.title, size: s.fileSize, type: 'audio' as const })),
    ...videos.map((v) => ({ name: v.title, size: v.fileSize, type: 'video' as const })),
  ].sort((a, b) => b.size - a.size);

  const genreMap = new Map<string, { count: number; size: number }>();
  for (const song of songs) {
    const genre = song.genre ?? 'Unknown';
    const existing = genreMap.get(genre) || { count: 0, size: 0 };
    existing.count++;
    existing.size += song.fileSize;
    genreMap.set(genre, existing);
  }

  return {
    totalSongs: songs.length,
    totalVideos: videos.length,
    totalAudioSize,
    totalVideoSize,
    largestFiles: allFiles.slice(0, 20),
    genreBreakdown: Array.from(genreMap.entries())
      .map(([genre, data]) => ({ genre, ...data }))
      .sort((a, b) => b.size - a.size),
  };
}
