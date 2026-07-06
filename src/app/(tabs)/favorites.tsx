import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { SwipeableRow } from '@/components/swipeable-row';
import { LyricsBadge } from '@/components/lyrics-badge';
import { Heart } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Song } from '@/types/media';
import { s } from '@/styles';
import { useTranslation } from '@/hooks/use-translation';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const songs = useFavoritesStore((s) => s.songs);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrateFavorites);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  useFocusEffect(
    useCallback(() => {
      const allSongs = useMusicStore.getState().songs;
      if (allSongs.length > 0) {
        hydrateFavorites(allSongs);
      }
    }, [hydrateFavorites])
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      <FlashList
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        renderItem={useCallback(({ item }: { item: Song }) => {
          const queueSong = () => {
            const { queue } = usePlayerStore.getState();
            usePlayerStore.getState().play(item, [...queue, item]);
          };
          return (
            <SwipeableRow
              rightActions={[{ type: 'queue', onPress: queueSong }]}
              leftActions={[{ type: 'remove', onPress: () => toggleSongFavorite(item) }]}
            >
              <Pressable
                onPress={() => usePlayerStore.getState().play(item, songs)}
                onLongPress={() => present(item)}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4]}
              >
                <Artwork uri={item.artwork}
                 size={60} 
                 borderRadius={16} 
                 iconSize={22} 
                 iconColor={colors.accent} 
                 backgroundColor={colors.surface} />
                <View style={[s.flex1]}>
                  <Text style={[s.textBase, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                    <Text style={[s.textSm, { color: colors.textMuted }]}>{item.artist}</Text>
                  </View>
                </View>
                <Text style={[s.textSm, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
              </Pressable>
            </SwipeableRow>
          );
        }, [songs, colors, present, toggleSongFavorite, lyricsMap])}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Heart size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>{t('playlist.no.songs')}</Text>
            <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('playlist.add.to')}</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
