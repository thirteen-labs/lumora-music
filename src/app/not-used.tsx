import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotUsedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const notUsed = songs.slice(-10).reverse();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Not Used</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <Text style={[s.textXs, s.mb4, { color: colors.textMuted }]}>Songs not opened for a long time</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {notUsed.length === 0 ? (
              <View style={[s.itemsCenter, s.py16]}>
                <Archive size={36} color={colors.textMuted} />
                <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>No unused songs</Text>
              </View>
            ) : (
              notUsed.map((song, i) => (
                <Pressable
                  key={song.id}
                  onPress={() => usePlayerStore.getState().play(song, notUsed)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < notUsed.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
                >
                  <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                    <Play size={18} color={colors.accent} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                    <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
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
