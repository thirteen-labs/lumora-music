import { View, Text, FlatList, Pressable, Dimensions } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music, LayoutGrid, List } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function sortSongs(songs: any[], sortField: SortField, sortOrder: SortOrder) {
  const sorted = [...songs];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'artist': cmp = a.artist.localeCompare(b.artist); break;
      case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
      case 'duration': cmp = a.duration - b.duration; break;
      case 'fileSize': cmp = a.fileSize - b.fileSize; break;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

export default function SongsScreen() {
  const { colors } = useTheme();
  const songs = useMusicStore((s) => s.songs);
  const sortField = useMusicStore((s) => s.sortField);
  const sortOrder = useMusicStore((s) => s.sortOrder);
  const setSort = useMusicStore((s) => s.setSort);
  const { fileSizeTheme, libraryViewMode, setLibraryViewMode } = useLayoutStore();
  const sortedSongs = useMemo(() => sortSongs(songs, sortField, sortOrder), [songs, sortField, sortOrder]);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const heightMap = { small: 56, medium: 68, big: 84 };
  const rowHeight = heightMap[fileSizeTheme];
  const artSizeMap = { small: 36, medium: 44, big: 56 };
  const artSize = artSizeMap[fileSizeTheme];
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const isGrid = libraryViewMode === 'grid';
  const GRID_COLUMNS = 3;
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (GRID_COLUMNS - 1) * 12) / GRID_COLUMNS;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Songs" showMenu />
      <SortMenu
        options={SORT_OPTIONS}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        <Pressable
          onPress={() => setLibraryViewMode('list')}
          style={{ padding: 6, borderRadius: 8, backgroundColor: !isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <List size={18} color={!isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => setLibraryViewMode('grid')}
          style={{ padding: 6, borderRadius: 8, backgroundColor: isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <LayoutGrid size={18} color={isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
      </View>
      {isGrid ? (
        <FlatList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => usePlayerStore.getState().play(item, sortedSongs)}
              onLongPress={() => present(item)}
              style={{ width: GRID_ITEM_WIDTH, marginBottom: 16 }}
            >
              <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={16} iconSize={28} iconColor={colors.accent} backgroundColor={colors.surface} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{item.artist}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Music size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>No songs found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => usePlayerStore.getState().play(item, sortedSongs)}
              onLongPress={() => present(item)}
              className="flex-row items-center gap-3 px-4"
              style={{ height: rowHeight, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Artwork uri={item.artwork} size={artSize} borderRadius={artSize * 0.25} iconColor={colors.accent} backgroundColor={colors.surface} />
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {item.artist} {fileSizeTheme === 'big' ? `· ${formatFileSize(item.fileSize)}` : ''}
                </Text>
              </View>
              <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(item.duration)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Music size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>No songs found</Text>
            </View>
          }
        />
      )}
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
