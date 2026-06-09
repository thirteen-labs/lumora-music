import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState, useCallback } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const { uri, title } = useLocalSearchParams<{ uri: string; title: string }>();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const player = useVideoPlayer(uri ?? '', (p) => {
    p.loop = true;
  });

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (!uri) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#000' }}>
        <Text style={{ color: colors.textMuted }}>No video URI provided</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <VideoView
          style={styles.fullscreenVideo}
          player={player}
          allowsPictureInPicture
        />
        <View style={styles.fullscreenControls}>
          <Pressable onPress={toggleFullscreen} style={styles.fullscreenButton}>
            <Minimize2 size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text className="text-base font-semibold flex-1" style={{ color: colors.text }} numberOfLines={1}>
          {title ?? 'Video'}
        </Text>
        <Pressable onPress={toggleFullscreen} className="w-10 h-10 items-center justify-center">
          <Maximize2 size={22} color={colors.text} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <VideoView
          style={styles.video}
          player={player}
          allowsPictureInPicture
          contentFit="contain"
        />
      </View>

      <View className="px-4 pb-8">
        <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
          {title ?? 'Untitled'}
        </Text>
        <Text className="text-sm" style={{ color: colors.textMuted }}>
          Local video
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.5625,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: SCREEN_HEIGHT,
    height: SCREEN_WIDTH,
  },
  fullscreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  fullscreenButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
});
