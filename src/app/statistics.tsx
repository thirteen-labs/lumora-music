import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useStatsStore } from '@/store/stats-store';
import { useMusicStore } from '@/store/music-store';
import { TrendingUp, Music, Clock, Activity, User, Disc } from 'lucide-react-native';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const songs = useMusicStore((s) => s.songs);
  const stats = useStatsStore();
  const topSongs = stats.getTopSongs(songs, 10);
  const totalPlayCount = stats.getTotalPlayCount();
  const totalListenTime = stats.getTotalListenTime();
  const listeningStats = stats.getListeningStats(songs);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Statistics" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Overview */}
          <View>
            <SectionHeader title="Overview" />
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Music size={24} color={colors.accent} />
                <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>{totalPlayCount}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Total Plays</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Clock size={24} color={colors.accent} />
                <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>
                  {totalListenTime > 3600
                    ? `${Math.floor(totalListenTime / 3600)}h`
                    : totalListenTime > 60
                    ? `${Math.floor(totalListenTime / 60)}m`
                    : `${totalListenTime}s`}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Listen Time</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <TrendingUp size={24} color={colors.accent} />
                <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>{listeningStats.totalTracksPlayed}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Tracks Played</Text>
              </View>
            </View>
          </View>

          {/* Top Songs */}
          <View>
            <SectionHeader title="Most Played Songs" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {topSongs.length === 0 ? (
                <View className="p-8 items-center">
                  <Activity size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No plays recorded yet</Text>
                </View>
              ) : (
                topSongs.map(({ song, count }, i) => (
                  <View
                    key={song.id}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < topSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <Text className="text-sm font-bold w-6 text-center" style={{ color: colors.accent }}>
                      {i + 1}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>{song.artist}</Text>
                    </View>
                    <Text className="text-sm font-semibold" style={{ color: colors.accent }}>{count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top Artists */}
          <View>
            <SectionHeader title="Top Artists" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {listeningStats.topArtists.length === 0 ? (
                <View className="p-8 items-center">
                  <User size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No data yet</Text>
                </View>
              ) : (
                listeningStats.topArtists.map(({ name, count }, i) => (
                  <View
                    key={name}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < listeningStats.topArtists.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <Text className="text-sm font-bold w-6 text-center" style={{ color: colors.accent }}>{i + 1}</Text>
                    <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{name}</Text>
                    <Text className="text-sm" style={{ color: colors.textMuted }}>{count} plays</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top Albums */}
          <View>
            <SectionHeader title="Top Albums" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {listeningStats.topAlbums.length === 0 ? (
                <View className="p-8 items-center">
                  <Disc size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No data yet</Text>
                </View>
              ) : (
                listeningStats.topAlbums.map(({ name, count }, i) => (
                  <View
                    key={name}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < listeningStats.topAlbums.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <Text className="text-sm font-bold w-6 text-center" style={{ color: colors.accent }}>{i + 1}</Text>
                    <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{name}</Text>
                    <Text className="text-sm" style={{ color: colors.textMuted }}>{count} plays</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
