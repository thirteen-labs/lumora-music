import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useStatsStore } from '@/store/stats-store';
import { useMusicStore } from '@/store/music-store';
import { useMemo } from 'react';
import { Clock, Music, Calendar } from 'lucide-react-native';

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PlayTimeScreen() {
  const { colors } = useTheme();
  const songs = useMusicStore((s) => s.songs);
  const getListeningStats = useStatsStore((s) => s.getListeningStats);
  const getTotalPlayCount = useStatsStore((s) => s.getTotalPlayCount);
  const getTotalListenTime = useStatsStore((s) => s.getTotalListenTime);
  const getTopSongs = useStatsStore((s) => s.getTopSongs);
  const listeningStats = useMemo(() => getListeningStats(songs), [songs, getListeningStats]);
  const totalPlayCount = useMemo(() => getTotalPlayCount(), [getTotalPlayCount]);
  const totalListenTime = useMemo(() => getTotalListenTime(), [getTotalListenTime]);
  const topSongs = useMemo(() => getTopSongs(songs, 10), [songs, getTopSongs]);

  const avgPerDay = listeningStats.weeklyMinutes.length > 0
    ? Math.round(listeningStats.weeklyMinutes.reduce((a, b) => a + b, 0) / 7)
    : 0;

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxMinutes = Math.max(...listeningStats.weeklyMinutes, 1);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Play Time" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          <View>
            <SectionHeader title="Overview" />
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Clock size={24} color={colors.accent} />
                <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>
                  {formatDuration(totalListenTime)}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Total Play Time</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Music size={24} color={colors.accent} />
                <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>{totalPlayCount}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Total Plays</Text>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Daily Average" />
            <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3">
                <Calendar size={20} color={colors.accent} />
                <View>
                  <Text className="text-lg font-bold" style={{ color: colors.text }}>
                    {formatDuration(avgPerDay * 60)}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>Average per day (last 7 days)</Text>
                </View>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Weekly Activity" />
            <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-end justify-between" style={{ height: 100 }}>
                {listeningStats.weeklyMinutes.map((minutes, i) => (
                  <View key={i} className="items-center gap-1">
                    <View
                      className="w-8 rounded-t-lg"
                      style={{
                        height: Math.max((minutes / maxMinutes) * 80, 2),
                        backgroundColor: colors.accent,
                      }}
                    />
                    <Text className="text-[10px]" style={{ color: colors.textMuted }}>{dayLabels[i]}</Text>
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  This week: {listeningStats.weeklyMinutes.reduce((a, b) => a + b, 0)} min
                </Text>
              </View>
            </View>
          </View>

          {topSongs.length > 0 && (
            <View>
              <SectionHeader title="Most Played Songs" />
              <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                {topSongs.map(({ song, count }, i) => (
                  <View
                    key={song.id}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < topSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <Text className="text-sm font-bold w-6 text-center" style={{ color: colors.accent }}>
                      {i + 1}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
                      {count} plays
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
