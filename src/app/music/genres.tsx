import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { Tag } from 'lucide-react-native';

export default function GenresScreen() {
  const { colors } = useTheme();
  const { genres } = useMusicStore();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Genres" />
      <FlatList
        data={genres}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            className="flex-row items-center gap-4 p-4 rounded-2xl mb-2"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: colors.card }}>
              <Tag size={20} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ color: colors.text }}>{item.name}</Text>
              <Text className="text-sm" style={{ color: colors.textMuted }}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Tag size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No genres found</Text>
          </View>
        }
      />
    </View>
  );
}
