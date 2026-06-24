import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { VideoThumbnailView } from '@/components/video-thumbnail-view';
import { VideoContextMenu, useVideoContextMenu } from '@/components/video-context-menu';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { s } from '@/styles';
import { Folder, ChevronLeft, HardDrive } from 'lucide-react-native';
import type { Video } from '@/types/media';

function getParentDir(uri: string): string {
  const idx = uri.lastIndexOf('/');
  if (idx === -1) return uri;
  return uri.substring(0, idx);
}

function getDirName(dirPath: string): string {
  const idx = dirPath.lastIndexOf('/');
  if (idx === -1) return dirPath;
  return dirPath.substring(idx + 1);
}

export default function VideoFolderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videos = useVideoStore((s) => s.videos);
  const hiddenVideoIds = useHiddenFilesStore((s) => s.hiddenVideoIds);
  const { bottomSheetRef, present, video: contextVideo } = useVideoContextMenu();
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  const folders = useMemo(() => {
    const visible = videos.filter((v) => !hiddenVideoIds.has(v.id));
    const map = new Map<string, Video[]>();
    for (const v of visible) {
      const dir = getParentDir(v.uri);
      const list = map.get(dir) ?? [];
      list.push(v);
      map.set(dir, list);
    }
    return [...map.entries()]
      .map(([path, files]) => ({ path, name: getDirName(path), files }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videos, hiddenVideoIds]);

  const currentVideos = selectedDir
    ? folders.find((f) => f.path === selectedDir)?.files ?? []
    : [];

  if (selectedDir) {
    return (
      <View style={[s.flex1, { backgroundColor: colors.background }]}>
        <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}>
          <Pressable onPress={() => setSelectedDir(null)} hitSlop={8}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={s.flex1}>
            <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
              {getDirName(selectedDir)}
            </Text>
            <Text style={[s.textXs, { color: colors.textMuted }]}>
              {currentVideos.length} video{currentVideos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
        >
          {currentVideos.map((video) => (
            <Pressable
              key={video.id}
              onPress={() => router.push({ pathname: '/video-player', params: { videoId: video.id } })}
              onLongPress={() => present(video)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.py3]}
            >
              <View
                style={{
                  width: 64,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                }}
              >
                <VideoThumbnailView
                  videoUri={video.uri}
                  videoId={video.id}
                  size={64}
                  borderRadius={8}
                  iconSize={18}
                  iconColor={colors.accent}
                  backgroundColor={colors.surface}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 3,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: 3,
                    paddingHorizontal: 3,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: '600', color: '#fff' }}>
                    {formatDuration(video.duration)}
                  </Text>
                </View>
              </View>
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                  {video.title}
                </Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>
                  {video.duration > 0 ? formatDuration(video.duration) : ''}
                  {video.width && video.height ? ` · ${video.width}x${video.height}` : ''}
                  {video.fileSize > 0 ? ` · ${formatFileSize(video.fileSize)}` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <VideoContextMenu bottomSheetRef={bottomSheetRef} video={contextVideo} />
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>
          Video Folders
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16, gap: 4 }}
      >
        {folders.map((folder) => (
          <Pressable
            key={folder.path}
            onPress={() => setSelectedDir(folder.path)}
            style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, s.rounded2xl, { backgroundColor: colors.surface }]}
          >
            <View
              style={[s.w10, s.h10, s.itemsCenter, s.justifyCenter, s.roundedXl, { backgroundColor: colors.card }]}
            >
              <HardDrive size={20} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                {folder.files.length} video{folder.files.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </Pressable>
        ))}
        {folders.length === 0 && (
          <View style={[s.itemsCenter, s.py20]}>
            <Folder size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No video folders found</Text>
          </View>
        )}
      </ScrollView>
      <VideoContextMenu bottomSheetRef={bottomSheetRef} video={contextVideo} />
    </View>
  );
}
