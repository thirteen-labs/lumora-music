import { createVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';

const THUMBNAIL_DIR = FileSystem.documentDirectory + 'thumbnails/';

const thumbnailCache = new Map<string, string>();

interface ThumbnailIndex {
  [videoId: string]: string;
}

async function loadIndex(): Promise<ThumbnailIndex> {
  try {
    const raw = await FileSystem.readAsStringAsync(THUMBNAIL_DIR + 'index.json');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveIndex(index: ThumbnailIndex): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true });
    await FileSystem.writeAsStringAsync(THUMBNAIL_DIR + 'index.json', JSON.stringify(index));
  } catch {}
}

FileSystem.makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true }).then(async () => {
  const index = await loadIndex();
  for (const [id, filePath] of Object.entries(index)) {
    const exists = await FileSystem.getInfoAsync(filePath).then((r) => r.exists).catch(() => false);
    if (exists) {
      thumbnailCache.set(id, filePath);
    }
  }
}).catch(() => {});

export function getCachedThumbnail(videoId: string): string | null {
  return thumbnailCache.get(videoId) ?? null;
}

export async function generateThumbnail(videoUri: string, videoId: string): Promise<string | null> {
  const cached = thumbnailCache.get(videoId);
  if (cached) {
    const exists = await FileSystem.getInfoAsync(cached).then((r) => r.exists).catch(() => false);
    if (exists) return cached;
  }

  try {
    const player = createVideoPlayer(videoUri);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Player ready timeout')), 10000);
      const sub = player.addListener('statusChange', (payload) => {
        if (payload.status === 'readyToPlay') {
          clearTimeout(timeout);
          sub.remove();
          resolve();
        }
      });
    });

    const thumbnails = await player.generateThumbnailsAsync(1, { maxWidth: 480 });
    player.replay();
    player.pause();

    if (thumbnails.length > 0) {
      const thumb = thumbnails[0] as any;
      const ext = thumb.uri ? thumb.uri.split('.').pop() || 'jpg' : 'jpg';
      const dest = THUMBNAIL_DIR + `${videoId}.${ext}`;
      try {
        if (thumb.uri) {
          await FileSystem.copyAsync({ from: thumb.uri, to: dest });
        } else {
          return null;
        }
        thumbnailCache.set(videoId, dest);
        const index = await loadIndex();
        index[videoId] = dest;
        await saveIndex(index);
        return dest;
      } catch {
        if (thumb.uri) {
          thumbnailCache.set(videoId, thumb.uri);
          return thumb.uri;
        }
        return null;
      }
    }
    return null;
  } catch (e) {
    console.warn('[VideoThumbnails] Failed for:', videoUri, e);
    return null;
  }
}

export async function clearThumbnailCache(): Promise<void> {
  thumbnailCache.clear();
  try {
    await FileSystem.deleteAsync(THUMBNAIL_DIR, { idempotent: true });
    await FileSystem.makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true });
  } catch {}
}
