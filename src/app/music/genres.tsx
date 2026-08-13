import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function GenresScreen() {
  const { colors } = useTheme();
  const genres = useMusicStore((s) => s.genres);
  const router = useRouter();

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title="Genres" />
      <FlashList
        data={genres}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/music/genre/[id]', params: { id: item.id } })}
            style={[s.flexRowCenter, s.gap4, s.p4, s.rounded3xl, s.mb2, { backgroundColor: colors.surface }]}
          >
            <View style={[s.w12, s.h12, s.roundedXl, s.center, { backgroundColor: colors.card }]}>
              <Tag size={20} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>{item.name}</Text>
              <Text style={[s.textSm, { color: colors.textMuted }]}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Tag size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No genres found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
