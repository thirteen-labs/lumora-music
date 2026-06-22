import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Disc3 } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { useRouter } from 'expo-router';

export default function AlbumsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const albums = useMusicStore((s) => s.albums);
  const router = useRouter();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Albums" />
      <FlashList
        data={albums}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 6, paddingBottom: 120 + insets.bottom }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/music/album/[id]', params: { id: item.id } })}
            style={[s.flex1, s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface, margin: 6, marginBottom: 12 }]}
          >
            <View style={[s.aspectSquare, s.center, s.overflowHidden, { backgroundColor: colors.card }]}>
              <Artwork uri={item.artwork} size={200} borderRadius={0} iconSize={40} iconColor={colors.accent} backgroundColor="transparent" />
            </View>
            <View style={s.p3}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[s.textXs, { color: colors.textMuted }]}>{item.songCount} songs</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Disc3 size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No albums found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
