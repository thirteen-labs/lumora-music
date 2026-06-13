import { useState, useRef } from 'react';
import { View, Text, FlatList, Pressable, Alert, TextInput } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { usePlaylistStore } from '@/store/playlist-store';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import { Plus, ListMusic, Trash2, Play } from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { playlists, createPlaylist, deletePlaylist } = usePlaylistStore();
  const songs = useMusicStore((s) => s.songs);
  const play = usePlayerStore((s) => s.play);
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
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) },
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar
        title="Playlists"
        showSettings={false}
      />
      <View className="px-4 py-2">
        <Pressable
          onPress={() => createSheetRef.current?.present()}
          className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
          style={{ backgroundColor: colors.accent }}
        >
          <Plus size={18} color={colors.background} />
          <Text className="text-sm font-semibold" style={{ color: colors.background }}>New Playlist</Text>
        </Pressable>
      </View>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}
            className="flex-row items-center gap-3 px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.surface }}>
              <ListMusic size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}
              </Text>
            </View>
            {item.songIds.length > 0 && (
              <Pressable
                onPress={() => handlePlayAll(item.id)}
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Play size={18} color={colors.background} fill={colors.background} />
              </Pressable>
            )}
            <Pressable
              onPress={() => handleDelete(item.id, item.name)}
              className="w-11 h-11 items-center justify-center"
            >
              <Trash2 size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <ListMusic size={40} color={colors.textMuted} />
            <Text className="mt-3" style={{ color: colors.textMuted }}>No playlists yet</Text>
            <Pressable
              onPress={() => createSheetRef.current?.present()}
              className="mt-4 py-2 px-6 rounded-2xl"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.background }}>Create Playlist</Text>
            </Pressable>
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
            New Playlist
          </Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Playlist name"
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
            accessibilityLabel="Playlist name"
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
              Create
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
