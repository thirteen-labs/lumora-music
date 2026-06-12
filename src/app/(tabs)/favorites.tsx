import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Heart } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useState } from 'react';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { songs, videos } = useFavoritesStore();
  const [tab, setTab] = useState<'songs' | 'videos'>('songs');
  const { bottomSheetRef, present, song } = useSongContextMenu();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Favorites" />
      <View className="flex-row px-4 py-3 gap-2">
        {(['songs', 'videos'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className="flex-1 py-3 rounded-2xl items-center"
            style={{ backgroundColor: tab === t ? colors.accent : colors.surface }}
          >
            <Text
              className="text-sm font-semibold capitalize"
              style={{ color: tab === t ? colors.background : colors.text }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'songs' ? (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
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
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Heart size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>No songs in favorites</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Artwork uri={item.thumbnail} size={44} borderRadius={16} iconSize={18} iconColor={colors.accent} backgroundColor={colors.surface} />
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(item.duration)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Heart size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>No videos in favorites</Text>
            </View>
          }
        />
      )}
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
