import { View, Text, Pressable, Dimensions, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { Video as VideoIcon, Search, FolderOpen } from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import { useEffect, useMemo, useState } from 'react';
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/media';
import { useRouter } from 'expo-router';
import { s } from '@/styles';
import { useTranslation } from '@/hooks/use-translation';
import { getCachedVideoThumbnail, generateVideoThumbnail } from '@/services/video-thumbnails';
import type { VideoThumbnail as ExpoVideoThumbnail } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function extractFolder(uri: string): string {
  const parts = uri.replace('file://', '').split('/');
  parts.pop();
  return parts.pop() || 'Unknown';
}

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

function VideoThumb({ uri, videoId, videoUri, width, height, borderRadius, colors }: { uri: string | null; videoId: string; videoUri: string; width: number; height: number; borderRadius: number; colors: any }) {
  const [hasError, setHasError] = useState(false);
  const [generatedThumb, setGeneratedThumb] = useState<ExpoVideoThumbnail | null | undefined>(
    getCachedVideoThumbnail(videoId) ?? undefined,
  );

  useEffect(() => {
    if (!uri && !generatedThumb) {
      generateVideoThumbnail(videoId, videoUri).then(setGeneratedThumb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, videoId, videoUri]);

  const imageSource: string | ExpoVideoThumbnail | null = generatedThumb ?? uri;

  if (!imageSource || hasError) {
    return (
      <View style={{ width, height, borderRadius, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <VideoIcon size={width * 0.4} color={colors.accent} />
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={{ width, height, borderRadius }}
      contentFit="cover"
      onError={() => setHasError(true)}
    />
  );
}

export default function VideosScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const videos = useVideoStore((s) => s.videos);
  const sortField = useVideoStore((s) => s.sortField);
  const sortOrder = useVideoStore((s) => s.sortOrder);
  const setSort = useVideoStore((s) => s.setSort);
  const scanVideos = useVideoStore((s) => s.scanVideos);
  const { fileSizeTheme } = useLayoutStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByFolder, setGroupByFolder] = useState(false);

  useEffect(() => {
    scanVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedVideos = useMemo(() => sortVideos(videos, sortField, sortOrder), [videos, sortField, sortOrder]);
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sortedVideos;
    const q = searchQuery.toLowerCase();
    return sortedVideos.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      extractFolder(v.uri).toLowerCase().includes(q),
    );
  }, [sortedVideos, searchQuery]);

  const grouped = useMemo(() => {
    if (!groupByFolder) return null;
    const map = new Map<string, typeof filtered>();
    for (const video of filtered) {
      const folder = extractFolder(video.uri);
      const group = map.get(folder) || [];
      group.push(video);
      map.set(folder, group);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByFolder]);

  const SMALL_COLUMNS = 4;
  const SMALL_GAP = 4;
  const SMALL_ITEM_W = (SCREEN_WIDTH - 32 - (SMALL_COLUMNS - 1) * SMALL_GAP) / SMALL_COLUMNS;

  const headerContent = (
    <>
      <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mx4, s.mb2]}>
        <View style={[s.flex1, s.flexRow, s.itemsCenter, s.rounded2xl, s.px3, { height: 36, backgroundColor: colors.surface }]}>
          <Search size={14} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search videos..."
            placeholderTextColor={colors.textMuted}
            style={[s.flex1, s.textSm, s.ml2, { color: colors.text, height: 36 }]}
          />
        </View>
        <Pressable
          onPress={() => setGroupByFolder((v) => !v)}
          style={[s.w9, s.h9, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: groupByFolder ? colors.accent + '25' : colors.surface }]}
        >
          <FolderOpen size={16} color={groupByFolder ? colors.accent : colors.textMuted} />
        </Pressable>
      </View>
      <SortMenu
        options={SORT_OPTIONS.filter((o) => o.field !== 'artist')}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
        count={filtered.length}
      />
    </>
  );

  if (groupByFolder && grouped) {
    return (
      <View style={[s.flex1, { backgroundColor: colors.background }]}>
        <TopBar />
        <FlashList
          data={grouped}
          keyExtractor={([folder]) => folder}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          ListHeaderComponent={headerContent}
          renderItem={({ item: [folder, folderVideos] }) => (
            <View style={[s.px4, s.mb4]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
                <FolderOpen size={14} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{folder}</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>{folderVideos.length}</Text>
              </View>
              <View style={[s.flexRow, s.flexWrap, { gap: 8 }]}>
                {folderVideos.map((video: any) => {
                  const cardW = (SCREEN_WIDTH - 48) / 3;
                  return (
                    <Pressable
                      key={video.id}
                      onPress={() => router.replace({ pathname: '/video-player', params: { uri: video.uri, title: video.title } })}
                      style={{ width: cardW }}
                    >
                      <VideoThumb uri={video.thumbnail} videoId={video.id} videoUri={video.uri} width={cardW} height={cardW * 0.65} borderRadius={8} colors={colors} />
                      <Text style={{ fontSize: 11, color: colors.text, marginTop: 4 }} numberOfLines={1}>{video.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <VideoIcon size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>{t('common.no.results')}</Text>
            </View>
          }
        />
        <MiniPlayer />
      </View>
    );
  }

  if (fileSizeTheme === 'small') {
    return (
      <View style={[s.flex1, { backgroundColor: colors.background }]}>
        <TopBar />
        {headerContent}
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={SMALL_COLUMNS}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.replace({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ width: SMALL_ITEM_W, marginBottom: SMALL_GAP }}
            >
              <VideoThumb uri={item.thumbnail} videoId={item.id} videoUri={item.uri} width={SMALL_ITEM_W} height={SMALL_ITEM_W * 0.65} borderRadius={6} colors={colors} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <VideoIcon size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>{t('common.no.results')}</Text>
            </View>
          }
        />
        <MiniPlayer />
      </View>
    );
  }

  if (fileSizeTheme === 'medium') {
    return (
      <View style={[s.flex1, { backgroundColor: colors.background }]}>
        <TopBar />
        {headerContent}
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.replace({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
            >
              <VideoThumb uri={item.thumbnail} videoId={item.id} videoUri={item.uri} width={120} height={72} borderRadius={10} colors={colors} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                  {formatDuration(item.duration)} · {item.width}x{item.height}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <VideoIcon size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>{t('common.no.results')}</Text>
            </View>
          }
        />
        <MiniPlayer />
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      {headerContent}
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const cardW = (SCREEN_WIDTH - 32 - 12) / 2;
          return (
            <Pressable
              onPress={() => router.replace({ pathname: '/video-player', params: { uri: item.uri, title: item.title } })}
              style={{ width: cardW, marginBottom: 16 }}
            >
              <VideoThumb uri={item.thumbnail} videoId={item.id} videoUri={item.uri} width={cardW} height={cardW * 0.65} borderRadius={12} colors={colors} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {item.width}x{item.height} · {formatDuration(item.duration)}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <VideoIcon size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>{t('common.no.results')}</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
