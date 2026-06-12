import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { EyeOff, Music, Film, Trash2 } from 'lucide-react-native';

export default function HiddenFilesScreen() {
  const { colors } = useTheme();
  const songs = useMusicStore((s) => s.songs);
  const videos = useVideoStore((s) => s.videos);
  const hiddenSongIds = useHiddenFilesStore((s) => s.hiddenSongIds);
  const hiddenVideoIds = useHiddenFilesStore((s) => s.hiddenVideoIds);
  const unhideSong = useHiddenFilesStore((s) => s.unhideSong);
  const unhideVideo = useHiddenFilesStore((s) => s.unhideVideo);

  const hiddenSongs = songs.filter((s) => hiddenSongIds.has(s.id));
  const hiddenVideos = videos.filter((v) => hiddenVideoIds.has(v.id));

  const handleUnhideSong = (id: string, title: string) => {
    Alert.alert('Unhide Song', `Show "${title}" in your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unhide', onPress: () => unhideSong(id) },
    ]);
  };

  const handleUnhideVideo = (id: string, title: string) => {
    Alert.alert('Unhide Video', `Show "${title}" in your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unhide', onPress: () => unhideVideo(id) },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Hidden Files" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {hiddenSongs.length === 0 && hiddenVideos.length === 0 ? (
            <View className="items-center py-12">
              <EyeOff size={48} color={colors.textMuted} />
              <Text className="text-sm mt-4" style={{ color: colors.textMuted }}>
                No hidden files
              </Text>
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Files you hide from your library will appear here
              </Text>
            </View>
          ) : (
            <>
              {hiddenSongs.length > 0 && (
                <View>
                  <SectionHeader title={`Hidden Songs (${hiddenSongs.length})`} />
                  <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    {hiddenSongs.map((song, i) => (
                      <Pressable
                        key={song.id}
                        onPress={() => handleUnhideSong(song.id, song.title)}
                        className="flex-row items-center gap-3 p-4"
                        style={{ borderBottomWidth: i < hiddenSongs.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                      >
                        <Music size={18} color={colors.accent} />
                        <View className="flex-1">
                          <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
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
                  <SectionHeader title={`Hidden Videos (${hiddenVideos.length})`} />
                  <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    {hiddenVideos.map((video, i) => (
                      <Pressable
                        key={video.id}
                        onPress={() => handleUnhideVideo(video.id, video.title)}
                        className="flex-row items-center gap-3 p-4"
                        style={{ borderBottomWidth: i < hiddenVideos.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                      >
                        <Film size={18} color={colors.accent} />
                        <View className="flex-1">
                          <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
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
