import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
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
  const songs = useMusicStore((s) => s.songs);
  const videos = useVideoStore((s) => s.videos);

  const info = useMemo(() => calculateStorageInfo(songs, videos), [songs, videos]);
  const totalSize = info.totalAudioSize + info.totalVideoSize;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Storage Analysis" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Overview */}
          <View>
            <SectionHeader title="Overview" />
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <HardDrive size={24} color={colors.accent} />
                <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>{formatFileSize(totalSize)}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Total</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <Music size={24} color={colors.accent} />
                <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>{formatFileSize(info.totalAudioSize)}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Audio</Text>
              </View>
              <View className="flex-1 rounded-3xl p-4 items-center" style={{ backgroundColor: colors.surface }}>
                <VideoIcon2 size={24} color={colors.accent} />
                <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>{formatFileSize(info.totalVideoSize)}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Video</Text>
              </View>
            </View>
          </View>

          {/* Largest Files */}
          <View>
            <SectionHeader title="Largest Files" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {info.largestFiles.length === 0 ? (
                <View className="p-8 items-center">
                  <FileText size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No files to display</Text>
                </View>
              ) : (
                info.largestFiles.slice(0, 15).map((file, i) => (
                  <View
                    key={`${file.name}-${i}`}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < Math.min(info.largestFiles.length, 15) - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    {file.type === 'audio' ? (
                      <Music size={16} color={colors.accent} />
                    ) : (
                      <VideoIcon2 size={16} color={colors.accent} />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm" style={{ color: colors.text }} numberOfLines={1}>{file.name}</Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>{file.type}</Text>
                    </View>
                    <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>{formatFileSize(file.size)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Genre Breakdown */}
          <View>
            <SectionHeader title="By Genre" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {info.genreBreakdown.length === 0 ? (
                <View className="p-8 items-center">
                  <Tag size={32} color={colors.textMuted} />
                  <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No genre data</Text>
                </View>
              ) : (
                info.genreBreakdown.map((genre, i) => {
                  const percentage = totalSize > 0 ? (genre.size / totalSize) * 100 : 0;
                  return (
                    <View
                      key={genre.genre}
                      className="p-4"
                      style={{ borderBottomWidth: i < info.genreBreakdown.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-medium" style={{ color: colors.text }}>{genre.genre}</Text>
                        <Text className="text-xs" style={{ color: colors.textMuted }}>{genre.count} tracks</Text>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.card }}>
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: colors.accent }}
                        />
                      </View>
                      <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
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
