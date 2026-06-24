import { createVideoPlayer } from 'expo-video';
import type { VideoThumbnail } from 'expo-video';

const thumbnailCache = new Map<string, VideoThumbnail>();

export function getCachedThumbnail(videoId: string): VideoThumbnail | null {
  return thumbnailCache.get(videoId) ?? null;
}

export async function generateThumbnail(videoUri: string, videoId: string): Promise<VideoThumbnail | null> {
  if (thumbnailCache.has(videoId)) return thumbnailCache.get(videoId)!;

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
      thumbnailCache.set(videoId, thumbnails[0]);
      return thumbnails[0];
    }
    return null;
  } catch (e) {
    console.warn('[VideoThumbnails] Failed for:', videoUri, e);
    return null;
  }
}

export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}
