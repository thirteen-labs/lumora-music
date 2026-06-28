import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { VideoThumbnailView } from '@/components/video-thumbnail-view';
import { VideoContextMenu, useVideoContextMenu } from '@/components/video-context-menu';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { s } from '@/styles';
import { Film, LayoutGrid, List, Search, X, FolderOpen } from 'lucide-react-native';
import type { Video, SortField, SortOrder, SortOption } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VIDEO_SORT_OPTIONS: SortOption[] = [
  { field: 'dateAdded', order: 'desc', label: 'Newest First' },
  { field: 'dateAdded', order: 'asc', label: 'Oldest First' },
  { field: 'title', order: 'asc', label: 'Name (A-Z)' },
  { field: 'title', order: 'desc', label: 'Name (Z-A)' },
  { field: 'duration', order: 'desc', label: 'Longest First' },
  { field: 'duration', order: 'asc', label: 'Shortest First' },
  { field: 'fileSize', order: 'desc', label: 'Largest First' },
  { field: 'fileSize', order: 'asc', label: 'Smallest First' },
];

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const GRID_PADDING = 16;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

function formatResolution(video: Video): string {
  if (!video.width || !video.height) return '';
  return `${video.width}x${video.height}`;
}

export default function VideosScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videos = useVideoStore((s) => s.videos);
  const fetchVideos = useVideoStore((s) => s.fetchVideos);
  const scanStatus = useVideoStore((s) => s.scanStatus);
  const scanProgress = useVideoStore((s) => s.scanProgress);
  const hiddenVideoIds = useHiddenFilesStore((s) => s.hiddenVideoIds);
  const videoViewMode = useLayoutStore((s) => s.videoViewMode);
  const setVideoViewMode = useLayoutStore((s) => s.setVideoViewMode);

  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const { bottomSheetRef, present, video: contextVideo } = useVideoContextMenu();

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (videos.length === 0 && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredVideos = useMemo(() => {
    let result = videos.filter((v) => !hiddenVideoIds.has(v.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'dateAdded':
          cmp = a.dateAdded - b.dateAdded;
          break;
        case 'duration':
          cmp = a.duration - b.duration;
          break;
        case 'fileSize':
          cmp = a.fileSize - b.fileSize;
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [videos, query, sortField, sortOrder, hiddenVideoIds]);

  const isGrid = videoViewMode === 'grid';
  const activeSort = VIDEO_SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? VIDEO_SORT_OPTIONS[0];

  const handleFolderPress = () => {
    router.push('/video-folder');
  };

  const renderGridItem = ({ item }: { item: Video }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/video-player', params: { videoId: item.id } })}
      onLongPress={() => present(item)}
      style={{ width: GRID_ITEM_WIDTH, marginBottom: GRID_GAP }}
    >
      <View
        style={{
          width: GRID_ITEM_WIDTH,
          height: GRID_ITEM_WIDTH * 0.6,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: colors.surface,
        }}
      >
        <VideoThumbnailView
          videoUri={item.uri}
          videoId={item.id}
          size={GRID_ITEM_WIDTH}
          borderRadius={12}
          iconSize={24}
          iconColor={colors.accent}
          backgroundColor={colors.surface}
        />
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 4,
            paddingHorizontal: 5,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderListItem = ({ item }: { item: Video }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/video-player', params: { videoId: item.id } })}
      onLongPress={() => present(item)}
      style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}
    >
      <View
        style={{
          width: 56,
          height: 40,
          borderRadius: 8,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <VideoThumbnailView
          videoUri={item.uri}
          videoId={item.id}
          size={56}
          borderRadius={8}
          iconSize={16}
          iconColor={colors.accent}
          backgroundColor={colors.surface}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            right: 3,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 3,
            paddingHorizontal: 3,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 8, fontWeight: '600', color: '#fff' }}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
      <View style={s.flex1}>
        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mt05]}>
          {item.duration > 0 && (
            <Text style={[s.textXs, { color: colors.textMuted }]}>
              {formatDuration(item.duration)}
            </Text>
          )}
          {formatResolution(item) ? (
            <Text style={[s.textXs, { color: colors.textMuted }]}>
              {formatResolution(item)}
            </Text>
          ) : null}
          {item.fileSize > 0 && (
            <Text style={[s.textXs, { color: colors.textMuted }]}>
              {formatFileSize(item.fileSize)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Videos" />

      <View style={[s.flexRow, s.itemsCenter, s.gap2, s.px4, s.py2]}>
        <View
          style={[
            s.flex1,
            s.flexRow,
            s.itemsCenter,
            s.gap2,
            s.rounded2xl,
            { backgroundColor: colors.surface, paddingHorizontal: 12, height: 40 },
          ]}
        >
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search videos..."
            placeholderTextColor={colors.textMuted}
            style={[s.flex1, s.textSm, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={handleFolderPress}
          style={[
            s.itemsCenter,
            s.justifyCenter,
            s.rounded2xl,
            { width: 40, height: 40, backgroundColor: colors.surface },
          ]}
        >
          <FolderOpen size={20} color={colors.accent} />
        </Pressable>
      </View>

      {scanStatus === 'scanning' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ height: 3, borderRadius: 1.5, backgroundColor: colors.surface, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 1.5, width: '100%', backgroundColor: colors.accent, opacity: 0.6 }} />
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
            Scanning... {scanProgress?.processed ?? 0} files found
          </Text>
        </View>
      )}
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, s.py1]}>
        <Text style={[s.textXs, { color: colors.textMuted }]}>
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
        </Text>
        <View style={[s.flexRow, s.itemsCenter, s.gap1]}>
          <SortMenu
            options={VIDEO_SORT_OPTIONS}
            active={activeSort}
            onSelect={(opt) => {
              setSortField(opt.field);
              setSortOrder(opt.order);
            }}
          />
          <Pressable
            onPress={() => setVideoViewMode(isGrid ? 'list' : 'grid')}
            style={{ padding: 6, borderRadius: 6 }}
          >
            {isGrid ? (
              <List size={18} color={colors.textMuted} />
            ) : (
              <LayoutGrid size={18} color={colors.textMuted} />
            )}
          </Pressable>
        </View>
      </View>

      {filteredVideos.length > 0 ? (
        isGrid ? (
          <FlashList
            data={filteredVideos}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            contentContainerStyle={{
              paddingHorizontal: GRID_PADDING,
              paddingBottom: 120 + insets.bottom,
            }}
            renderItem={renderGridItem}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlashList
            data={filteredVideos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            renderItem={renderListItem}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <Film size={48} color={colors.textMuted} />
          <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No videos found</Text>
        </View>
      )}

      <VideoContextMenu bottomSheetRef={bottomSheetRef} video={contextVideo} />
      <MiniPlayer />
    </View>
  );
}
