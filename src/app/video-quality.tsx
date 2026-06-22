import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUALITY_INFO = [
  { id: '480p', label: '480p', desc: 'Standard definition (SD)' },
  { id: '720p', label: '720p', desc: 'High definition (HD)' },
  { id: '1080p', label: '1080p', desc: 'Full high definition (FHD)' },
  { id: '4k', label: '4K', desc: 'Ultra high definition (UHD)' },
];

export default function VideoQualityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Video Quality</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.rounded3xl, s.p4, s.mb4, s.flexRow, s.gap3, { backgroundColor: colors.surface }]}>
            <Info size={18} color={colors.accent} style={{ marginTop: 2 }} />
            <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20, flex: 1 }]}>
              Quality is determined by the source file. Lumora plays your videos at their original resolution — no transcoding is applied.
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
