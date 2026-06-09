import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { Video as VideoIcon } from 'lucide-react-native';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { useEffect } from 'react';
import { SORT_OPTIONS } from '@/types/media';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';

export default function VideosScreen() {
  const { colors } = useTheme();
  const { getSortedVideos, sortField, sortOrder, setSort, loadVideos } = useVideoStore();
  const { scan } = useMusicStore();
  const videos = getSortedVideos();
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const router = useRouter();

  useEffect(() => {
    scan().then(() => loadVideos());
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Videos" />
      <SortMenu
        options={SORT_OPTIONS.filter((o) => o.field !== 'artist')}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
      />
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
            className="flex-row items-center gap-3 px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <View className="w-24 h-16 rounded-xl items-center justify-center" style={{ backgroundColor: colors.surface }}>
              <VideoIcon size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={2}>{item.title}</Text>
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {formatDuration(item.duration)} · {formatFileSize(item.fileSize)}
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {item.width}x{item.height}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <VideoIcon size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No videos found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
