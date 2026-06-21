import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { listMediaContents, getParentPath, type FileItem, type MediaFolderItem } from '@/services/file-browser';
import { storage } from '@/services/mmkv';
import { Folder, FileAudio, ChevronRight, ChevronLeft, HardDrive, Music, Plus } from 'lucide-react-native';

const SCAN_LOCATIONS_KEY = 'lumora-scan-locations';

interface ScanFolder {
  name: string;
  path: string;
}

function loadScanLocations(): ScanFolder[] {
  try {
    const raw = storage.getString(SCAN_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

type ViewState =
  | { screen: 'locations' }
  | { screen: 'files'; path: string; breadcrumbs: string[] };

export default function FilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewState, setViewState] = useState<ViewState>({ screen: 'locations' });
  const [locations, setLocations] = useState<ScanFolder[]>([]);
  const [mediaFiles, setMediaFiles] = useState<FileItem[]>([]);
  const [mediaFolders, setMediaFolders] = useState<MediaFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLocations(loadScanLocations());
    return () => { mountedRef.current = false; };
  }, []);

  const loadDirectory = async (uri: string, breadcrumbs: string[]) => {
    setLoading(true);
    const contents = await listMediaContents(uri, 'audio');
    if (!mountedRef.current) return;
    setMediaFiles(contents.mediaFiles);
    setMediaFolders(contents.mediaFolders);
    setViewState({ screen: 'files', path: uri, breadcrumbs });
    setLoading(false);
  };

  const openLocation = useCallback(async (folder: ScanFolder) => {
    await loadDirectory(folder.path, [folder.name]);
  }, []);

  const navigateTo = useCallback(async (uri: string) => {
    if (viewState.screen !== 'files') return;
    const parent = getParentPath(uri);
    const name = uri.replace(/\/$/, '').split('/').pop() || '';
    const newBreadcrumbs = parent
      ? [...viewState.breadcrumbs, name]
      : [name];
    await loadDirectory(uri, newBreadcrumbs);
  }, [viewState]);

  const navigateUp = useCallback(async () => {
    if (viewState.screen !== 'files') return;
    const parent = getParentPath(viewState.path);
    if (!parent) {
      setViewState({ screen: 'locations' });
      return;
    }
    const newBreadcrumbs = viewState.breadcrumbs.slice(0, -1);
    await loadDirectory(parent, newBreadcrumbs);
  }, [viewState]);

  const navigateToLocations = useCallback(async () => {
    setViewState({ screen: 'locations' });
  }, []);

  const pickMusicFolder = useCallback(async () => {
    try {
      const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return;
      const uri = result.directoryUri;
      const name = decodeURIComponent(uri.split('%2F').pop() ?? uri.split('/').pop() ?? 'Music');
      const current = loadScanLocations();
      if (current.some((l) => l.path === uri)) return;
      const next = [...current, { name, path: uri }];
      storage.set(SCAN_LOCATIONS_KEY, JSON.stringify(next));
      setLocations(next);
    } catch (err) {
      console.warn('[Files] SAF picker failed:', err);
    }
  }, []);

  const removeLocation = useCallback((path: string) => {
    const next = locations.filter((l) => l.path !== path);
    storage.set(SCAN_LOCATIONS_KEY, JSON.stringify(next));
    setLocations(next);
  }, [locations]);

  const hasContent = mediaFiles.length > 0 || mediaFolders.length > 0;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.gap4]}>
          {viewState.screen === 'locations' ? (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween]}>
                <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Music Folders</Text>
              </View>

              {locations.length === 0 ? (
                <View style={[s.itemsCenter, s.py16]}>
                  <Folder size={40} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No music folders added</Text>
                  <Text style={[s.textXs, s.mt1, { color: colors.textMuted }, { textAlign: 'center' }]}>
                    Tap below to pick a folder with music files
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                  {locations.map((folder) => (
                    <Pressable
                      key={folder.path}
                      onPress={() => openLocation(folder)}
                      style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
                    >
                      <Folder size={20} color={colors.accent} />
                      <View style={s.flex1}>
                        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{folder.name}</Text>
                        <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{folder.path}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable
                onPress={pickMusicFolder}
                style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent + '20' }]}
              >
                <Plus size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>Pick Music Folder</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.flexWrap]}>
                <Pressable onPress={navigateToLocations} style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card }]}>
                  <HardDrive size={14} color={colors.accent} />
                  <Text style={[s.textXs, s.fontMedium, { color: colors.accent }]}>Locations</Text>
                </Pressable>
                <Pressable onPress={navigateUp} style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card }]}>
                  <ChevronLeft size={14} color={colors.text} />
                  <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>Back</Text>
                </Pressable>
                <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                  /{viewState.breadcrumbs.join('/')}
                </Text>
              </View>

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
                        Songs ({mediaFiles.length})
                      </Text>
                      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                        {mediaFiles.map((file) => (
                          <View key={file.uri} style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}>
                            <FileAudio size={18} color={colors.accent} />
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
                        Subfolders ({mediaFolders.length})
                      </Text>
                      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                        {mediaFolders.map((folder) => (
                          <Pressable
                            key={folder.uri}
                            onPress={() => navigateTo(folder.uri)}
                            style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
                          >
                            <Folder size={18} color={colors.accent} />
                            <View style={s.flex1}>
                              <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
                              {folder.mediaCount.audio > 0 && (
                                <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt1]}>
                                  <Music size={12} color={colors.textMuted} />
                                  <Text style={[s.textXs, { color: colors.textMuted }]}>{folder.mediaCount.audio} songs</Text>
                                </View>
                              )}
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
                      <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No music found</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
