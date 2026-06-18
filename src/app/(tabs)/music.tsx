import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { useEffect } from 'react';
import { Music } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { formatDuration } from '@/utils/cn';
import { s } from '@/styles';
import { useTranslation } from '@/hooks/use-translation';

export default function MusicScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { songs, scan } = useMusicStore();

  useEffect(() => {
    if (songs.length === 0) scan();
  }, []);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      {songs.length > 0 ? (
        <FlashList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => usePlayerStore.getState().play(item, songs)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <Artwork uri={item.artwork} size={40} borderRadius={8} iconSize={16} iconColor={colors.accent} backgroundColor={colors.card} />
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
              </View>
              <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={null}
        />
      ) : (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <Music size={48} color={colors.textMuted} />
          <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>{t('library.no.songs') || 'No music found'}</Text>
        </View>
      )}
      <MiniPlayer />
    </View>
  );
}
