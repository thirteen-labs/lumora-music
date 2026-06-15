import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { useEffect, useMemo } from 'react';
import { Music, List, Disc3, User, Tag, Play, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useStatsStore } from '@/store/stats-store';
import type { Song } from '@/types/media';
import { s } from '@/styles';
import { useTranslation } from '@/hooks/use-translation';

export default function MusicScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { songs, albums, artists, genres, scan } = useMusicStore();

  // Auto-scan if empty
  useEffect(() => {
    if (songs.length === 0) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackStats = useStatsStore((s) => s.trackStats);
  const topSongs = useMemo(() => {
    return Object.entries(trackStats)
      .sort((a, b) => (b[1].playCount ?? 0) - (a[1].playCount ?? 0))
      .slice(0, 5)
      .map(([id]) => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s);
  }, [trackStats, songs]);

  const recentlyPlayed = useMemo(() => {
    return [...songs]
      .filter(s => trackStats[s.id]?.lastPlayed)
      .sort((a, b) => (trackStats[b.id]?.lastPlayed ?? 0) - (trackStats[a.id]?.lastPlayed ?? 0))
      .slice(0, 5);
  }, [songs, trackStats]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {/* Category Grid */}
        <View style={[s.px5, s.mb6]}>
          <Text style={[s.text2xl, s.fontBold, s.mb4, { color: colors.text }]}>Browse</Text>
          <View style={[s.gap3]}>
            {[
              { icon: List, label: t('library.songs'), count: songs.length, route: '/music/songs' },
              { icon: Disc3, label: t('library.albums'), count: albums.length, route: '/music/albums' },
              { icon: User, label: t('library.artists'), count: artists.length, route: '/music/artists' },
              { icon: Tag, label: t('library.genres'), count: genres.length, route: '/music/genres' },
            ].map(({ icon: Icon, label, count, route }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as any)}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, s.rounded2xl, { backgroundColor: colors.surface }]}
              >
                <View style={[s.w12, s.h12, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
                  <Icon size={24} color={colors.accent} />
                </View>
                <View style={[s.flex1]}>
                  <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>{label}</Text>
                  <Text style={[s.textSm, s.mt05, { color: colors.textMuted }]}>{count} items</Text>
                </View>
                <ArrowRight size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Top Songs */}
        <View style={[s.px5, s.mb6]}>
          <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }, s.mb3]}>
            {t('stats.most.played')}
          </Text>
          <Text style={[s.textLg, s.fontBold, s.mb3, { color: colors.text }]}>
            {t('library.most.played')}
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
            {topSongs.map((song, i) => song && (
              <Pressable
                key={song.id}
                onPress={() => usePlayerStore.getState().play(song, topSongs.filter(Boolean))}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.py3, s.px4, { borderBottomWidth: i < topSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
              >
                <View style={[s.w10, s.h10, s.roundedLg, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
                  <Text style={[s.textXs, s.fontSemibold, { color: colors.textMuted }]}>{i + 1}</Text>
                </View>
                <View style={[s.flex1]}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
                </View>
                <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(song.duration)}</Text>
              </Pressable>
            ))}
            {topSongs.length === 0 && (
              <View style={[s.py6, s.itemsCenter]}>
                <Music size={32} color={colors.textMuted} />
                <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>{t('stats.no.plays')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={[s.px5, s.mb6]}>
            <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }, s.mb3]}>
              {t('library.recently.played')}
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
              {recentlyPlayed.map((song, i) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, recentlyPlayed)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.py3, s.px4, { borderBottomWidth: i < recentlyPlayed.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                >
                  <View style={[s.w10, s.h10, s.roundedLg, s.itemsCenter, s.justifyCenter, s.overflowHidden, { backgroundColor: colors.card }]}>
                    <Artwork uri={song.artwork} size={40} borderRadius={8} iconSize={16} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <View style={[s.flex1]}>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                    <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <Play size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
