import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, ShieldCheck, WifiOff, EyeOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_ITEMS = [
  { icon: WifiOff, label: 'Offline Mode', desc: 'No internet access required' },
  { icon: ShieldCheck, label: 'No Data Collection', desc: 'Your data stays on your device' },
  { icon: EyeOff, label: 'No Analytics', desc: 'Usage analytics are disabled' },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.rounded3xl, s.p5, s.itemsCenter, s.mb6, { backgroundColor: colors.surface }]}>
            <View style={[s.w16, s.h16, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
              <Shield size={32} color={colors.accent} />
            </View>
            <Text style={[s.textLg, s.fontBold, s.mt3, { color: colors.text }]}>Your Privacy Matters</Text>
            <Text style={[s.textSm, s.textCenter, s.mt2, { color: colors.textMuted, lineHeight: 22 }]}>
              Lumora is designed to work completely offline. No data is collected, tracked, or shared.
            </Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {PRIVACY_ITEMS.map((item) => (
              <View key={item.label} style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}>
                <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <item.icon size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
