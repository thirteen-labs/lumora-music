import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { generateRandomQueue } from '@/store/player-store';
import { playerActions } from '@/player/actions';
import { useSmartPlaylistStore } from '@/store/smart-playlist-store';
import { useStatsStore } from '@/store/stats-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { useLayoutStore } from '@/store/layout-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { LyricsBadge } from '@/components/lyrics-badge';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Music, Clock, LayoutGrid, List, ListPlus, Play, X, SquareCheck } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/format';
import { sortSongs } from '@/utils/sort-songs';
import { useTranslation } from '@/hooks/use-translation';
import { s } from '@/styles';
import type { Song } from '@/types/media';
import { SORT_OPTIONS } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MusicScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const scan = useMusicStore((s) => s.scan);
  const sortField = useMusicStore((s) => s.sortField);
  const sortOrder = useMusicStore((s) => s.sortOrder);
  const setSort = useMusicStore((s) => s.setSort);
  const trackStats = useStatsStore((s) => s.trackStats);
  const resolveSongs = useSmartPlaylistStore((s) => s.resolveSongs);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const fileSizeTheme = useLayoutStore((s) => s.fileSizeTheme);
  const libraryViewMode = useLayoutStore((s) => s.libraryViewMode);
  const setLibraryViewMode = useLayoutStore((s) => s.setLibraryViewMode);

  const { bottomSheetRef, present, song } = useSongContextMenu();
  const initialScanDone = useRef(false);
  useEffect(() => {
    if (songs.length === 0 && !initialScanDone.current) {
      initialScanDone.current = true;
      scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      playerActions.play(item, generateRandomQueue(item, songs));
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
    selectedIds.forEach((id) => {
      const track = songs.find((s) => s.id === id);
      if (track) playerActions.addToQueue(track);
    });
    clearSelection();
  }, [selectedIds, songs, clearSelection]);

  const handlePlaySelected = useCallback(() => {
    const selectedSongs = songs.filter((s) => selectedIds.has(s.id));
    if (selectedSongs.length > 0) {
      playerActions.play(selectedSongs[0], selectedSongs);
    }
    clearSelection();
  }, [selectedIds, songs, clearSelection]);

  const sortedSongs = useMemo(() => sortSongs(songs, sortField, sortOrder, trackStats), [songs, sortField, sortOrder, trackStats]);

  const recentlyAdded = useMemo(() => {
    if (songs.length === 0) return [];
    return resolveSongs('__recently_added', songs, trackStats);
  }, [songs, trackStats, resolveSongs]);

  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];
  const isGrid = libraryViewMode === 'grid';

  const gridConfig = {
    small: { columns: 3, thumbHeight: 64, showSize: false },
    medium: { columns: 3, thumbHeight: 96, showSize: false },
    big: { columns: 2, thumbHeight: 0, showSize: true },
  }[fileSizeTheme];

  const GRID_COLUMNS = gridConfig.columns;
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (GRID_COLUMNS - 1) * 12) / GRID_COLUMNS;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
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
      {sortedSongs.length > 0 ? (
        isGrid ? (
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
                  <View
                    style={{
                      width: GRID_ITEM_WIDTH,
                      height: gridConfig.thumbHeight || GRID_ITEM_WIDTH,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: colors.surface,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: colors.accent,
                    }}
                  >
                    <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={14} iconSize={24} iconColor={colors.accent} backgroundColor={colors.surface} />
                    {isSelected && (
                      <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <SquareCheck size={14} color={colors.background} />
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={null}
          />
        ) : (
          <FlashList
            data={sortedSongs}
            keyExtractor={(item) => item.id}
            estimatedItemSize={76}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              recentlyAdded.length > 0 && !isGrid ? (
                <View>
                  <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mb1, s.px4, s.pt2]}>
                    <Clock size={13} color={colors.accent} />
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                      {t('library.recently.added')}
                    </Text>
                  </View>
                  {recentlyAdded.slice(0, 5).map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleItemPress(item)}
                        onLongPress={() => handleItemLongPress(item)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4, { backgroundColor: isSelected ? colors.accent + '10' : 'transparent', opacity: isSelecting && !isSelected ? 0.6 : 1 }]}
                      >
                        <Artwork uri={item.artwork} size={56} borderRadius={12} iconSize={20} iconColor={colors.accent} backgroundColor={colors.card} />
                        <View style={s.flex1}>
                          <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                          <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt05]}>
                            <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                            <Text style={[s.textSm, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
                          </View>
                        </View>
                        {isSelected ? (
                          <SquareCheck size={18} color={colors.accent} />
                        ) : (
                          <Text style={[s.textSm, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable
                  onPress={() => handleItemPress(item)}
                  onLongPress={() => handleItemLongPress(item)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4, { backgroundColor: isSelected ? colors.accent + '10' : 'transparent', opacity: isSelecting && !isSelected ? 0.6 : 1 }]}
                >
                  <Artwork uri={item.artwork} size={56} borderRadius={12} iconSize={20} iconColor={colors.accent} backgroundColor={colors.card} />
                  <View style={s.flex1}>
                    <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt05]}>
                        {(!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true) && (
                          <View style={{ backgroundColor: colors.accent + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>Lyrics</Text>
                          </View>
                        )}
                        <Text style={[s.textSm, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
                      </View>
                  </View>
                  {isSelected ? (
                    <SquareCheck size={18} color={colors.accent} />
                  ) : (
                    <Text style={[s.textSm, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={null}
          />
        )
      ) : (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <Music size={48} color={colors.textMuted} />
          <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>{t('library.no.music')}</Text>
        </View>
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
              {selectedIds.size} {t('library.selected')}
            </Text>
            <Pressable
              onPress={handleAddSelectedToQueue}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.accent }}
            >
              <ListPlus size={16} color={colors.background} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.background }}>{t('library.add.to.queue')}</Text>
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
