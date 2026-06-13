import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play, Archive } from 'lucide-react-native';

export default function NotUsedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const notUsed = songs.slice(-10).reverse();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Not Used</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <Text className="text-xs mb-4" style={{ color: colors.textMuted }}>Songs not opened for a long time</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {notUsed.length === 0 ? (
              <View className="items-center py-16">
                <Archive size={36} color={colors.textMuted} />
                <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>No unused songs</Text>
              </View>
            ) : (
              notUsed.map((song, i) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, notUsed)}
                  className="flex-row items-center gap-3 p-4"
                  style={{ borderBottomWidth: i < notUsed.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                    <Play size={18} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>{song.artist}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
