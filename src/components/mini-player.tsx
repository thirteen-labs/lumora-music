import { View, Text, Pressable } from 'react-native';
import { usePlayerStore } from '@/store/player-store';
import { useTheme } from '@/hooks/use-theme';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import { useRouter } from 'expo-router';
import { Artwork } from '@/components/artwork';

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
    <Pressable onPress={() => router.push('/player')} className="w-full">
      <View style={{ backgroundColor: colors.surface }}>
        <View className="w-full h-[2px]" style={{ backgroundColor: colors.border }}>
          <View className="h-full" style={{ width: `${progress * 100}%`, backgroundColor: colors.accent }} />
        </View>
        <View className="flex-row items-center px-4 py-3 gap-3">
          <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.card }}>
            <Artwork uri={currentTrack.artwork} size={44} borderRadius={10} iconSize={18} iconColor={colors.accent} backgroundColor="transparent" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {formatDuration(position)}
          </Text>
          <Pressable onPress={togglePlay} hitSlop={8} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.card }}>
            {isPlaying ? (
              <Pause size={18} color={colors.text} fill={colors.text} />
            ) : (
              <Play size={18} color={colors.accent} fill={colors.accent} />
            )}
          </Pressable>
          <Pressable onPress={next} hitSlop={8} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.card }}>
            <SkipForward size={18} color={colors.text} fill={colors.text} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}