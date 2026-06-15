import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { listDirectory, getRootPath, getParentPath, getMediaType, type FileItem } from '@/services/file-browser';
import { Folder, FileAudio, FileVideo, ChevronRight, ChevronLeft, HardDrive } from 'lucide-react-native';

export default function FilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const path = getRootPath();
      const entries = await listDirectory(path);
      if (mountedRef.current) {
        setItems(entries);
        setCurrentPath(path);
        setBreadcrumbs([]);
        setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const loadDirectory = async (uri: string | null) => {
    setLoading(true);
    const path = uri ?? getRootPath();
    const entries = await listDirectory(path);
    if (!mountedRef.current) return;
    setItems(entries);
    setCurrentPath(path);

    if (uri === null) {
      setBreadcrumbs([]);
    } else {
      const parent = getParentPath(path);
      if (parent === null) {
        setBreadcrumbs([]);
      } else {
        const name = path.replace(/\/$/, '').split('/').pop() || '';
        setBreadcrumbs((prev) => {
          const idx = prev.indexOf(name);
          return idx >= 0 ? prev.slice(0, idx + 1) : [...prev, name];
        });
      }
    }
    setLoading(false);
  };

  const navigateTo = (uri: string) => loadDirectory(uri);
  const navigateUp = () => {
    const parent = currentPath ? getParentPath(currentPath) : null;
    if (parent) {
      loadDirectory(parent);
    }
  };
  const navigateRoot = () => loadDirectory(null);

  const audioFiles = items.filter((i) => !i.isDirectory && getMediaType(i.name) === 'audio');
  const videoFiles = items.filter((i) => !i.isDirectory && getMediaType(i.name) === 'video');
  const folders = items.filter((i) => i.isDirectory);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.gap4]}>
          {breadcrumbs.length > 0 && (
            <View style={[s.flexRow, s.itemsCenter, s.gap2, s.flexWrap]}>
              <Pressable onPress={navigateRoot} style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card }]}>
                <HardDrive size={14} color={colors.accent} />
                <Text style={[s.textXs, s.fontMedium, { color: colors.accent }]}>Root</Text>
              </Pressable>
              {breadcrumbs.length > 0 && currentPath && (
                <Pressable onPress={navigateUp} style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card }]}>
                  <ChevronLeft size={14} color={colors.text} />
                  <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>Back</Text>
                </Pressable>
              )}
              <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                /{breadcrumbs.join('/')}
              </Text>
            </View>
          )}

          {loading ? (
            <View style={[s.itemsCenter, s.py20]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>Scanning folders...</Text>
            </View>
          ) : (
            <>
              {audioFiles.length > 0 && (
                <View>
                  <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                    Audio Files ({audioFiles.length})
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {audioFiles.slice(0, 10).map((file, i) => (
                      <View key={file.uri} style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderBottomWidth: i < Math.min(audioFiles.length, 10) - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                        <FileAudio size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
                        </View>
                      </View>
                    ))}
                    {audioFiles.length > 10 && (
                      <Text style={[s.textXs, s.textCenter, s.py3, { color: colors.textMuted }]}>
                        +{audioFiles.length - 10} more audio files
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {videoFiles.length > 0 && (
                <View>
                  <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                    Video Files ({videoFiles.length})
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {videoFiles.slice(0, 10).map((file, i) => (
                      <View key={file.uri} style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderBottomWidth: i < Math.min(videoFiles.length, 10) - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                        <FileVideo size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
                        </View>
                      </View>
                    ))}
                    {videoFiles.length > 10 && (
                      <Text style={[s.textXs, s.textCenter, s.py3, { color: colors.textMuted }]}>
                        +{videoFiles.length - 10} more video files
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {folders.length > 0 && (
                <View>
                  <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                    Folders ({folders.length})
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {folders.map((folder, i) => (
                      <Pressable
                        key={folder.uri}
                        onPress={() => navigateTo(folder.uri)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderBottomWidth: i < folders.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                      >
                        <Folder size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>Folder</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {items.length === 0 && (
                <View style={[s.itemsCenter, s.py20]}>
                  <Folder size={40} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No files found</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
