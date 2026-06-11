import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { User } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { useRouter } from 'expo-router';

export default function ArtistsScreen() {
  const { colors } = useTheme();
  const { artists } = useMusicStore();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Artists" />
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/music/artist/[id]', params: { id: item.id } })}
            className="flex-row items-center gap-4 p-3 rounded-3xl mb-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Artwork uri={item.artwork} size={56} borderRadius={28} iconSize={24} iconColor={colors.accent} backgroundColor={colors.card} />
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ color: colors.text }} numberOfLines={1}>{item.name}</Text>
              <Text className="text-sm" style={{ color: colors.textMuted }}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <User size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No artists found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
