import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { Video as VideoIcon } from 'lucide-react-native';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { useEffect, useMemo } from 'react';
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/media';
import { useRouter } from 'expo-router';

function sortVideos(videos: any[], sortField: SortField, sortOrder: SortOrder) {
  const sorted = [...videos];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
      case 'duration': cmp = a.duration - b.duration; break;
      case 'fileSize': cmp = a.fileSize - b.fileSize; break;
      default: cmp = a.dateAdded - b.dateAdded;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

export default function VideosScreen() {
  const { colors } = useTheme();
  const videos = useVideoStore((s) => s.videos);
  const sortField = useVideoStore((s) => s.sortField);
  const sortOrder = useVideoStore((s) => s.sortOrder);
  const setSort = useVideoStore((s) => s.setSort);
  const loadVideos = useVideoStore((s) => s.loadVideos);
  const { scan } = useMusicStore();
  const sortedVideos = useMemo(() => sortVideos(videos, sortField, sortOrder), [videos, sortField, sortOrder]);
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const router = useRouter();

  useEffect(() => {
    scan().then(() => loadVideos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        data={sortedVideos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
            className="flex-row items-center gap-3 px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <View className="w-24 h-16 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.surface }}>
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
