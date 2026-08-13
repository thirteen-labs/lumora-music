import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
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
  const insets = useSafeAreaInsets();
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
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title="Play Time" showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <View>
            <SectionHeader title="Overview" />
            <View style={[s.flexRow, s.gap3]}>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <Clock size={24} color={colors.accent} />
                <Text style={[s.textXl, s.fontBold, s.mt2, { color: colors.text }]}>
                  {formatDuration(totalListenTime)}
                </Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Total Play Time</Text>
              </View>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <Music size={24} color={colors.accent} />
                <Text style={[s.textXl, s.fontBold, s.mt2, { color: colors.text }]}>{totalPlayCount}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Total Plays</Text>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Daily Average" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <Calendar size={20} color={colors.accent} />
                <View>
                  <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
                    {formatDuration(avgPerDay * 60)}
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>Average per day (last 7 days)</Text>
                </View>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Weekly Activity" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsEnd, s.justifyBetween, { height: 100 }]}>
                {listeningStats.weeklyMinutes.map((minutes, i) => (
                  <View key={i} style={[s.itemsCenter, s.gap1]}>
                    <View
                      style={[{ width: 32, borderTopLeftRadius: 8, borderTopRightRadius: 8, height: Math.max((minutes / maxMinutes) * 80, 2), backgroundColor: colors.accent }]}
                    />
                    <Text style={[s.text10, { color: colors.textMuted }]}>{dayLabels[i]}</Text>
                  </View>
                ))}
              </View>
              <View style={[s.flexRow, s.justifyBetween, s.mt2]}>
                <Text style={[s.textXs, { color: colors.textMuted }]}>
                  This week: {listeningStats.weeklyMinutes.reduce((a, b) => a + b, 0)} min
                </Text>
              </View>
            </View>
          </View>

          {topSongs.length > 0 && (
            <View>
              <SectionHeader title="Most Played Songs" />
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                {topSongs.map(({ song, count }, i) => (
                  <View
                    key={song.id}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                  >
                    <Text style={[s.textSm, s.fontBold, { width: 24, textAlign: 'center', color: colors.accent }]}>
                      {i + 1}
                    </Text>
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
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
