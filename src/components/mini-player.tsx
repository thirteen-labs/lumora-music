import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/player-store';
import { playerActions } from '@/player/actions';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { formatDuration } from '@/utils/format';
import { useRouter } from 'expo-router';
import { Artwork } from '@/components/artwork';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '@/store/settings-store';

const CIRCUMFERENCE = 2 * Math.PI * 17;

export const MiniPlayer = React.memo(function MiniPlayer() {
  const isMiniPlayerVisible = usePlayerStore((s) => s.isMiniPlayerVisible);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bottomSheetRef, present, song } = useSongContextMenu();
  const navigatingRef = useRef(false);
  const hasImage = !!useSettingsStore((s) => s.backgroundImage);

  if (!isMiniPlayerVisible || !currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  const openPlayer = () => {
    if (navigatingRef.current) return;
    if (!currentTrack) return;
    navigatingRef.current = true;
    try {
      playerActions.showFullPlayer();
    } catch {}
    try {
      router.push('/player');
    } catch {
      try {
        // fallback for typedRoutes / missing route
        (router as any).navigate?.('/player');
      } catch {}
    }
    setTimeout(() => { navigatingRef.current = false; }, 600);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onEnd((e) => {
      const { translationX: tx, translationY: ty } = e;
      if (ty < -50) {
        openPlayer();
      } else if (ty > 50) {
        playerActions.hideMiniPlayer();
      } else if (tx < -50) {
        playerActions.next();
      } else if (tx > 50) {
        playerActions.previous();
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    openPlayer();
  });

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      present(currentTrack);
    });

  const composed = Gesture.Exclusive(pan, tap, longPress);

  return (
    <View style={[s.wFull, { overflow: 'hidden', borderTopWidth: hasImage ? StyleSheet.hairlineWidth : 0, borderTopColor: hasImage ? colors.glassBorder : 'transparent' }]}>
      <View style={{ backgroundColor: hasImage ? colors.surfaceGlass : colors.pageBackground, paddingBottom: insets.bottom, overflow: 'hidden' }}>
        {hasImage && <BlurView intensity={26} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
        {hasImage && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, opacity: 0.52 }]} />}
        <View style={[s.wFull, s.h2px, { backgroundColor: hasImage ? colors.glassBorder : colors.border }]}>
          <View style={[s.hFull, { width: `${progress * 100}%`, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 4 }]} />
        </View>
        <View style={[s.flexRow, s.itemsCenter, s.px4, s.py3, s.gap3]}>
          <GestureDetector gesture={composed}>
            <View
              style={[s.flex1, s.flexRow, s.itemsCenter, s.gap3]}
              accessible
              accessibilityLabel={`${currentTrack.title} by ${currentTrack.artist}. Open player`}
              accessibilityRole={'button' as const}
            >
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
            </View>
          </GestureDetector>
          <Pressable onPress={playerActions.togglePlay} hitSlop={8} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: hasImage ? colors.glass : colors.card, borderWidth: hasImage ? StyleSheet.hairlineWidth : 0, borderColor: colors.glassBorder }]}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            accessibilityRole={'button' as const}
          >
            <Svg width={40} height={40} style={{ position: 'absolute' }}>
              <Circle cx={20} cy={20} r={17} stroke={hasImage ? colors.glassBorder : colors.border} strokeWidth={3} fill="none" />
              <G transform={`rotate(-90, 20, 20)`}>
                <Circle
                  cx={20} cy={20} r={17}
                  stroke={colors.accent} strokeWidth={3} fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
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
          <Pressable onPress={playerActions.next} hitSlop={8} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: hasImage ? colors.glass : colors.card, borderWidth: hasImage ? StyleSheet.hairlineWidth : 0, borderColor: colors.glassBorder }]}
            accessibilityLabel="Skip forward"
            accessibilityRole={'button' as const}
          >
            <SkipForward size={18} color={colors.text} fill={colors.text} />
          </Pressable>
        </View>
      </View>
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
    </View>
  );
});
