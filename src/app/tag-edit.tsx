import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useRoute, useRouter } from 'expo-router';
import { useMusicStore } from '@/store/music-store';
import { Save, X } from 'lucide-react-native';

export default function TagEditScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const route = useRoute();
  const songs = useMusicStore((s) => s.songs);

  const songId = (route.params as any)?.songId;
  const song = songs.find((s) => s.id === songId);

  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [album, setAlbum] = useState(song?.album ?? '');
  const [genre, setGenre] = useState(song?.genre ?? '');
  const [year, setYear] = useState(song?.dateAdded ? new Date(song.dateAdded).getFullYear().toString() : '');

  if (!song) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>Song not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = () => {
    Alert.alert(
      'Coming Soon',
      'Tag editing will be available in a future update. This feature requires native metadata writing capabilities.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Edit Tags" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-4">
          <View className="rounded-3xl p-4 gap-4" style={{ backgroundColor: colors.surface }}>
            <TagField label="Title" value={title} onChange={setTitle} colors={colors} />
            <TagField label="Artist" value={artist} onChange={setArtist} colors={colors} />
            <TagField label="Album" value={album} onChange={setAlbum} colors={colors} />
            <TagField label="Genre" value={genre} onChange={setGenre} colors={colors} />
            <TagField label="Year" value={year} onChange={setYear} colors={colors} keyboardType="numeric" />
          </View>

          <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Note: Tag editing requires native metadata writing support. Currently this feature is read-only. Embedded metadata can be viewed but modifications will be supported in a future release.
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-4 rounded-3xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: colors.card }}
            >
              <X size={18} color={colors.text} />
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              className="flex-1 py-4 rounded-3xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: colors.accent }}
            >
              <Save size={18} color={colors.background} />
              <Text className="text-sm font-semibold" style={{ color: colors.background }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TagField({
  label, value, onChange, colors, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: any;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View>
      <Text className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        className="px-4 py-3 rounded-2xl text-sm"
        style={{ backgroundColor: colors.card, color: colors.text }}
      />
    </View>
  );
}
