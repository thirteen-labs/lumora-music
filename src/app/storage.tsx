import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { calculateStorageInfo } from '@/scanner/enhanced-scanner';
import { formatFileSize } from '@/utils/cn';
import { HardDrive, Music, Video as VideoIcon2, FileText, Tag } from 'lucide-react-native';

export default function StorageScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const videos = useVideoStore((s) => s.videos);

  const info = useMemo(() => calculateStorageInfo(songs, videos), [songs, videos]);
  const totalSize = info.totalAudioSize + info.totalVideoSize;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Storage Analysis" showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Overview */}
          <View>
            <SectionHeader title="Overview" />
            <View style={[s.flexRow, s.gap3]}>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <HardDrive size={24} color={colors.accent} />
                <Text style={[s.textXl, s.fontBold, s.mt2, { color: colors.text }]}>{formatFileSize(totalSize)}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Total</Text>
              </View>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <Music size={24} color={colors.accent} />
                <Text style={[s.textXl, s.fontBold, s.mt2, { color: colors.text }]}>{formatFileSize(info.totalAudioSize)}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Audio</Text>
              </View>
              <View style={[s.flex1, s.rounded3xl, s.p4, s.itemsCenter, { backgroundColor: colors.surface }]}>
                <VideoIcon2 size={24} color={colors.accent} />
                <Text style={[s.textXl, s.fontBold, s.mt2, { color: colors.text }]}>{formatFileSize(info.totalVideoSize)}</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Video</Text>
              </View>
            </View>
          </View>

          {/* Largest Files */}
          <View>
            <SectionHeader title="Largest Files" />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {info.largestFiles.length === 0 ? (
                <View style={[s.p8, s.itemsCenter]}>
                  <FileText size={32} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>No files to display</Text>
                </View>
              ) : (
                info.largestFiles.slice(0, 15).map((file, i) => (
                  <View
                    key={`${file.name}-${i}`}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                  >
                    {file.type === 'audio' ? (
                      <Music size={16} color={colors.accent} />
                    ) : (
                      <VideoIcon2 size={16} color={colors.accent} />
                    )}
                    <View style={s.flex1}>
                      <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>{file.type}</Text>
                    </View>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.textMuted }]}>{formatFileSize(file.size)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Genre Breakdown */}
          <View>
            <SectionHeader title="By Genre" />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {info.genreBreakdown.length === 0 ? (
                <View style={[s.p8, s.itemsCenter]}>
                  <Tag size={32} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>No genre data</Text>
                </View>
              ) : (
                info.genreBreakdown.map((genre, i) => {
                  const percentage = totalSize > 0 ? (genre.size / totalSize) * 100 : 0;
                  return (
                    <View
                      key={genre.genre}
                      style={[s.p4]}
                    >
                      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb1]}>
                        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{genre.genre}</Text>
                        <Text style={[s.textXs, { color: colors.textMuted }]}>{genre.count} tracks</Text>
                      </View>
                      <View style={[{ height: 8, borderRadius: 9999, overflow: 'hidden', backgroundColor: colors.card }]}>
                        <View
                          style={[{ height: '100%', borderRadius: 9999, width: `${percentage}%`, backgroundColor: colors.accent }]}
                        />
                      </View>
                      <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>
                        {formatFileSize(genre.size)} ({percentage.toFixed(1)}%)
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
