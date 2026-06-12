import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useVideoStore } from '@/store/video-store';
import { useStatsStore } from '@/store/stats-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import { Music, Clock, Heart, PlayCircle } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useScanManager } from '@/hooks/use-scan-manager';
import { useTranslation } from '@/hooks/use-translation';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { songs } = useMusicStore();
  const { favoriteSongIds, hydrateFavorites } = useFavoritesStore();
  const { currentTrack } = usePlayerStore();
  const router = useRouter();
  const { bottomSheetRef, present, song } = useSongContextMenu();
  const trackStats = useStatsStore((s) => s.trackStats);
  const { manualScan } = useScanManager();

  useEffect(() => {
    const init = async () => {
      await manualScan();
      const { songs: allSongs } = useMusicStore.getState();
      const { videos: allVideos } = useVideoStore.getState();
      hydrateFavorites(allSongs, allVideos);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentSongs = [...songs].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 10);
  const favSongs = songs.filter((s) => favoriteSongIds.includes(s.id)).slice(0, 10);
  const recentlyPlayed = useMemo(() => {
    return [...songs]
      .filter((s) => trackStats[s.id]?.lastPlayed)
      .sort((a, b) => (trackStats[b.id]?.lastPlayed || 0) - (trackStats[a.id]?.lastPlayed || 0))
      .slice(0, 10);
  }, [songs, trackStats]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold" style={{ color: colors.text }}>
            {t('home.welcome')}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>
            {t('home.songs.favorites', { songs: songs.length, favorites: favoriteSongIds.length })}
          </Text>
        </View>

        {currentTrack && (
          <View className="px-4 mb-6">
            <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
              Now Playing
            </Text>
            <Pressable
              onPress={() => router.push('/player')}
              className="flex-row items-center gap-3 p-4 rounded-3xl"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="w-14 h-14 rounded-xl overflow-hidden" style={{ backgroundColor: colors.card }}>
                <Artwork uri={currentTrack.artwork} size={56} borderRadius={12} iconSize={24} iconColor={colors.accent} backgroundColor="transparent" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text className="text-sm" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {recentlyPlayed.length > 0 && (
          <View className="px-4 mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <PlayCircle size={18} color={colors.accent} />
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                {t('library.recently.played')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentlyPlayed.map((song) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, recentlyPlayed)}
                  onLongPress={() => present(song)}
                  className="mr-3"
                  style={{ width: 140 }}
                >
                  <View className="w-[140px] h-[140px] rounded-3xl items-center justify-center mb-2 overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    <Artwork uri={song.artwork} size={140} borderRadius={24} iconSize={32} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
                    {song.artist} · {formatDuration(song.duration)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {recentSongs.length > 0 && (
          <View className="px-4 mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Clock size={18} color={colors.accent} />
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                {t('library.recently.added')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentSongs.map((song) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, recentSongs)}
                  onLongPress={() => present(song)}
                  className="mr-3"
                  style={{ width: 140 }}
                >
                  <View className="w-[140px] h-[140px] rounded-3xl items-center justify-center mb-2 overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    <Artwork uri={song.artwork} size={140} borderRadius={24} iconSize={32} iconColor={colors.accent} backgroundColor="transparent" />
                  </View>
                  <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
                    {song.artist} · {formatDuration(song.duration)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {favSongs.length > 0 && (
          <View className="px-4 mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Heart size={18} color={colors.accent} />
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                {t('library.favorites')}
              </Text>
            </View>
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
                  <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {song.artist}
                  </Text>
                </View>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {formatDuration(song.duration)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {songs.length === 0 && (
          <View className="items-center py-20">
            <Music size={48} color={colors.textMuted} />
            <Text className="text-lg mt-4" style={{ color: colors.textMuted }}>
              {t('home.no.songs')}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>
              {t('home.no.songs.desc')}
            </Text>
            <Pressable
              onPress={() => manualScan()}
              className="mt-4 px-6 py-3 rounded-2xl"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="font-semibold" style={{ color: colors.background }}>{t('home.scan')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />
      <MiniPlayer />
    </View>
  );
}
