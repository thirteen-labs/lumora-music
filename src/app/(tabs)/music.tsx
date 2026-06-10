import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { useEffect } from 'react';
import { Music, List, Disc3, User, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function MusicScreen() {
  const { colors } = useTheme();
  const { songs, albums, artists, genres, scan } = useMusicStore();
  const router = useRouter();

  useEffect(() => {
    if (songs.length === 0) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = [
    { icon: List, label: 'Songs', count: songs.length, route: '/music/songs' },
    { icon: Disc3, label: 'Albums', count: albums.length, route: '/music/albums' },
    { icon: User, label: 'Artists', count: artists.length, route: '/music/artists' },
    { icon: Tag, label: 'Genres', count: genres.length, route: '/music/genres' },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Music" showMenu />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4">
          <Text className="text-sm mb-4" style={{ color: colors.textMuted }}>
            {songs.length} songs • {albums.length} albums • {artists.length} artists
          </Text>
          <View className="gap-3">
            {categories.map(({ icon: Icon, label, count, route }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as any)}
                className="flex-row items-center gap-4 p-4 rounded-2xl"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.card }}>
                  <Icon size={24} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>{label}</Text>
                  <Text className="text-sm" style={{ color: colors.textMuted }}>{count} items</Text>
                </View>
                <Text style={{ color: colors.textMuted }}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>Quick Play</Text>
          {songs.slice(0, 5).map((song) => (
            <Pressable
              key={song.id}
              onPress={() => {
                usePlayerStore.getState().play(song, songs);
              }}
              className="flex-row items-center gap-3 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: colors.surface }}>
                <Music size={18} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>{song.artist}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
