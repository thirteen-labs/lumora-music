import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, Alert, TextInput, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { PlaylistCard } from '@/components/playlist-card';
import { usePlaylistStore } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useStatsStore } from '@/store/stats-store';
import { useLayoutStore } from '@/store/layout-store';
import { useRouter } from 'expo-router';
import {
  Heart, Plus, ListMusic, Tag, Users, Clock, TrendingUp, Disc3,
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
  { icon: Heart, labelKey: 'library.favorites' as const, route: '/(tabs)/favorites' },
];

const LIST_CARD_WIDTH = SCREEN_WIDTH * 0.98;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;
const CARD_HEIGHT = 192;

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
  const favoriteCount = useFavoritesStore((s) => s.favoriteSongIds.length);
  const trackStats = useStatsStore((s) => s.trackStats);
  const { libraryViewMode, setLibraryViewMode } = useLayoutStore();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => b.createdAt - a.createdAt);
  }, [playlists]);

  const [newName, setNewName] = useState('');
  const createSheetRef = useRef<BottomSheetModal>(null);

  const isGrid = libraryViewMode === 'grid';
  const cardWidth = isGrid ? GRID_CARD_WIDTH : LIST_CARD_WIDTH;

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
      case 'library.favorites': return favoriteCount;
      default: return 0;
    }
  }, [albums.length, artists.length, genres.length, recentlyPlayedCount, mostPlayedCount, favoriteCount]);

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
    <View>
      <View style={[s.px5, s.py2]}>
        <Text style={[s.textSm, s.fontSemibold, s.mb3, { color: colors.textMuted }]}>Browse</Text>
        <View style={[s.gap2]}>
          {PREDEFINED_SECTIONS.map((section) => {
            const Icon = section.icon;
            const count = getCount(section.labelKey);
            return (
              <Pressable
                key={section.labelKey}
                onPress={() => router.push(section.route)}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '30' }]}
              >
                <View style={[s.w14, s.h14, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Icon size={24} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                    {t(section.labelKey)}
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {count} {count === 1 ? t('library.song') : t('library.tracks')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.flexRowCenterBetween}>
        <Text style={[s.textSm, s.fontSemibold, { color: colors.textMuted }]}>My Playlists</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
      </View>

      <Pressable
        onPress={() => createSheetRef.current?.present()}
        style={[
          s.addPlaylistButton,
          {
            width: SCREEN_WIDTH,
            height: CARD_HEIGHT,
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

      {sortedPlaylists.length === 0 && (
        <View style={[s.itemsCenter, s.py16]}>
          <ListMusic size={40} color={colors.textMuted} />
          <Text style={[s.mt3, { color: colors.textMuted }]}>{t('playlist.no.playlists')}</Text>
        </View>
      )}
    </View>
  ), [colors, t, sortedPlaylists, getCount, router, createSheetRef, isGrid, setLibraryViewMode]);

  const renderPlaylistCard = ({ item }: { item: typeof sortedPlaylists[0] }) => (
    <PlaylistCard
      playlist={item}
      cardWidth={cardWidth}
      onPress={() => router.push({ pathname: '/(tabs)/playlist/[id]', params: { id: item.id } })}
      onLongPress={() => handleDelete(item.id, item.name)}
    />
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar
        title={t('playlist.title')}
        showSettings={false}
      />

      <View style={s.flex1}>
        {sortedPlaylists.length > 0 ? (
          isGrid ? (
            <FlashList
              data={sortedPlaylists}
              keyExtractor={(item) => item.id}
              numColumns={2}
              estimatedItemSize={CARD_HEIGHT}
              ListHeaderComponent={renderListHeader}
              contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={renderPlaylistCard}
            />
          ) : (
            <FlashList
              data={sortedPlaylists}
              keyExtractor={(item) => item.id}
              numColumns={1}
              estimatedItemSize={CARD_HEIGHT}
              ListHeaderComponent={renderListHeader}
              contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
              showsVerticalScrollIndicator={false}
              renderItem={renderPlaylistCard}
            />
          )
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
            {renderListHeader()}
          </ScrollView>
        )}
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
