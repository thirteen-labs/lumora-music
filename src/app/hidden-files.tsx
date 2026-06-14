import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { EyeOff, Music, Film, Trash2 } from 'lucide-react-native';

export default function HiddenFilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const videos = useVideoStore((s) => s.videos);
  const hiddenSongIds = useHiddenFilesStore((s) => s.hiddenSongIds);
  const hiddenVideoIds = useHiddenFilesStore((s) => s.hiddenVideoIds);
  const unhideSong = useHiddenFilesStore((s) => s.unhideSong);
  const unhideVideo = useHiddenFilesStore((s) => s.unhideVideo);

  const hiddenSongs = songs.filter((s) => hiddenSongIds.has(s.id));
  const hiddenVideos = videos.filter((v) => hiddenVideoIds.has(v.id));

  const handleUnhideSong = (id: string, title: string) => {
    Alert.alert(t('hidden.unhide'), t('hidden.unhide.song', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('hidden.unhide'), onPress: () => unhideSong(id) },
    ]);
  };

  const handleUnhideVideo = (id: string, title: string) => {
    Alert.alert(t('hidden.unhide'), t('hidden.unhide.video', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('hidden.unhide'), onPress: () => unhideVideo(id) },
    ]);
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('hidden.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {hiddenSongs.length === 0 && hiddenVideos.length === 0 ? (
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
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < hiddenSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
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

              {hiddenVideos.length > 0 && (
                <View>
                  <SectionHeader title={t('hidden.videos', { count: hiddenVideos.length })} />
                  <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                    {hiddenVideos.map((video, i) => (
                      <Pressable
                        key={video.id}
                        onPress={() => handleUnhideVideo(video.id, video.title)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < hiddenVideos.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                      >
                        <Film size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                            {video.title}
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
