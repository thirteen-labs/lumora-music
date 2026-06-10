import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { TopBar } from '@/components/top-bar';
import { FileSizeSelector } from '@/components/file-size-selector';
import { ThemeSelector } from '@/components/theme-selector';
import { SectionHeader } from '@/components/section-header';
import { Shuffle, Repeat, Zap, Info, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const {
    defaultShuffle, setDefaultShuffle,
    defaultRepeat, setDefaultRepeat,
    crossfade, setCrossfade,
    colorAware, setColorAware,
    backgroundImage, setBackgroundImage,
  } = useSettingsStore();
  const { songs, albums, artists } = useMusicStore();
  const { videos } = useVideoStore();

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  const removeBackground = () => {
    Alert.alert('Remove Background', 'Remove the current background image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setBackgroundImage(null) },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Settings" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          <View>
            <SectionHeader title="File Size Theme" />
            <FileSizeSelector />
          </View>

          <View>
            <SectionHeader title="Image Background" />
            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="h-40 items-center justify-center overflow-hidden" style={{ backgroundColor: colors.card }}>
                {backgroundImage ? (
                  <Image
                    source={{ uri: backgroundImage }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="items-center">
                    <ImageIcon size={32} color={colors.textMuted} />
                    <Text className="mt-2 text-sm" style={{ color: colors.textMuted }}>No background set</Text>
                  </View>
                )}
              </View>
              <View className="flex-row p-3 gap-2">
                <Pressable
                  onPress={pickBackgroundImage}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text className="text-sm font-semibold" style={{ color: colors.background }}>
                    {backgroundImage ? 'Change' : 'Select Image'}
                  </Text>
                </Pressable>
                {backgroundImage && (
                  <Pressable
                    onPress={removeBackground}
                    className="py-3 px-5 rounded-xl items-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Text className="text-sm" style={{ color: colors.text }}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Themes" />
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <ThemeSelector />
            </View>
          </View>

          <View>
            <SectionHeader title="Color Aware" />
            <View className="flex-row items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: colors.surface }}>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  Extract colors from artwork
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  Auto-theme based on album art
                </Text>
              </View>
              <Pressable
                onPress={() => setColorAware(!colorAware)}
                className="w-14 h-8 rounded-full items-center justify-end px-1"
                style={{ backgroundColor: colorAware ? colors.accent : colors.card }}
              >
                <View
                  className="w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: '#fff',
                    transform: [{ translateX: colorAware ? 0 : -22 }],
                  }}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <SectionHeader title="Playback" />
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingToggle
                icon={Shuffle}
                label="Default Shuffle"
                value={defaultShuffle}
                onToggle={() => setDefaultShuffle(!defaultShuffle)}
                colors={colors}
              />
              <SettingToggle
                icon={Repeat}
                label="Default Repeat"
                value={defaultRepeat === 'all'}
                onToggle={() => {
                  const modes = ['off', 'all', 'one'] as const;
                  const idx = modes.indexOf(defaultRepeat);
                  setDefaultRepeat(modes[(idx + 1) % modes.length]);
                }}
                colors={colors}
              />
              <SettingToggle
                icon={Zap}
                label="Crossfade"
                value={crossfade}
                onToggle={() => setCrossfade(!crossfade)}
                colors={colors}
              />
            </View>
          </View>

          <View>
            <SectionHeader title="Storage" />
            <View className="p-4 rounded-2xl" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                {songs.length} songs • {albums.length} albums • {artists.length} artists • {videos.length} videos
              </Text>
            </View>
          </View>

          <View>
            <SectionHeader title="About" />
            <View className="p-4 rounded-2xl" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-2 mb-2">
                <Info size={16} color={colors.accent} />
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>Lumora</Text>
              </View>
              <Text className="text-sm" style={{ color: colors.textMuted }}>Version 1.0.0</Text>
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Premium offline media player
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingToggle({
  icon: Icon,
  label,
  value,
  onToggle,
  colors,
}: {
  icon: any;
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <View
      className="flex-row items-center gap-4 p-4"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Icon size={20} color={colors.accent} />
      <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
      <Pressable
        onPress={onToggle}
        className="w-14 h-8 rounded-full items-center justify-end px-1"
        style={{ backgroundColor: value ? colors.accent : colors.card }}
      >
        <View
          className="w-6 h-6 rounded-full"
          style={{ backgroundColor: '#fff', transform: [{ translateX: value ? 0 : -22 }] }}
        />
      </Pressable>
    </View>
  );
}
