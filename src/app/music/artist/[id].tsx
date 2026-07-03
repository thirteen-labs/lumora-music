import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useLayoutStore } from '@/store/layout-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { LyricsBadge } from '@/components/lyrics-badge';
import { Music } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { useLocalSearchParams } from 'expo-router';

export default function ArtistDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const songs = useMusicStore((s) => s.songs);
  const artists = useMusicStore((s) => s.artists);
  const fileSizeTheme = useLayoutStore((s) => s.fileSizeTheme);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const { bottomSheetRef, present, song } = useSongContextMenu();

  const artist = artists.find((a) => a.id === id);
  const artistSongs = songs.filter((s) => s.artist === id);

  const heightMap = { small: 64, medium: 76, big: 92 };
  const rowHeight = heightMap[fileSizeTheme];
  const artSizeMap = { small: 40, medium: 48, big: 60 };
  const artSize = artSizeMap[fileSizeTheme];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={artist?.name ?? 'Artist'} />
      <View style={[s.px4, s.py4, s.flexRowCenter, s.gap4, { backgroundColor: colors.surface }]}>
        <Artwork uri={artist?.artwork} size={80} borderRadius={40} iconSize={36} iconColor={colors.accent} backgroundColor={colors.card} />
        <View style={s.flex1}>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]} numberOfLines={1}>
            {artist?.name ?? 'Unknown Artist'}
          </Text>
          <Text style={[s.textSm, { color: colors.textMuted }]}>
            {artistSongs.length} songs
          </Text>
        </View>
      </View>
      <FlashList
        data={artistSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => usePlayerStore.getState().play(item, artistSongs)}
            onLongPress={() => present(item)}
            style={[s.flexRowCenter, s.gap3, s.px4, { height: rowHeight }]}
          >
            <Text style={[s.textSm, s.textCenter, { width: 24, color: colors.textMuted }]}>
              {index + 1}
            </Text>
            <Artwork uri={item.artwork} size={artSize} borderRadius={artSize * 0.25} iconColor={colors.accent} backgroundColor={colors.surface} />
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.album} {fileSizeTheme === 'big' ? `· ${formatFileSize(item.fileSize)}` : ''}
                </Text>
              </View>
            </View>
            <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Music size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No songs by this artist</Text>
          </View>
        }
      />
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
