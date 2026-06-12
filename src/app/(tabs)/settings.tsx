import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, LANGUAGE_OPTIONS, FONT_OPTIONS } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { useVideoStore } from '@/store/video-store';
import { TopBar } from '@/components/top-bar';
import { FileSizeSelector } from '@/components/file-size-selector';
import { ThemeSelector } from '@/components/theme-selector';
import { SectionHeader } from '@/components/section-header';
import { useRouter } from 'expo-router';
import { useScanManager } from '@/hooks/use-scan-manager';
import { useTranslation } from '@/hooks/use-translation';
import {
  getScanInterval as getStoredScanInterval,
  setScanInterval as setStoredScanInterval,
  getLastBackgroundScanTime,
} from '@/services/background-scanner';
import {
  Shuffle, Repeat, Zap, Info, Image as ImageIcon, LayoutGrid,
  Equal, Moon, Activity, ListMusic, Music, Tag,
  HardDrive, Hand, Captions, Brain, Cloud,
  Disc, ChevronRight, Timer, EyeOff, Clock, Trash2,
  Sparkles, Mic, Film, RefreshCw, Bell, ListPlus,
  Languages, Type, ShieldCheck, ShieldOff,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import { useState, useRef, useCallback, useMemo } from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
  const bgScanEnabled = useMusicStore((s) => s.backgroundScanEnabled);
  const setBgScanEnabled = useMusicStore((s) => s.setBackgroundScanEnabled);
  const { manualScan } = useScanManager();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const setAdsRemoved = useSettingsStore((s) => s.setAdsRemoved);
  const [scanInterval, setScanIntervalState] = useState(getStoredScanInterval());
  const [lastBgScan, setLastBgScan] = useState(getLastBackgroundScanTime());
  const languageSheetRef = useRef<BottomSheetModal>(null);
  const fontSheetRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const langSnapPoints = useMemo(() => ['50%', '75%'], []);
  const fontSnapPoints = useMemo(() => ['35%'], []);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language);
  const currentFont = FONT_OPTIONS.find((f) => f.key === fontFamily);
  const languageLabel = currentLang ? `${currentLang.native} (${currentLang.label})` : t('settings.app.language');

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
    Alert.alert(t('settings.remove.image'), t('settings.remove.background'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.remove'), style: 'destructive', onPress: () => setBackgroundImage(null) },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Settings" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          <View>
            <SectionHeader title={t('settings.file.size.theme')} />
            <FileSizeSelector />
          </View>

          <View>
            <SectionHeader title={t('settings.image.background')} />
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
                    <Text className="mt-2 text-sm" style={{ color: colors.textMuted }}>{t('settings.no.background')}</Text>
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
                    {backgroundImage ? t('settings.change.image') : t('settings.select.image')}
                  </Text>
                </Pressable>
                {backgroundImage && (
                  <Pressable
                    onPress={removeBackground}
                    className="py-3 px-5 rounded-2xl items-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Text className="text-sm" style={{ color: colors.text }}>{t('settings.remove.image')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title={t('settings.themes')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <ThemeSelector />
            </View>
          </View>

          <View>
            <SectionHeader title={t('settings.color.aware')} />
            <View className="flex-row items-center justify-between p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  {t('settings.color.aware')}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {t('settings.color.aware.desc')}
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
            <SectionHeader title={t('settings.library.scanning')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <View
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <RefreshCw size={20} color={colors.accent} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {t('settings.bg.scan')}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {t('settings.bg.scan.desc')}
                  </Text>
                </View>
                <Switch
                  value={bgScanEnabled}
                  onValueChange={setBgScanEnabled}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              {bgScanEnabled && (
                <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                    {t('settings.scan.interval')}
                  </Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: '1h', value: 60 },
                      { label: '6h', value: 360 },
                      { label: '12h', value: 720 },
                      { label: '24h', value: 1440 },
                    ].map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setScanIntervalState(option.value);
                          setStoredScanInterval(option.value);
                          setLastBgScan(getLastBackgroundScanTime());
                        }}
                        className="flex-1 py-2 rounded-xl items-center"
                        style={{
                          backgroundColor: scanInterval === option.value ? colors.accent : colors.card,
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color: scanInterval === option.value ? colors.background : colors.textMuted,
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {lastBgScan > 0 && (
                <View className="px-4 py-3">
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {t('settings.last.scan')}: {new Date(lastBgScan).toLocaleString()}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={manualScan}
                className="flex-row items-center gap-4 p-4"
              >
                <RefreshCw size={20} color={colors.accent} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {t('settings.scan.now')}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {t('settings.scan.now.desc')}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Language */}
          <View>
            <SectionHeader title={t('settings.language')} />
            <Pressable
              onPress={() => languageSheetRef.current?.present()}
              className="flex-row items-center gap-4 p-4 rounded-3xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Languages size={20} color={colors.accent} />
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>{t('settings.app.language')}</Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{languageLabel}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Font */}
          <View>
            <SectionHeader title={t('settings.font')} />
            <Pressable
              onPress={() => fontSheetRef.current?.present()}
              className="flex-row items-center gap-4 p-4 rounded-3xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Type size={20} color={colors.accent} />
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>{t('settings.app.font')}</Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{currentFont?.label ?? t('settings.app.font')}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Remove Ads */}
          <View>
            <SectionHeader title={t('settings.ads')} />
            <View className="flex-row items-center justify-between p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3 flex-1">
                {adsRemoved ? (
                  <ShieldCheck size={20} color={colors.accent} />
                ) : (
                  <ShieldOff size={20} color={colors.textMuted} />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{t('settings.remove.ads')}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {adsRemoved ? t('settings.ads.disabled') : t('settings.remove.ads.desc')}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (adsRemoved) {
                    setAdsRemoved(false);
                  } else {
                    Alert.alert(
                      t('settings.remove.ads'),
                      t('settings.ads.prompt'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('settings.ads.upgrade'), style: 'default', onPress: () => setAdsRemoved(true) },
                      ],
                    );
                  }
                }}
                className="w-14 h-8 rounded-full items-center justify-end px-1"
                style={{ backgroundColor: adsRemoved ? colors.accent : colors.card }}
              >
                <View
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: '#fff', transform: [{ translateX: adsRemoved ? 0 : -22 }] }}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <SectionHeader title={t('settings.now.playing.layout')} />
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
            <SectionHeader title={t('settings.playback')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingToggle
                icon={Shuffle}
                label={t('settings.default.shuffle')}
                value={defaultShuffle}
                onToggle={() => setDefaultShuffle(!defaultShuffle)}
                colors={colors}
              />
              <SettingToggle
                icon={Repeat}
                label={t('settings.default.repeat')}
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
                label={t('settings.crossfade')}
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
                        {t('settings.crossfade.duration')}
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
            <SectionHeader title={t('settings.audio')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Equal}
                label={t('settings.equalizer')}
                subtitle={t('settings.equalizer.desc')}
                onPress={() => router.push('/audio-features' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Moon}
                label={t('settings.sleep.timer')}
                subtitle={t('settings.sleep.timer.desc')}
                onPress={() => router.push('/sleep-timer' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Library */}
          <View>
            <SectionHeader title={t('settings.library')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={ListMusic}
                label={t('settings.smart.playlists')}
                subtitle={t('settings.smart.playlists.desc')}
                onPress={() => router.push('/smart-playlists' as any)}
                colors={colors}
              />
              <SettingRow
                icon={ListMusic}
                label={t('settings.my.playlists')}
                subtitle={t('settings.my.playlists.desc')}
                onPress={() => router.push('/playlists' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Activity}
                label={t('settings.statistics')}
                subtitle={t('settings.statistics.desc')}
                onPress={() => router.push('/statistics' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Tag}
                label={t('settings.tag.editor')}
                subtitle={t('settings.tag.editor.desc')}
                onPress={() => router.push('/tag-edit' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Disc}
                label={t('settings.library.tools')}
                subtitle={t('settings.library.tools.desc')}
                onPress={() => router.push('/library-tools' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Power User */}
          <View>
            <SectionHeader title={t('settings.power.user')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Music}
                label={t('settings.batch.ops')}
                subtitle={t('settings.batch.ops.desc')}
                onPress={() => router.push('/batch-operations' as any)}
                colors={colors}
              />
              <SettingRow
                icon={HardDrive}
                label={t('settings.storage')}
                subtitle={t('settings.storage.desc')}
                onPress={() => router.push('/storage' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Hand}
                label={t('settings.gestures')}
                subtitle={t('settings.gestures.desc')}
                onPress={() => router.push('/gesture-controls' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Files & Management */}
          <View>
            <SectionHeader title={t('settings.files.management')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={EyeOff}
                label={t('settings.hidden.files')}
                subtitle={t('settings.hidden.files.desc')}
                onPress={() => router.push('/hidden-files' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Clock}
                label={t('settings.play.time')}
                subtitle={t('settings.play.time.desc')}
                onPress={() => router.push('/play-time' as any)}
                colors={colors}
              />
              <SettingRow
                icon={Trash2}
                label={t('settings.recently.deleted')}
                subtitle={t('settings.recently.deleted.desc')}
                onPress={() => router.push('/recently-deleted' as any)}
                colors={colors}
              />
            </View>
          </View>

          {/* Online Features */}
          <View>
            <SectionHeader title={t('settings.online')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <SettingRow
                icon={Captions}
                label={t('settings.subtitles')}
                subtitle={t('settings.subtitles.desc')}
                onPress={() => router.push('/online-subtitles' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Brain}
                label={t('settings.ai')}
                subtitle={t('settings.ai.desc')}
                onPress={() => router.push('/ai-features' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Cloud}
                label={t('settings.cloud.backup')}
                subtitle={t('settings.cloud.backup.desc')}
                onPress={() => router.push('/cloud-sync' as any)}
                colors={colors}
                comingSoon
              />
              <SettingRow
                icon={Cloud}
                label={t('settings.cloud.restore')}
                subtitle={t('settings.cloud.restore.desc')}
                onPress={() => router.push('/cloud-sync' as any)}
                colors={colors}
                comingSoon
              />
            </View>
          </View>

          <View>
            <SectionHeader title="Future Features" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <FutureFeatureRow
                icon={Captions}
                title="Online Subtitle Downloader"
                subtitle="Fetch subtitles from online databases"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Sparkles}
                title="AI Smart Playlists"
                subtitle="Generate playlists from descriptions"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Brain}
                title="AI Mood Detection"
                subtitle="Auto-create mood-based playlists"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Music}
                title="AI Natural Search"
                subtitle="Search with natural language queries"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Cloud}
                title="Cloud Sync"
                subtitle="Sync data across all your devices"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Film}
                title="Frame-by-Frame Stepping"
                subtitle="Step through video one frame at a time"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Zap}
                title="True Crossfade"
                subtitle="Overlapping audio crossfade between tracks"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Mic}
                title="Lyrics Editor"
                subtitle="Create and edit synced lyrics in-app"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Equal}
                title="Loudness Enhancer"
                subtitle="Boost perceived audio loudness"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Clock}
                title="Continue Watching"
                subtitle="Resume video playback from last position"
                colors={colors}
              />
              <FutureFeatureRow
                icon={Bell}
                title="Notification Artwork"
                subtitle="Show album art in notification controls"
                colors={colors}
              />
              <FutureFeatureRow
                icon={ListPlus}
                title="Batch Add to Playlist"
                subtitle="Add multiple songs to playlists at once"
                colors={colors}
              />
            </View>
          </View>

          <View>
            <SectionHeader title={t('settings.storage')} />
            <View className="p-4 rounded-3xl" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                {t('settings.storage.info', { songs: songs.length, albums: albums.length, artists: artists.length, videos: videos.length })}
              </Text>
            </View>
          </View>

          <View>
            <SectionHeader title={t('settings.about')} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              <View className="p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <Info size={16} color={colors.accent} />
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>Lumora</Text>
                </View>
                <Text className="text-sm" style={{ color: colors.textMuted }}>{t('settings.version')}</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {t('settings.tagline')}
                </Text>
              </View>
              <View className="p-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {t('settings.developed.by')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Language Picker */}
      <BottomSheetModal
        ref={languageSheetRef}
        snapPoints={langSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            {t('settings.app.language')}
          </Text>
          {LANGUAGE_OPTIONS.map((lang) => {
            const isActive = lang.code === language;
            return (
              <Pressable
                key={lang.code}
                onPress={() => {
                  setLanguage(lang.code);
                  languageSheetRef.current?.dismiss();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: isActive ? colors.accent + '18' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 16 }}>{lang.native}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: isActive ? colors.accent : colors.text,
                      fontWeight: isActive ? '600' : '400',
                    }}
                  >
                    {lang.label}
                  </Text>
                </View>
                {isActive && (
                  <Text style={{ fontSize: 14, color: colors.accent }}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Font Picker */}
      <BottomSheetModal
        ref={fontSheetRef}
        snapPoints={fontSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            {t('settings.app.font')}
          </Text>
          {FONT_OPTIONS.map((font) => {
            const isActive = font.key === fontFamily;
            return (
              <Pressable
                key={font.key}
                onPress={() => {
                  setFontFamily(font.key);
                  fontSheetRef.current?.dismiss();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: isActive ? colors.accent + '18' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 15, color: isActive ? colors.accent : colors.text, fontWeight: isActive ? '600' : '400' }}>
                  {font.label}
                </Text>
                {isActive && (
                  <Text style={{ fontSize: 14, color: colors.accent, marginLeft: 8 }}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
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

function FutureFeatureRow({
  icon: Icon,
  title,
  subtitle,
  colors,
}: {
  icon: any;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View
      className="flex-row items-center gap-4 p-4"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Icon size={20} color={colors.textMuted} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-medium" style={{ color: colors.text }}>{title}</Text>
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.textMuted + '20' }}>
            <Text className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>SOON</Text>
          </View>
        </View>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>
      </View>
    </View>
  );
}
