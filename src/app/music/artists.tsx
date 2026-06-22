import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { User } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { useRouter } from 'expo-router';

export default function ArtistsScreen() {
  const { colors } = useTheme();
  const artists = useMusicStore((s) => s.artists);
  const router = useRouter();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Artists" />
      <FlashList
        data={artists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/music/artist/[id]', params: { id: item.id } })}
            style={[s.flexRowCenter, s.gap4, s.p3, s.rounded3xl, s.mb2, { backgroundColor: colors.surface }]}
          >
            <Artwork uri={item.artwork} size={56} borderRadius={28} iconSize={24} iconColor={colors.accent} backgroundColor={colors.card} />
            <View style={s.flex1}>
              <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.textSm, { color: colors.textMuted }]}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <User size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No artists found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
