import { View, Text, FlatList, Pressable, Dimensions, Image } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useMusicStore } from '@/store/music-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { Video as VideoIcon } from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import { useEffect, useMemo } from 'react';
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/media';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function VideoThumb({ uri, width, height, borderRadius, colors }: { uri: string | null; width: number; height: number; borderRadius: number; colors: any }) {
  if (!uri) {
    return (
      <View style={{ width, height, borderRadius, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <VideoIcon size={width * 0.4} color={colors.accent} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius }}
      resizeMode="cover"
    />
  );
}

export default function VideosScreen() {
  const { colors } = useTheme();
  const videos = useVideoStore((s) => s.videos);
  const sortField = useVideoStore((s) => s.sortField);
  const sortOrder = useVideoStore((s) => s.sortOrder);
  const setSort = useVideoStore((s) => s.setSort);
  const loadVideos = useVideoStore((s) => s.loadVideos);
  const { fileSizeTheme } = useLayoutStore();
  const { scan } = useMusicStore();
  const sortedVideos = useMemo(() => sortVideos(videos, sortField, sortOrder), [videos, sortField, sortOrder]);
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const router = useRouter();

  useEffect(() => {
    scan().then(() => loadVideos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const SMALL_COLUMNS = 4;
  const SMALL_GAP = 4;
  const SMALL_ITEM_W = (SCREEN_WIDTH - 32 - (SMALL_COLUMNS - 1) * SMALL_GAP) / SMALL_COLUMNS;

  if (fileSizeTheme === 'small') {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <TopBar />
        <SortMenu
          options={SORT_OPTIONS.filter((o) => o.field !== 'artist')}
          active={activeSort}
          onSelect={(opt) => setSort(opt.field, opt.order)}
        />
        <FlatList
          data={sortedVideos}
          keyExtractor={(item) => item.id}
          numColumns={SMALL_COLUMNS}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          columnWrapperStyle={{ gap: SMALL_GAP }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ width: SMALL_ITEM_W, marginBottom: SMALL_GAP }}
            >
              <VideoThumb uri={item.thumbnail} width={SMALL_ITEM_W} height={SMALL_ITEM_W * 0.65} borderRadius={6} colors={colors} />
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

  if (fileSizeTheme === 'medium') {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <TopBar />
        <SortMenu
          options={SORT_OPTIONS.filter((o) => o.field !== 'artist')}
          active={activeSort}
          onSelect={(opt) => setSort(opt.field, opt.order)}
        />
        <FlatList
          data={sortedVideos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <VideoThumb uri={item.thumbnail} width={120} height={72} borderRadius={10} colors={colors} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                  {formatDuration(item.duration)} · {item.width}x{item.height}
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <SortMenu
        options={SORT_OPTIONS.filter((o) => o.field !== 'artist')}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
      />
      <FlatList
        data={sortedVideos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const cardW = (SCREEN_WIDTH - 32 - 12) / 2;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ width: cardW, marginBottom: 16 }}
            >
              <VideoThumb uri={item.thumbnail} width={cardW} height={cardW * 0.65} borderRadius={12} colors={colors} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {item.width}x{item.height} · {formatDuration(item.duration)}
              </Text>
            </Pressable>
          );
        }}
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
