import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { Disc3 } from 'lucide-react-native';

export default function AlbumsScreen() {
  const { colors } = useTheme();
  const { albums } = useMusicStore();

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
          <Pressable className="flex-1 rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
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
    </View>
  );
}
