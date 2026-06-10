import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Folder, File, ChevronLeft, Music, Video as VideoIcon } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { formatFileSize } from '@/utils/cn';
import {
  listDirectory,
  getRootPath,
  getParentPath,
  getMediaType,
  type FileItem,
} from '@/services/file-browser';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useRouter } from 'expo-router';

export default function FilesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { songs } = useMusicStore();
  const [currentPath, setCurrentPath] = useState(getRootPath());
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listDirectory(currentPath).then((dirItems) => {
      if (!cancelled) {
        setItems(dirItems);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [currentPath]);

  const parentPath = getParentPath(currentPath);

  const handleItemPress = (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.uri);
    } else {
      const mediaType = getMediaType(item.name);
      if (mediaType === 'audio') {
        const matchingSong = songs.find((s) => s.uri === item.uri || s.uri.includes(item.name));
        if (matchingSong) {
          usePlayerStore.getState().play(matchingSong, songs);
        }
      } else if (mediaType === 'video') {
        router.push({ pathname: '/video-player', params: { uri: item.uri, title: item.name } });
      }
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Files" />

      {parentPath && (
        <Pressable
          onPress={() => setCurrentPath(parentPath)}
          className="flex-row items-center gap-2 px-4 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <ChevronLeft size={18} color={colors.accent} />
          <Text className="text-sm font-medium" style={{ color: colors.accent }}>Back</Text>
        </Pressable>
      )}

      <View className="px-4 py-2" style={{ backgroundColor: colors.surface }}>
        <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
          {currentPath}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const mediaType = getMediaType(item.name);
          return (
            <Pressable
              onPress={() => handleItemPress(item)}
              className="flex-row items-center gap-3 px-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.surface }}
              >
                {item.isDirectory ? (
                  <Folder size={20} color={colors.accent} />
                ) : mediaType === 'audio' ? (
                  <Music size={20} color={colors.accent} />
                ) : mediaType === 'video' ? (
                  <VideoIcon size={20} color={colors.accent} />
                ) : (
                  <File size={20} color={colors.textMuted} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {item.isDirectory ? 'Folder' : formatFileSize(item.size)}
                </Text>
              </View>
              {item.isDirectory && (
                <Text style={{ color: colors.textMuted }}>{'›'}</Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Folder size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>
              {loading ? 'Loading...' : 'This folder is empty'}
            </Text>
          </View>
        }
      />
      <MiniPlayer />
    </View>
  );
}
