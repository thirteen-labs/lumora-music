import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';

const QUALITY_OPTIONS = [
  { id: 'low', label: 'Low (128 kbps)', desc: 'Saves storage space' },
  { id: 'medium', label: 'Medium (192 kbps)', desc: 'Balanced quality' },
  { id: 'high', label: 'High (320 kbps)', desc: 'Best quality' },
  { id: 'lossless', label: 'Lossless', desc: 'CD quality (FLAC)' },
];

export default function AudioQualityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const current = useSettingsStore((s) => s.audioQuality);
  const setAudioQuality = useSettingsStore((s) => s.setAudioQuality);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Audio Quality</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {QUALITY_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.id}
                onPress={() => setAudioQuality(opt.id)}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: i < QUALITY_OPTIONS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
              >
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{opt.desc}</Text>
                </View>
                {current === opt.id && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
