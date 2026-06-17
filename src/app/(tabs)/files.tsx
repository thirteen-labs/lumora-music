import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { listMediaContents, getAccessibleRootPath, getParentPath, type FileItem, type MediaFolderItem } from '@/services/file-browser';
import { Folder, FileAudio, FileVideo, ChevronRight, ChevronLeft, HardDrive, Music, Film } from 'lucide-react-native';

export default function FilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<FileItem[]>([]);
  const [mediaFolders, setMediaFolders] = useState<MediaFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const path = await getAccessibleRootPath();
      const contents = await listMediaContents(path);
      if (mountedRef.current) {
        setMediaFiles(contents.mediaFiles);
        setMediaFolders(contents.mediaFolders);
        setCurrentPath(path);
        setBreadcrumbs([]);
        setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const loadDirectory = async (uri: string | null) => {
    setLoading(true);
    const path = uri ?? await getAccessibleRootPath();
    const contents = await listMediaContents(path);
    if (!mountedRef.current) return;
    setMediaFiles(contents.mediaFiles);
    setMediaFolders(contents.mediaFolders);
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

  const hasContent = mediaFiles.length > 0 || mediaFolders.length > 0;

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
              {mediaFiles.length > 0 && (
                <View>
                  <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                    Files ({mediaFiles.length})
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {mediaFiles.map((file, i) => (
                      <View key={file.uri} style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderBottomWidth: i < mediaFiles.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                        {getMediaTypeFromName(file.name) === 'audio' ? (
                          <FileAudio size={18} color={colors.accent} />
                        ) : (
                          <FileVideo size={18} color={colors.accent} />
                        )}
                        <View style={s.flex1}>
                          <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {mediaFolders.length > 0 && (
                <View>
                  <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                    Media Folders ({mediaFolders.length})
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {mediaFolders.map((folder, i) => (
                      <Pressable
                        key={folder.uri}
                        onPress={() => navigateTo(folder.uri)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderBottomWidth: i < mediaFolders.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                      >
                        <Folder size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
                          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mt1]}>
                            {folder.mediaCount.audio > 0 && (
                              <View style={[s.flexRow, s.itemsCenter, s.gap1]}>
                                <Music size={12} color={colors.textMuted} />
                                <Text style={[s.textXs, { color: colors.textMuted }]}>{folder.mediaCount.audio}</Text>
                              </View>
                            )}
                            {folder.mediaCount.video > 0 && (
                              <View style={[s.flexRow, s.itemsCenter, s.gap1]}>
                                <Film size={12} color={colors.textMuted} />
                                <Text style={[s.textXs, { color: colors.textMuted }]}>{folder.mediaCount.video}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={16} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {!hasContent && (
                <View style={[s.itemsCenter, s.py20]}>
                  <Folder size={40} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No media found</Text>
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

function getMediaTypeFromName(name: string): 'audio' | 'video' | null {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  const audioExts = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
  if (audioExts.includes(ext)) return 'audio';
  if (videoExts.includes(ext)) return 'video';
  return null;
}
