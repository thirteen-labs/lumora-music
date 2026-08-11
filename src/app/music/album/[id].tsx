import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { playerActions } from '@/player/actions';
import { useLayoutStore } from '@/store/layout-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { LyricsBadge } from '@/components/lyrics-badge';
import { Music } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration, formatFileSize } from '@/utils/format';
import { useLocalSearchParams } from 'expo-router';

export default function AlbumDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);
  const fileSizeTheme = useLayoutStore((s) => s.fileSizeTheme);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const album = albums.find((a) => a.id === id);
  const albumSongs = songs.filter((s) => s.albumId === id);

  const heightMap = { small: 76, medium: 88, big: 104 };
  const rowHeight = heightMap[fileSizeTheme];
  const artSizeMap = { small: 52, medium: 60, big: 72 };
  const artSize = artSizeMap[fileSizeTheme];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={album?.title ?? 'Album'} />
      <View style={[s.px4, s.py4, s.flexRowCenter, s.gap4, { backgroundColor: colors.surface }]}>
        <Artwork uri={album?.artwork} size={80} borderRadius={24} iconSize={36} iconColor={colors.accent} backgroundColor={colors.card} />
        <View style={s.flex1}>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]} numberOfLines={1}>
            {album?.title ?? 'Unknown Album'}
          </Text>
          <Text style={[s.textSm, { color: colors.textMuted }]}>
            {albumSongs.length} songs · {album?.artist ?? ''}
          </Text>
        </View>
      </View>
      <FlashList
        data={albumSongs}
        keyExtractor={(item) => item.id}
        estimatedItemSize={rowHeight}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => playerActions.play(item, albumSongs)}
            onLongPress={() => present(item)}
            style={[s.flexRowCenter, s.gap3, s.px4, { height: rowHeight }]}
          >
            <Text style={[s.textSm, s.textCenter, { width: 24, color: colors.textMuted }]}>
              {index + 1}
            </Text>
            <Artwork uri={album?.artwork ?? item.artwork} size={artSize} borderRadius={artSize * 0.25} iconColor={colors.accent} backgroundColor={colors.surface} />
            <View style={s.flex1}>
              <Text style={[s.textBase, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                <Text style={[s.textSm, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.artist} {fileSizeTheme === 'big' ? `· ${formatFileSize(item.fileSize)}` : ''}
                </Text>
              </View>
            </View>
            <Text style={[s.textSm, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Music size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No songs in this album</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
