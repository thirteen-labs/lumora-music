import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/player-store';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
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
            <Artwork uri={currentTrack.artwork} size={52} borderRadius={12} iconSize={20} iconColor={colors.accent} backgroundColor="transparent" />
          </View>
          <View style={s.flex1}>
            <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[s.textSm, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <Text style={[s.textSm, { color: colors.textMuted }]}>
            {formatDuration(position)}
          </Text>
          <Text style={[s.textSm, s.fontMedium, { color: colors.accent }]}>
            {Math.round(progress * 100)}%
          </Text>
          <Pressable onPress={togglePlay} hitSlop={8} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
            <Svg width={40} height={40} style={{ position: 'absolute' }}>
              <Circle cx={20} cy={20} r={17} stroke={colors.border} strokeWidth={3} fill="none" />
              <G transform={`rotate(-90, 20, 20)`}>
                <Circle
                  cx={20} cy={20} r={17}
                  stroke={colors.accent} strokeWidth={3} fill="none"
                  strokeDasharray={106.814}
                  strokeDashoffset={106.814 * (1 - progress)}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
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