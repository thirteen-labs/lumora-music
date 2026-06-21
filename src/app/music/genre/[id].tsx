import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
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
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={genre?.name ?? 'Genre'} />
      <View style={[s.px4, s.py4, s.flexRowCenter, s.gap4, { backgroundColor: colors.surface }]}>
        <View style={[s.w14, s.h14, s.rounded3xl, s.center, { backgroundColor: colors.card }]}>
          <Tag size={28} color={colors.accent} />
        </View>
        <View style={s.flex1}>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
            {genre?.name ?? 'Unknown Genre'}
          </Text>
          <Text style={[s.textSm, { color: colors.textMuted }]}>
            {genreSongs.length} songs
          </Text>
        </View>
      </View>
      <FlashList
        data={genreSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => usePlayerStore.getState().play(item, genreSongs)}
            onLongPress={() => present(item)}
            style={[s.flexRowCenter, s.gap3, s.px4, { height: rowHeight }]}
          >
            <Text style={[s.textSm, s.textCenter, { width: 24, color: colors.textMuted }]}>
              {index + 1}
            </Text>
            <View style={[s.roundedXl, s.center, { width: artSize, height: artSize, backgroundColor: colors.surface }]}>
              <Music size={artSize * 0.4} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                {item.artist} {fileSizeTheme === 'big' ? `· ${formatFileSize(item.fileSize)}` : ''}
              </Text>
            </View>
            <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Music size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No songs in this genre</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
