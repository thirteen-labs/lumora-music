import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useMetadataStore } from '@/store/metadata-store';
import { useMusicStore } from '@/store/music-store';
import { useState } from 'react';
import { Save, RotateCcw, Type, User, Disc } from 'lucide-react-native';

export default function MetadataEditorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const songs = useMusicStore((s) => s.songs);
  const overrides = useMetadataStore((s) => s.overrides);
  const setOverride = useMetadataStore((s) => s.setOverride);
  const removeOverride = useMetadataStore((s) => s.removeOverride);

  const originalSong = songs.find(song => song.id === songId);
  const currentOverride = overrides[songId ?? ''];

  const [title, setTitle] = useState(() => originalSong ? (currentOverride?.title ?? originalSong.title) : '');
  const [artist, setArtist] = useState(() => originalSong ? (currentOverride?.artist ?? originalSong.artist ?? '') : '');
  const [album, setAlbum] = useState(() => originalSong ? (currentOverride?.album ?? originalSong.album ?? '') : '');

  if (!originalSong) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Song not found</Text>
      </View>
    );
  }

  const handleSave = () => {
    setOverride(originalSong.id, { title, artist, album });
    Alert.alert("Success", "Metadata updated locally.");
    router.back();
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Metadata",
      "Restore original tags from the file?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: () => {
            removeOverride(originalSong.id);
            setTitle(originalSong.title);
            setArtist(originalSong.artist ?? '');
            setAlbum(originalSong.album ?? '');
          }
        }
      ]
    );
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Edit Metadata" showSettings={false} />
      
      <ScrollView 
        style={s.flex1} 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <Text style={[s.textXs, s.fontBold, s.mb6, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }]}>
          Modify Track Information
        </Text>

        <View style={s.gap5}>
          {/* Title */}
          <View>
            <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
              <Type size={14} color={colors.accent} />
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Title</Text>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter song title"
              placeholderTextColor={colors.textMuted}
              style={[s.p4, { backgroundColor: colors.surface, borderRadius: 16, color: colors.text, fontSize: 16 }]}
            />
          </View>

          {/* Artist */}
          <View>
            <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
              <User size={14} color={colors.accent} />
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Artist</Text>
            </View>
            <TextInput
              value={artist}
              onChangeText={setArtist}
              placeholder="Enter artist name"
              placeholderTextColor={colors.textMuted}
              style={[s.p4, { backgroundColor: colors.surface, borderRadius: 16, color: colors.text, fontSize: 16 }]}
            />
          </View>

          {/* Album */}
          <View>
            <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
              <Disc size={14} color={colors.accent} />
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Album</Text>
            </View>
            <TextInput
              value={album}
              onChangeText={setAlbum}
              placeholder="Enter album name"
              placeholderTextColor={colors.textMuted}
              style={[s.p4, { backgroundColor: colors.surface, borderRadius: 16, color: colors.text, fontSize: 16 }]}
            />
          </View>
        </View>

        <View style={[s.flexRow, s.gap4, s.mt10]}>
          <Pressable
            onPress={handleReset}
            style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.card, paddingVertical: 16, borderRadius: 20 }]}
          >
            <RotateCcw size={18} color={colors.text} />
            <Text style={[s.fontBold, { color: colors.text }]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 20 }]}
          >
            <Save size={18} color="#fff" />
            <Text style={[s.fontBold, { color: '#fff' }]}>Save Changes</Text>
          </Pressable>
        </View>

        <Text style={[s.textXs, s.mt8, s.textCenter, { color: colors.textMuted, lineHeight: 18 }]}>
          Note: Changes are saved within Lumora and do not modify the original audio file on your storage.
        </Text>
      </ScrollView>
    </View>
  );
}
