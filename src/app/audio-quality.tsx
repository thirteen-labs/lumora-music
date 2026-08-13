import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUALITY_INFO = [
  { id: 'low', label: 'Low (128 kbps)', desc: 'Smallest file size' },
  { id: 'medium', label: 'Medium (192 kbps)', desc: 'Balanced quality' },
  { id: 'high', label: 'High (320 kbps)', desc: 'Best quality' },
  { id: 'lossless', label: 'Lossless', desc: 'CD quality (FLAC, ALAC)' },
];

export default function AudioQualityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Audio Quality</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.rounded3xl, s.p4, s.mb4, s.flexRow, s.gap3, { backgroundColor: colors.surface }]}>
            <Info size={18} color={colors.accent} style={{ marginTop: 2 }} />
            <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20, flex: 1 }]}>
              Quality is determined by the source file. Lumora plays your files at their original quality — no transcoding is applied.
            </Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {QUALITY_INFO.map((opt) => (
              <View key={opt.id} style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{opt.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
