import { createVideoPlayer } from 'expo-video';
import type { VideoThumbnail } from 'expo-video';
import { Paths, Directory } from 'expo-file-system';

const THUMB_DIR = new Directory(Paths.cache, 'video-thumbnails');

export async function generateThumbnail(
  videoUri: string,
  timeMs: number = 1000,
): Promise<VideoThumbnail | null> {
  try {
    try {
      THUMB_DIR.create({ intermediates: true });
    } catch {}
    const player = createVideoPlayer({ uri: videoUri });
    const thumbnails = await player.generateThumbnailsAsync(timeMs / 1000, {
      maxWidth: 640,
    });
    return thumbnails.length > 0 ? thumbnails[0] : null;
  } catch (e) {
    console.warn('Thumbnail generation failed:', e);
    return null;
  }
}
