import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useMusicStore } from '@/store/music-store';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
import {
  Settings,
  Paintbrush,
  Palette,
  Sun,
  Languages,
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
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const songs = useMusicStore((s) => s.songs);
  const albums = useMusicStore((s) => s.albums);

  const languageLabel: Record<string, string> = {
    en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
    ja: '日本語', zh: '中文', pt: 'Português', ru: 'Русский',
    it: 'Italiano', ko: '한국어', ar: 'العربية', tr: 'Türkçe',
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">

          <View className="flex-row items-center gap-3 mb-8">
            <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.accent + '25' }}>
              <Settings size={28} color={colors.accent} />
            </View>
            <View>
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>Settings</Text>
              <Text className="text-sm" style={{ color: colors.textMuted }}>Customize your Lumora experience</Text>
            </View>
          </View>

          <Section title="APPEARANCE" colors={colors}>
            <SettingRow
              icon={Paintbrush}
              label="Theme"
              subtitle="Nebula"
              onPress={() => router.push('/themes' as any)}
              colors={colors}
            />
            <SettingRow
              icon={Palette}
              label="Accent Color"
              subtitle="Purple"
              onPress={() => router.push('/accent-color' as any)}
              colors={colors}
            />
            <View className="flex-row items-center gap-4 p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border + '20' }}>
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                <Sun size={20} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>Dark Mode</Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>Always on</Text>
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
              subtitle="Last scanned: Today, 8:30 AM"
              onPress={() => {}}
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
    <View className="mb-6">
      <Text className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({ icon: Icon, label, subtitle, onPress, colors }: { icon: any; label: string; subtitle: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-4 p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border + '20' }}>
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
        <Icon size={20} color={colors.accent} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}
