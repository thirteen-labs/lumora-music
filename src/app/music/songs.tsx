import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useMemo } from 'react';

import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { useStatsStore } from '@/store/stats-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music, LayoutGrid, List } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { SORT_OPTIONS, type SortField, type SortOrder, type Song } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function sortSongs(songs: any[], sortField: SortField, sortOrder: SortOrder, stats: Record<string, any>) {
  const sorted = [...songs];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'artist': cmp = a.artist.localeCompare(b.artist); break;
      case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
      case 'duration': cmp = a.duration - b.duration; break;
      case 'fileSize': cmp = a.fileSize - b.fileSize; break;
      case 'playCount': cmp = (stats[a.id]?.playCount || 0) - (stats[b.id]?.playCount || 0); break;
      case 'lastPlayed': cmp = (stats[a.id]?.lastPlayed || 0) - (stats[b.id]?.lastPlayed || 0); break;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

function LyricsBadge({ colors }: { colors: any }) {
  return (
    <View
      style={{
        backgroundColor: colors.accent + '20',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent }}>Lyrics</Text>
    </View>
  );
}

export default function SongsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const sortField = useMusicStore((s) => s.sortField);
  const sortOrder = useMusicStore((s) => s.sortOrder);
  const setSort = useMusicStore((s) => s.setSort);
  const trackStats = useStatsStore((s) => s.trackStats);
  const { fileSizeTheme, libraryViewMode, setLibraryViewMode } = useLayoutStore();
  const sortedSongs = useMemo(() => sortSongs(songs, sortField, sortOrder, trackStats), [songs, sortField, sortOrder, trackStats]);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const isGrid = libraryViewMode === 'grid';

  const gridConfig = {
    small: { columns: 3, thumbHeight: 64, showSize: false },
    medium: { columns: 3, thumbHeight: 96, showSize: false },
    big: { columns: 2, thumbHeight: 0, showSize: true },
  }[fileSizeTheme];

  const GRID_COLUMNS = gridConfig.columns;
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (GRID_COLUMNS - 1) * 12) / GRID_COLUMNS;

  const listHeightMap = { small: 56, medium: 68, big: 84 };
  const rowHeight = listHeightMap[fileSizeTheme];
  const listArtSizeMap = { small: 36, medium: 44, big: 56 };
  const artSize = listArtSizeMap[fileSizeTheme];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Songs" />
      <SortMenu
        options={SORT_OPTIONS}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
        count={sortedSongs.length}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        <Pressable
          onPress={() => setLibraryViewMode('list')}
          style={{ padding: 6, borderRadius: 6, backgroundColor: !isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <List size={18} color={!isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => setLibraryViewMode('grid')}
          style={{ padding: 6, borderRadius: 6, backgroundColor: isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <LayoutGrid size={18} color={isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
      </View>
      {isGrid ? (
        <FlashList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
          renderItem={({ item }: { item: Song }) => (
            <Pressable
              onPress={() => usePlayerStore.getState().play(item, sortedSongs)}
              onLongPress={() => present(item)}
              style={{ width: GRID_ITEM_WIDTH, marginBottom: 16 }}
            >
              {fileSizeTheme === 'big' ? (
                <>
                  <View
                    style={{
                      width: GRID_ITEM_WIDTH,
                      height: GRID_ITEM_WIDTH,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={14} iconSize={36} iconColor={colors.accent} backgroundColor={colors.surface} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                    <LyricsBadge colors={colors} />
                  </View>
                </>
              ) : (
                <>
                  <View
                    style={{
                      width: GRID_ITEM_WIDTH,
                      height: gridConfig.thumbHeight,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={12} iconSize={24} iconColor={colors.accent} backgroundColor={colors.surface} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                    <LyricsBadge colors={colors} />
                  </View>
                </>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <Music size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>No songs found</Text>
            </View>
          }
        />
      ) : (
        <FlashList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          renderItem={({ item }: { item: Song }) => (
            <Pressable
              onPress={() => usePlayerStore.getState().play(item, sortedSongs)}
              onLongPress={() => present(item)}
              style={[s.flexRowCenter, s.gap3, s.px4, { height: rowHeight, borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <Artwork uri={item.artwork} size={artSize} borderRadius={artSize * 0.25} iconColor={colors.accent} backgroundColor={colors.surface} />
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.artist}
                  </Text>
                  <LyricsBadge colors={colors} />
                  {fileSizeTheme === 'big' && (
                    <Text style={[s.textXs, { color: colors.textMuted, marginLeft: 6 }]}>
                      {formatFileSize(item.fileSize)}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <Music size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>No songs found</Text>
            </View>
          }
        />
      )}
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
