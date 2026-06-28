import { useEffect, useState, memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { generateThumbnail, getCachedThumbnail, cancelThumbnailGeneration } from '@/services/video-thumbnails';
import { Film } from 'lucide-react-native';

interface VideoThumbnailViewProps {
  videoUri: string;
  videoId: string;
  size: number;
  borderRadius?: number;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
}

export const VideoThumbnailView = memo(function VideoThumbnailView({
  videoUri,
  videoId,
  size,
  borderRadius = 8,
  iconSize,
  iconColor,
  backgroundColor,
}: VideoThumbnailViewProps) {
  const [thumb, setThumb] = useState<string | null>(getCachedThumbnail(videoId));

  useEffect(() => {
    if (thumb) return;
    let cancelled = false;
    generateThumbnail(videoUri, videoId).then((t) => {
      if (!cancelled && t) setThumb(t);
    });
    return () => {
      cancelled = true;
      cancelThumbnailGeneration(videoId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUri, videoId]);

  if (thumb) {
    return (
      <Image
        source={thumb}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor ?? 'transparent',
      }}
    >
      <Film size={iconSize ?? size * 0.4} color={iconColor ?? '#7C82F8'} />
    </View>
  );
});
