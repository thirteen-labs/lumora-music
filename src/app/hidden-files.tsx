import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useMusicStore } from '@/store/music-store';
import { EyeOff, Music, Trash2, ScanEye, ChevronRight } from 'lucide-react-native';

export default function HiddenFilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const hiddenSongIds = useHiddenFilesStore((s) => s.hiddenSongIds);
  const unhideSong = useHiddenFilesStore((s) => s.unhideSong);

  const hiddenSongs = songs.filter((s) => hiddenSongIds.has(s.id));

  const handleUnhideSong = (id: string, title: string) => {
    Alert.alert(t('hidden.unhide'), t('hidden.unhide.song', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('hidden.unhide'), onPress: () => unhideSong(id) },
    ]);
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('hidden.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <Pressable
            onPress={() => router.push('/system-hidden-files')}
            style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { backgroundColor: colors.accent + '12', borderRadius: 16 }]}
          >
            <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '25' }]}>
              <ScanEye size={22} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{t('hidden.system.open')}</Text>
              <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{t('hidden.system.desc')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          {hiddenSongs.length === 0 ? (
            <View style={[s.itemsCenter, s.py12]}>
              <EyeOff size={48} color={colors.textMuted} />
              <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>
                {t('hidden.none')}
              </Text>
              <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>
                {t('hidden.desc')}
              </Text>
            </View>
          ) : (
            <>
              {hiddenSongs.length > 0 && (
                <View>
                  <SectionHeader title={t('hidden.songs', { count: hiddenSongs.length })} />
                  <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                    {hiddenSongs.map((song, i) => (
                      <Pressable
                        key={song.id}
                        onPress={() => handleUnhideSong(song.id, song.title)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                      >
                        <Music size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                            {song.artist}
                          </Text>
                        </View>
                        <Trash2 size={16} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
