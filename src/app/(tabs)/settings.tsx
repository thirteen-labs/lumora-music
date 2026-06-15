import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, FONT_OPTIONS } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { useThemeStore } from '@/store/theme-store';
import { getThemeById } from '@/theme/themes';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Settings,
  Paintbrush,
  Palette,
  Sun,
  Languages,
  Type,
  Music,
  Play,
  SlidersHorizontal,
  Volume2,
  FolderOpen,
  RefreshCw,
  Database,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  ImageIcon,
  Pencil,
} from 'lucide-react-native';
import { s } from '@/styles';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);
  const scan = useMusicStore((s) => s.scan);
  const scanStatus = useMusicStore((s) => s.scanStatus);
  const lastScanTime = useMusicStore((s) => s.lastScanTime);
  const colorAware = useSettingsStore((s) => s.colorAware);
  const setColorAware = useSettingsStore((s) => s.setColorAware);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const setBackgroundImage = useSettingsStore((s) => s.setBackgroundImage);
  const currentThemeId = useThemeStore((s) => s.currentThemeId);
  const currentTheme = getThemeById(currentThemeId);
  const accentOverride = useSettingsStore((s) => s.accentOverride);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontLabel = FONT_OPTIONS.find((f) => f.key === fontFamily)?.label ?? 'System';

  const accentLabel: Record<string, string> = {
    '#7C3AED': 'Purple', '#3B82F6': 'Blue', '#10B981': 'Green',
    '#EF4444': 'Red', '#F59E0B': 'Orange', '#EC4899': 'Pink',
    '#06B6D4': 'Cyan', '#14B8A6': 'Teal',
  };

  const handleBackgroundImagePress = () => {
    const options = ['Choose from Gallery'];
    if (backgroundImage) options.push('Remove Background');
    options.push('Cancel');

    Alert.alert('Background Image', 'Set a custom background image for the app.', options.map((opt) => ({
      text: opt,
      style: opt === 'Cancel' ? 'cancel' : opt === 'Remove Background' ? 'destructive' : 'default',
      onPress: async () => {
        if (opt === 'Choose from Gallery') {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Required', 'Allow access to your photo library to choose a background image.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            setBackgroundImage(result.assets[0].uri);
          }
        } else if (opt === 'Remove Background') {
          setBackgroundImage(null);
        }
      },
    })));
  };

  const languageLabel: Record<string, string> = {
    en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
    ja: '日本語', zh: '中文', pt: 'Português', ru: 'Русский',
    it: 'Italiano', ko: '한국어', ar: 'العربية', tr: 'Türkçe',
  };

  const lastScanLabel = useMemo(() => {
    if (scanStatus === 'scanning') return 'Scanning...';
    if (!lastScanTime) return 'Never scanned';
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - lastScanTime;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [scanStatus, lastScanTime]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: insets.top + 20 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5]}>

          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb8]}>
            <View style={[s.w14, s.h14, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '25' }]}>
              <Settings size={28} color={colors.accent} />
            </View>
            <View>
              <Text style={[s.text2xl, s.fontBold, { color: colors.text }]}>Settings</Text>
              <Text style={[s.textSm, { color: colors.textMuted }]}>Customize your Lumora experience</Text>
            </View>
          </View>

          <Section title="APPEARANCE" colors={colors}>
            <Pressable
              onPress={handleBackgroundImagePress}
              style={[s.itemsCenter, s.justifyCenter, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border + '20' }]}
            >
              <View
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: colors.card,
                }}
              >
                {backgroundImage ? (
                  <Image
                    source={{ uri: backgroundImage }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
                    <ImageIcon size={32} color={colors.textMuted} />
                    <Text style={[s.textXs, s.mt2, { color: colors.textMuted }]}>No background set</Text>
                  </View>
                )}
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} color={colors.background} />
                </View>
              </View>
              <Text style={[s.textSm, s.fontMedium, s.mt2, { color: colors.text }]}>Background Image</Text>
            </Pressable>
            <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border + '20' }]}>
              <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <Palette size={20} color={colors.accent} />
              </View>
              <View style={[s.flex1]}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{t('settings.color.aware')}</Text>
                <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{t('settings.color.aware.desc')}</Text>
              </View>
              <Switch value={colorAware} onValueChange={setColorAware} trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
            <SettingRow
              icon={Paintbrush}
              label="Theme"
              subtitle={currentTheme.name}
              onPress={() => router.push('/themes' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Palette}
              label="Accent Color"
              subtitle={accentOverride ? (accentLabel[accentOverride] ?? accentOverride) : 'Default'}
              onPress={() => router.push('/accent-color' as any)}
              colors={colors}
            />
            <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border + '20' }]}>
              <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <Sun size={20} color={colors.accent} />
              </View>
              <View style={[s.flex1]}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>Always on</Text>
              </View>
              <Switch value={true} disabled trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
            <SettingRow
              icon={Languages}
              label="Language"
              subtitle={languageLabel[language] || 'English'}
              onPress={() => router.push('/language-settings' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Type}
              label="Font"
              subtitle={fontLabel}
              onPress={() => router.push('/font-settings' as any)}
              colors={colors}
            />
          </Section>

          <Section title="PLAYBACK" colors={colors}>
            <SettingRow
              icon={Music}
              label="Audio Quality"
              subtitle="High (320 kbps)"
              onPress={() => router.push('/audio-quality' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Play}
              label="Video Quality"
              subtitle="1080p"
              onPress={() => router.push('/video-quality' as any)}
              colors={colors}
            />
            <SettingRow
              icon={SlidersHorizontal}
              label={t('settings.equalizer')}
              subtitle="Custom"
              onPress={() => router.push('/audio-features' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Volume2}
              label={t('settings.crossfade')}
              subtitle="5 seconds"
              onPress={() => router.push('/crossfade-settings' as any)}
              colors={colors}
            />
          </Section>

          <Section title="LIBRARY" colors={colors}>
            <SettingRow
              icon={FolderOpen}
              label="Scan Locations"
              subtitle="2 folders"
              onPress={() => router.push('/scan-locations' as any)}
              colors={colors}
            />
            <SettingRow
              icon={RefreshCw}
              label="Rescan Library"
              subtitle={lastScanLabel}
              onPress={() => scan(true)}
              colors={colors}
            />
            <SettingRow
              icon={Database}
              label={t('settings.storage')}
              subtitle={`${songs.length} songs · ${albums.length} albums`}
              onPress={() => router.push('/storage' as any)}
              colors={colors}
            />
          </Section>

          <Section title="GENERAL" colors={colors}>
            <SettingRow
              icon={Shield}
              label="Privacy"
              subtitle="Offline & Local Only"
              onPress={() => router.push('/privacy' as any)}
              colors={colors}
            />
            <SettingRow
              icon={HelpCircle}
              label="Help & Support"
              subtitle="FAQs, Guides, Contact"
              onPress={() => router.push('/help-support' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Info}
              label="About Lumora"
              subtitle={t('settings.version')}
              onPress={() => router.push('/about' as any)}
              colors={colors}
            />
          </Section>

        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[s.mb6]}>
      <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }, s.mb3]}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({ icon: Icon, label, subtitle, onPress, colors }: { icon: any; label: string; subtitle: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border + '20' }]}>
      <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
        <Icon size={20} color={colors.accent} />
      </View>
      <View style={[s.flex1]}>
        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{label}</Text>
        <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}
