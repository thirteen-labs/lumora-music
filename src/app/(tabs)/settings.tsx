import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { TopBar } from '@/components/top-bar';
import { FileSizeSelector } from '@/components/file-size-selector';
import { ThemeSelector } from '@/components/theme-selector';
import { SectionHeader } from '@/components/section-header';
import { useRouter } from 'expo-router';
import {
  Shuffle, Repeat, Zap, Info, Image as ImageIcon, LayoutGrid,
  Equal, Moon, Activity, ListMusic, Music, Tag,
  HardDrive, Hand, Captions, Brain, Cloud,
  Disc, ChevronRight, Timer,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const defaultShuffle = useSettingsStore((s) => s.defaultShuffle);
  const setDefaultShuffle = useSettingsStore((s) => s.setDefaultShuffle);
  const defaultRepeat = useSettingsStore((s) => s.defaultRepeat);
  const setDefaultRepeat = useSettingsStore((s) => s.setDefaultRepeat);
  const crossfade = useSettingsStore((s) => s.crossfade);
  const setCrossfade = useSettingsStore((s) => s.setCrossfade);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const setCrossfadeDuration = useSettingsStore((s) => s.setCrossfadeDuration);
  const colorAware = useSettingsStore((s) => s.colorAware);
  const setColorAware = useSettingsStore((s) => s.setColorAware);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const setBackgroundImage = useSettingsStore((s) => s.setBackgroundImage);
  const nowPlayingLayout = useSettingsStore((s) => s.nowPlayingLayout);
  const setNowPlayingLayout = useSettingsStore((s) => s.setNowPlayingLayout);
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);
  const videos = useVideoStore((s) => s.videos);

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
              className="rounded-3xl overflow-hidden"
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
                  className="flex-1 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text className="text-sm font-semibold" style={{ color: colors.background }}>
                    {backgroundImage ? 'Change' : 'Select Image'}
                  </Text>
                </Pressable>
                {backgroundImage && (
                  <Pressable
                    onPress={removeBackground}
                    className="py-3 px-5 rounded-2xl items-center"
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
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <ThemeSelector />
            </View>
          </View>

          <View>
            <SectionHeader title="Color Aware" />
            <View className="flex-row items-center justify-between p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
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
            <SectionHeader title="Now Playing Layout" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row p-2 gap-2">
                {(['classic', 'modern', 'minimal'] as const).map((layout) => (
                  <Pressable
                    key={layout}
                    onPress={() => setNowPlayingLayout(layout)}
                    className="flex-1 py-3 rounded-2xl items-center"
                    style={{ backgroundColor: nowPlayingLayout === layout ? colors.accent : colors.card }}
                  >
                    <LayoutGrid size={16} color={nowPlayingLayout === layout ? colors.background : colors.textMuted} />
                    <Text
                      className="text-xs font-semibold mt-1 capitalize"
                      style={{ color: nowPlayingLayout === layout ? colors.background : colors.textMuted }}
                    >
                      {layout}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Playback" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
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
              {crossfade && (
                <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Timer size={16} color={colors.accent} />
                      <Text className="text-xs font-medium" style={{ color: colors.textMuted }}>
                        Crossfade Duration
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
                      {crossfadeDuration}s
                    </Text>
                  </View>
                  <Slider
                    value={crossfadeDuration}
                    onValueChange={(val) => setCrossfadeDuration(Math.round(val * 2) / 2)}
                    minimumValue={1}
                    maximumValue={12}
                    step={0.5}
                    minimumTrackTintColor={colors.accent}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.accent}
                    style={{ width: '100%', height: 32 }}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Audio Features */}
          <View>
            <SectionHeader title="Audio" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Equal}
                label="Equalizer & Audio Effects"
                subtitle="EQ, bass boost, balance, speed"
                onPress={() => router.push('/audio-features' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Moon}
                label="Sleep Timer"
                subtitle="Auto-stop after duration"
                onPress={() => router.push('/sleep-timer' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Library */}
          <View>
            <SectionHeader title="Library" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={ListMusic}
                label="Smart Playlists"
                subtitle="Rules-based auto-playlists"
                onPress={() => router.push('/smart-playlists' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Activity}
                label="Statistics"
                subtitle="Play counts & listening stats"
                onPress={() => router.push('/statistics' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Tag}
                label="Tag Editor"
                subtitle="Edit song metadata"
                onPress={() => router.push('/tag-edit' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Disc}
                label="Library Tools"
                subtitle="Duplicates, missing files, scanning"
                onPress={() => router.push('/library-tools' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Power User */}
          <View>
            <SectionHeader title="Power User" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Music}
                label="Batch Operations"
                subtitle="Multi-select actions"
                onPress={() => router.push('/batch-operations' as any)}
                colors={colors}
              />
              <SettingRow
                icon={HardDrive}
                label="Storage Analysis"
                subtitle="File sizes & breakdown"
                onPress={() => router.push('/storage' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Online Features */}
          <View>
            <SectionHeader title="Online Features" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Captions}
                label="Subtitle Downloader"
                subtitle="Download subtitles online"
                onPress={() => router.push('/online-subtitles' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Brain}
                label="AI Features"
                subtitle="Smart playlists, mood detection"
                onPress={() => router.push('/ai-features' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Cloud}
                label="Cloud Backup & Sync"
                subtitle="Backup & sync across devices"
                onPress={() => router.push('/cloud-sync' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Hand}
                label="Gesture Controls"
                subtitle="Video swipe gestures"
                onPress={() => router.push('/gesture-controls' as any)}
                colors={colors}
                comingSoon
              />
            </View>
          </View>

          <View>
            <SectionHeader title="Storage" />
            <View className="p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                {songs.length} songs • {albums.length} albums • {artists.length} artists • {videos.length} videos
              </Text>
            </View>
          </View>

          <View>
            <SectionHeader title="About" />
            <View className="p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
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

function SettingRow({
  icon: Icon,
  label,
  subtitle,
  onPress,
  colors,
  comingSoon,
}: {
  icon: any;
  label: string;
  subtitle: string;
  onPress: () => void;
  colors: any;
  comingSoon?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 p-4"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Icon size={20} color={colors.accent} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
          {comingSoon && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.accent + '20' }}>
              <Text className="text-[10px] font-semibold" style={{ color: colors.accent }}>SOON</Text>
            </View>
          )}
        </View>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}
