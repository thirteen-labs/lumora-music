const thumbCache = new Map<string, string>();

export function setThumbnailUri(mediaId: string, uri: string): void {
  thumbCache.set(mediaId, uri);
}

export function getCachedThumbnailUri(mediaId: string): string | null {
  return thumbCache.get(mediaId) ?? null;
}

export function getVideoThumbnailUri(
  videoUri: string,
  mediaId: string,
): string | null {
  try {
    if (videoUri.startsWith('content://')) {
      const uri = `content://media/external/video/thumbnails/${mediaId}`;
      thumbCache.set(mediaId, uri);
      return uri;
    }
    return null;
  } catch {
    return null;
  }
}
