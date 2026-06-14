import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
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
  const insets = useSafeAreaInsets();
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
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('stats.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Overview */}
          <View>
            <SectionHeader title={t('stats.overview')} />
            <View style={[s.flexRow, s.gap3]}>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <Music size={24} color={colors.accent} />
                <Text style={[s.text2xl, s.fontBold, s.mt2, { color: colors.text }]}>{totalPlayCount}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('stats.total.plays')}</Text>
              </View>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <Clock size={24} color={colors.accent} />
                <Text style={[s.text2xl, s.fontBold, s.mt2, { color: colors.text }]}>
                  {totalListenTime > 3600
                    ? `${Math.floor(totalListenTime / 3600)}h`
                    : totalListenTime > 60
                    ? `${Math.floor(totalListenTime / 60)}m`
                    : `${totalListenTime}s`}
                </Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('stats.listen.time')}</Text>
              </View>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <TrendingUp size={24} color={colors.accent} />
                <Text style={[s.text2xl, s.fontBold, s.mt2, { color: colors.text }]}>{listeningStats.totalTracksPlayed}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('stats.tracks.played')}</Text>
              </View>
            </View>
          </View>

          {/* Weekly Listening */}
          <View>
            <SectionHeader title={t('stats.week')} />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb4]}>
                <BarChart3 size={20} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{t('stats.daily')}</Text>
              </View>
              <View style={[s.flexRow, s.itemsEnd, s.justifyBetween, { height: 120 }]}>
                {weeklyMinutes.map((minutes, i) => (
                  <View key={i} style={[s.flex1, s.itemsCenter]}>
                    <Text style={[s.text10, s.mb1, { color: colors.textMuted }]}>
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
                    <Text style={[s.text10, s.mt1, { color: i === weeklyMinutes.length - 1 ? colors.accent : colors.textMuted }]}>
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
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {topSongs.length === 0 ? (
                <View style={[s.p8, s.itemsCenter]}>
                  <Activity size={32} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>{t('stats.no.plays')}</Text>
                </View>
              ) : (
                topSongs.map(({ song, count }, i) => (
                  <View
                    key={song.id}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < topSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  >
                    <Text style={[s.textSm, s.fontBold, { width: 24, textAlign: 'center', color: colors.accent }]}>
                      {i + 1}
                    </Text>
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
                    </View>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>{count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top Artists */}
          <View>
            <SectionHeader title={t('stats.top.artists')} />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {listeningStats.topArtists.length === 0 ? (
                <View style={[s.p8, s.itemsCenter]}>
                  <User size={32} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>{t('stats.no.data')}</Text>
                </View>
              ) : (
                listeningStats.topArtists.map(({ name, count }, i) => (
                  <View
                    key={name}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < listeningStats.topArtists.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  >
                    <Text style={[s.textSm, s.fontBold, { width: 24, textAlign: 'center', color: colors.accent }]}>{i + 1}</Text>
                    <Text style={[s.flex1, s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                    <Text style={[s.textSm, { color: colors.textMuted }]}>{t('stats.plays', { count })}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top Albums */}
          <View>
            <SectionHeader title={t('stats.top.albums')} />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {listeningStats.topAlbums.length === 0 ? (
                <View style={[s.p8, s.itemsCenter]}>
                  <Disc size={32} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>{t('stats.no.data')}</Text>
                </View>
              ) : (
                listeningStats.topAlbums.map(({ name, count }, i) => (
                  <View
                    key={name}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < listeningStats.topAlbums.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  >
                    <Text style={[s.textSm, s.fontBold, { width: 24, textAlign: 'center', color: colors.accent }]}>{i + 1}</Text>
                    <Text style={[s.flex1, s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                    <Text style={[s.textSm, { color: colors.textMuted }]}>{t('stats.plays', { count })}</Text>
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
