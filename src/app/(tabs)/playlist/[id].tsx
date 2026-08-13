import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert, ScrollView, TextInput } from 'react-native';
import { s } from '@/styles';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Artwork } from '@/components/artwork';
import { usePlaylistStore } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { playerActions } from '@/player/actions';
import { useLyricsStore } from '@/store/lyrics-store';
import { useMetadataStore, type MetadataOverride } from '@/store/metadata-store';
import { hasCachedLyrics } from '@/services/lyrics';
import { formatDuration } from '@/utils/format';
import type { Song } from '@/types/media';
import { Music, Play, Plus, Shuffle, Info, Save, RotateCcw } from 'lucide-react-native';
import { LyricsBadge } from '@/components/lyrics-badge';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SongContextMenu, useSongContextMenu } from '@/components/song-context-menu';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function PlaylistDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const playlists = usePlaylistStore((s) => s.playlists);
  const removeSongFromPlaylist = usePlaylistStore((s) => s.removeSongFromPlaylist);

  const playlist = playlists.find((p) => p.id === id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const addSheetRef = useRef<BottomSheetModal>(null);
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const { bottomSheetRef, present, song } = useSongContextMenu();
  const setOverride = useMetadataStore((s) => s.setOverride);
  const [infoSong, setInfoSong] = useState<Song | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editArtwork, setEditArtwork] = useState<string | null>(null);

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

  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongsToPlaylist);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const handleInfoPress = useCallback((item: Song) => {
    setInfoSong(item);
    setEditTitle(item.title);
    setEditArtist(item.artist ?? '');
    setEditAlbum(item.album ?? '');
    setEditArtwork(item.artwork ?? null);
    infoSheetRef.current?.present();
  }, []);

  const handleSaveInfo = useCallback(() => {
    if (!infoSong) return;
    const override: MetadataOverride = {};
    if (editTitle !== infoSong.title) override.title = editTitle;
    if (editArtist !== (infoSong.artist ?? '')) override.artist = editArtist;
    if (editAlbum !== (infoSong.album ?? '')) override.album = editAlbum;
    if (editArtwork !== (infoSong.artwork ?? null)) {
      override.artwork = editArtwork ?? '';
    }
    if (Object.keys(override).length > 0) {
      setOverride(infoSong.id, override);
    }
    infoSheetRef.current?.dismiss();
  }, [infoSong, editTitle, editArtist, editAlbum, editArtwork, setOverride]);

  const handleResetInfo = useCallback(() => {
    if (!infoSong) return;
    setEditTitle(infoSong.title);
    setEditArtist(infoSong.artist ?? '');
    setEditAlbum(infoSong.album ?? '');
    setEditArtwork(infoSong.artwork ?? null);
  }, [infoSong]);

  if (!playlist) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.pageBackground }]}>
        <Text style={{ color: colors.textMuted }}>Playlist not found</Text>
        <Pressable onPress={() => router.back()} style={s.mt4}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playerActions.play(playlistSongs[0], playlistSongs);
      router.push('/player');
    }
  };

  const handleShufflePlay = () => {
    if (playlistSongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * playlistSongs.length);
      playerActions.play(playlistSongs[randomIndex], playlistSongs);
      playerActions.setShuffle(true);
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
          Array.from(selectedIds).forEach((songId) => removeSongFromPlaylist(playlist.id, songId));
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

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title={playlist.name} showSettings={false} />
      <FlashList
        data={playlistSongs}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
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
                onPress={handleShufflePlay}
                disabled={playlistSongs.length === 0}
                style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: playlistSongs.length > 0 ? colors.accent : colors.card }]}
              >
                <Shuffle size={18} color={playlistSongs.length > 0 ? colors.background : colors.textMuted} />
                <Text style={[s.textSm, s.fontSemibold, { color: playlistSongs.length > 0 ? colors.background : colors.textMuted }]}>
                  Shuffle
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
              onLongPress={() => present(item)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4, { backgroundColor: isSelected ? colors.accent + '10' : 'transparent' }]}
            >
              <Text style={[s.textXs, { width: 24, textAlign: 'center', color: colors.textMuted }]}>
                {index + 1}
              </Text>
              <Artwork uri={item.artwork} size={48} borderRadius={12} iconSize={18} iconColor={colors.textMuted} backgroundColor={colors.surface} />
              <View style={s.flex1}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{item.artist} · {formatDuration(item.duration)}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => handleInfoPress(item)}
                hitSlop={8}
                style={[{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}
              >
                <Info size={16} color={colors.textMuted} />
              </Pressable>
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
      <SongContextMenu bottomSheetRef={bottomSheetRef} song={song} />

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
                    paddingVertical: 12,
                    backgroundColor: isSelected ? colors.accent + '10' : 'transparent',
                  }}
                >
                  <Artwork uri={item.artwork} size={44} borderRadius={10} iconSize={16} iconColor={colors.textMuted} backgroundColor={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                      <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{item.artist}</Text>
                    </View>
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

      {/* Song Info Bottom Sheet */}
      <BottomSheetModal
        ref={infoSheetRef}
        snapPoints={['65%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ flex: 1, padding: 20 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
              Song Information
            </Text>

            <View style={[s.itemsCenter, s.mb6]}>
              <View style={[s.rounded2xl, s.overflowHidden, { width: 120, height: 120, backgroundColor: colors.card }]}>
                {editArtwork ? (
                  <Image source={{ uri: editArtwork }} style={{ width: 120, height: 120 }} contentFit="cover" />
                ) : (
                  <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                    <Music size={36} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <Pressable
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                    allowsEditing: true,
                    aspect: [1, 1],
                  });
                  if (!result.canceled && result.assets[0]) {
                    setEditArtwork(result.assets[0].uri);
                  }
                }}
                style={[s.mt2, { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.accent + '20' }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>
                  {editArtwork || infoSong?.artwork ? 'Change Artwork' : 'Add Artwork'}
                </Text>
              </Pressable>
            </View>

            <View style={[s.gap4, s.mb6]}>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Track title"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Artist</Text>
                <TextInput
                  value={editArtist}
                  onChangeText={setEditArtist}
                  placeholder="Artist name"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Album</Text>
                <TextInput
                  value={editAlbum}
                  onChangeText={setEditAlbum}
                  placeholder="Album name"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
            </View>

            <Text style={[s.textXs, s.fontBold, s.mb3, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }]}>
              Technical Information
            </Text>
            <View style={s.gap4}>
              <InfoRow label="Format" value={infoSong?.uri.split('.').pop()?.toUpperCase() ?? 'NONE'} colors={colors} />
              <InfoRow label="Bitrate" value={infoSong?.bitrate ? `${infoSong.bitrate} kbps` : 'Unknown'} colors={colors} />
              <InfoRow label="Sample Rate" value={infoSong?.sampleRate ? `${infoSong.sampleRate} Hz` : 'Unknown'} colors={colors} />
              <InfoRow label="File Size" value={infoSong ? formatFileSize(infoSong.fileSize) : '0 B'} colors={colors} />
              <InfoRow label="File Path" value={infoSong?.uri ?? 'Unknown'} colors={colors} multiline />
            </View>

            <View style={[s.flexRow, s.gap4, s.mt6, s.mb4]}>
              <Pressable
                onPress={handleResetInfo}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.card, paddingVertical: 12, borderRadius: 16 }]}
              >
                <RotateCcw size={16} color={colors.text} />
                <Text style={[s.fontSemibold, { color: colors.text }]}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveInfo}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 16 }]}
              >
                <Save size={16} color="#fff" />
                <Text style={[s.fontSemibold, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </BottomSheetModal>
    </View>
  );
}

function InfoRow({ label, value, colors, multiline }: { label: string; value: string; colors: { text: string; textMuted: string }; multiline?: boolean }) {
  return (
    <View style={[s.flexRow, s.justifyBetween, { alignItems: multiline ? 'flex-start' : 'center', gap: 8 }]}>
      <Text style={{ fontSize: 12, color: colors.textMuted, width: 90 }}>{label}</Text>
      <Text
        style={[s.flex1, { fontSize: 13, color: colors.text, textAlign: 'right' }]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
