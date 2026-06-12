import { View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { usePlayerStore } from '@/store/player-store';
import { TopBar } from '@/components/top-bar';
import { Search } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { useState, useMemo } from 'react';
import { formatDuration } from '@/utils/cn';
import { fuzzySearch } from '@/utils/fuzzy';

export default function SearchScreen() {
  const { colors } = useTheme();
  const { songs } = useMusicStore();
  const { videos } = useVideoStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return { songs: [], videos: [] };
    const matchedSongs = fuzzySearch(songs, query, (s) => [s.title, s.artist, s.album]);
    const matchedVideos = fuzzySearch(videos, query, (v) => [v.title]);
    return {
      songs: matchedSongs.map((r) => r.item),
      videos: matchedVideos.map((r) => r.item),
    };
  }, [query, songs, videos]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Search" showSearch={false} />
      <View className="px-4 py-3">
        <View
          className="flex-row items-center gap-3 px-4 py-3 rounded-3xl"
          style={{ backgroundColor: colors.surface }}
        >
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, albums, videos..."
            placeholderTextColor={colors.textMuted}
            className="flex-1 text-base"
            style={{ color: colors.text }}
          />
        </View>
      </View>

      {query.trim() && (
        <FlatList
          data={[
            ...results.songs.map((s) => ({ type: 'song' as const, id: s.id, title: s.title, subtitle: s.artist, artwork: s.artwork, thumbnail: null })),
            ...results.videos.map((v) => ({ type: 'video' as const, id: v.id, title: v.title, subtitle: formatDuration(v.duration), artwork: null, thumbnail: v.thumbnail })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <Text className="px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
              {results.songs.length + results.videos.length} results
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.type === 'song') {
                  const song = songs.find((s) => s.id === item.id);
                  if (song) usePlayerStore.getState().play(song, results.songs);
                }
              }}
              className="flex-row items-center gap-3 px-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Artwork uri={item.artwork ?? item.thumbnail} size={40} borderRadius={16} iconSize={18} iconColor={colors.accent} backgroundColor={colors.surface} />
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>{item.subtitle}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Search size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>No results found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
