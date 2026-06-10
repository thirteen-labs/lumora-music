import { View, Text, Pressable, Platform } from 'react-native';
import { usePlayerStore } from '@/store/player-store';
import { useTheme } from '@/hooks/use-theme';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

export function MiniPlayer() {
  const isMiniPlayerVisible = usePlayerStore((s) => s.isMiniPlayerVisible);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const { colors } = useTheme();
  const router = useRouter();

  if (!isMiniPlayerVisible || !currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <Pressable
      onPress={() => router.push('/player')}
      className="w-full"
    >
      <BlurView
        intensity={80}
        tint="dark"
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={{ overflow: 'hidden' }}
      >
        <View className="w-full h-1" style={{ backgroundColor: colors.border }}>
          <View
            className="h-full"
            style={{ width: `${progress * 100}%`, backgroundColor: colors.accent }}
          />
        </View>
        <View className="flex-row items-center px-4 py-3 gap-3">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.card + '90' }}
          >
            <Text className="text-lg" style={{ color: colors.accent }}>♪</Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.text }}
              numberOfLines={1}
            >
              {currentTrack.title}
            </Text>
            <Text
              className="text-xs"
              style={{ color: colors.textMuted }}
              numberOfLines={1}
            >
              {currentTrack.artist}
            </Text>
          </View>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {formatDuration(position)}
          </Text>
          <Pressable onPress={togglePlay} className="w-10 h-10 rounded-full items-center justify-center">
            {isPlaying ? (
              <Pause size={22} color={colors.text} fill={colors.text} />
            ) : (
              <Play size={22} color={colors.text} fill={colors.text} />
            )}
          </Pressable>
          <Pressable onPress={next} className="w-10 h-10 rounded-full items-center justify-center">
            <SkipForward size={20} color={colors.text} fill={colors.text} />
          </Pressable>
        </View>
      </BlurView>
    </Pressable>
  );
}
