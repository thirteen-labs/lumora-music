import { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import type { ThemeColors } from '@/types/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { usePlaylistStore } from '@/store/playlist-store';
import { useRouter } from 'expo-router';
import {
  SquareCheck, Square, Trash2, Heart, Share2, Music,
  ListPlus, ListMusic,
} from 'lucide-react-native';
import { deleteFiles, shareFiles } from '@/services/file-operations';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

export default function BatchOperationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const isSongFavorite = useFavoritesStore((s) => s.isSongFavorite);
  const play = usePlayerStore((s) => s.play);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [operating, setOperating] = useState(false);
  const playlistSheetRef = useRef<BottomSheetModal>(null);
  const playlists = usePlaylistStore((s) => s.playlists);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongsToPlaylist);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(songs.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const selectedSongs = useMemo(
    () => songs.filter((s) => selected.has(s.id)),
    [songs, selected]
  );

  const handleAddToQueue = () => {
    selectedSongs.forEach((s) => addToQueue(s));
    Alert.alert(t('common.ok'), t('batch.added.queue', { count: selectedSongs.length }));
    setSelected(new Set());
  };

  const handleFavorite = () => {
    selectedSongs.forEach((s) => {
      if (!isSongFavorite(s.id)) toggleSongFavorite(s);
    });
    Alert.alert(t('common.ok'), t('batch.favorited', { count: selectedSongs.length }));
    setSelected(new Set());
  };

  const handlePlayNow = () => {
    if (selectedSongs.length === 0) return;
    play(selectedSongs[0], selectedSongs);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      t('batch.delete'),
      t('batch.delete.confirm', { count: selectedSongs.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('deleted.delete'),
          style: 'destructive',
          onPress: async () => {
            setOperating(true);
            try {
              const uris = selectedSongs.map((s) => s.uri);
              const result = await deleteFiles(uris);
              if (result.success) {
                const deletedIds = new Set(selectedSongs.map((s) => s.id));
                useMusicStore.setState((state) => ({
                  songs: state.songs.filter((s) => !deletedIds.has(s.id)),
                }));
                Alert.alert(t('common.ok'), t('batch.deleted', { count: selectedSongs.length }));
                setSelected(new Set());
              } else {
                Alert.alert('Error', result.error ?? 'Failed to delete files.');
              }
            } finally {
              setOperating(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    setOperating(true);
    try {
      const uris = selectedSongs.map((s) => s.uri);
      const result = await shareFiles(uris);
      if (!result.success) {
        Alert.alert('Error', result.error ?? 'Failed to share files.');
      }
      setSelected(new Set());
    } finally {
      setOperating(false);
    }
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addSongsToPlaylist(playlistId, Array.from(selected));
    const playlist = playlists.find((p) => p.id === playlistId);
    Alert.alert(t('common.ok'), `${selected.size} tracks added to "${playlist?.name ?? 'playlist'}"`);
    setSelected(new Set());
    playlistSheetRef.current?.dismiss();
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar
        title={t('batch.selected', { count: selected.size })}
        showSettings={false}
      />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap4]}>
          <View style={[s.flexRow, s.gap2]}>
            <Pressable onPress={selectAll} style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: colors.card }]}>
              <Text style={[s.textXs, s.fontSemibold, { color: colors.text }]}>{t('batch.select.all')}</Text>
            </Pressable>
            <Pressable onPress={deselectAll} style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: colors.card }]}>
              <Text style={[s.textXs, s.fontSemibold, { color: colors.text }]}>{t('batch.deselect.all')}</Text>
            </Pressable>
          </View>

          {selected.size > 0 && (
            <View>
              <SectionHeader title={t('batch.actions')} />
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                <ActionButton
                  icon={ListPlus} label={t('batch.add.queue')} count={selected.size}
                  onPress={handleAddToQueue} colors={colors}
                  disabled={operating}
                />
                <ActionButton
                  icon={Heart} label={t('batch.add.favorites')} count={selected.size}
                  onPress={handleFavorite} colors={colors}
                  disabled={operating}
                />
                <ActionButton
                  icon={ListMusic} label={t('batch.add.playlist')} count={selected.size}
                  onPress={() => playlistSheetRef.current?.present()} colors={colors}
                  disabled={operating}
                />
                <ActionButton
                  icon={Music} label={t('batch.play.now')} count={selected.size}
                  onPress={handlePlayNow} colors={colors}
                  disabled={operating}
                />
                <ActionButton
                  icon={Share2} label={t('batch.share')} count={selected.size}
                  onPress={handleShare} colors={colors}
                  disabled={operating}
                />
                <ActionButton
                  icon={Trash2} label={t('batch.delete')} count={selected.size}
                  onPress={handleDelete} colors={colors} danger
                  disabled={operating}
                />
              </View>
            </View>
          )}

          <View>
            <SectionHeader title={t('library.songs.count', { count: songs.length })} />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {songs.map((song, i) => {
                const isSelected = selected.has(song.id);
                return (
                  <Pressable
                    key={song.id}
                    onPress={() => toggleSelect(song.id)}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { backgroundColor: isSelected ? colors.accent + '10' : 'transparent' }]}
                  >
                    {isSelected ? (
                      <SquareCheck size={20} color={colors.accent} />
                    ) : (
                      <Square size={20} color={colors.textMuted} />
                    )}
                    <View style={s.flex1}>
                      <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomSheetModal
        ref={playlistSheetRef}
        snapPoints={['40%', '70%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
            {t('batch.add.playlist')}
          </Text>
          {playlists.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ListMusic size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
                No playlists yet. Create one first.
              </Text>
            </View>
          ) : (
            playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                onPress={() => handleAddToPlaylist(playlist.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  marginBottom: 8,
                  backgroundColor: colors.card,
                }}
              >
                <ListMusic size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>{playlist.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{playlist.songIds.length} songs</Text>
                </View>
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

function ActionButton({
  icon: Icon, label, count, onPress, colors, danger, disabled,
}: {
  icon: any; label: string; count: number; onPress: () => void; colors: ThemeColors; danger?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { opacity: disabled ? 0.5 : 1 }]}
    >
      <Icon size={18} color={danger ? colors.notification : colors.accent} />
      <Text style={[s.flex1, s.textSm, s.fontMedium, { color: danger ? colors.notification : colors.text }]}>{label}</Text>
      <Text style={[s.textXs, { color: colors.textMuted }]}>{count} items</Text>
    </Pressable>
  );
}
