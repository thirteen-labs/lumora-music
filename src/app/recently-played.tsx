import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { useStatsStore } from '@/store/stats-store';
import { usePlayerStore } from '@/store/player-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { useRouter } from 'expo-router';
import { LyricsBadge } from '@/components/lyrics-badge';
import { ChevronLeft, Play, Clock } from 'lucide-react-native';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecentlyPlayedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const getRecentlyPlayed = useStatsStore((s) => s.getRecentlyPlayed);
  const recentlyPlayed = useMemo(() => getRecentlyPlayed(songs, 20), [songs, getRecentlyPlayed]);
  const insets = useSafeAreaInsets();
  const { bottomSheetRef, present, song } = useSongContextMenu();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Recently Played</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {recentlyPlayed.length === 0 ? (
              <View style={[s.itemsCenter, s.py16]}>
                <Clock size={36} color={colors.textMuted} />
                <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>No recently played songs</Text>
              </View>
            ) : (
              recentlyPlayed.map((song, i) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, recentlyPlayed)}
                  onLongPress={() => present(song)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                >
                  <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                    <Play size={18} color={colors.accent} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <LyricsBadge colors={colors} show={!!lyricsMap[song.id] || hasCachedLyrics(song.artist, song.title) === true} />
                      <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
    </View>
  );
}
