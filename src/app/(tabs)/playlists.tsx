import { useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { usePlaylistStore } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useStatsStore } from '@/store/stats-store';
import { useLyricsStore } from '@/store/lyrics-store';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import {
  Heart, Plus, ListMusic, Play, Tag, Users, Mic2, Clock, TrendingUp, Disc3,
} from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

const PREDEFINED_SECTIONS = [
  { icon: Disc3, labelKey: 'library.albums', route: '/music/albums' },
  { icon: Tag, labelKey: 'library.genres', route: '/music/genres' },
  { icon: Users, labelKey: 'library.artists', route: '/music/artists' },
  { icon: Mic2, labelKey: 'library.with.lyrics', route: '/with-lyrics' },
  { icon: Clock, labelKey: 'library.recently.played', route: '/recently-played' },
  { icon: TrendingUp, labelKey: 'library.most.played', route: '/statistics' },
  { icon: Heart, labelKey: 'library.favorites', route: '/(tabs)/favorites' },
];

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { playlists, createPlaylist, deletePlaylist } = usePlaylistStore();
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);
  const genres = useMusicStore((s) => s.genres);
  const play = usePlayerStore((s) => s.play);
  const favoriteCount = useFavoritesStore((s) => s.favoriteSongIds.length);
  const trackStats = useStatsStore((s) => s.trackStats);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);

  const [newName, setNewName] = useState('');
  const createSheetRef = useRef<BottomSheetModal>(null);

  const lyricsCount = useMemo(() => songs.filter((s) => lyricsMap[s.id]).length, [songs, lyricsMap]);
  const recentlyPlayedCount = useMemo(
    () => songs.filter((s) => trackStats[s.id]?.lastPlayed).length,
    [songs, trackStats],
  );
  const mostPlayedCount = useMemo(
    () => songs.filter((s) => (trackStats[s.id]?.playCount || 0) > 0).length,
    [songs, trackStats],
  );

  const getCount = (labelKey: string): number => {
    switch (labelKey) {
      case 'library.albums': return albums.length;
      case 'library.genres': return genres.length;
      case 'library.artists': return artists.length;
      case 'library.with.lyrics': return lyricsCount;
      case 'library.recently.played': return recentlyPlayedCount;
      case 'library.most.played': return mostPlayedCount;
      case 'library.favorites': return favoriteCount;
      default: return 0;
    }
  };

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

  const handlePlayAll = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist || playlist.songIds.length === 0) return;
    const songMap = new Map(songs.map((s) => [s.id, s]));
    const playlistSongs = playlist.songIds.map((id) => songMap.get(id)).filter((s): s is typeof songs[0] => Boolean(s));
    if (playlistSongs.length > 0) {
      play(playlistSongs[0], playlistSongs);
      router.push('/player');
    }
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  );

  const renderListHeader = () => (
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
                onPress={() => router.push(section.route as any)}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '30' }]}
              >
                <View style={[s.w14, s.h14, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Icon size={24} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                    {t(section.labelKey as any)}
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

      <View style={[s.px5, s.py3]}>
        <Text style={[s.textSm, s.fontSemibold, s.mb3, { color: colors.textMuted }]}>My Playlists</Text>
        <Pressable
          onPress={() => createSheetRef.current?.present()}
          style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}
        >
          <Plus size={18} color={colors.background} />
          <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>{t('playlist.new')}</Text>
        </Pressable>
      </View>

      {playlists.length === 0 && (
        <View style={[s.itemsCenter, s.py16]}>
          <ListMusic size={40} color={colors.textMuted} />
          <Text style={[s.mt3, { color: colors.textMuted }]}>{t('playlist.no.playlists')}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar
        title={t('playlist.title')}
        showSettings={false}
      />
      {playlists.length > 0 ? (
        <FlashList
          data={playlists}
          keyExtractor={(item) => item.id}
          numColumns={1}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/playlist/[id]', params: { id: item.id } })}
              onLongPress={() => handleDelete(item.id, item.name)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '30' }]}
            >
              <View style={[s.w14, s.h14, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <ListMusic size={24} color={colors.accent} />
              </View>
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>
                  {item.songIds.length} {item.songIds.length === 1 ? t('library.song') : t('library.tracks')}
                </Text>
              </View>
              {item.songIds.length > 0 && (
                <Pressable
                  onPress={() => handlePlayAll(item.id)}
                  style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent }]}
                >
                  <Play size={18} color={colors.background} fill={colors.background} />
                </Pressable>
              )}
            </Pressable>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {renderListHeader()}
        </ScrollView>
      )}
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
