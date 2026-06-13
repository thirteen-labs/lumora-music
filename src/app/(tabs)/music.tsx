import { View, Text, ScrollView, Pressable } from 'react-native';
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

export default function MusicScreen() {
  const { colors } = useTheme();
  const router = useRouter();
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {/* Category Grid */}
        <View className="px-5 mb-6">
          <Text className="text-2xl font-bold mb-4" style={{ color: colors.text }}>Browse</Text>
          <View className="gap-3">
            {[
              { icon: List, label: 'Songs', count: songs.length, route: '/music/songs' },
              { icon: Disc3, label: 'Albums', count: albums.length, route: '/music/albums' },
              { icon: User, label: 'Artists', count: artists.length, route: '/music/artists' },
              { icon: Tag, label: 'Genres', count: genres.length, route: '/music/genres' },
            ].map(({ icon: Icon, label, count, route }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as any)}
                className="flex-row items-center gap-4 p-4 rounded-2xl"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: colors.card }}>
                  <Icon size={24} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>{label}</Text>
                  <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>{count} items</Text>
                </View>
                <ArrowRight size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Top Songs */}
        <View className="px-5 mb-6">
          <Text className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
            Top Songs
          </Text>
          <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
            Most Played
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
            {topSongs.map((song, i) => song && (
              <Pressable
                key={song.id}
                onPress={() => usePlayerStore.getState().play(song, topSongs.filter(Boolean))}
                className="flex-row items-center gap-3 py-3 px-4"
                style={{ borderBottomWidth: i < topSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
              >
                <View className="w-10 h-10 rounded-lg items-center justify-center" style={{ backgroundColor: colors.card }}>
                  <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>{i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>{song.artist}</Text>
                </View>
                <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(song.duration)}</Text>
              </Pressable>
            ))}
            {topSongs.length === 0 && (
              <View className="py-6 items-center">
                <Music size={32} color={colors.textMuted} />
                <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No play history yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View className="px-5 mb-6">
            <Text className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
              Recently Played
            </Text>
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>Quick Replay</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
              {recentlyPlayed.map((song, i) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, recentlyPlayed)}
                  className="flex-row items-center gap-3 py-3 px-4"
                  style={{ borderBottomWidth: i < recentlyPlayed.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                >
                  <View className="w-10 h-10 rounded-lg items-center justify-center overflow-hidden" style={{ backgroundColor: colors.card }}>
                    <Artwork uri={song.artwork} size={40} borderRadius={8} iconSize={16} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>{song.artist}</Text>
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