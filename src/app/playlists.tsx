import { useState, useRef } from 'react';
import { View, Text, Pressable, Alert, TextInput } from 'react-native';
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
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import {
  Heart, Plus, ListMusic, Trash2, Play, Tag, Users, Mic2, Clock, TrendingUp, ChevronRight,
} from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

const PREDEFINED_SECTIONS = [
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
  const play = usePlayerStore((s) => s.play);
  const favoriteCount = useFavoritesStore((s) => s.favoriteSongIds.length);
  const [newName, setNewName] = useState('');
  const createSheetRef = useRef<BottomSheetModal>(null);

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

  const ListHeader = () => (
    <View>
      <View style={[s.px4, s.py2]}>
        <Text style={[s.textSm, s.fontSemibold, s.mb3, { color: colors.textMuted }]}>Browse</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
          {PREDEFINED_SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <Pressable
                key={section.labelKey}
                onPress={() => router.push(section.route as any)}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < PREDEFINED_SECTIONS.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
              >
                <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Icon size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                    {t(section.labelKey as any)}
                  </Text>
                  {section.labelKey === 'library.favorites' && (
                    <Text style={[s.textXs, { color: colors.textMuted, marginTop: 2 }]}>
                      {favoriteCount} {favoriteCount === 1 ? t('library.song') : t('library.tracks')}
                    </Text>
                  )}
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[s.px4, s.py2]}>
        <Text style={[s.textSm, s.fontSemibold, s.mb3, { color: colors.textMuted }]}>My Playlists</Text>
        <Pressable
          onPress={() => createSheetRef.current?.present()}
          style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}
        >
          <Plus size={18} color={colors.background} />
          <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>{t('playlist.new')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar
        title={t('playlist.title')}
        showSettings={false}
      />
      <FlashList
        data={playlists}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}
            style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <View style={[{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }]}>
              <ListMusic size={24} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
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
            <Pressable
              onPress={() => handleDelete(item.id, item.name)}
              style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}
            >
              <Trash2 size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <ListMusic size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>{t('playlist.no.playlists')}</Text>
          </View>
        }
      />
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
