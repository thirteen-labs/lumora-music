import { createVideoPlayer } from 'expo-video';
import type { VideoThumbnail } from 'expo-video';

const thumbCache = new Map<string, string>();
const sharedRefCache = new Map<string, VideoThumbnail | null>();
const pendingGenerations = new Map<string, Promise<VideoThumbnail | null>>();
const MAX_CACHE_SIZE = 500;

function trimCache(): void {
  if (thumbCache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(thumbCache.keys());
    const toDelete = keys.slice(0, thumbCache.size - MAX_CACHE_SIZE);
    for (const key of toDelete) {
      thumbCache.delete(key);
    }
  }
}

export function setThumbnailUri(mediaId: string, uri: string): void {
  thumbCache.set(mediaId, uri);
  trimCache();
}

export function getCachedThumbnailUri(mediaId: string): string | null {
  return thumbCache.get(mediaId) ?? null;
}

export function getVideoThumbnailUri(
  videoUri: string,
  mediaId: string,
): string | null {
  try {
    const uri = `content://media/external/video/thumbnails/${mediaId}`;
    thumbCache.set(mediaId, uri);
    trimCache();
    return uri;
  } catch {
    return null;
  }
}

export function getCachedVideoThumbnail(
  videoId: string,
): VideoThumbnail | null | undefined {
  return sharedRefCache.get(videoId);
}

export async function generateVideoThumbnail(
  videoId: string,
  videoUri: string,
): Promise<VideoThumbnail | null> {
  if (sharedRefCache.has(videoId)) {
    return sharedRefCache.get(videoId) ?? null;
  }
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
    sharedRefCache.set(videoId, thumb);
    return thumb;
  } catch (e) {
    console.warn('[VideoThumbnails] Failed to generate thumbnail:', e);
    sharedRefCache.set(videoId, null);
    return null;
  } finally {
    player.release();
  }
}
