import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useMusicStore } from '@/store/music-store';
import { useStatsStore } from '@/store/stats-store';
import { usePlaylistStore } from '@/store/playlist-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { SwipeableRow } from '@/components/swipeable-row';
import { Music, Play, Sparkles, FileMusic } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
import { ScrollView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { s } from '@/styles';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 40) / 2.2;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const scan = useMusicStore((s) => s.scan);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrateFavorites);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playlists = usePlaylistStore((s) => s.playlists);
  const router = useRouter();
  const { bottomSheetRef, present, song } = useSongContextMenu();
  const trackStats = useStatsStore((s) => s.trackStats);

  useEffect(() => {
    const init = async () => {
      let allSongs = useMusicStore.getState().songs;
      if (allSongs.length === 0) {
        await scan();
        allSongs = useMusicStore.getState().songs;
      }
      hydrateFavorites(allSongs);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentSongs = [...songs].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 10);
  const favSongs = songs.filter((s) => favoriteSongIds.includes(s.id)).slice(0, 10);
  const recentlyPlayed = [...songs]
    .filter((s) => trackStats[s.id]?.lastPlayed)
    .sort((a, b) => (trackStats[b.id]?.lastPlayed || 0) - (trackStats[a.id]?.lastPlayed || 0))
    .slice(0, 10);

  const hasContent = recentlyPlayed.length > 0 || recentSongs.length > 0 || favSongs.length > 0;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      <View style={[s.flex1]}>
        {!hasContent ? (
          <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
            <Music size={56} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[s.textLg, s.fontSemibold, s.mt6, { color: colors.text }]}>
              {t('home.no.songs')}
            </Text>
            <Text style={[s.textSm, s.mt2, s.textCenter, { color: colors.textMuted }]}>
              {t('home.no.songs.desc')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={[s.flex1]}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Greeting & Stats */}
            <View style={[s.px5, s.pt2, s.pb5, s.flexRow, s.itemsCenter, s.gap4]}>
              <View style={[s.w14, s.h14, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                <Sparkles size={28} color={colors.accent} />
              </View>
              <View style={[s.flex1]}>
                <Text style={[s.text3xl, s.fontBold, { color: colors.text }]}>
                  {getGreeting()}
                </Text>
                <Text style={[s.textSm, s.mt1, { color: colors.textMuted }]}>
                  {t('home.songs.favorites', { songs: songs.length, favorites: favoriteSongIds.length })}
                </Text>
              </View>
            </View>

            {/* Custom Playlists */}
            {playlists.length > 0 && (
              <View style={[s.mb8]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.mb3]}>
                   <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}>
                    Your Playlists
                  </Text>
                  <Pressable onPress={() => router.push('/playlist-picker')}>
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
                      View All
                    </Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {playlists.map((pl) => (
                    <Pressable
                      key={pl.id}
                      onPress={() => router.push({ pathname: '/(tabs)/playlist/[id]', params: { id: pl.id } })}
                      style={{ width: 140 }}
                    >
                      <View style={[s.rounded2xl, s.justifyCenter, s.itemsCenter, { width: 140, height: 140, backgroundColor: colors.surface, borderRadius: 20 }]}>
                         <FileMusic size={40} color={colors.accent} />
                      </View>
                      <Text style={[s.textSm, s.fontSemibold, s.mt2, { color: colors.text }]} numberOfLines={1}>
                        {pl.name}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>
                        {pl.songIds.length} tracks
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Now Playing Card */}
            {currentTrack && (
              <View style={[s.px5, s.mb6]}>
                <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.accent }]}>
                  {t('player.now.playing')}
                </Text>
                <Pressable
                  onPress={() => router.push('/player')}
                  style={[s.cardRow, s.rounded2xl, { backgroundColor: colors.surface }]}
                >
                  <View style={[s.roundedXl, s.overflowHidden, { backgroundColor: colors.card }]}>
                    <Artwork uri={currentTrack.artwork} size={52} borderRadius={10} iconSize={22} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <View style={[s.flex1]}>
                    <Text style={[s.fontSemibold, s.textBase, { color: colors.text }]} numberOfLines={1}>
                      {currentTrack.title}
                    </Text>
                    <Text style={[s.textSm, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
                      {currentTrack.artist}
                    </Text>
                  </View>
                  <Play size={28} color={colors.accent} fill={colors.accent} />
                </Pressable>
              </View>
            )}

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
              <View style={[s.mb6]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.mb3]}>
                  <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}>
                    {t('library.recently.played')}
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/music')}>
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
                      See All
                    </Text>
                  </Pressable>
                </View>
                <Text style={[s.textLg, s.fontBold, s.px5, s.mb3, { color: colors.text }]}>
                  Pick Up Where You Left Off
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {recentlyPlayed.map((song) => (
                    <Pressable
                      key={song.id}
                      onPress={() => usePlayerStore.getState().play(song, recentlyPlayed)}
                      onLongPress={() => present(song)}
                      style={{ width: CARD_W }}
                    >
                      <View style={[s.rounded2xl, s.overflowHidden, s.mb2, { backgroundColor: colors.surface, width: CARD_W, height: CARD_W }]}>
                        <Artwork uri={song.artwork} size={CARD_W} borderRadius={16} iconSize={40} iconColor={colors.accent} backgroundColor="transparent" />
                      </View>
                      <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
                        {song.artist} · {formatDuration(song.duration)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recent Additions */}
            {recentSongs.length > 0 && (
              <View style={[s.mb6]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.mb3]}>
                  <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}>
                    {t('library.recently.added')}
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/music')}>
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
                      See All
                    </Text>
                  </Pressable>
                </View>
                <Text style={[s.textLg, s.fontBold, s.px5, s.mb3, { color: colors.text }]}>
                  New in your Library
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {recentSongs.map((song) => (
                    <Pressable
                      key={song.id}
                      onPress={() => usePlayerStore.getState().play(song, recentSongs)}
                      onLongPress={() => present(song)}
                      style={{ width: CARD_W }}
                    >
                      <View style={[s.rounded2xl, s.overflowHidden, s.mb2, { backgroundColor: colors.surface, width: CARD_W, height: CARD_W }]}>
                        <Artwork uri={song.artwork} size={CARD_W} borderRadius={16} iconSize={40} iconColor={colors.accent} backgroundColor="transparent" />
                      </View>
                      <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
                        {song.artist} · {formatDuration(song.duration)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Favorites */}
            {favSongs.length > 0 && (
              <View style={[s.mb6]}>
                <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }, s.px5, s.mb3]}>
                  Your Favorites
                </Text>
                <Text style={[s.textLg, s.fontBold, s.px5, s.mb3, { color: colors.text }]}>
                  Liked Songs
                </Text>
                <View style={[s.px5]}>
                  {favSongs.map((song) => (
                    <SwipeableRow key={song.id} rightActions={[{ type: 'queue', onPress: () => {
                      const { queue } = usePlayerStore.getState();
                      usePlayerStore.getState().play(song, [...queue, song]);
                    } }]}>
                      <Pressable
                        onPress={() => usePlayerStore.getState().play(song, favSongs)}
                        onLongPress={() => present(song)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.py3]}
                      >
                        <View style={[s.w12, s.h12, s.roundedXl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                          <Artwork uri={song.artwork} size={48} borderRadius={12} iconSize={20} iconColor={colors.accent} backgroundColor="transparent" />
                        </View>
                        <View style={[s.flex1]}>
                          <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
                            {song.artist}
                          </Text>
                        </View>
                        <Text style={[s.textXs, { color: colors.textMuted }]}>
                          {formatDuration(song.duration)}
                        </Text>
                      </Pressable>
                    </SwipeableRow>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
