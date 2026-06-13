import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Heart } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ListRenderItemInfo } from 'react-native';
import type { Song } from '@/types/media';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { songs, hydrateFavorites } = useFavoritesStore();
  const { bottomSheetRef, present, song } = useSongContextMenu();

  useFocusEffect(
    useCallback(() => {
      const allSongs = useMusicStore.getState().songs;
      if (allSongs.length > 0) {
        hydrateFavorites(allSongs, []);
      }
    }, [hydrateFavorites])
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={useCallback(({ item }: ListRenderItemInfo<Song>) => (
          <Pressable
            onPress={() => usePlayerStore.getState().play(item, songs)}
            onLongPress={() => present(item)}
            className="flex-row items-center gap-3 px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Artwork uri={item.artwork} size={44} borderRadius={16} iconSize={18} iconColor={colors.accent} backgroundColor={colors.surface} />
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{item.title}</Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>{item.artist}</Text>
            </View>
            <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(item.duration)}</Text>
          </Pressable>
        ), [songs, colors, present])}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Heart size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No favorite songs yet</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Tap the heart icon in the player</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
