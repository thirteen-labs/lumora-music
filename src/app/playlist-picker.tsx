import { View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { CustomModal } from '@/components/custom-modal';
import { usePlaylistStore } from '@/store/playlist-store';
import { useState } from 'react';
import { Plus, FileMusic, ChevronRight } from 'lucide-react-native';
import { useToastStore } from '@/store/toast-store';

export default function PlaylistPickerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist);
  const showToast = useToastStore(s => s.showToast);

  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = () => {
    if (!newPlaylistName.trim()) return;
    const id = createPlaylist(newPlaylistName.trim());
    if (songId) {
      addSongToPlaylist(id, songId);
      showToast(`Added to ${newPlaylistName}`, 'list');
    }
    setModalVisible(false);
    setNewPlaylistName('');
    if (songId) router.back();
  };

  const handleSelect = (playlist: { id: string; name: string; songIds: string[] }) => {
    if (songId) {
      addSongToPlaylist(playlist.id, songId);
      showToast(`Added to ${playlist.name}`, 'list');
      router.back();
    } else {
        router.push({ pathname: '/(tabs)/playlist/[id]', params: { id: playlist.id } });
    }
  };

  const renderItem = ({ item }: { item: { id: string; name: string; songIds: string[] } }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      style={[s.flexRow, s.itemsCenter, s.p4, s.mb2, { backgroundColor: colors.surface, borderRadius: 16 }]}
    >
      <View style={[s.w12, s.h12, s.roundedLg, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
        <FileMusic size={24} color={colors.accent} />
      </View>
      <View style={[s.flex1, s.ml2]}>
        <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>{item.name}</Text>
        <Text style={[s.textXs, { color: colors.textMuted }]}>{item.songIds.length} songs</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title={songId ? "Add to Playlist" : "Playlists"} showSettings={false} />
      
      <FlatList
        data={playlists}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        ListHeaderComponent={
          <Pressable
            onPress={() => setModalVisible(true)}
            style={[s.flexRow, s.itemsCenter, s.p4, s.mb4, { backgroundColor: colors.accent + '15', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.accent }]}
          >
            <View style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent }]}>
              <Plus size={24} color="#fff" />
            </View>
            <Text style={[s.textBase, s.fontBold, { marginLeft: 12, color: colors.accent }]}>Create New Playlist</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={[s.itemsCenter, s.justifyCenter, s.mt12]}>
            <FileMusic size={48} color={colors.textMuted} opacity={0.3} />
            <Text style={[s.mt4, { color: colors.textMuted }]}>No playlists created yet</Text>
          </View>
        }
      />

      <CustomModal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[{ width: '80%', minWidth: 260, backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border }]}>
          <Text style={[s.textLg, s.fontBold, s.mb4, { color: colors.text }]}>New Playlist</Text>
          <TextInput
            autoFocus
            placeholder="Playlist name"
            placeholderTextColor={colors.textMuted}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            style={[s.p4, s.mb6, { backgroundColor: colors.card, borderRadius: 16, color: colors.text }]}
          />
          <View style={[s.flexRow, s.gap3]}>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={[s.flex1, s.p4, s.itemsCenter, { backgroundColor: colors.card, borderRadius: 12 }]}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              style={[s.flex1, s.p4, s.itemsCenter, { backgroundColor: colors.accent, borderRadius: 12 }]}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create</Text>
            </Pressable>
          </View>
        </View>
      </CustomModal>
    </View>
  );
}
