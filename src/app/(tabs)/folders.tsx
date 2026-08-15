import { View, Text, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { useMusicStore } from '@/store/music-store';
import { playerActions } from '@/player/actions';
import { useToastStore } from '@/store/toast-store';
import {
  listDirectory,
  getAccessibleRootPath,
  getRootPath,
  getParentPath,
  getMediaType,
  type FileItem,
} from '@/services/file-browser';
import { formatFileSize } from '@/utils/format';
import type { Song } from '@/types/media';
import { ChevronRight, Folder as FolderIcon, Music, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { s } from '@/styles';

type SortMode = 'name' | 'date' | 'size';

interface Crumb {
  name: string;
  uri: string;
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

/** Build a minimal playable Song from a raw file so any audio file on disk
 *  can be played even if it isn't part of the scanned library. */
function fileItemToSong(item: FileItem): Song {
  return {
    id: item.uri,
    uri: item.uri,
    title: stripExtension(item.name),
    artist: '',
    album: '',
    albumId: '',
    duration: 0,
    fileSize: item.size ?? 0,
    dateAdded: item.modificationTime ?? 0,
    artwork: null,
    genre: null,
    bitrate: null,
    sampleRate: null,
    channels: null,
    codec: null,
  };
}

function buildCrumbs(uri: string): Crumb[] {
  const cleaned = uri.replace(/\/$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = '';
  for (const part of parts) {
    acc += part + '/';
    crumbs.push({ name: decodeURIComponent(part), uri: acc });
  }
  return crumbs;
}

export default function FoldersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const showToast = useToastStore((s) => s.showToast);

  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('name');

  const crumbs = useMemo(() => (currentPath ? buildCrumbs(currentPath) : []), [currentPath]);

  const load = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDirectory(path);
      setItems(result);
    } catch {
      setError('Could not open this folder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const root = await getAccessibleRootPath();
        if (!mounted) return;
        setCurrentPath(root);
        await load(root);
      } catch {
        const fallback = getRootPath();
        if (!mounted) return;
        setCurrentPath(fallback);
        await load(fallback);
      }
    })();
    return () => { mounted = false; };
  }, [load]);

  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'date') return (b.modificationTime || 0) - (a.modificationTime || 0);
      if (sort === 'size') return (b.size || 0) - (a.size || 0);
      return 0;
    });
    return arr;
  }, [items, sort]);

  const navigate = useCallback((item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.uri);
      load(item.uri);
    } else {
      const mediaType = getMediaType(item.name);
      if (mediaType !== 'audio') {
        showToast('Only audio files can be played', 'music');
        return;
      }
      const song = songs.find((s) => s.uri === item.uri) ?? fileItemToSong(item);
      playerActions.play(song, [song]);
    }
  }, [songs, showToast, load]);

  const goUp = useCallback(() => {
    if (!currentPath) return;
    const parent = getParentPath(currentPath);
    if (parent) {
      setCurrentPath(parent);
      load(parent);
    }
  }, [currentPath, load]);

  const renderItem = ({ item }: { item: FileItem }) => {
    const isAudio = !item.isDirectory && getMediaType(item.name) === 'audio';
    return (
      <Pressable
        onPress={() => navigate(item)}
        style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4, { borderBottomWidth: 1, borderColor: colors.border }]}
        accessibilityRole={'button' as const}
        accessibilityLabel={item.name}
      >
        <View style={[s.w12, s.h12, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: item.isDirectory ? colors.accent + '20' : colors.card }]}>
          {item.isDirectory ? (
            <FolderIcon size={22} color={colors.accent} />
          ) : (
            <Music size={20} color={isAudio ? colors.accent : colors.textMuted} />
          )}
        </View>
        <View style={s.flex1}>
          <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>
            {item.isDirectory
              ? t('nav.folders')
              : isAudio
                ? formatFileSize(item.size)
                : 'File'}
          </Text>
        </View>
        {item.isDirectory && <ChevronRight size={18} color={colors.textMuted} />}
      </Pressable>
    );
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title={t('nav.folders')} rightElement={
        <Pressable onPress={() => setSort((m) => (m === 'name' ? 'date' : m === 'date' ? 'size' : 'name'))} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <Text style={[s.textXs, s.fontBold, { color: colors.accent }]}>
            {sort === 'name' ? 'A-Z' : sort === 'date' ? 'Date' : 'Size'}
          </Text>
        </Pressable>
      } />

      {/* Breadcrumb / path bar */}
      <View style={[s.flexRow, s.itemsCenter, s.px4, s.py2, { backgroundColor: colors.surface, gap: 4 }]}>
        <Pressable onPress={goUp} disabled={!currentPath || crumbs.length === 0} style={[s.w9, s.h9, s.roundedFull, s.itemsCenter, s.justifyCenter, { opacity: crumbs.length === 0 ? 0.3 : 1 }]}>
          <ChevronLeft size={18} color={colors.text} />
        </Pressable>
        <View style={[s.flex1, s.flexRow, s.itemsCenter, { gap: 2 }]}>
          {crumbs.length === 0 ? (
            <Text style={[s.textSm, s.fontMedium, { color: colors.textMuted }]}>Internal Storage</Text>
          ) : (
            crumbs.map((c, i) => (
              <View key={c.uri} style={[s.flexRow, s.itemsCenter]}>
                <Pressable onPress={() => { setCurrentPath(c.uri); load(c.uri); }}>
                  <Text style={[s.textSm, { color: i === crumbs.length - 1 ? colors.text : colors.textMuted, fontWeight: i === crumbs.length - 1 ? '700' : '400' }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
                {i < crumbs.length - 1 && <ChevronRight size={12} color={colors.textMuted} />}
              </View>
            ))
          )}
        </View>
      </View>

      {loading ? (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
          <Text style={[s.textSm, { color: colors.textMuted }]}>{error}</Text>
          <Pressable onPress={() => currentPath && load(currentPath)} style={[s.mt4, s.flexRow, s.itemsCenter, s.gap2, s.px4, s.py3, s.roundedFull, { backgroundColor: colors.accent + '20' }]}>
            <RefreshCw size={16} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
          <FolderIcon size={48} color={colors.textMuted} />
          <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>{t('home.no.songs')}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        />
      )}
      <MiniPlayer />
    </View>
  );
}
