import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { listMediaContents, getParentPath, getRootPath, type FileItem, type MediaFolderItem } from '@/services/file-browser';
import { storage } from '@/services/mmkv';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { deleteFiles, shareFiles } from '@/services/file-operations';
import { formatFileSize } from '@/utils/cn';
import type { Song } from '@/types/media';
import { Folder, ChevronRight, ChevronLeft, HardDrive, Music, Plus, Video, Film, Headphones, Heart, ListMusic, Trash2, Forward, Share2, EyeOff, X } from 'lucide-react-native';

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
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [locations, setLocations] = useState<ScanFolder[]>(loadScanLocations);
  const [mediaFiles, setMediaFiles] = useState<FileItem[]>([]);
  const [mediaFolders, setMediaFolders] = useState<MediaFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'audio' | 'video'>('audio');
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const isSelecting = selectedUris.size > 0;
  const mountedRef = useRef(true);

  const toggleSelect = useCallback((uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedUris(new Set()), []);

  const fileToSong = useCallback((file: FileItem): Song => ({
    id: file.uri,
    uri: file.uri,
    title: file.name,
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    albumId: 'unknown',
    duration: 0,
    fileSize: file.size,
    dateAdded: file.modificationTime,
    artwork: null,
    genre: null,
    bitrate: null,
    sampleRate: null,
  }), []);

  const selectedSongs = useMemo(
    () => mediaFiles.filter((f) => selectedUris.has(f.uri)).map(fileToSong),
    [mediaFiles, selectedUris, fileToSong],
  );

  const handleAddFavorites = useCallback(() => {
    const { toggleSongFavorite } = useFavoritesStore.getState();
    selectedSongs.forEach(toggleSongFavorite);
    clearSelection();
  }, [selectedSongs, clearSelection]);

  const handleAddToQueue = useCallback(() => {
    const { addToQueue } = usePlayerStore.getState();
    selectedSongs.forEach((s) => addToQueue(s));
    clearSelection();
  }, [selectedSongs, clearSelection]);

  const handlePlayNext = useCallback(() => {
    const store = usePlayerStore.getState();
    const insertAt = (store.queueIndex ?? -1) + 1;
    const newQueue = [...store.queue];
    newQueue.splice(insertAt >= 0 ? insertAt : newQueue.length, 0, ...selectedSongs);
    usePlayerStore.setState({ queue: newQueue });
    clearSelection();
  }, [selectedSongs, clearSelection]);

  const handleDelete = useCallback(() => {
    if (selectedUris.size === 0) return;
    const count = selectedUris.size;
    const label = count === 1 ? 'this file' : `these ${count} files`;
    Alert.alert('Delete', `Are you sure you want to delete ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const uris = [...selectedUris];
          const result = await deleteFiles(uris);
          if (result.success) {
            const deletedIds = new Set(uris);
            usePlayerStore.setState((state) => ({
              queue: state.queue.filter((s) => !deletedIds.has(s.uri)),
              ...(state.currentTrack && deletedIds.has(state.currentTrack.uri) ? { currentTrack: null } : {}),
            }));
          }
          clearSelection();
        },
      },
    ]);
  }, [selectedUris, clearSelection]);

  const handleShare = useCallback(() => {
    const uris = [...selectedUris];
    shareFiles(uris);
    clearSelection();
  }, [selectedUris, clearSelection]);

  const handleHide = useCallback(() => {
    const { hideSong } = useHiddenFilesStore.getState();
    selectedSongs.forEach((s) => hideSong(s.id));
    clearSelection();
  }, [selectedSongs, clearSelection]);

  const allLocations = useMemo(() => {
    const root = getRootPath();
    const systemLoc = { name: 'Internal Storage', path: root };
    // Check if user already added the root manually
    if (locations.some(l => l.path === root || l.path === 'content://com.android.externalstorage.documents/tree/primary%3A')) {
      return locations;
    }
    return [systemLoc, ...locations];
  }, [locations]);

  const loadDirectory = useCallback(async (uri: string, breadcrumbs: string[]) => {
    setLoading(true);
    const contents = await listMediaContents(uri, filterType);
    if (!mountedRef.current) return;
    setMediaFiles(contents.mediaFiles);
    setMediaFolders(contents.mediaFolders);
    setViewState({ screen: 'files', path: uri, breadcrumbs });
    setLoading(false);
  }, [filterType]);

  const openLocation = useCallback(async (folder: ScanFolder) => {
    await loadDirectory(folder.path, [folder.name]);
  }, [loadDirectory]);

  // Refresh current directory when filter toggles
  useEffect(() => {
    if (viewState.screen === 'files') {
      const id = setTimeout(() => {
        loadDirectory(viewState.path, viewState.breadcrumbs);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [filterType, loadDirectory, viewState]);

  const navigateTo = useCallback(async (uri: string) => {
    if (viewState.screen !== 'files') return;
    const parent = getParentPath(uri);
    const name = uri.replace(/\/$/, '').split('/').pop() || '';
    const newBreadcrumbs = parent
      ? [...viewState.breadcrumbs, name]
      : [name];
    await loadDirectory(uri, newBreadcrumbs);
  }, [viewState, loadDirectory]);

  const navigateUp = useCallback(async () => {
    if (viewState.screen !== 'files') return;
    const parent = getParentPath(viewState.path);
    if (!parent) {
      setViewState({ screen: 'locations' });
      return;
    }
    const newBreadcrumbs = viewState.breadcrumbs.slice(0, -1);
    await loadDirectory(parent, newBreadcrumbs);
  }, [viewState, loadDirectory]);

  const navigateToLocations = useCallback(async () => {
    setViewState({ screen: 'locations' });
  }, []);

  const playFile = useCallback(async (file: FileItem) => {
    const songQueue: Song[] = mediaFiles.map((f: FileItem) => ({
      id: f.uri,
      uri: f.uri,
      title: f.name,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      albumId: 'unknown',
      duration: 0,
      fileSize: f.size,
      dateAdded: f.modificationTime,
      artwork: null,
      genre: null,
      bitrate: null,
      sampleRate: null,
    }));
    
    const currentSong = songQueue.find((s: Song) => s.uri === file.uri);
    if (currentSong) {
      await play(currentSong, songQueue);
    }
  }, [mediaFiles, play]);

  const pickMusicFolder = useCallback(async () => {
    try {
      const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return;
      const uri = result.directoryUri;
      const name = decodeURIComponent(uri.split('%2F').pop() ?? uri.split('/').pop() ?? 'Music');
      const current = loadScanLocations();
      if (current.some((l: ScanFolder) => l.path === uri)) return;
      const next = [...current, { name, path: uri }];
      storage.set(SCAN_LOCATIONS_KEY, JSON.stringify(next));
      setLocations(next);
    } catch (err) {
      console.warn('[Files] SAF picker failed:', err);
    }
  }, []);

  const hasContent = mediaFiles.length > 0 || mediaFolders.length > 0;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      {isSelecting ? (
        <View style={[s.wFull, s.overflowHidden, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.py3]}>
            <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
              {selectedUris.size} Selected
            </Text>
            <Pressable
              onPress={clearSelection}
              style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ) : (
        <TopBar />
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.gap4]}>
          {viewState.screen === 'locations' ? (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb1]}>
                <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>{filterType === 'audio' ? 'Music' : 'Video'} Folders</Text>
                
                <View style={[s.flexRow, { backgroundColor: colors.surface, borderRadius: 12, padding: 4 }]}>
                  <Pressable 
                    onPress={() => setFilterType('audio')}
                    style={[s.px3, { paddingVertical: 6 }, s.flexRow, s.itemsCenter, s.gap2, { borderRadius: 8, backgroundColor: filterType === 'audio' ? colors.accent : 'transparent' }]}
                  >
                    <Headphones size={14} color={filterType === 'audio' ? '#fff' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: filterType === 'audio' ? '#fff' : colors.textMuted }}>Music</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setFilterType('video')}
                    style={[s.px3, { paddingVertical: 6 }, s.flexRow, s.itemsCenter, s.gap2, { borderRadius: 8, backgroundColor: filterType === 'video' ? colors.accent : 'transparent' }]}
                  >
                    <Video size={14} color={filterType === 'video' ? '#fff' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: filterType === 'video' ? '#fff' : colors.textMuted }}>Video</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                {allLocations.map((folder: any) => (
                  <Pressable
                    key={folder.path}
                    onPress={() => openLocation(folder)}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
                  >
                    <Folder size={20} color={folder.name === 'Internal Storage' ? colors.textMuted : colors.accent} />
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{folder.name}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
                        {folder.path === getRootPath() ? 'Root Directory' : folder.path}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={pickMusicFolder}
                style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent + '20' }]}
              >
                <Plus size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>Add Scan Location</Text>
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
                        {filterType === 'audio' ? 'Songs' : 'Videos'} ({mediaFiles.length})
                      </Text>
                      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                        {mediaFiles.map((file) => {
                          const isActive = currentTrack?.uri === file.uri;
                          const isSelected = selectedUris.has(file.uri);
                          return (
                            <Pressable 
                              key={file.uri} 
                              onPress={() => {
                                if (isSelecting) toggleSelect(file.uri);
                                else playFile(file);
                              }}
                              onLongPress={() => toggleSelect(file.uri)}
                              style={({ pressed }) => [
                                s.flexRow, s.itemsCenter, s.gap3, s.p3,
                                { backgroundColor: isSelected ? colors.accent + '25' : isActive ? colors.accent + '15' : pressed ? colors.background : 'transparent' }
                              ]}
                            >
                              <View style={[s.w9, s.h9, s.roundedLg, s.itemsCenter, s.justifyCenter, { backgroundColor: isActive && !isSelected ? colors.accent : colors.accent + '15' }]}>
                                {filterType === 'audio' ? (
                                  <Music size={16} color={isActive && !isSelected ? '#fff' : isSelected ? colors.accent : colors.accent} />
                                ) : (
                                  <Film size={16} color={isActive && !isSelected ? '#fff' : isSelected ? colors.accent : colors.accent} />
                                )}
                              </View>
                              <View style={s.flex1}>
                                <Text style={[s.textSm, { color: isActive ? colors.accent : colors.text, fontWeight: isActive ? '600' : '400' }]} numberOfLines={1}>{file.name}</Text>
                                <Text style={[s.textXs, { color: colors.textMuted }]}>
                                  {formatFileSize(file.size)}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {mediaFolders.length > 0 && (
                    <View>
                      <Text style={[s.textSm, s.fontSemibold, s.mb2, { color: colors.text }]}>
                        Subfolders ({mediaFolders.length})
                      </Text>
                      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                        {mediaFolders.map((folder: MediaFolderItem) => (
                          <Pressable
                            key={folder.uri}
                            onPress={() => navigateTo(folder.uri)}
                            style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
                          >
                            <Folder size={18} color={colors.accent} />
                            <View style={s.flex1}>
                              <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
                              {folder.mediaCount.audio > 0 && filterType === 'audio' && (
                                <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt1]}>
                                  <Music size={12} color={colors.textMuted} />
                                  <Text style={[s.textXs, { color: colors.textMuted }]}>{folder.mediaCount.audio} songs</Text>
                                </View>
                              )}
                              {folder.mediaCount.video > 0 && filterType === 'video' && (
                                <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt1]}>
                                  <Video size={12} color={colors.textMuted} />
                                  <Text style={[s.textXs, { color: colors.textMuted }]}>{folder.mediaCount.video} videos</Text>
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
                      <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No {filterType === 'audio' ? 'music' : 'videos'} found</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {isSelecting && (
        <View style={[{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.accent + '20' }]}>
          <View style={[s.flexRow, s.itemsCenter, s.justifyAround]}>
            <Pressable onPress={handleAddFavorites} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <Heart size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Favorite</Text>
            </Pressable>
            <Pressable onPress={handleAddToQueue} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <ListMusic size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Queue</Text>
            </Pressable>
            <Pressable onPress={handlePlayNext} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <Forward size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Next</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <Trash2 size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Delete</Text>
            </Pressable>
            <Pressable onPress={handleShare} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <Share2 size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Share</Text>
            </Pressable>
            <Pressable onPress={handleHide} style={[s.itemsCenter, s.gap1, { padding: 8 }]}>
              <EyeOff size={22} color={colors.accent} />
              <Text style={[s.text10, { color: colors.textMuted }]}>Hide</Text>
            </Pressable>
          </View>
        </View>
      )}
      <MiniPlayer />
    </View>
  );
}
