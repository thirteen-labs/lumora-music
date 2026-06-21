import { useState, useMemo, useRef } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { s } from '@/styles';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Artwork } from '@/components/artwork';
import { usePlaylistStore } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { formatDuration } from '@/utils/cn';
import { Music, Play, Plus } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';

export default function PlaylistDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const play = usePlayerStore((s) => s.play);
  const { playlists, removeSongsFromPlaylist } = usePlaylistStore();

  const playlist = playlists.find((p) => p.id === id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const addSheetRef = useRef<BottomSheetModal>(null);

  const playlistSongs = useMemo(() => {
    if (!playlist) return [];
    const songMap = new Map(songs.map((s) => [s.id, s]));
    return playlist.songIds.map((id) => songMap.get(id)).filter(Boolean) as typeof songs;
  }, [playlist, songs]);

  const availableSongs = useMemo(() => {
    if (!playlist) return [];
    const idSet = new Set(playlist.songIds);
    return songs.filter((s) => !idSet.has(s.id));
  }, [playlist, songs]);

  const { addSongsToPlaylist } = usePlaylistStore();

  if (!playlist) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Playlist not found</Text>
        <Pressable onPress={() => router.back()} style={s.mt4}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      play(playlistSongs[0], playlistSongs);
      router.push('/player');
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('Remove Songs', `Remove ${selectedIds.size} song(s) from playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeSongsFromPlaylist(playlist.id, Array.from(selectedIds));
          setSelectedIds(new Set());
        },
      },
    ]);
  };

  const toggleSelect = (songId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const handleAddSongs = () => {
    addSongsToPlaylist(playlist.id, Array.from(selectedIds));
    setSelectedIds(new Set());
    addSheetRef.current?.dismiss();
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={playlist.name} showSettings={false} />
      <FlashList
        data={playlistSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={[s.px4, s.py4]}>
            <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb4]}>
              <Pressable
                onPress={handlePlayAll}
                disabled={playlistSongs.length === 0}
                style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: playlistSongs.length > 0 ? colors.accent : colors.card }]}
              >
                <Play size={18} color={playlistSongs.length > 0 ? colors.background : colors.textMuted} fill={playlistSongs.length > 0 ? colors.background : colors.textMuted} />
                <Text style={[s.textSm, s.fontSemibold, { color: playlistSongs.length > 0 ? colors.background : colors.textMuted }]}>
                  Play All
                </Text>
              </Pressable>
              <Pressable
                onPress={() => addSheetRef.current?.present()}
                style={[{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 6, backgroundColor: colors.card }]}
              >
                <Plus size={16} color={colors.text} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Add</Text>
              </Pressable>
            </View>

            {selectedIds.size > 0 && (
              <Pressable
                onPress={handleRemoveSelected}
                style={[{ paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginBottom: 16, backgroundColor: colors.notification + '20' }]}
              >
                <Text style={[s.textSm, s.fontSemibold, { color: colors.notification }]}>
                  Remove {selectedIds.size} Selected
                </Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              onPress={() => toggleSelect(item.id)}
              onLongPress={() => toggleSelect(item.id)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3, { backgroundColor: isSelected ? colors.accent + '10' : 'transparent' }]}
            >
              <Text style={[s.textXs, { width: 24, textAlign: 'center', color: colors.textMuted }]}>
                {index + 1}
              </Text>
              <Artwork uri={item.artwork} size={44} borderRadius={12} iconSize={18} iconColor={colors.accent} backgroundColor={colors.surface} />
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>{item.artist} · {formatDuration(item.duration)}</Text>
              </View>
              {isSelected && (
                <View style={[{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }]}>
                  <Text style={[s.textXs, s.fontBold, { color: colors.background }]}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.py20]}>
            <Music size={40} color={colors.textMuted} />
            <Text style={[s.mt3, { color: colors.textMuted }]}>No songs in this playlist</Text>
            <Pressable
              onPress={() => addSheetRef.current?.present()}
              style={[s.mt4, { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 16, backgroundColor: colors.accent }]}
            >
              <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Add Songs</Text>
            </Pressable>
          </View>
        }
      />
      <MiniPlayer />

      <BottomSheetModal
        ref={addSheetRef}
        snapPoints={['60%', '90%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              Add Songs to {playlist.name}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {availableSongs.length} songs available
            </Text>
          </View>
          {selectedIds.size > 0 && (
            <Pressable
              onPress={handleAddSongs}
              style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.background }}>
                Add {selectedIds.size} Song{selectedIds.size > 1 ? 's' : ''}
              </Text>
            </Pressable>
          )}
          <BottomSheetFlatList
            data={availableSongs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    backgroundColor: isSelected ? colors.accent + '10' : 'transparent',
                  }}
                >
                  <Artwork uri={item.artwork} size={40} borderRadius={10} iconSize={16} iconColor={colors.accent} backgroundColor={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                  </View>
                  {isSelected && (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.background }}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}
