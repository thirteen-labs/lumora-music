import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useMemo, useState, useCallback } from 'react';

import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore, generateRandomQueue } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { useStatsStore } from '@/store/stats-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { SwipeableRow } from '@/components/swipeable-row';
import { LyricsBadge } from '@/components/lyrics-badge';
import { Music, LayoutGrid, List, ListPlus, Play, X, SquareCheck } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration, formatFileSize } from '@/utils/format';
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

export default function SongsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const sortField = useMusicStore((s) => s.sortField);
  const sortOrder = useMusicStore((s) => s.sortOrder);
  const setSort = useMusicStore((s) => s.setSort);
  const trackStats = useStatsStore((s) => s.trackStats);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const { fileSizeTheme, libraryViewMode, setLibraryViewMode } = useLayoutStore();
  const sortedSongs = useMemo(() => sortSongs(songs, sortField, sortOrder, trackStats), [songs, sortField, sortOrder, trackStats]);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleItemPress = useCallback((item: Song) => {
    if (isSelecting) {
      toggleSelect(item.id);
    } else {
      usePlayerStore.getState().play(item, generateRandomQueue(item, songs));
    }
  }, [isSelecting, toggleSelect, songs]);

  const handleItemLongPress = useCallback((item: Song) => {
    if (!isSelecting) {
      setSelectedIds(new Set([item.id]));
    } else {
      present(item);
    }
  }, [isSelecting, present]);

  const handleAddSelectedToQueue = useCallback(() => {
    const addToQueue = usePlayerStore.getState().addToQueue;
    selectedIds.forEach((id) => {
      const track = songs.find((s) => s.id === id);
      if (track) addToQueue(track);
    });
    clearSelection();
  }, [selectedIds, songs, clearSelection]);

  const handlePlaySelected = useCallback(() => {
    const selectedSongsList = songs.filter((s) => selectedIds.has(s.id));
    if (selectedSongsList.length > 0) {
      usePlayerStore.getState().play(selectedSongsList[0], selectedSongsList);
    }
    clearSelection();
  }, [selectedIds, songs, clearSelection]);

  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const isGrid = libraryViewMode === 'grid';

  const gridConfig = {
    small: { columns: 3, thumbHeight: 64, showSize: false },
    medium: { columns: 3, thumbHeight: 96, showSize: false },
    big: { columns: 2, thumbHeight: 0, showSize: true },
  }[fileSizeTheme];

  const GRID_COLUMNS = gridConfig.columns;
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (GRID_COLUMNS - 1) * 12) / GRID_COLUMNS;

  const listHeightMap = { small: 76, medium: 88, big: 104 };
  const rowHeight = listHeightMap[fileSizeTheme];
  const listArtSizeMap = { small: 52, medium: 60, big: 72 };
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
          estimatedItemSize={gridConfig.thumbHeight || GRID_ITEM_WIDTH}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
          renderItem={({ item }: { item: Song }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Pressable
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item)}
                style={{ width: GRID_ITEM_WIDTH, marginBottom: 16, opacity: isSelecting && !isSelected ? 0.6 : 1 }}
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
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: colors.accent,
                      }}
                    >
                      <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={14} iconSize={36} iconColor={colors.accent} backgroundColor={colors.surface} />
                      {isSelected && (
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <SquareCheck size={14} color={colors.background} />
                        </View>
                      )}
                    </View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                          <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
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
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: colors.accent,
                      }}
                    >
                      <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={12} iconSize={24} iconColor={colors.accent} backgroundColor={colors.surface} />
                      {isSelected && (
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <SquareCheck size={14} color={colors.background} />
                        </View>
                      )}
                    </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                          <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                        </View>
                  </>
                )}
              </Pressable>
            );
          }}
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
          estimatedItemSize={rowHeight}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          renderItem={({ item }: { item: Song }) => {
            const isSelected = selectedIds.has(item.id);
            const queueSong = () => {
              const { queue } = usePlayerStore.getState();
              usePlayerStore.getState().play(item, [...queue, item]);
            };
            return (
              <SwipeableRow rightActions={isSelecting ? [] : [{ type: 'queue', onPress: queueSong }]} disabled={isSelecting}>
                <Pressable
                  onPress={() => handleItemPress(item)}
                  onLongPress={() => handleItemLongPress(item)}
                  style={[s.flexRowCenter, s.gap3, s.px4, { height: rowHeight, backgroundColor: isSelected ? colors.accent + '10' : 'transparent', opacity: isSelecting && !isSelected ? 0.6 : 1 }]}
                >
                  <Artwork uri={item.artwork} size={artSize} borderRadius={artSize * 0.25} iconColor={colors.accent} backgroundColor={colors.surface} />
                  <View style={s.flex1}>
                    <Text style={[s.textBase, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                      <Text style={[s.textSm, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      {fileSizeTheme === 'big' && (
                        <Text style={[s.textSm, { color: colors.textMuted }]}>
                          {formatFileSize(item.fileSize)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isSelected ? (
                    <SquareCheck size={18} color={colors.accent} />
                  ) : (
                    <Text style={[s.textSm, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
                  )}
                </Pressable>
              </SwipeableRow>
            );
          }}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <Music size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>No songs found</Text>
            </View>
          }
        />
      )}
      {isSelecting && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 12, backgroundColor: colors.background + 'F2' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={clearSelection}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}
            >
              <X size={18} color={colors.text} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>
              {selectedIds.size} selected
            </Text>
            <Pressable
              onPress={handleAddSelectedToQueue}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.accent }}
            >
              <ListPlus size={16} color={colors.background} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.background }}>Add to Queue</Text>
            </Pressable>
            <Pressable
              onPress={handlePlaySelected}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}
            >
              <Play size={18} color={colors.background} fill={colors.background} />
            </Pressable>
          </View>
        </View>
      )}
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
