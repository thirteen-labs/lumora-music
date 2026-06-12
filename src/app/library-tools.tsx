import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import {
  findDuplicateSongs,
} from '@/scanner/enhanced-scanner';
import { useMusicStore } from '@/store/music-store';
import { TriangleAlert, CircleCheck, Music } from 'lucide-react-native';

export default function LibraryToolsScreen() {
  const { colors } = useTheme();
  const songs = useMusicStore((s) => s.songs);

  const duplicates = findDuplicateSongs(songs);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Library Tools" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Library Health */}
          <View>
            <SectionHeader title="Library Health" />
            <View className="rounded-3xl overflow-hidden p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3">
                <CircleCheck size={20} color="#22C55E" />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>Total Songs</Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>{songs.length} tracks in library</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <TriangleAlert size={20} color={duplicates.length > 0 ? '#F59E0B' : '#22C55E'} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>Duplicate Detection</Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {duplicates.length > 0 ? `${duplicates.length} potential duplicates found` : 'No duplicates found'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <View>
              <SectionHeader title="Potential Duplicates" />
              <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                {duplicates.slice(0, 20).map((group, i) => (
                  <View
                    key={i}
                    className="p-4"
                    style={{ borderBottomWidth: i < duplicates.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <Music size={14} color={colors.accent} />
                      <Text className="text-sm font-medium flex-1" style={{ color: colors.text }} numberOfLines={1}>
                        {group.song.title}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {group.duplicates.length + 1} copies
                      </Text>
                    </View>
                    <Text className="text-xs" style={{ color: colors.textMuted }}>
                      by {group.song.artist} • {group.song.album}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Missing Files */}
          <View>
            <SectionHeader title="Missing File Cleanup" />
            <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                Missing file detection checks your library for entries that no longer point to existing files on disk.
              </Text>
              <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                This feature will be fully available in a future update when background file verification is implemented.
              </Text>
            </View>
          </View>

          {/* Incremental Scan */}
          <View>
            <SectionHeader title="Incremental Scan" />
            <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                Incremental scanning only processes new or modified files since the last scan, making rescans much faster.
              </Text>
              <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                Full incremental scan support with file change tracking will be available in a future update.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
