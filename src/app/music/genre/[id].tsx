import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music, Tag } from 'lucide-react-native';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { useLocalSearchParams } from 'expo-router';

export default function GenreDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { songs, genres } = useMusicStore();
  const { fileSizeTheme } = useLayoutStore();
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const genre = genres.find((g) => g.id === id);
  const genreSongs = songs.filter((s) => (s.genre ?? 'Unknown Genre') === id);

  const heightMap = { small: 56, medium: 68, big: 84 };
  const rowHeight = heightMap[fileSizeTheme];
  const artSizeMap = { small: 36, medium: 44, big: 56 };
  const artSize = artSizeMap[fileSizeTheme];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title={genre?.name ?? 'Genre'} />
      <View className="px-4 py-4 flex-row items-center gap-4" style={{ backgroundColor: colors.surface }}>
        <View className="w-14 h-14 rounded-3xl items-center justify-center" style={{ backgroundColor: colors.card }}>
          <Tag size={28} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            {genre?.name ?? 'Unknown Genre'}
          </Text>
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {genreSongs.length} songs
          </Text>
        </View>
      </View>
      <FlatList
        data={genreSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => usePlayerStore.getState().play(item, genreSongs)}
            onLongPress={() => present(item)}
            className="flex-row items-center gap-3 px-4"
            style={{ height: rowHeight, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Text className="text-sm w-6 text-center" style={{ color: colors.textMuted }}>
              {index + 1}
            </Text>
            <View className="rounded-xl items-center justify-center" style={{ width: artSize, height: artSize, backgroundColor: colors.surface }}>
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
            <Text className="mt-3" style={{ color: colors.textMuted }}>No songs in this genre</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
