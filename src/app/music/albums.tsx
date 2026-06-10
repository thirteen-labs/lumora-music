import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Disc3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AlbumsScreen() {
  const { colors } = useTheme();
  const { albums } = useMusicStore();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Albums" />
      <FlatList
        data={albums}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/music/album/[id]', params: { id: item.id } })}
            className="flex-1 rounded-3xl overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="aspect-square items-center justify-center" style={{ backgroundColor: colors.card }}>
              <Disc3 size={40} color={colors.accent} />
            </View>
            <View className="p-3">
              <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>{item.title}</Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Disc3 size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No albums found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
