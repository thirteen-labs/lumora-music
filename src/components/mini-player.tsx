import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/player-store';
import { s } from '@/styles';
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
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!isMiniPlayerVisible || !currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <Pressable onPress={() => router.push('/player')} style={s.wFull}>
      <View style={{ backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
        <View style={[s.wFull, s.h2px, { backgroundColor: colors.border }]}>
          <View style={[s.hFull, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
        </View>
        <View style={[s.flexRow, s.itemsCenter, s.px4, s.py3, s.gap3]}>
          <View style={[s.roundedXl, s.overflowHidden, { backgroundColor: colors.card }]}>
            <Artwork uri={currentTrack.artwork} size={44} borderRadius={10} iconSize={18} iconColor={colors.accent} backgroundColor="transparent" />
          </View>
          <View style={s.flex1}>
            <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <Text style={[s.textXs, { color: colors.textMuted }]}>
            {formatDuration(position)}
          </Text>
          <Text style={[s.textXs, s.fontMedium, { color: colors.accent }]}>
            {Math.round(progress * 100)}%
          </Text>
          <Pressable onPress={togglePlay} hitSlop={8} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
            {isPlaying ? (
              <Pause size={18} color={colors.text} fill={colors.text} />
            ) : (
              <Play size={18} color={colors.accent} fill={colors.accent} />
            )}
          </Pressable>
          <Pressable onPress={next} hitSlop={8} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
            <SkipForward size={18} color={colors.text} fill={colors.text} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}