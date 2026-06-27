import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore, generateRandomQueue } from '@/store/player-store';
import { useSmartPlaylistStore } from '@/store/smart-playlist-store';
import { useStatsStore } from '@/store/stats-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { useLayoutStore } from '@/store/layout-store';
import { hasCachedLyrics, fetchLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SortMenu } from '@/components/sort-menu';
import { useEffect, useMemo, useRef } from 'react';
import { Music, Clock, LayoutGrid, List } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { s } from '@/styles';
import type { SortField, SortOrder, Song } from '@/types/media';
import { SORT_OPTIONS } from '@/types/media';

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

export default function MusicScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const scan = useMusicStore((s) => s.scan);
  const scanStatus = useMusicStore((s) => s.scanStatus);
  const scanProgress = useMusicStore((s) => s.scanProgress);
  const sortField = useMusicStore((s) => s.sortField);
  const sortOrder = useMusicStore((s) => s.sortOrder);
  const setSort = useMusicStore((s) => s.setSort);
  const trackStats = useStatsStore((s) => s.trackStats);
  const resolveSongs = useSmartPlaylistStore((s) => s.resolveSongs);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const fileSizeTheme = useLayoutStore((s) => s.fileSizeTheme);
  const libraryViewMode = useLayoutStore((s) => s.libraryViewMode);
  const setLibraryViewMode = useLayoutStore((s) => s.setLibraryViewMode);

  const initialScanDone = useRef(false);
  useEffect(() => {
    if (songs.length === 0 && !initialScanDone.current) {
      initialScanDone.current = true;
      scan();
    }
  }, []);

  const lyricsFetchedRef = useRef(false);
  useEffect(() => {
    if (songs.length === 0 || lyricsFetchedRef.current) return;
    lyricsFetchedRef.current = true;
    const toFetch = songs.slice(0, 30);
    for (let i = 0; i < toFetch.length; i++) {
      const s = toFetch[i];
      if (s.artist && s.title && hasCachedLyrics(s.artist, s.title) !== true) {
        setTimeout(() => {
          fetchLyrics(s.artist, s.title).catch(() => {});
        }, i * 300);
      }
    }
  }, [songs]);

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
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
            renderItem={({ item }: { item: Song }) => (
              <Pressable
                onPress={() => usePlayerStore.getState().play(item, generateRandomQueue(item, songs))}
                style={{ width: GRID_ITEM_WIDTH, marginBottom: 16 }}
              >
                <View
                  style={{
                    width: GRID_ITEM_WIDTH,
                    height: gridConfig.thumbHeight || GRID_ITEM_WIDTH,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                  }}
                >
                  <Artwork uri={item.artwork} size={GRID_ITEM_WIDTH} borderRadius={14} iconSize={24} iconColor={colors.accent} backgroundColor={colors.surface} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text, marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={null}
          />
        ) : (
          <FlashList
            data={sortedSongs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              recentlyAdded.length > 0 && !isGrid ? (
                <View>
                  <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mb1, s.px4, s.pt2]}>
                    <Clock size={13} color={colors.accent} />
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                      Recently Added
                    </Text>
                  </View>
                  {recentlyAdded.slice(0, 5).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => usePlayerStore.getState().play(item, generateRandomQueue(item, songs))}
                      style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}
                    >
                      <Artwork uri={item.artwork} size={40} borderRadius={8} iconSize={16} iconColor={colors.accent} backgroundColor={colors.card} />
                      <View style={s.flex1}>
                        <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt05]}>
                          {(!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true) && (
                            <View style={{ backgroundColor: colors.accent + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent }}>Lyrics</Text>
                            </View>
                          )}
                          <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
                        </View>
                      </View>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => usePlayerStore.getState().play(item, generateRandomQueue(item, songs))}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}
              >
                <Artwork uri={item.artwork} size={40} borderRadius={8} iconSize={16} iconColor={colors.accent} backgroundColor={colors.card} />
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt05]}>
                      {(!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true) && (
                        <View style={{ backgroundColor: colors.accent + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent }}>Lyrics</Text>
                        </View>
                      )}
                      <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
                    </View>
                </View>
                <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
              </Pressable>
            )}
            ListEmptyComponent={null}
          />
        )
      ) : (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <Music size={48} color={colors.textMuted} />
          <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No music found</Text>
        </View>
      )}
      <MiniPlayer />
    </View>
  );
}
