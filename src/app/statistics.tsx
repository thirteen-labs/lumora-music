import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useStatsStore } from '@/store/stats-store';
import { useMusicStore } from '@/store/music-store';
import { useMemo } from 'react';
import { TrendingUp, Music, Clock, Activity, User, Disc, BarChart3 } from 'lucide-react-native';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const getTopSongs = useStatsStore((s) => s.getTopSongs);
  const getTotalPlayCount = useStatsStore((s) => s.getTotalPlayCount);
  const getTotalListenTime = useStatsStore((s) => s.getTotalListenTime);
  const getListeningStats = useStatsStore((s) => s.getListeningStats);
  const topSongs = useMemo(() => getTopSongs(songs, 10), [songs, getTopSongs]);
  const totalPlayCount = useMemo(() => getTotalPlayCount(), [getTotalPlayCount]);
  const totalListenTime = useMemo(() => getTotalListenTime(), [getTotalListenTime]);
  const listeningStats = useMemo(() => getListeningStats(songs), [songs, getListeningStats]);
  const weeklyMinutes = listeningStats.weeklyMinutes;
  const maxWeeklyMinutes = Math.max(...weeklyMinutes, 1);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const orderedLabels = [...dayLabels.slice(todayIdx + 1), ...dayLabels.slice(0, todayIdx + 1)];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title={t('stats.title')} showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Overview */}
          <View>
            <SectionHeader title={t('stats.overview')} />
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Music size={24} color={colors.accent} />
                <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>{totalPlayCount}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('stats.total.plays')}</Text>
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
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('stats.listen.time')}</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <TrendingUp size={24} color={colors.accent} />
                <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>{listeningStats.totalTracksPlayed}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('stats.tracks.played')}</Text>
              </View>
            </View>
          </View>

          {/* Weekly Listening */}
          <View>
            <SectionHeader title={t('stats.week')} />
            <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-2 mb-4">
                <BarChart3 size={20} color={colors.accent} />
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{t('stats.daily')}</Text>
              </View>
              <View className="flex-row items-end justify-between" style={{ height: 120 }}>
                {weeklyMinutes.map((minutes, i) => (
                  <View key={i} className="flex-1 items-center">
                    <Text className="text-[10px] mb-1" style={{ color: colors.textMuted }}>
                      {minutes > 0 ? `${minutes}m` : ''}
                    </Text>
                    <View
                      style={{
                        width: 24,
                        height: Math.max(4, (minutes / maxWeeklyMinutes) * 80),
                        borderRadius: 6,
                        backgroundColor: i === weeklyMinutes.length - 1 ? colors.accent : colors.accent + '40',
                      }}
                    />
                    <Text className="text-[10px] mt-1" style={{ color: i === weeklyMinutes.length - 1 ? colors.accent : colors.textMuted }}>
                      {orderedLabels[i]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Top Songs */}
          <View>
            <SectionHeader title={t('stats.most.played')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {topSongs.length === 0 ? (
                <View className="p-8 items-center">
                  <Activity size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>{t('stats.no.plays')}</Text>
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
            <SectionHeader title={t('stats.top.artists')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {listeningStats.topArtists.length === 0 ? (
                <View className="p-8 items-center">
                  <User size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>{t('stats.no.data')}</Text>
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
                    <Text className="text-sm" style={{ color: colors.textMuted }}>{t('stats.plays', { count })}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top Albums */}
          <View>
            <SectionHeader title={t('stats.top.albums')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {listeningStats.topAlbums.length === 0 ? (
                <View className="p-8 items-center">
                  <Disc size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>{t('stats.no.data')}</Text>
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
                    <Text className="text-sm" style={{ color: colors.textMuted }}>{t('stats.plays', { count })}</Text>
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
