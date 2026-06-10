import { View, Text, FlatList, Pressable } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music } from 'lucide-react-native';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/media';

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
  const { fileSizeTheme } = useLayoutStore();
  const sortedSongs = useMemo(() => sortSongs(songs, sortField, sortOrder), [songs, sortField, sortOrder]);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const heightMap = { small: 56, medium: 68, big: 84 };
  const rowHeight = heightMap[fileSizeTheme];
  const artSizeMap = { small: 36, medium: 44, big: 56 };
  const artSize = artSizeMap[fileSizeTheme];
  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Songs" showMenu />
      <SortMenu
        options={SORT_OPTIONS}
        active={activeSort}
        onSelect={(opt) => setSort(opt.field, opt.order)}
      />
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
            <View className="rounded-2xl items-center justify-center" style={{ width: artSize, height: artSize, backgroundColor: colors.surface }}>
              <Music size={artSize * 0.4} color={colors.accent} />
            </View>
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
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
