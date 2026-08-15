import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, Alert, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { PlaylistCard } from '@/components/playlist-card';
import { usePlaylistStore, type Playlist } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useStatsStore } from '@/store/stats-store';
import { useLayoutStore } from '@/store/layout-store';
import { useRouter } from 'expo-router';
import {
  Plus, Tag, Users, Clock, TrendingUp, Disc3,
  LayoutGrid, List,
} from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PREDEFINED_SECTIONS = [
  { icon: Disc3, labelKey: 'library.albums' as const, route: '/music/albums' },
  { icon: Tag, labelKey: 'library.genres' as const, route: '/music/genres' },
  { icon: Users, labelKey: 'library.artists' as const, route: '/music/artists' },
  { icon: Clock, labelKey: 'library.recently.played' as const, route: '/recently-played' },
  { icon: TrendingUp, labelKey: 'library.most.played' as const, route: '/statistics' },
];

const LIST_CARD_WIDTH = SCREEN_WIDTH * 0.98;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 32) * 0.45;
const LIST_CARD_HEIGHT = 10 * 16;
const GRID_CARD_HEIGHT = 12 * 16;

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);
  const genres = useMusicStore((s) => s.genres);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const trackStats = useStatsStore((s) => s.trackStats);
  const { libraryViewMode, setLibraryViewMode } = useLayoutStore();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => b.createdAt - a.createdAt);
  }, [playlists]);

  type PlaylistListItem =
    | { kind: 'system'; id: string; section: (typeof PREDEFINED_SECTIONS)[number] }
    | { kind: 'playlist'; id: string; playlist: Playlist };

  const favoritesPlaylist = useMemo<Playlist>(
    () => ({
      id: 'favorites',
      name: t('library.favorites'),
      songIds: favoriteSongIds,
      artwork: null,
      createdAt: 0,
    }),
    [favoriteSongIds, t],
  );

  const combinedItems = useMemo<PlaylistListItem[]>(() => {
    const systemItems: PlaylistListItem[] = PREDEFINED_SECTIONS.map((section) => ({
      kind: 'system',
      id: `system-${section.labelKey}`,
      section,
    }));
    const favoritesItem: PlaylistListItem = {
      kind: 'playlist',
      id: 'favorites',
      playlist: favoritesPlaylist,
    };
    const playlistItems: PlaylistListItem[] = sortedPlaylists.map((playlist) => ({
      kind: 'playlist',
      id: playlist.id,
      playlist,
    }));
    return [...systemItems, favoritesItem, ...playlistItems];
  }, [sortedPlaylists, favoritesPlaylist]);

  const [newName, setNewName] = useState('');
  const createSheetRef = useRef<BottomSheetModal>(null);

  const isGrid = libraryViewMode === 'grid';
  const cardWidth = isGrid ? GRID_CARD_WIDTH : LIST_CARD_WIDTH;
  const cardHeight = isGrid ? GRID_CARD_HEIGHT : LIST_CARD_HEIGHT;
  const imageHeight = Math.round(cardHeight * 0.625);

  const recentlyPlayedCount = useMemo(
    () => songs.filter((s) => trackStats[s.id]?.lastPlayed).length,
    [songs, trackStats],
  );
  const mostPlayedCount = useMemo(
    () => songs.filter((s) => (trackStats[s.id]?.playCount || 0) > 0).length,
    [songs, trackStats],
  );

  const getCount = useCallback((labelKey: string): number => {
    switch (labelKey) {
      case 'library.albums': return albums.length;
      case 'library.genres': return genres.length;
      case 'library.artists': return artists.length;
      case 'library.recently.played': return recentlyPlayedCount;
      case 'library.most.played': return mostPlayedCount;
      default: return 0;
    }
  }, [albums.length, artists.length, genres.length, recentlyPlayedCount, mostPlayedCount]);

  const handleCreate = () => {
    if (newName.trim()) {
      createPlaylist(newName.trim());
      setNewName('');
      createSheetRef.current?.dismiss();
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(t('playlist.title'), `${t('common.delete')} "${name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePlaylist(id) },
    ]);
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

const renderListHeader = useCallback(() => (
    <View style={{ paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
        <Pressable
          onPress={() => setLibraryViewMode('list')}
          style={{ padding: 6, borderRadius: 6, backgroundColor: !isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <List size={18} color={!isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => setLibraryViewMode('grid')}
          style={{ padding: 6, borderRadius: 6, backgroundColor: isGrid ? colors.accent + '20' : 'transparent' }}
        >
          <LayoutGrid size={18} color={isGrid ? colors.accent : colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => createSheetRef.current?.present()}
        style={[
          s.addPlaylistButton,
          {
            width: '100%',
            height: cardHeight,
            backgroundColor: 'transparent',
            borderWidth: 0,
            borderRadius: 16,
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Plus size={24} color={colors.accent} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('playlist.new')}</Text>
      </Pressable>
    </View>
  ), [colors, t, createSheetRef, isGrid, setLibraryViewMode, cardHeight]);

  const renderItem = ({ item }: { item: PlaylistListItem }) => {
    if (item.kind === 'system') {
      const { section } = item;
      const Icon = section.icon;
      const count = getCount(section.labelKey);
        return (
          <Pressable
            onPress={() => router.push(section.route)}
            style={{
              width: cardWidth,
              height: cardHeight,
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.accent + '30',
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <View style={{ width: cardWidth, height: imageHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
              <Icon size={40} color={colors.accent} />
            </View>
          <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {t(section.labelKey)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              {count} {count === 1 ? t('library.song') : t('library.tracks')}
            </Text>
          </View>
        </Pressable>
      );
    }

    const isFavorites = item.playlist.id === 'favorites';

    return (
      <PlaylistCard
        playlist={item.playlist}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        imageHeight={imageHeight}
        onPress={() =>
          isFavorites
            ? router.push('/(tabs)/favorites')
            : router.push({ pathname: '/(tabs)/playlist/[id]', params: { id: item.playlist.id } })
        }
        onLongPress={isFavorites ? undefined : () => handleDelete(item.playlist.id, item.playlist.name)}
      />
    );
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar />

      <View style={s.flex1} key={isGrid ? 'grid' : 'list'}>
        <FlashList
          data={combinedItems}
          keyExtractor={(item) => item.id}
          numColumns={isGrid ? 2 : 1}
          estimatedItemSize={cardHeight}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: isGrid ? 16 : 0 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          />
      </View>

      <MiniPlayer />

      <BottomSheetModal
        ref={createSheetRef}
        snapPoints={['30%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
            {t('playlist.new')}
          </Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('playlist.name.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              marginBottom: 16,
            }}
            autoFocus
            onSubmitEditing={handleCreate}
            accessibilityLabel={t('playlist.name.placeholder')}
          />
          <Pressable
            onPress={handleCreate}
            disabled={!newName.trim()}
            style={{
              backgroundColor: newName.trim() ? colors.accent : colors.card,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: newName.trim() ? colors.background : colors.textMuted,
            }}>
              {t('playlist.create')}
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
