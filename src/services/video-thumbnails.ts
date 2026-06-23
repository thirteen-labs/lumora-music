import { createVideoPlayer, type VideoPlayer, type VideoThumbnail } from 'expo-video';

const thumbCache = new Map<string, VideoThumbnail>();
const playerMap = new Map<string, VideoPlayer>();
const pendingGenerations = new Map<string, Promise<VideoThumbnail | null>>();
const MAX_CACHE_SIZE = 100;

function trimCache(): void {
  if (thumbCache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(thumbCache.keys());
    const toDelete = keys.slice(0, thumbCache.size - MAX_CACHE_SIZE);
    for (const key of toDelete) {
      thumbCache.delete(key);
      const player = playerMap.get(key);
      if (player) {
        try { player.release(); } catch {}
        playerMap.delete(key);
      }
    }
  }
}

export function setThumbnailUri(mediaId: string, uri: string): void {
  // Legacy compatibility - no-op, thumbnails are now stored as VideoThumbnail refs
}

export function getCachedThumbnailUri(mediaId: string): string | null {
  return null;
}

export function getVideoThumbnailUri(
  videoUri: string,
  mediaId: string,
): string | null {
  try {
    return `content://media/external/video/thumbnails/${mediaId}`;
  } catch {
    return null;
  }
}

export function getCachedVideoThumbnail(
  videoId: string,
): VideoThumbnail | null | undefined {
  return thumbCache.get(videoId);
}

export async function generateVideoThumbnail(
  videoId: string,
  videoUri: string,
): Promise<VideoThumbnail | null> {
  const cached = thumbCache.get(videoId);
  if (cached) return cached;

  if (pendingGenerations.has(videoId)) {
    return pendingGenerations.get(videoId)!;
  }

  const promise = generateThumbnailInternal(videoId, videoUri);
  pendingGenerations.set(videoId, promise);
  const result = await promise;
  pendingGenerations.delete(videoId);
  return result;
}

async function generateThumbnailInternal(
  videoId: string,
  videoUri: string,
): Promise<VideoThumbnail | null> {
  const player = createVideoPlayer({ uri: videoUri });
  try {
    const thumbnails = await player.generateThumbnailsAsync(0, {
      maxWidth: 320,
    });
    const thumb = thumbnails[0] ?? null;
    if (thumb) {
      thumbCache.set(videoId, thumb);
      playerMap.set(videoId, player);
      trimCache();
    }
    return thumb;
  } catch (e) {
    console.warn('[VideoThumbnails] Failed to generate thumbnail:', e);
    try { player.release(); } catch {}
    return null;
  }
}
