import { View, Text, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { useStatsStore } from '@/store/stats-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music, Play, Sparkles } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
import { ScrollView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

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
  const { t } = useTranslation();
  const { songs } = useMusicStore();
  const { favoriteSongIds, hydrateFavorites } = useFavoritesStore();
  const { currentTrack } = usePlayerStore();
  const router = useRouter();
  const { bottomSheetRef, present, song } = useSongContextMenu();
  const trackStats = useStatsStore((s) => s.trackStats);

  useEffect(() => {
    const init = async () => {
      const allSongs = useMusicStore.getState().songs;
      const allVideos = useVideoStore.getState().videos;
      hydrateFavorites(allSongs, allVideos);
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <View className="flex-1">
        {!hasContent ? (
          <View className="flex-1 items-center justify-center px-8">
            <Music size={56} color={colors.textMuted} strokeWidth={1.5} />
            <Text className="text-lg font-semibold mt-6" style={{ color: colors.text }}>
              {t('home.no.songs')}
            </Text>
            <Text className="text-sm mt-2 text-center" style={{ color: colors.textMuted }}>
              {t('home.no.songs.desc')}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Greeting & Stats */}
            <View className="px-5 pt-2 pb-5 flex-row items-center gap-4">
              <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.accent + '20' }}>
                <Sparkles size={28} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-3xl font-bold" style={{ color: colors.text }}>
                  {getGreeting()}
                </Text>
                <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {songs.length} songs · {favoriteSongIds.length} favorites
                </Text>
              </View>
            </View>

            {/* Now Playing Card */}
            {currentTrack && (
              <View className="px-5 mb-6">
                <Text className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
                  Now Playing
                </Text>
                <Pressable
                  onPress={() => router.push('/player')}
                  className="flex-row items-center gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: colors.surface }}
                >
                  <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.card }}>
                    <Artwork uri={currentTrack.artwork} size={52} borderRadius={10} iconSize={22} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base" style={{ color: colors.text }} numberOfLines={1}>
                      {currentTrack.title}
                    </Text>
                    <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                      {currentTrack.artist}
                    </Text>
                  </View>
                  <Play size={28} color={colors.accent} fill={colors.accent} />
                </Pressable>
              </View>
            )}

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between px-5 mb-3">
                  <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                    Recently Played
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/music')}>
                    <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
                      See All
                    </Text>
                  </Pressable>
                </View>
                <Text className="text-lg font-bold px-5 mb-3" style={{ color: colors.text }}>
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
                      <View className="rounded-2xl overflow-hidden mb-2" style={{ backgroundColor: colors.surface, width: CARD_W, height: CARD_W }}>
                        <Artwork uri={song.artwork} size={CARD_W} borderRadius={16} iconSize={40} iconColor={colors.accent} backgroundColor="transparent" />
                      </View>
                      <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                        {song.artist} · {formatDuration(song.duration)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recent Additions */}
            {recentSongs.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between px-5 mb-3">
                  <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                    Recent Additions
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/music')}>
                    <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
                      See All
                    </Text>
                  </Pressable>
                </View>
                <Text className="text-lg font-bold px-5 mb-3" style={{ color: colors.text }}>
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
                      <View className="rounded-2xl overflow-hidden mb-2" style={{ backgroundColor: colors.surface, width: CARD_W, height: CARD_W }}>
                        <Artwork uri={song.artwork} size={CARD_W} borderRadius={16} iconSize={40} iconColor={colors.accent} backgroundColor="transparent" />
                      </View>
                      <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                        {song.artist} · {formatDuration(song.duration)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Favorites */}
            {favSongs.length > 0 && (
              <View className="mb-6">
                <Text className="text-xs font-bold uppercase tracking-widest px-5 mb-3" style={{ color: colors.textMuted }}>
                  Your Favorites
                </Text>
                <Text className="text-lg font-bold px-5 mb-3" style={{ color: colors.text }}>
                  Liked Songs
                </Text>
                <View className="px-5">
                  {favSongs.map((song) => (
                    <Pressable
                      key={song.id}
                      onPress={() => usePlayerStore.getState().play(song, favSongs)}
                      onLongPress={() => present(song)}
                      className="flex-row items-center gap-3 py-3"
                      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                      <View className="w-12 h-12 rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                        <Artwork uri={song.artwork} size={48} borderRadius={12} iconSize={20} iconColor={colors.accent} backgroundColor="transparent" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                          {song.artist}
                        </Text>
                      </View>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {formatDuration(song.duration)}
                      </Text>
                    </Pressable>
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